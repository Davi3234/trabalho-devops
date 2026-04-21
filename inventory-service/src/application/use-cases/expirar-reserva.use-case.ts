import { Inject, Injectable, Logger } from '@nestjs/common'

import type { IEventPublisher } from '@application/ports/event-publisher.port'
import { EVENT_PUBLISHER_TOKEN } from '@application/ports/event-publisher.port'
import { ReservaEstornadaEvent } from '@domain/events/reserva-estornada.event'
import type { IProdutoRepository } from '@domain/repositories/produto.repository'
import { PRODUTO_REPO_TOKEN } from '@domain/repositories/produto.repository'
import type { IReservaRepository } from '@domain/repositories/reserva.repository'
import { RESERVA_REPO_TOKEN } from '@domain/repositories/reserva.repository'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'

@Injectable()
export class ExpirarReservasUseCase {

  private readonly logger = new Logger(ExpirarReservasUseCase.name)

  constructor(
    @Inject(PRODUTO_REPO_TOKEN) private readonly produtoRepo: IProdutoRepository,
    @Inject(RESERVA_REPO_TOKEN) private readonly reservaRepo: IReservaRepository,
    @Inject(EVENT_PUBLISHER_TOKEN) private readonly eventPublisher: IEventPublisher,
  ) { }

  async execute(): Promise<{ expiradas: number }> {
    const reservasExpiradas = await this.reservaRepo.findExpiradas()

    if (reservasExpiradas.length === 0) {
      return { expiradas: 0 }
    }

    this.logger.log(`Expirando ${reservasExpiradas.length} reserva(s) vencida(s)`)

    let count = 0

    for (const reserva of reservasExpiradas) {
      try {
        const produtoIds = reserva.itens.map(item => item.produtoId)
        const produtos = await this.produtoRepo.findByIds(produtoIds)
        const produtoMap = new Map(produtos.map(produto => [produto.id, produto]))

        for (const item of reserva.itens) {
          const produto = produtoMap.get(item.produtoId)

          if (!produto) {
            this.logger.error(`Produto ${item.produtoId} não encontrado ao expirar reserva ${reserva.id}`)

            continue
          }

          produto.estornarReserva(EstoqueProduto.create(item.quantidade.quantidade))
        }

        reserva.expirar()

        await this.produtoRepo.saveMany(produtos)
        await this.reservaRepo.save(reserva)

        await this.eventPublisher.publish(
          new ReservaEstornadaEvent(
            reserva.pedidoId.id,
            reserva.itens.map(item => ({
              produtoId: item.produtoId,
              quantidade: item.quantidade.quantidade,
            }))
          )
        )

        count++

        this.logger.log(`Reserva ${reserva.id} (pedido ${reserva.pedidoId.id}) expirada`)
      } catch (err) {
        this.logger.error(`Erro ao expirar reserva ${reserva.id}: ${(err as Error).message}`)
      }
    }

    return { expiradas: count }
  }
}
