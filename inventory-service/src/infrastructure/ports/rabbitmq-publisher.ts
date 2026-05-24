import { AmqpConnection } from '@golevelup/nestjs-rabbitmq'
import { Injectable, Logger } from '@nestjs/common'

import { IEventPublisher } from '@application/ports/event-publisher.port'
import { DomainEvent } from '@domain/events/domain-event'

@Injectable()
export class RabbitMQPublisher implements IEventPublisher {

  private readonly logger = new Logger(RabbitMQPublisher.name)

  constructor(
    private readonly client: AmqpConnection
  ) { }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event)
    }
  }

  async publish(event: DomainEvent): Promise<void> {
    await this.client.publish('inventory.events', event.eventName, event)

    this.logger.log(`Evento publicado: ${event.eventName} [${event.eventId}]`)
  }
}
