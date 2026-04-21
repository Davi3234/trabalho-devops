import { Controller, Logger } from '@nestjs/common'
import { EventPattern, Payload } from '@nestjs/microservices'

import type { PagamentoConfirmadoPayload } from '@application/handlers/pagamento-confirmado.handler'
import { PagamentoConfirmadoHandler } from '@application/handlers/pagamento-confirmado.handler'
import type { PedidoCanceladoPayload } from '@application/handlers/pedido-cancelado.handler'
import { PedidoCanceladoHandler } from '@application/handlers/pedido-cancelado.handler'
import type { PedidoCriadoPayload } from '@application/handlers/pedido-criado.handler'
import { PedidoCriadoHandler } from '@application/handlers/pedido-criado.handler'

@Controller()
export class RabbitMQConsumerController {

  private readonly logger = new Logger(RabbitMQConsumerController.name)

  constructor(
    private readonly pedidoCriadoHandler: PedidoCriadoHandler,
    private readonly pedidoCanceladoHandler: PedidoCanceladoHandler,
    private readonly pagamentoConfirmadoHandler: PagamentoConfirmadoHandler,
  ) { }

  @EventPattern('pedido.criado')
  async onPedidoCriado(@Payload() payload: PedidoCriadoPayload) {
    this.logger.log(`Recebido pedido.criado [pedido: ${payload.pedidoId}]`)
    await this.pedidoCriadoHandler.handle(payload)
  }

  @EventPattern('pedido.cancelado')
  async onPedidoCancelado(@Payload() payload: PedidoCanceladoPayload) {
    this.logger.log(`Recebido pedido.cancelado [pedido: ${payload.pedidoId}]`)
    await this.pedidoCanceladoHandler.handle(payload)
  }

  @EventPattern('pagamento.confirmado')
  async onPagamentoConfirmado(@Payload() payload: PagamentoConfirmadoPayload) {
    this.logger.log(`Recebido pagamento.confirmado [pedido: ${payload.pedidoId}]`)
    await this.pagamentoConfirmadoHandler.handle(payload)
  }
}
