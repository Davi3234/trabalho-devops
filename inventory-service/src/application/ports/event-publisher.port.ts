import { DomainEvent } from '@domain/events/domain-event'

export const EVENT_PUBLISHER_TOKEN = 'IEventPublisher'

export interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>
  publishMany(events: DomainEvent[]): Promise<void>
}
