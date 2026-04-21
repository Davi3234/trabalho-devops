import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IEventPublisher } from '@application/ports/event-publisher.port'
import { ConfirmarBaixaUseCase } from '@application/use-cases/confirmar-baixa.use-case'
import { ItemReserva } from '@domain/entities/item-reserva.entity'
import { Produto } from '@domain/entities/produto.entity'
import { Reserva } from '@domain/entities/reserva.entity'
import { StatusReserva } from '@domain/enums/status-reserva.enum'
import { NivelCriticoEstoqueEvent } from '@domain/events/nivel-critico-estoque.event'
import { IProdutoRepository } from '@domain/repositories/produto.repository'
import { IReservaRepository } from '@domain/repositories/reserva.repository'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'
import { PedidoId } from '@domain/value-objects/pedido-id.vo'
import { BusinessException } from '@shared/exceptions/business.exception'

const PRODUTO_ID = 1
const PEDIDO_ID = 3

function makeProduto(total: number, reservado: number): Produto {
  return Produto.reconstitute({
    id: PRODUTO_ID,
    quantidadeTotal: EstoqueProduto.create(total),
    quantidadeReservada: EstoqueProduto.create(reservado),
    version: 0,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  })
}

function makeReservaPendente(quantidade: number): Reserva {
  const item = ItemReserva.create({
    produtoId: PRODUTO_ID,
    quantidade: EstoqueProduto.create(quantidade),
  })
  return Reserva.criar(PedidoId.create(PEDIDO_ID), [item])
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
    isPedidoReservado: vi.fn(),
  }
  const eventPublisher: IEventPublisher = {
    publish: vi.fn(),
    publishMany: vi.fn(),
  }
  const useCase = new ConfirmarBaixaUseCase(produtoRepo, reservaRepo, eventPublisher)
  return { useCase, produtoRepo, reservaRepo, eventPublisher }
}

describe('ConfirmarBaixaUseCase', () => {
  let mocks: ReturnType<typeof makeMocks>

  beforeEach(() => { mocks = makeMocks() })

  describe('happy path', () => {
    it('confirma baixa e atualiza total e reservado no produto', async () => {
      const { useCase, produtoRepo, reservaRepo } = mocks
      const reserva = makeReservaPendente(10)
      const produto = makeProduto(100, 10)

      vi.mocked(reservaRepo.findByPedidoId).mockResolvedValue(reserva)
      vi.mocked(produtoRepo.findByIds).mockResolvedValue([produto])
      vi.mocked(produtoRepo.saveMany).mockResolvedValue()
      vi.mocked(reservaRepo.save).mockResolvedValue()

      await useCase.execute({ pedidoId: PEDIDO_ID })

      const [produtos] = vi.mocked(produtoRepo.saveMany).mock.calls[0]
      expect(produtos[0].quantidadeTotal.quantidade).toBe(90)
      expect(produtos[0].quantidadeReservada.quantidade).toBe(0)

      const [reservaSalva] = vi.mocked(reservaRepo.save).mock.calls[0]
      expect(reservaSalva.status).toBe(StatusReserva.CONFIRMADO)
    })

    it('não publica nenhum evento quando não atinge nível crítico', async () => {
      const { useCase, produtoRepo, reservaRepo, eventPublisher } = mocks
      const reserva = makeReservaPendente(5)
      const produto = makeProduto(100, 5)

      vi.mocked(reservaRepo.findByPedidoId).mockResolvedValue(reserva)
      vi.mocked(produtoRepo.findByIds).mockResolvedValue([produto])
      vi.mocked(produtoRepo.saveMany).mockResolvedValue()
      vi.mocked(reservaRepo.save).mockResolvedValue()

      await useCase.execute({ pedidoId: PEDIDO_ID })

      expect(eventPublisher.publishMany).not.toHaveBeenCalled()
    })
  })

  describe('idempotência', () => {
    it('ignora silenciosamente quando reserva já está confirmada', async () => {
      const { useCase, produtoRepo, reservaRepo } = mocks
      const reserva = makeReservaPendente(10)
      reserva.confirmar()

      vi.mocked(reservaRepo.findByPedidoId).mockResolvedValue(reserva)

      await expect(useCase.execute({ pedidoId: PEDIDO_ID })).resolves.not.toThrow()
      expect(produtoRepo.findByIds).not.toHaveBeenCalled()
    })

    it('ignora silenciosamente quando reserva não existe', async () => {
      const { useCase, produtoRepo, reservaRepo } = mocks
      vi.mocked(reservaRepo.findByPedidoId).mockResolvedValue(null)

      await expect(useCase.execute({ pedidoId: PEDIDO_ID })).resolves.not.toThrow()
      expect(produtoRepo.findByIds).not.toHaveBeenCalled()
    })
  })

  describe('reserva em estado inválido', () => {
    it('lança BusinessException quando reserva está estornada', async () => {
      const { useCase, reservaRepo } = mocks
      const reserva = makeReservaPendente(10)
      reserva.estornar()

      vi.mocked(reservaRepo.findByPedidoId).mockResolvedValue(reserva)

      await expect(useCase.execute({ pedidoId: PEDIDO_ID })).rejects.toThrow(BusinessException)
    })
  })

  describe('nível crítico', () => {
    it('publica NivelCriticoEstoqueEvent quando disponível cai abaixo de 5 após baixa', async () => {
      const { useCase, produtoRepo, reservaRepo, eventPublisher } = mocks

      const reserva = makeReservaPendente(10)
      const produto = makeProduto(10, 10)

      vi.mocked(reservaRepo.findByPedidoId).mockResolvedValue(reserva)
      vi.mocked(produtoRepo.findByIds).mockResolvedValue([produto])
      vi.mocked(produtoRepo.saveMany).mockResolvedValue()
      vi.mocked(reservaRepo.save).mockResolvedValue()

      await useCase.execute({ pedidoId: PEDIDO_ID })

      expect(eventPublisher.publishMany).toHaveBeenCalled()
      const [eventos] = vi.mocked(eventPublisher.publishMany).mock.calls[0]
      expect(eventos[0]).toBeInstanceOf(NivelCriticoEstoqueEvent)
    })
  })
})
