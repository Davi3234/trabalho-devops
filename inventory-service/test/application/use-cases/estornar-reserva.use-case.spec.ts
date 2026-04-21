import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IEventPublisher } from '@application/ports/event-publisher.port'
import { EstornarReservaUseCase } from '@application/use-cases/estornar-reserva.use-case'
import { ItemReserva } from '@domain/entities/item-reserva.entity'
import { Produto } from '@domain/entities/produto.entity'
import { Reserva } from '@domain/entities/reserva.entity'
import { StatusReserva } from '@domain/enums/status-reserva.enum'
import { ReservaEstornadaEvent } from '@domain/events/reserva-estornada.event'
import { IProdutoRepository } from '@domain/repositories/produto.repository'
import { IReservaRepository } from '@domain/repositories/reserva.repository'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'
import { PedidoId } from '@domain/value-objects/pedido-id.vo'

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
  const useCase = new EstornarReservaUseCase(produtoRepo, reservaRepo, eventPublisher)
  return { useCase, produtoRepo, reservaRepo, eventPublisher }
}

describe('EstornarReservaUseCase', () => {
  let mocks: ReturnType<typeof makeMocks>

  beforeEach(() => { mocks = makeMocks() })

  describe('happy path', () => {
    it('estorna reserva devolvendo quantidade ao disponível', async () => {
      const { useCase, produtoRepo, reservaRepo } = mocks
      const reserva = makeReservaPendente(15)
      const produto = makeProduto(100, 15)

      vi.mocked(reservaRepo.findByPedidoId).mockResolvedValue(reserva)
      vi.mocked(produtoRepo.findByIds).mockResolvedValue([produto])
      vi.mocked(produtoRepo.saveMany).mockResolvedValue()
      vi.mocked(reservaRepo.save).mockResolvedValue()

      await useCase.execute({ pedidoId: PEDIDO_ID })

      const [produtos] = vi.mocked(produtoRepo.saveMany).mock.calls[0]
      expect(produtos[0].quantidadeReservada.quantidade).toBe(0)
      expect(produtos[0].quantidadeDisponivel.quantidade).toBe(100)
    })

    it('publica ReservaEstornadaEvent com os itens corretos', async () => {
      const { useCase, produtoRepo, reservaRepo, eventPublisher } = mocks
      const reserva = makeReservaPendente(15)
      const produto = makeProduto(100, 15)

      vi.mocked(reservaRepo.findByPedidoId).mockResolvedValue(reserva)
      vi.mocked(produtoRepo.findByIds).mockResolvedValue([produto])
      vi.mocked(produtoRepo.saveMany).mockResolvedValue()
      vi.mocked(reservaRepo.save).mockResolvedValue()

      await useCase.execute({ pedidoId: PEDIDO_ID })

      const [evento] = vi.mocked(eventPublisher.publish).mock.calls[0]

      expect(evento).toBeInstanceOf(ReservaEstornadaEvent)
      expect((evento as ReservaEstornadaEvent).pedidoId).toBe(PEDIDO_ID)
      expect((evento as ReservaEstornadaEvent).itens[0].quantidade).toBe(15)
    })

    it('marca a reserva como estornada', async () => {
      const { useCase, produtoRepo, reservaRepo } = mocks
      const reserva = makeReservaPendente(10)
      const produto = makeProduto(50, 10)

      vi.mocked(reservaRepo.findByPedidoId).mockResolvedValue(reserva)
      vi.mocked(produtoRepo.findByIds).mockResolvedValue([produto])
      vi.mocked(produtoRepo.saveMany).mockResolvedValue()
      vi.mocked(reservaRepo.save).mockResolvedValue()

      await useCase.execute({ pedidoId: PEDIDO_ID })

      const [reservaSalva] = vi.mocked(reservaRepo.save).mock.calls[0]
      expect(reservaSalva.status).toBe(StatusReserva.ESTORNADO)
    })
  })

  describe('idempotência e casos limítrofes', () => {
    it('não faz nada quando reserva não existe', async () => {
      const { useCase, produtoRepo, reservaRepo } = mocks
      vi.mocked(reservaRepo.findByPedidoId).mockResolvedValue(null)

      await expect(useCase.execute({ pedidoId: PEDIDO_ID })).resolves.not.toThrow()
      expect(produtoRepo.findByIds).not.toHaveBeenCalled()
    })

    it('não faz nada quando reserva já está estornada', async () => {
      const { useCase, produtoRepo, reservaRepo } = mocks
      const reserva = makeReservaPendente(10)
      reserva.estornar()

      vi.mocked(reservaRepo.findByPedidoId).mockResolvedValue(reserva)

      await expect(useCase.execute({ pedidoId: PEDIDO_ID })).resolves.not.toThrow()
      expect(produtoRepo.findByIds).not.toHaveBeenCalled()
    })

    it('não faz nada quando reserva já está expirada', async () => {
      const { useCase, produtoRepo, reservaRepo } = mocks
      const reserva = makeReservaPendente(10)
      reserva.expirar()

      vi.mocked(reservaRepo.findByPedidoId).mockResolvedValue(reserva)

      await expect(useCase.execute({ pedidoId: PEDIDO_ID })).resolves.not.toThrow()
      expect(produtoRepo.findByIds).not.toHaveBeenCalled()
    })

    it('não estorna quando reserva já foi confirmada (baixa definitiva já ocorreu)', async () => {
      const { useCase, produtoRepo, reservaRepo } = mocks
      const reserva = makeReservaPendente(10)
      reserva.confirmar()

      vi.mocked(reservaRepo.findByPedidoId).mockResolvedValue(reserva)

      await expect(useCase.execute({ pedidoId: PEDIDO_ID })).resolves.not.toThrow()
      expect(produtoRepo.findByIds).not.toHaveBeenCalled()
    })
  })
})
