import { Module } from '@nestjs/common'
import { ClientsModule, Transport } from '@nestjs/microservices'

import { EVENT_PUBLISHER_TOKEN } from '@application/ports/event-publisher.port'
import { RabbitMQPublisher } from '@infrastructure/ports/rabbitmq-publisher'
import { RABBITMQ_CLIENT_TOKEN } from '@infrastructure/rabbitmq.token'
import { env } from '@shared/env'

@Module({
  imports: [
    ClientsModule.register([
      {
        name: RABBITMQ_CLIENT_TOKEN,
        transport: Transport.RMQ,
        options: {
          urls: [env('RABBITMQ_URL', 'amqp://localhost')],
          queue: 'estoque_publisher',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  providers: [
    RabbitMQPublisher,
    {
      provide: EVENT_PUBLISHER_TOKEN,
      useClass: RabbitMQPublisher
    },
  ],
  exports: [RabbitMQPublisher, EVENT_PUBLISHER_TOKEN],
})
export class RabbitMQModule { }
