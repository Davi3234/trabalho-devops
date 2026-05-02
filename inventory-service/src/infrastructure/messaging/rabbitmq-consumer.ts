import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq'
import { Injectable, Logger } from '@nestjs/common'

import { PagamentoConfirmadoHandler } from '@application/handlers/pagamento-confirmado.handler'
import { PedidoCanceladoHandler } from '@application/handlers/pedido-cancelado.handler'
import { PedidoCriadoHandler } from '@application/handlers/pedido-criado.handler'

type PedidoIdentifierPayload = {
  orderId: number
}

type PedidoPayload = PedidoIdentifierPayload & {
  items: { productId: number, quantity: number }[]
}

@Injectable()
export class RabbitMQConsumer {

  private readonly logger = new Logger(RabbitMQConsumer.name)

  constructor(
    private readonly pedidoCriadoHandler: PedidoCriadoHandler,
    private readonly pedidoCanceladoHandler: PedidoCanceladoHandler,
    private readonly pagamentoConfirmadoHandler: PagamentoConfirmadoHandler,
  ) { }

  @RabbitSubscribe({
    exchange: 'order.events',
    routingKey: 'order.pedido.criado',
    queue: 'pedido.criado',
    queueOptions: {
      durable: true,
    },
  })
  async onPedidoCriado(payload: PedidoPayload) {
    try {
      const parsed = {
        pedidoId: payload.orderId,
        itens: payload.items.map(({ productId, quantity }) => ({
          produtoId: productId,
          quantidade: quantity
        })),
      }

      this.logger.log(`Recebido pedido.criado [pedido: ${parsed.pedidoId}]`)
      await this.pedidoCriadoHandler.handle(parsed)
    } catch (error: any) { }
  }

  @RabbitSubscribe({
    exchange: 'order.events',
    routingKey: 'order.pedido.cancelado',
    queue: 'pedido.cancelado',
    queueOptions: {
      durable: true,
    },
  })
  async onPedidoCancelado({ orderId }: PedidoIdentifierPayload) {
    try {
      this.logger.log(`Recebido pedido.cancelado [pedido: ${orderId}]`)
      await this.pedidoCanceladoHandler.handle({ pedidoId: orderId })
    } catch (error: any) { }
  }

  @RabbitSubscribe({
    exchange: 'order.events',
    routingKey: 'order.pedido.pago',
    queue: 'pedido.pago',
    queueOptions: {
      durable: true,
    },
  })
  async onPagamentoConfirmado({ orderId }: PedidoIdentifierPayload) {
    try {
      this.logger.log(`Recebido pedido.pago [pedido: ${orderId}]`)
      await this.pagamentoConfirmadoHandler.handle({ pedidoId: orderId })
    } catch (error: any) { }
  }
}
