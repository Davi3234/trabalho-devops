import { Inject, Injectable } from '@nestjs/common'

import { ConfirmarBaixaInput, confirmarBaixaSchema } from '@application/dto/confirmar-baixa.dto'
import type { IEventPublisher } from '@application/ports/event-publisher.port'
import { EVENT_PUBLISHER_TOKEN } from '@application/ports/event-publisher.port'
import { PRODUTO_REPO_TOKEN, RESERVA_REPO_TOKEN } from '@application/use-cases/reservar-itens.use-case'
import { NivelCriticoEstoqueEvent } from '@domain/events/nivel-critico-estoque.event'
import type { IProdutoRepository } from '@domain/repositories/produto.repository'
import type { IReservaRepository } from '@domain/repositories/reserva.repository'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'
import { PedidoId } from '@domain/value-objects/pedido-id.vo'
import { BusinessException } from '@shared/exceptions/business.exception'

@Injectable()
export class ConfirmarBaixaUseCase {

  constructor(
    @Inject(PRODUTO_REPO_TOKEN) private readonly produtoRepo: IProdutoRepository,
    @Inject(RESERVA_REPO_TOKEN) private readonly reservaRepo: IReservaRepository,
    @Inject(EVENT_PUBLISHER_TOKEN) private readonly eventPublisher: IEventPublisher,
  ) { }

  async execute(input: ConfirmarBaixaInput) {
    const { pedidoId: pedidoIdDTO } = confirmarBaixaSchema.parse(input)
    const pedidoId = PedidoId.create(pedidoIdDTO)

    const reserva = await this.reservaRepo.findByPedidoId(pedidoId)

    if (!reserva) {
      return
    }

    const produtoIds = reserva.itens.map(item => item.produtoId)
    const produtos = await this.produtoRepo.findByIds(produtoIds)
    const produtoMap = new Map(produtos.map(produto => [produto.id, produto]))

    const eventosNivelCritico: NivelCriticoEstoqueEvent[] = []

    for (const item of reserva.itens) {
      const produto = produtoMap.get(item.produtoId)

      if (!produto) {
        throw new BusinessException(`Produto ${item.produtoId} não encontrado ao confirmar baixa`)
      }

      produto.confirmarBaixa(EstoqueProduto.create(item.quantidade.quantidade))

      if (produto.isNivelCritico()) {
        eventosNivelCritico.push(new NivelCriticoEstoqueEvent(produto.id, produto.quantidadeDisponivel.quantidade))
      }
    }

    reserva.confirmar()

    await this.produtoRepo.saveMany(produtos)
    await this.reservaRepo.save(reserva)

    if (eventosNivelCritico.length > 0) {
      await this.eventPublisher.publishMany(eventosNivelCritico)
    }
  }
}
