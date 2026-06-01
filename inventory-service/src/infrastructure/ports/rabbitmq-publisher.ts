import { Injectable, Logger } from '@nestjs/common'

import { IEventPublisher } from '@application/ports/event-publisher.port'
import { DomainEvent } from '@domain/events/domain-event'

@Injectable()
export class RabbitMQPublisher implements IEventPublisher {

  private readonly logger = new Logger(RabbitMQPublisher.name)

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event)
    }
  }

  async publish(event: DomainEvent): Promise<void> {
    this.logger.log(`Evento publicado: ${event.eventName} [${event.eventId}]`)
    return new Promise(resolve => resolve())
  }
}
