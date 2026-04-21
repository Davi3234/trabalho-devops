import { Injectable, Logger } from '@nestjs/common';

import { ReservarItensUseCase } from '@application/use-cases/reservar-itens.use-case';

export interface PedidoCriadoPayload {
  pedidoId: number
  itens: { produtoId: number; quantidade: number }[]
}

@Injectable()
export class PedidoCriadoHandler {

  private readonly logger = new Logger(PedidoCriadoHandler.name)

  constructor(
    private readonly reservarItens: ReservarItensUseCase
  ) { }

  async handle(payload: PedidoCriadoPayload) {
    this.logger.log(`Processando pedido.criado para pedido ${payload.pedidoId}`)

    await this.reservarItens.execute(payload)
  }
}
