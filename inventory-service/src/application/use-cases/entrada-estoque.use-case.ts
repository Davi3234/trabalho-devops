import { Inject, Injectable, Logger } from '@nestjs/common'

import type { EntradaEstoqueInput, EntradaEstoqueOutput } from '@application/dto/entrada-estoque.dto'
import { entradaEstoqueSchema } from '@application/dto/entrada-estoque.dto'
import type { IEventPublisher } from '@application/ports/event-publisher.port'
import { EVENT_PUBLISHER_TOKEN } from '@application/ports/event-publisher.port'
import type { ILockService } from '@application/ports/lock-service.port'
import { LOCK_SERVICE_TOKEN } from '@application/ports/lock-service.port'
import { Produto } from '@domain/entities/produto.entity'
import { NivelCriticoEstoqueEvent } from '@domain/events/nivel-critico-estoque.event'
import type { IProdutoRepository } from '@domain/repositories/produto.repository'
import { PRODUTO_REPO_TOKEN } from '@domain/repositories/produto.repository'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'

const LOCK_TTL_MS = 10_000

@Injectable()
export class EntradaEstoqueUseCase {

  private readonly logger = new Logger(EntradaEstoqueUseCase.name)

  constructor(
    @Inject(PRODUTO_REPO_TOKEN) private readonly produtoRepository: IProdutoRepository,
    @Inject(EVENT_PUBLISHER_TOKEN) private readonly eventPublisher: IEventPublisher,
    @Inject(LOCK_SERVICE_TOKEN) private readonly lockService: ILockService,
  ) { }

  async execute(input: EntradaEstoqueInput): Promise<EntradaEstoqueOutput> {
    const dto = entradaEstoqueSchema.parse(input)

    const produtoIds = dto.itens.map(item => item.produtoId)

    const lockKey = `estoque:entrada:${produtoIds.sort().join(',')}`
    await this.lockService.acquire(lockKey, LOCK_TTL_MS)

    try {
      return await this.processarEntrada(dto)
    } finally {
      await this.lockService.release(lockKey)
    }
  }

  private async processarEntrada(dto: EntradaEstoqueInput): Promise<EntradaEstoqueOutput> {
    const produtos = await this.produtoRepository.findByItens(dto.itens)

    const produtosEncontradosIds = new Set(produtos.map(p => p.id))
    const produtosFaltantesIds = dto.itens.filter(item => !produtosEncontradosIds.has(item.produtoId))

    const novosProdutos = produtosFaltantesIds.map(item => {
      const novoProduto = Produto.create({ id: item.produtoId })

      this.logger.log(`Criando novo produto com ID: ${item.produtoId}`)

      return novoProduto
    })

    const todosProdutos = [...produtos, ...novosProdutos]
    const produtoMap = new Map<number, Produto>(todosProdutos.map(produto => [produto.id, produto]))

    const produtosAlterados: Produto[] = []
    const eventosNivelCritico: NivelCriticoEstoqueEvent[] = []
    const produtosAtualizados: { produtoId: number; novaQuantidadeTotal: number }[] = []

    for (const item of dto.itens) {
      const produto = produtoMap.get(item.produtoId)!
      const quantidade = EstoqueProduto.create(item.quantidade)

      produto.adicionarEstoque(quantidade)
      produtosAlterados.push(produto)
      produtosAtualizados.push({
        produtoId: produto.id,
        novaQuantidadeTotal: produto.quantidadeTotal.quantidade,
      })

      if (produto.isNivelCritico()) {
        eventosNivelCritico.push(new NivelCriticoEstoqueEvent(produto.id, produto.quantidadeDisponivel.quantidade))
      }
    }

    await this.produtoRepository.saveMany(produtosAlterados)

    if (eventosNivelCritico.length > 0) {
      await this.eventPublisher.publishMany(eventosNivelCritico)
    }

    this.logger.log(`Entrada de estoque realizada para ${produtosAlterados.length} produto(s)`)

    return {
      produtosAtualizados,
    }
  }
}
