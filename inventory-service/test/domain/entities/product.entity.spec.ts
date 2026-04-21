import { describe, expect, it } from 'vitest'

import { NIVEL_CRITICO_THRESHOLD, Produto } from '@domain/entities/produto.entity'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'
import { BusinessException } from '@shared/exceptions/business.exception'

function makeProduto(total: number, reservado = 0): Produto {
  return Produto.reconstitute({
    id: 1,
    quantidadeTotal: EstoqueProduto.create(total),
    quantidadeReservada: EstoqueProduto.create(reservado),
    version: 0,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  })
}

describe('Produto', () => {
  describe('quantidadeDisponivel', () => {
    it('calcula disponível como total menos reservado', () => {
      const p = makeProduto(100, 30)
      expect(p.quantidadeDisponivel.quantidade).toBe(70)
    })

    it('retorna zero quando tudo está reservado', () => {
      const p = makeProduto(10, 10)
      expect(p.quantidadeDisponivel.quantidade).toBe(0)
    })
  })

  describe('hasDisponivel', () => {
    it('retorna true quando há estoque suficiente', () => {
      const p = makeProduto(20, 5)
      expect(p.hasDisponivel(EstoqueProduto.create(10))).toBe(true)
    })

    it('retorna true para quantidade exatamente igual ao disponível', () => {
      const p = makeProduto(10, 5)
      expect(p.hasDisponivel(EstoqueProduto.create(5))).toBe(true)
    })

    it('retorna false quando estoque insuficiente', () => {
      const p = makeProduto(10, 8)
      expect(p.hasDisponivel(EstoqueProduto.create(5))).toBe(false)
    })
  })

  describe('isNivelCritico', () => {
    it('retorna true quando disponível é menor que o threshold', () => {
      const p = makeProduto(10, 10 - (NIVEL_CRITICO_THRESHOLD - 1))
      expect(p.isNivelCritico()).toBe(true)
    })

    it('retorna false quando disponível é igual ao threshold', () => {
      const p = makeProduto(10, 10 - NIVEL_CRITICO_THRESHOLD)
      expect(p.isNivelCritico()).toBe(false)
    })

    it('retorna false quando disponível é maior que o threshold', () => {
      const p = makeProduto(50, 0)
      expect(p.isNivelCritico()).toBe(false)
    })
  })

  describe('reservar', () => {
    it('incrementa quantidadeReservada', () => {
      const p = makeProduto(100, 0)
      p.reservar(EstoqueProduto.create(30))
      expect(p.quantidadeReservada.quantidade).toBe(30)
      expect(p.quantidadeDisponivel.quantidade).toBe(70)
    })

    it('lança erro quando estoque insuficiente', () => {
      const p = makeProduto(10, 8)
      expect(() => p.reservar(EstoqueProduto.create(5))).toThrow()
    })

    it('permite reservar exatamente o disponível', () => {
      const p = makeProduto(10, 3)
      expect(() => p.reservar(EstoqueProduto.create(7))).not.toThrow()
      expect(p.quantidadeDisponivel.quantidade).toBe(0)
    })
  })

  describe('confirmarBaixa', () => {
    it('reduz total e reservado simultaneamente', () => {
      const p = makeProduto(100, 20)
      p.confirmarBaixa(EstoqueProduto.create(20))
      expect(p.quantidadeTotal.quantidade).toBe(80)
      expect(p.quantidadeReservada.quantidade).toBe(0)
      expect(p.quantidadeDisponivel.quantidade).toBe(80)
    })
  })

  describe('estornarReserva', () => {
    it('decrementa quantidadeReservada devolvendo ao disponível', () => {
      const p = makeProduto(100, 40)
      p.estornarReserva(EstoqueProduto.create(40))
      expect(p.quantidadeReservada.quantidade).toBe(0)
      expect(p.quantidadeDisponivel.quantidade).toBe(100)
    })

    it('lança exceção se estornar mais do que o reservado', () => {
      const p = makeProduto(100, 10)
      expect(() => p.estornarReserva(EstoqueProduto.create(20))).toThrow(BusinessException)
    })
  })

  describe('create', () => {
    it('inicia com quantidadeReservada zero', () => {
      const p = Produto.create({
        id: 1,
        quantidadeTotal: EstoqueProduto.create(50),
      })
      expect(p.quantidadeReservada.quantidade).toBe(0)
      expect(p.quantidadeDisponivel.quantidade).toBe(50)
    })
  })
})
