import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IEventPublisher } from '@application/ports/event-publisher.port'
import { ILockService } from '@application/ports/lock-service.port'
import { ReservarItensUseCase } from '@application/use-cases/reservar-itens.use-case'
import { Produto } from '@domain/entities/produto.entity'
import { Reserva } from '@domain/entities/reserva.entity'
import { EstoqueReservadoEvent } from '@domain/events/estoque-reservado.event'
import { NivelCriticoEstoqueEvent } from '@domain/events/nivel-critico-estoque.event'
import { ReservaFalhouEvent } from '@domain/events/reserva-falhou.event'
import { IProdutoRepository } from '@domain/repositories/produto.repository'
import { IReservaRepository } from '@domain/repositories/reserva.repository'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'
import { PedidoId } from '@domain/value-objects/pedido-id.vo'
import { BusinessException } from '@shared/exceptions/business.exception'

const PRODUTO_ID_A = 1
const PRODUTO_ID_B = 2
const PEDIDO_ID = 3

function makeProduto(id: number, total: number, reservado = 0): Produto {
  return Produto.reconstitute({
    id: id,
    quantidadeTotal: EstoqueProduto.create(total),
    quantidadeReservada: EstoqueProduto.create(reservado),
    version: 0,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  })
}

function makeReserva(pedidoId: number): Reserva {
  return Reserva.create(
    PedidoId.create(pedidoId),
    [{
      produtoId: PRODUTO_ID_A,
      quantidade: EstoqueProduto.create(1),
    } as any],
  )
}

function makeMocks() {
  const produtoRepo: IProdutoRepository = {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findByItens: vi.fn(),
    save: vi.fn(),
    saveMany: vi.fn(),
  }

  vi.mocked(produtoRepo.findByItens).mockImplementation(items => {
    return produtoRepo.findByIds(items.map(({ produtoId }) => produtoId))
  })

  const reservaRepo: IReservaRepository = {
    findByPedidoId: vi.fn(),
    findExpiradas: vi.fn(),
    save: vi.fn(),
    isPedidoReservado: vi.fn().mockResolvedValue(false),
  }

  const eventPublisher: IEventPublisher = {
    publish: vi.fn(),
    publishMany: vi.fn(),
  }

  const lockService: ILockService = {
    acquire: vi.fn().mockResolvedValue(true),
    release: vi.fn(),
    withLock: vi.fn(),
  }

  const useCase = new ReservarItensUseCase(
    produtoRepo,
    reservaRepo,
    eventPublisher,
    lockService,
  )

  return { useCase, produtoRepo, reservaRepo, eventPublisher, lockService }
}

describe('ReservarItensUseCase', () => {
  let mocks: ReturnType<typeof makeMocks>

  beforeEach(() => {
    mocks = makeMocks()
  })

  describe('happy path', () => {
    it('reserva itens disponíveis e publica EstoqueReservadoEvent', async () => {
      const { useCase, produtoRepo, reservaRepo, eventPublisher } = mocks

      vi.mocked(produtoRepo.findByIds).mockResolvedValue([
        makeProduto(PRODUTO_ID_A, 50),
        makeProduto(PRODUTO_ID_B, 30),
      ])
      vi.mocked(reservaRepo.save).mockResolvedValue()
      vi.mocked(produtoRepo.saveMany).mockResolvedValue()

      const result = await useCase.execute({
        pedidoId: PEDIDO_ID,
        itens: [
          { produtoId: PRODUTO_ID_A, quantidade: 10 },
          { produtoId: PRODUTO_ID_B, quantidade: 5 },
        ],
      })

      expect(result.pedidoId).toBe(PEDIDO_ID)
      expect(result.reservaId).toBeTruthy()
      expect(result.expiradoEm).toBeInstanceOf(Date)

      const [eventos] = vi.mocked(eventPublisher.publishMany).mock.calls[0]
      expect(eventos[0]).toBeInstanceOf(EstoqueReservadoEvent)
    })

    it('persiste a reserva e os produtos atualizados', async () => {
      const { useCase, produtoRepo, reservaRepo } = mocks

      vi.mocked(produtoRepo.findByIds).mockResolvedValue([makeProduto(PRODUTO_ID_A, 20)])
      vi.mocked(produtoRepo.saveMany).mockResolvedValue()
      vi.mocked(reservaRepo.save).mockResolvedValue()

      await useCase.execute({
        pedidoId: PEDIDO_ID,
        itens: [{ produtoId: PRODUTO_ID_A, quantidade: 5 }],
      })

      expect(produtoRepo.saveMany).toHaveBeenCalledOnce()
      expect(reservaRepo.save).toHaveBeenCalledOnce()
    })
  })

  describe('tudo ou nada — reserva parcial não permitida', () => {
    it('rejeita reserva quando apenas um item está indisponível', async () => {
      const { useCase, produtoRepo, eventPublisher } = mocks

      vi.mocked(produtoRepo.findByIds).mockResolvedValue([
        makeProduto(PRODUTO_ID_A, 50),
        makeProduto(PRODUTO_ID_B, 3, 3),
      ])

      await expect(
        useCase.execute({
          pedidoId: PEDIDO_ID,
          itens: [
            { produtoId: PRODUTO_ID_A, quantidade: 10 },
            { produtoId: PRODUTO_ID_B, quantidade: 2 },
          ],
        }),
      ).rejects.toThrow(BusinessException)

      expect(mocks.produtoRepo.saveMany).not.toHaveBeenCalled()
      expect(mocks.reservaRepo.save).not.toHaveBeenCalled()

      const evento = vi.mocked(eventPublisher.publish).mock.calls[0][0]
      expect(evento).toBeInstanceOf(ReservaFalhouEvent)
    })

    it('rejeita quando produto não existe no catálogo', async () => {
      const { useCase, produtoRepo } = mocks
      vi.mocked(produtoRepo.findByIds).mockResolvedValue([])

      await expect(
        useCase.execute({
          pedidoId: PEDIDO_ID,
          itens: [{ produtoId: PRODUTO_ID_A, quantidade: 1 }],
        }),
      ).rejects.toThrow(BusinessException)
    })
  })

  describe('idempotência', () => {
    it('retorna a reserva existente sem reprocessar quando pedido já foi processado', async () => {
      const { useCase, reservaRepo, produtoRepo } = mocks
      const reservaExistente = makeReserva(PEDIDO_ID)

      vi.mocked(reservaRepo.isPedidoReservado).mockResolvedValue(true)
      vi.mocked(reservaRepo.findByPedidoId).mockResolvedValue(reservaExistente)

      const result = await useCase.execute({
        pedidoId: PEDIDO_ID,
        itens: [{ produtoId: PRODUTO_ID_A, quantidade: 1 }],
      })

      expect(produtoRepo.findByIds).not.toHaveBeenCalled()
      expect(produtoRepo.saveMany).not.toHaveBeenCalled()
      expect(result.reservaId).toBe(reservaExistente.id)
    })
  })

  describe('lock de concorrência', () => {
    it('lança BusinessException quando não consegue adquirir lock', async () => {
      const { useCase, lockService } = mocks
      vi.mocked(lockService.acquire).mockResolvedValue(false)

      await expect(
        useCase.execute({
          pedidoId: PEDIDO_ID,
          itens: [{ produtoId: PRODUTO_ID_A, quantidade: 1 }],
        }),
      ).rejects.toThrow(BusinessException)
    })

    it('libera o lock mesmo quando a reserva falha', async () => {
      const { useCase, produtoRepo, lockService } = mocks

      vi.mocked(produtoRepo.findByIds).mockResolvedValue([
        makeProduto(PRODUTO_ID_A, 0),
      ])

      await expect(
        useCase.execute({
          pedidoId: PEDIDO_ID,
          itens: [{ produtoId: PRODUTO_ID_A, quantidade: 1 }],
        }),
      ).rejects.toThrow()

      expect(lockService.release).toHaveBeenCalledWith(`reserva:pedido:${PEDIDO_ID}`)
    })
  })

  describe('nível crítico', () => {
    it('publica NivelCriticoEstoqueEvent quando disponível cai abaixo de 5 após reserva', async () => {
      const { useCase, produtoRepo, reservaRepo, eventPublisher } = mocks

      vi.mocked(produtoRepo.findByIds).mockResolvedValue([
        makeProduto(PRODUTO_ID_A, 10, 6),
      ])
      vi.mocked(produtoRepo.saveMany).mockResolvedValue()
      vi.mocked(reservaRepo.save).mockResolvedValue()

      await useCase.execute({
        pedidoId: PEDIDO_ID,
        itens: [{ produtoId: PRODUTO_ID_A, quantidade: 1 }],
      })

      const [eventos] = vi.mocked(eventPublisher.publishMany).mock.calls[0]
      const nivelCritico = eventos.find((e: any) => e instanceof NivelCriticoEstoqueEvent)
      expect(nivelCritico).toBeDefined()
    })

    it('não publica NivelCriticoEstoqueEvent quando disponível permanece acima de 5', async () => {
      const { useCase, produtoRepo, reservaRepo, eventPublisher } = mocks

      vi.mocked(produtoRepo.findByIds).mockResolvedValue([
        makeProduto(PRODUTO_ID_A, 100, 0),
      ])
      vi.mocked(produtoRepo.saveMany).mockResolvedValue()
      vi.mocked(reservaRepo.save).mockResolvedValue()

      await useCase.execute({
        pedidoId: PEDIDO_ID,
        itens: [{ produtoId: PRODUTO_ID_A, quantidade: 1 }],
      })

      const [eventos] = vi.mocked(eventPublisher.publishMany).mock.calls[0]
      const nivelCritico = eventos.find((e: any) => e instanceof NivelCriticoEstoqueEvent)
      expect(nivelCritico).toBeUndefined()
    })
  })

  describe('validação de input (Zod)', () => {
    it('lança erro para pedidoId inválido', async () => {
      const { useCase } = mocks

      await expect(useCase.execute({ pedidoId: null as any, itens: [{ produtoId: PRODUTO_ID_A, quantidade: 1 }] })).rejects.toThrow()
    })

    it('lança erro para itens vazio', async () => {
      const { useCase } = mocks

      await expect(useCase.execute({ pedidoId: PEDIDO_ID, itens: [] })).rejects.toThrow()
    })

    it('lança erro para quantidade não inteira', async () => {
      const { useCase } = mocks

      await expect(useCase.execute({ pedidoId: PEDIDO_ID, itens: [{ produtoId: PRODUTO_ID_A, quantidade: 1.5 }] })).rejects.toThrow()
    })

    it('lança erro para quantidade zero', async () => {
      const { useCase } = mocks

      await expect(useCase.execute({ pedidoId: PEDIDO_ID, itens: [{ produtoId: PRODUTO_ID_A, quantidade: 0 }] })).rejects.toThrow()
    })
  })
})
