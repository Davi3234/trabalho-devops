import { Inject, Injectable, Logger } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { lastValueFrom } from 'rxjs'

import { IEventPublisher } from '@application/ports/event-publisher.port'
import { DomainEvent } from '@domain/events/domain-event'

export const RABBITMQ_CLIENT_TOKEN = 'RABBITMQ_CLIENT'

@Injectable()
export class RabbitMQPublisher implements IEventPublisher {

  private readonly logger = new Logger(RabbitMQPublisher.name)

  constructor(
    @Inject(RABBITMQ_CLIENT_TOKEN) private readonly client: ClientProxy
  ) { }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event)
    }
  }

  async publish(event: DomainEvent): Promise<void> {
    await lastValueFrom(this.client.emit(event.eventName, event))

    this.logger.debug(`Evento publicado: ${event.eventName} [${event.eventId}]`)
  }
}
