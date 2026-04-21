import { Injectable, Logger } from '@nestjs/common'

import { ConfirmarBaixaUseCase } from '@application/use-cases/confirmar-baixa.use-case'

export interface PagamentoConfirmadoPayload {
  pedidoId: number
}

@Injectable()
export class PagamentoConfirmadoHandler {

  private readonly logger = new Logger(PagamentoConfirmadoHandler.name)

  constructor(
    private readonly confirmarBaixa: ConfirmarBaixaUseCase
  ) { }

  async handle(payload: PagamentoConfirmadoPayload) {
    this.logger.log(`Processando pagamento.confirmado para pedido ${payload.pedidoId}`)

    await this.confirmarBaixa.execute({ pedidoId: payload.pedidoId })
  }
}
