import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ConsultarDisponibilidadeUseCase } from '@application/use-cases/consultar-disponibilidade.use-case'
import { Produto } from '@domain/entities/produto.entity'
import { IProdutoRepository } from '@domain/repositories/produto.repository'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'

const PRODUTO_ID_A = 1
const PRODUTO_ID_B = 2

function makeProduto(id: number, total: number, reservado = 0): Produto {
  return Produto.reconstitute({
    id,
    quantidadeTotal: EstoqueProduto.create(total),
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

  const useCase = new ConsultarDisponibilidadeUseCase(produtoRepo)
  return { useCase, produtoRepo }
}

describe('ConsultarDisponibilidadeUseCase', () => {
  let mocks: ReturnType<typeof makeMocks>

  beforeEach(() => { mocks = makeMocks() })

  it('retorna disponibilidade correta para produtos existentes', async () => {
    const { useCase, produtoRepo } = mocks
    vi.mocked(produtoRepo.findByIds).mockResolvedValue([
      makeProduto(PRODUTO_ID_A, 100, 20),
      makeProduto(PRODUTO_ID_B, 50, 50),
    ])

    const result = await useCase.execute({ produtoIds: [PRODUTO_ID_A, PRODUTO_ID_B] })

    const itemA = result.itens.find(item => item.produtoId === PRODUTO_ID_A)!

    expect(itemA.quantidadeTotal).toBe(100)
    expect(itemA.quantidadeReservada).toBe(20)
    expect(itemA.quantidadeDisponivel).toBe(80)
    expect(itemA.isNivelCritico).toBe(false)

    const itemB = result.itens.find((i) => i.produtoId === PRODUTO_ID_B)!
    expect(itemB.quantidadeDisponivel).toBe(0)
    expect(itemB.isNivelCritico).toBe(true)
  })

  it('retorna disponível zero para produto não encontrado', async () => {
    const { useCase, produtoRepo } = mocks
    vi.mocked(produtoRepo.findByIds).mockResolvedValue([])

    const result = await useCase.execute({ produtoIds: [PRODUTO_ID_A] })

    expect(result.itens[0].quantidadeDisponivel).toBe(0)
    expect(result.itens[0].isNivelCritico).toBe(true)
  })

  it('preserva a ordem dos produtoIds na resposta', async () => {
    const { useCase, produtoRepo } = mocks
    vi.mocked(produtoRepo.findByIds).mockResolvedValue([
      makeProduto(PRODUTO_ID_B, 30),
      makeProduto(PRODUTO_ID_A, 10),
    ])

    const result = await useCase.execute({ produtoIds: [PRODUTO_ID_A, PRODUTO_ID_B] })

    expect(result.itens[0].produtoId).toBe(PRODUTO_ID_A)
    expect(result.itens[1].produtoId).toBe(PRODUTO_ID_B)
  })

  it('indica nível crítico quando disponível está abaixo de 5', async () => {
    const { useCase, produtoRepo } = mocks

    vi.mocked(produtoRepo.findByIds).mockResolvedValue([
      makeProduto(PRODUTO_ID_A, 10, 7),
    ])

    const result = await useCase.execute({ produtoIds: [PRODUTO_ID_A] })

    expect(result.itens[0].isNivelCritico).toBe(true)
  })

  it('lança erro de validação para lista vazia', async () => {
    const { useCase } = mocks

    await expect(useCase.execute({ produtoIds: [] })).rejects.toThrow()
  })

  it('lança erro de validação para produtoId inválido', async () => {
    const { useCase } = mocks

    await expect(useCase.execute({ produtoIds: [null as any] })).rejects.toThrow()
  })
})
