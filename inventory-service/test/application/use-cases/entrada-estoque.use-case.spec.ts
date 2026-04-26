import { describe, expect, it, vi } from 'vitest'

import { IEventPublisher } from '@application/ports/event-publisher.port'
import { ILockService } from '@application/ports/lock-service.port'
import { EntradaEstoqueUseCase } from '@application/use-cases/entrada-estoque.use-case'
import { Produto } from '@domain/entities/produto.entity'
import { NivelCriticoEstoqueEvent } from '@domain/events/nivel-critico-estoque.event'
import { IProdutoRepository } from '@domain/repositories/produto.repository'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'

const PRODUTO_ID_A = 1
const PRODUTO_ID_B = 2

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

  const eventPublisher: IEventPublisher = {
    publish: vi.fn(),
    publishMany: vi.fn(),
  }

  const lockService: ILockService = {
    acquire: vi.fn().mockResolvedValue(true),
    release: vi.fn(),
    withLock: vi.fn(),
  }

  const useCase = new EntradaEstoqueUseCase(
    produtoRepo,
    eventPublisher,
    lockService,
  )

  return { useCase, produtoRepo, eventPublisher, lockService }
}

describe('EntradaEstoqueUseCase', () => {

  describe('execute', () => {

    it('deve adicionar estoque para um único produto', async () => {
      const { useCase, produtoRepo, eventPublisher, lockService } = makeMocks()
      const produtoA = makeProduto(PRODUTO_ID_A, 100)

      vi.mocked(produtoRepo.findByIds).mockResolvedValueOnce([produtoA])

      const result = await useCase.execute({
        itens: [{ produtoId: PRODUTO_ID_A, quantidade: 50 }],
      })

      expect(result.produtosAtualizados).toHaveLength(1)
      expect(result.produtosAtualizados[0]).toEqual({
        produtoId: PRODUTO_ID_A,
        novaQuantidadeTotal: 150,
      })

      expect(produtoRepo.findByIds).toHaveBeenCalledWith([PRODUTO_ID_A])
      expect(produtoRepo.saveMany).toHaveBeenCalledOnce()
      expect(lockService.acquire).toHaveBeenCalledOnce()
      expect(lockService.release).toHaveBeenCalledOnce()
      expect(eventPublisher.publishMany).not.toHaveBeenCalled()
    })

    it('deve adicionar estoque para múltiplos produtos', async () => {
      const { useCase, produtoRepo, eventPublisher, lockService } = makeMocks()
      const produtoA = makeProduto(PRODUTO_ID_A, 100)
      const produtoB = makeProduto(PRODUTO_ID_B, 200)

      vi.mocked(produtoRepo.findByIds).mockResolvedValueOnce([produtoA, produtoB])

      const result = await useCase.execute({
        itens: [
          { produtoId: PRODUTO_ID_A, quantidade: 50 },
          { produtoId: PRODUTO_ID_B, quantidade: 30 },
        ],
      })

      expect(result.produtosAtualizados).toHaveLength(2)
      expect(result.produtosAtualizados).toEqual([
        { produtoId: PRODUTO_ID_A, novaQuantidadeTotal: 150 },
        { produtoId: PRODUTO_ID_B, novaQuantidadeTotal: 230 },
      ])

      expect(produtoRepo.saveMany).toHaveBeenCalledOnce()
      const savedProdutos = vi.mocked(produtoRepo.saveMany).mock.calls[0]?.[0]
      expect(savedProdutos).toHaveLength(2)
    })

    it('deve publicar evento de nível crítico quando estoque fica abaixo do threshold', async () => {
      const { useCase, produtoRepo, eventPublisher } = makeMocks()

      const produtoA = makeProduto(PRODUTO_ID_A, 6, 0)

      vi.mocked(produtoRepo.findByIds).mockResolvedValueOnce([produtoA])

      const result = await useCase.execute({
        itens: [{ produtoId: PRODUTO_ID_A, quantidade: 1 }],
      })

      expect(result.produtosAtualizados).toHaveLength(1)
      expect(result.produtosAtualizados[0]).toEqual({
        produtoId: PRODUTO_ID_A,
        novaQuantidadeTotal: 7,
      })

      expect(eventPublisher.publishMany).not.toHaveBeenCalled()
    })

    it('deve publicar evento de nível crítico quando estoque cai para nível crítico', async () => {
      const { useCase, produtoRepo, eventPublisher } = makeMocks()
      const produtoA = makeProduto(PRODUTO_ID_A, 5, 0)

      vi.mocked(produtoRepo.findByIds).mockResolvedValueOnce([produtoA])

      const result = await useCase.execute({
        itens: [{ produtoId: PRODUTO_ID_A, quantidade: 5 }],
      })

      expect(result.produtosAtualizados).toHaveLength(1)
      expect(eventPublisher.publishMany).not.toHaveBeenCalled()
    })

    it('deve publicar evento de nível crítico para múltiplos produtos em nível crítico', async () => {
      const { useCase, produtoRepo, eventPublisher } = makeMocks()

      const produtoA = makeProduto(PRODUTO_ID_A, 3, 0)
      const produtoB = makeProduto(PRODUTO_ID_B, 2, 0)

      vi.mocked(produtoRepo.findByIds).mockResolvedValueOnce([produtoA, produtoB])

      const result = await useCase.execute({
        itens: [
          { produtoId: PRODUTO_ID_A, quantidade: 1 },
          { produtoId: PRODUTO_ID_B, quantidade: 1 },
        ],
      })

      expect(result.produtosAtualizados).toHaveLength(2)

      expect(eventPublisher.publishMany).toHaveBeenCalledOnce()
      const eventosPublicados = vi.mocked(eventPublisher.publishMany).mock.calls[0]?.[0]
      expect(eventosPublicados).toHaveLength(2)
      expect(eventosPublicados?.[0]).toBeInstanceOf(NivelCriticoEstoqueEvent)
      expect(eventosPublicados?.[1]).toBeInstanceOf(NivelCriticoEstoqueEvent)
    })

    it('deve lançar erro quando nenhum item é fornecido', async () => {
      const { useCase } = makeMocks()

      await expect(
        useCase.execute({ itens: [] })
      ).rejects.toThrow()
    })

    it('deve lançar erro quando quantidade é inválida', async () => {
      const { useCase } = makeMocks()

      await expect(
        useCase.execute({
          itens: [{ produtoId: PRODUTO_ID_A, quantidade: -5 }],
        })
      ).rejects.toThrow()

      await expect(
        useCase.execute({
          itens: [{ produtoId: PRODUTO_ID_A, quantidade: 0 }],
        })
      ).rejects.toThrow()

      await expect(
        useCase.execute({
          itens: [{ produtoId: PRODUTO_ID_A, quantidade: 1.5 }],
        })
      ).rejects.toThrow()
    })

    it('deve lançar erro quando ID do produto é inválido', async () => {
      const { useCase } = makeMocks()

      await expect(
        useCase.execute({
          itens: [{ produtoId: -1, quantidade: 5 }],
        })
      ).rejects.toThrow()

      await expect(
        useCase.execute({
          itens: [{ produtoId: 0, quantidade: 5 }],
        })
      ).rejects.toThrow()
    })

    it('deve adquirir lock antes de processar e liberar após', async () => {
      const { useCase, produtoRepo, lockService } = makeMocks()
      const produtoA = makeProduto(PRODUTO_ID_A, 100)

      vi.mocked(produtoRepo.findByIds).mockResolvedValueOnce([produtoA])

      const lockAcquireOrder = 1
      const lockReleaseOrder = 2
      let callOrder = 0

      vi.mocked(lockService.acquire).mockImplementation(async () => {
        callOrder++
        expect(callOrder).toBe(lockAcquireOrder)

        return true
      })

      vi.mocked(lockService.release).mockImplementation(async () => {
        callOrder++
        expect(callOrder).toBe(lockReleaseOrder)
      })

      await useCase.execute({
        itens: [{ produtoId: PRODUTO_ID_A, quantidade: 50 }],
      })

      expect(lockService.acquire).toHaveBeenCalledOnce()
      expect(lockService.release).toHaveBeenCalledOnce()
    })

    it('deve usar chave de lock correta com IDs de produtos ordenados', async () => {
      const { useCase, produtoRepo, lockService } = makeMocks()
      const produtoA = makeProduto(PRODUTO_ID_A, 100)
      const produtoB = makeProduto(PRODUTO_ID_B, 200)

      vi.mocked(produtoRepo.findByIds).mockResolvedValueOnce([produtoB, produtoA])

      await useCase.execute({
        itens: [
          { produtoId: PRODUTO_ID_B, quantidade: 30 },
          { produtoId: PRODUTO_ID_A, quantidade: 50 },
        ],
      })

      const expectedLockKey = 'estoque:entrada:1,2'
      expect(lockService.acquire).toHaveBeenCalledWith(expectedLockKey, 10_000)
      expect(lockService.release).toHaveBeenCalledWith(expectedLockKey)
    })

    it('deve salvar produtos com quantidade correta', async () => {
      const { useCase, produtoRepo } = makeMocks()
      const produtoA = makeProduto(PRODUTO_ID_A, 100)
      const produtoB = makeProduto(PRODUTO_ID_B, 200)

      vi.mocked(produtoRepo.findByIds).mockResolvedValueOnce([produtoA, produtoB])

      await useCase.execute({
        itens: [
          { produtoId: PRODUTO_ID_A, quantidade: 50 },
          { produtoId: PRODUTO_ID_B, quantidade: 75 },
        ],
      })

      const savedProdutos = vi.mocked(produtoRepo.saveMany).mock.calls[0]?.[0]

      expect(savedProdutos?.[0]?.quantidadeTotal.quantidade).toBe(150)
      expect(savedProdutos?.[1]?.quantidadeTotal.quantidade).toBe(275)
    })

    it('deve criar um novo produto quando não encontrado no banco de dados', async () => {
      const { useCase, produtoRepo, lockService } = makeMocks()

      vi.mocked(produtoRepo.findByIds).mockResolvedValueOnce([])

      const result = await useCase.execute({
        itens: [
          { produtoId: PRODUTO_ID_A, quantidade: 50 },
          { produtoId: PRODUTO_ID_B, quantidade: 30 },
        ],
      })

      expect(result.produtosAtualizados).toHaveLength(2)
      expect(result.produtosAtualizados).toEqual([
        { produtoId: PRODUTO_ID_A, novaQuantidadeTotal: 50 },
        { produtoId: PRODUTO_ID_B, novaQuantidadeTotal: 30 },
      ])

      expect(produtoRepo.saveMany).toHaveBeenCalledOnce()

      const savedProdutos = vi.mocked(produtoRepo.saveMany).mock.calls[0]?.[0]

      expect(savedProdutos).toHaveLength(2)
      expect(savedProdutos?.[0]?.id).toBe(PRODUTO_ID_A)
      expect(savedProdutos?.[0]?.quantidadeTotal.quantidade).toBe(50)
      expect(savedProdutos?.[1]?.id).toBe(PRODUTO_ID_B)
      expect(savedProdutos?.[1]?.quantidadeTotal.quantidade).toBe(30)

      expect(lockService.release).toHaveBeenCalledOnce()
    })
  })
})
