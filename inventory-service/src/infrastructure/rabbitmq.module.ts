import { RabbitMQModule as RabbitMQModuleConfig } from '@golevelup/nestjs-rabbitmq'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { EVENT_PUBLISHER_TOKEN } from '@application/ports/event-publisher.port'
import { RabbitMQPublisher } from '@infrastructure/ports/rabbitmq-publisher'
import { env } from '@shared/env'

@Module({
  imports: [
    RabbitMQModuleConfig.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: env('RABBITMQ_URL', 'amqp://localhost'),
        exchanges: [
          {
            name: 'inventory.events',
            type: 'topic',
          },
        ],
        connectionInitOptions: { wait: true, timeout: 20000 },
      }),
    }),
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
