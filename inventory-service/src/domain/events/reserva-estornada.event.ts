import { DomainEvent } from '@domain/events/domain-event'
import { ItemReservadoData } from '@domain/events/estoque-reservado.event'

export class ReservaEstornadaEvent implements DomainEvent {

  readonly eventId: string
  readonly occurredAt: Date
  readonly eventName = 'inventory.estoque.estornado'

  constructor(
    public readonly pedidoId: number,
    public readonly itens: ItemReservadoData[],
    eventId?: string,
  ) {
    this.eventId = eventId ?? crypto.randomUUID()
    this.occurredAt = new Date()
  }
}
