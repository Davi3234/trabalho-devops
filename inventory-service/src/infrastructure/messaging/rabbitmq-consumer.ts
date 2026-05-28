import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq'
import { Injectable, Logger } from '@nestjs/common'

import { PagamentoConfirmadoHandler } from '@application/handlers/pagamento-confirmado.handler'
import { PedidoCanceladoHandler } from '@application/handlers/pedido-cancelado.handler'
import { PedidoCriadoHandler } from '@application/handlers/pedido-criado.handler'
import { MetricsService } from '@infrastructure/metrics/metrics.service'

type PedidoIdentifierPayload = {
  orderId: number
}

type PedidoPayload = PedidoIdentifierPayload & {
  items: { productId: number, quantity: number }[]
}

const EVENT_PEDIDO_CRIADO = 'order.pedido.criado'
const EVENT_PEDIDO_CANCELADO = 'order.pedido.cancelado'
const EVENT_PEDIDO_PAGO = 'order.pedido.pago'

@Injectable()
export class RabbitMQConsumer {

  private readonly logger = new Logger(RabbitMQConsumer.name)

  constructor(
    private readonly pedidoCriadoHandler: PedidoCriadoHandler,
    private readonly pedidoCanceladoHandler: PedidoCanceladoHandler,
    private readonly pagamentoConfirmadoHandler: PagamentoConfirmadoHandler,
    private readonly metricsService: MetricsService,
  ) { }

  @RabbitSubscribe({
    exchange: 'order.events',
    routingKey: 'order.pedido.criado',
    queue: 'inventory.pedido.criado',
    queueOptions: {
      durable: true,
    },
  })
  async onPedidoCriado(payload: PedidoPayload) {
    const start = Date.now()

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

      this.metricsService.recordMessagingEvent(EVENT_PEDIDO_CRIADO, 'success', Date.now() - start)
      this.metricsService.recordReservation('success')
    } catch (error: any) {
      this.logger.error(`Erro ao processar pedido.criado [pedido: ${payload.orderId}]`, error instanceof Error ? error.stack : String(error))

      this.metricsService.recordMessagingEvent(EVENT_PEDIDO_CRIADO, 'error', Date.now() - start)
      this.metricsService.recordReservation('error')
    }
  }

  @RabbitSubscribe({
    exchange: 'order.events',
    routingKey: 'order.pedido.cancelado',
    queue: 'inventory.pedido.cancelado',
    queueOptions: {
      durable: true,
    },
  })
  async onPedidoCancelado({ orderId }: PedidoIdentifierPayload) {
    const start = Date.now()

    try {
      this.logger.log(`Recebido pedido.cancelado [pedido: ${orderId}]`)
      await this.pedidoCanceladoHandler.handle({ pedidoId: orderId })

      this.metricsService.recordMessagingEvent(EVENT_PEDIDO_CANCELADO, 'success', Date.now() - start)
      this.metricsService.recordReversal('success')
    } catch (error: any) {
      this.logger.error(`Erro ao processar pedido.cancelado [pedido: ${orderId}]`, error instanceof Error ? error.stack : String(error))

      this.metricsService.recordMessagingEvent(EVENT_PEDIDO_CANCELADO, 'error', Date.now() - start)
      this.metricsService.recordReversal('error')
    }
  }

  @RabbitSubscribe({
    exchange: 'order.events',
    routingKey: 'order.pedido.pago',
    queue: 'inventory.pedido.pago',
    queueOptions: {
      durable: true,
    },
  })
  async onPagamentoConfirmado({ orderId }: PedidoIdentifierPayload) {
    const start = Date.now()

    try {
      this.logger.log(`Recebido pedido.pago [pedido: ${orderId}]`)
      await this.pagamentoConfirmadoHandler.handle({ pedidoId: orderId })

      this.metricsService.recordMessagingEvent(EVENT_PEDIDO_PAGO, 'success', Date.now() - start)
      this.metricsService.recordConfirmation('success')
    } catch (error: any) {
      this.logger.error(`Erro ao processar pedido.pago [pedido: ${orderId}]`, error instanceof Error ? error.stack : String(error))

      this.metricsService.recordMessagingEvent(EVENT_PEDIDO_PAGO, 'error', Date.now() - start)
      this.metricsService.recordConfirmation('error')
    }
  }
}
