import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ItemReserva } from '@domain/entities/item-reserva.entity'
import { Reserva, RESERVA_TIMEOUT_MINUTOS } from '@domain/entities/reserva.entity'
import { StatusReserva } from '@domain/enums/status-reserva.enum'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'
import { PedidoId } from '@domain/value-objects/pedido-id.vo'

function makeItem(qtd = 5): ItemReserva {
  return ItemReserva.create({
    produtoId: 1,
    quantidade: EstoqueProduto.create(qtd),
  })
}

function makePedidoId(): PedidoId {
  return PedidoId.create(1)
}

describe('Reserva', () => {
  describe('criar', () => {
    it('cria reserva no status pendente', () => {
      const reserva = Reserva.criar(makePedidoId(), [makeItem()])
      expect(reserva.status).toBe(StatusReserva.PENDENTE)
    })

    it('define expiradoEm 15 minutos à frente', () => {
      const antes = new Date()
      const reserva = Reserva.criar(makePedidoId(), [makeItem()])
      const depois = new Date()

      const minExpiry = new Date(antes.getTime() + RESERVA_TIMEOUT_MINUTOS * 60 * 1000)
      const maxExpiry = new Date(depois.getTime() + RESERVA_TIMEOUT_MINUTOS * 60 * 1000)

      expect(reserva.expiradoEm.getTime()).toBeGreaterThanOrEqual(minExpiry.getTime())
      expect(reserva.expiradoEm.getTime()).toBeLessThanOrEqual(maxExpiry.getTime())
    })

    it('lança erro ao criar sem itens', () => {
      expect(() => Reserva.criar(makePedidoId(), [])).toThrow()
    })

    it('preserva os itens passados', () => {
      const item1 = makeItem(3)
      const item2 = makeItem(7)
      const reserva = Reserva.criar(makePedidoId(), [item1, item2])
      expect(reserva.itens).toHaveLength(2)
    })
  })

  describe('isAtiva', () => {
    it('retorna true quando pendente e não expirada', () => {
      const reserva = Reserva.criar(makePedidoId(), [makeItem()])
      expect(reserva.isAtiva()).toBe(true)
    })

    it('retorna false após confirmar', () => {
      const reserva = Reserva.criar(makePedidoId(), [makeItem()])
      reserva.confirmar()
      expect(reserva.isAtiva()).toBe(false)
    })
  })

  describe('isExpirada', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('retorna false antes do prazo', () => {
      const reserva = Reserva.criar(makePedidoId(), [makeItem()])
      expect(reserva.isExpirada()).toBe(false)
    })

    it('retorna true após o prazo de 15 minutos', () => {
      const reserva = Reserva.criar(makePedidoId(), [makeItem()])
      vi.advanceTimersByTime((RESERVA_TIMEOUT_MINUTOS + 1) * 60 * 1000)
      expect(reserva.isExpirada()).toBe(true)
    })

    it('retorna false quando status não é pendente, mesmo expirada no tempo', () => {
      const reserva = Reserva.criar(makePedidoId(), [makeItem()])
      reserva.confirmar()
      vi.advanceTimersByTime((RESERVA_TIMEOUT_MINUTOS + 1) * 60 * 1000)
      expect(reserva.isExpirada()).toBe(false)
    })
  })

  describe('confirmar', () => {
    it('transiciona de pendente para confirmada', () => {
      const reserva = Reserva.criar(makePedidoId(), [makeItem()])
      reserva.confirmar()
      expect(reserva.status).toBe(StatusReserva.CONFIRMADO)
    })

    it('lança erro ao confirmar reserva já confirmada', () => {
      const reserva = Reserva.criar(makePedidoId(), [makeItem()])
      reserva.confirmar()
      expect(() => reserva.confirmar()).toThrow()
    })

    it('lança erro ao confirmar reserva estornada', () => {
      const reserva = Reserva.criar(makePedidoId(), [makeItem()])
      reserva.estornar()
      expect(() => reserva.confirmar()).toThrow()
    })
  })

  describe('estornar', () => {
    it('transiciona de pendente para estornada', () => {
      const reserva = Reserva.criar(makePedidoId(), [makeItem()])
      reserva.estornar()
      expect(reserva.status).toBe(StatusReserva.ESTORNADO)
    })

    it('lança erro ao estornar reserva já estornada', () => {
      const reserva = Reserva.criar(makePedidoId(), [makeItem()])
      reserva.estornar()
      expect(() => reserva.estornar()).toThrow()
    })

    it('lança erro ao estornar reserva confirmada', () => {
      const reserva = Reserva.criar(makePedidoId(), [makeItem()])
      reserva.confirmar()
      expect(() => reserva.estornar()).toThrow()
    })
  })

  describe('expirar', () => {
    it('transiciona de pendente para expirada', () => {
      const reserva = Reserva.criar(makePedidoId(), [makeItem()])
      reserva.expirar()
      expect(reserva.status).toBe(StatusReserva.EXPIRADO)
    })

    it('lança erro ao expirar reserva já confirmada', () => {
      const reserva = Reserva.criar(makePedidoId(), [makeItem()])
      reserva.confirmar()
      expect(() => reserva.expirar()).toThrow()
    })
  })
})
