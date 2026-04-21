import { Module } from '@nestjs/common'
import { ClientsModule, Transport } from '@nestjs/microservices'

import { RABBITMQ_CLIENT_TOKEN } from '@infrastructure/ports/rabbitmq-publisher'
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
})
export class RabbitMQModule { }
