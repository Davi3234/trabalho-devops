import { Module } from '@nestjs/common'

import { EVENT_PUBLISHER_TOKEN } from '@application/ports/event-publisher.port'
import { RabbitMQPublisher } from '@infrastructure/ports/rabbitmq-publisher'

@Module({
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
