import { Inject, Injectable, Logger } from '@nestjs/common'

import { ConfirmarBaixaInput, confirmarBaixaSchema } from '@application/dto/confirmar-baixa.dto'
import type { IEventPublisher } from '@application/ports/event-publisher.port'
import { EVENT_PUBLISHER_TOKEN } from '@application/ports/event-publisher.port'
import { StatusReserva } from '@domain/enums/status-reserva.enum'
import { NivelCriticoEstoqueEvent } from '@domain/events/nivel-critico-estoque.event'
import type { IProdutoRepository } from '@domain/repositories/produto.repository'
import { PRODUTO_REPO_TOKEN } from '@domain/repositories/produto.repository'
import type { IReservaRepository } from '@domain/repositories/reserva.repository'
import { RESERVA_REPO_TOKEN } from '@domain/repositories/reserva.repository'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'
import { PedidoId } from '@domain/value-objects/pedido-id.vo'
import { BusinessException } from '@shared/exceptions/business.exception'

@Injectable()
export class ConfirmarBaixaUseCase {

  private readonly logger = new Logger(ConfirmarBaixaUseCase.name)

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
      this.logger.warn(`Nenhuma reserva encontrada para pedido ${pedidoIdDTO}. Ignorando.`)

      return
    }

    if (reserva.status === StatusReserva.CONFIRMADO) {
      this.logger.warn(`Reserva do pedido ${pedidoIdDTO} já confirmada. Ignorando duplicata.`)

      return
    }

    if (reserva.status !== StatusReserva.PENDENTE) {
      throw new BusinessException(`Reserva do pedido ${pedidoIdDTO} está no status '${reserva.status}' e não pode ser confirmada`)
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

    this.logger.log(`Baixa definitiva confirmada para pedido ${pedidoIdDTO}`)
  }
}
