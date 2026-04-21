import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IEventPublisher } from '@application/ports/event-publisher.port'
import { ExpirarReservasUseCase } from '@application/use-cases/expirar-reserva.use-case'
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
const PEDIDO_A = 3
const PEDIDO_B = 4

function makeReservaPendente(pedidoId: number, quantidade: number): Reserva {
  const item = ItemReserva.create({
    produtoId: PRODUTO_ID,
    quantidade: EstoqueProduto.create(quantidade),
  })

  return Reserva.criar(PedidoId.create(pedidoId), [item])
}

function makeProduto(reservado: number): Produto {
  return Produto.reconstitute({
    id: PRODUTO_ID,
    quantidadeTotal: EstoqueProduto.create(100),
    quantidadeReservada: EstoqueProduto.create(reservado),
    version: 0,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  })
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

  const useCase = new ExpirarReservasUseCase(produtoRepo, reservaRepo, eventPublisher)

  return { useCase, produtoRepo, reservaRepo, eventPublisher }
}

describe('ExpirarReservasUseCase', () => {
  let mocks: ReturnType<typeof makeMocks>

  beforeEach(() => { mocks = makeMocks() })

  it('retorna zero expiradas quando não há reservas vencidas', async () => {
    const { useCase, reservaRepo } = mocks
    vi.mocked(reservaRepo.findExpiradas).mockResolvedValue([])

    const result = await useCase.execute()
    expect(result.expiradas).toBe(0)
  })

  it('expira múltiplas reservas e estorna o estoque de cada uma', async () => {
    const { useCase, produtoRepo, reservaRepo } = mocks

    const reservaA = makeReservaPendente(PEDIDO_A, 10)
    const reservaB = makeReservaPendente(PEDIDO_B, 5)

    vi.mocked(reservaRepo.findExpiradas).mockResolvedValue([reservaA, reservaB])
    vi.mocked(produtoRepo.findByIds).mockResolvedValue([makeProduto(15)])
    vi.mocked(produtoRepo.saveMany).mockResolvedValue()
    vi.mocked(reservaRepo.save).mockResolvedValue()

    const result = await useCase.execute()

    expect(result.expiradas).toBe(2)
    expect(reservaRepo.save).toHaveBeenCalledTimes(2)
  })

  it('marca cada reserva com status expirada', async () => {
    const { useCase, produtoRepo, reservaRepo } = mocks
    const reserva = makeReservaPendente(3, 5)

    vi.mocked(reservaRepo.findExpiradas).mockResolvedValue([reserva])
    vi.mocked(produtoRepo.findByIds).mockResolvedValue([makeProduto(5)])
    vi.mocked(produtoRepo.saveMany).mockResolvedValue()
    vi.mocked(reservaRepo.save).mockResolvedValue()

    await useCase.execute()

    const [reservaSalva] = vi.mocked(reservaRepo.save).mock.calls[0]
    expect(reservaSalva.status).toBe(StatusReserva.EXPIRADO)
  })

  it('publica ReservaEstornadaEvent para cada reserva expirada', async () => {
    const { useCase, produtoRepo, reservaRepo, eventPublisher } = mocks
    const reserva = makeReservaPendente(3, 5)

    vi.mocked(reservaRepo.findExpiradas).mockResolvedValue([reserva])
    vi.mocked(produtoRepo.findByIds).mockResolvedValue([makeProduto(5)])
    vi.mocked(produtoRepo.saveMany).mockResolvedValue()
    vi.mocked(reservaRepo.save).mockResolvedValue()

    await useCase.execute()

    expect(eventPublisher.publish).toHaveBeenCalledOnce()
    const [evento] = vi.mocked(eventPublisher.publish).mock.calls[0]
    expect(evento).toBeInstanceOf(ReservaEstornadaEvent)
  })

  it('continua processando as demais reservas quando uma falha', async () => {
    const { useCase, produtoRepo, reservaRepo } = mocks

    const reservaA = makeReservaPendente(PEDIDO_A, 5)
    const reservaB = makeReservaPendente(PEDIDO_B, 3)

    vi.mocked(reservaRepo.findExpiradas).mockResolvedValue([reservaA, reservaB])

    vi.mocked(produtoRepo.findByIds)
      .mockRejectedValueOnce(new Error('DB timeout'))
      .mockResolvedValueOnce([makeProduto(3)])

    vi.mocked(produtoRepo.saveMany).mockResolvedValue()
    vi.mocked(reservaRepo.save).mockResolvedValue()

    const result = await useCase.execute()

    expect(result.expiradas).toBe(1)
  })
})
