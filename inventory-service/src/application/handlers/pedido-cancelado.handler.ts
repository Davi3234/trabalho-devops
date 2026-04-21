import { Injectable, Logger } from '@nestjs/common'

import { EstornarReservaUseCase } from '@application/use-cases/estornar-reserva.use-case'

export interface PedidoCanceladoPayload {
  pedidoId: number
}

@Injectable()
export class PedidoCanceladoHandler {

  private readonly logger = new Logger(PedidoCanceladoHandler.name)

  constructor(
    private readonly estornarReserva: EstornarReservaUseCase
  ) { }

  async handle(payload: PedidoCanceladoPayload) {
    this.logger.log(`Processando pedido.cancelado para pedido ${payload.pedidoId}`)

    await this.estornarReserva.execute({ pedidoId: payload.pedidoId })
  }
}
