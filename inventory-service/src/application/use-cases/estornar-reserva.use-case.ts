import { Inject, Injectable, Logger } from '@nestjs/common'

import { EstornarReservaInput, estornarReservaSchema } from '@application/dto/estornar-reserva.use-case'
import type { IEventPublisher } from '@application/ports/event-publisher.port'
import { EVENT_PUBLISHER_TOKEN } from '@application/ports/event-publisher.port'
import { StatusReserva } from '@domain/enums/status-reserva.enum'
import { ReservaEstornadaEvent } from '@domain/events/reserva-estornada.event'
import type { IProdutoRepository } from '@domain/repositories/produto.repository'
import { PRODUTO_REPO_TOKEN } from '@domain/repositories/produto.repository'
import type { IReservaRepository } from '@domain/repositories/reserva.repository'
import { RESERVA_REPO_TOKEN } from '@domain/repositories/reserva.repository'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'
import { PedidoId } from '@domain/value-objects/pedido-id.vo'

@Injectable()
export class EstornarReservaUseCase {

  private readonly logger = new Logger(EstornarReservaUseCase.name)

  constructor(
    @Inject(PRODUTO_REPO_TOKEN) private readonly produtoRepo: IProdutoRepository,
    @Inject(RESERVA_REPO_TOKEN) private readonly reservaRepo: IReservaRepository,
    @Inject(EVENT_PUBLISHER_TOKEN) private readonly eventPublisher: IEventPublisher,
  ) { }

  async execute(input: EstornarReservaInput): Promise<void> {
    const { pedidoId: pedidoIdDTO } = estornarReservaSchema.parse(input)
    const pedidoId = PedidoId.create(pedidoIdDTO)

    const reserva = await this.reservaRepo.findByPedidoId(pedidoId)

    if (!reserva) {
      this.logger.warn(`Nenhuma reserva encontrada para pedido ${pedidoIdDTO}. Nada a estornar.`)
      return
    }

    if (reserva.status === StatusReserva.ESTORNADO || reserva.status === StatusReserva.EXPIRADO) {
      this.logger.warn(`Reserva do pedido ${pedidoIdDTO} já está ${reserva.status}. Ignorando.`)
      return
    }

    if (reserva.status === StatusReserva.CONFIRMADO) {
      this.logger.warn(`Reserva do pedido ${pedidoIdDTO} já foi confirmada. Estorno de estoque não aplicável.`)

      return
    }

    const produtoIds = reserva.itens.map(item => item.produtoId)
    const produtos = await this.produtoRepo.findByIds(produtoIds)
    const produtoMap = new Map(produtos.map(produto => [produto.id, produto]))

    for (const item of reserva.itens) {
      const produto = produtoMap.get(item.produtoId)

      if (!produto) {
        this.logger.error(`Produto ${item.produtoId} não encontrado durante estorno`)

        continue
      }

      produto.estornarReserva(EstoqueProduto.create(item.quantidade.quantidade))
    }

    reserva.estornar()

    await this.produtoRepo.saveMany(produtos)
    await this.reservaRepo.save(reserva)

    await this.eventPublisher.publish(
      new ReservaEstornadaEvent(
        pedidoId.id,
        reserva.itens.map(item => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade.quantidade,
        })),
      )
    )

    this.logger.log(`Reserva estornada para pedido ${pedidoIdDTO}`)
  }
}
