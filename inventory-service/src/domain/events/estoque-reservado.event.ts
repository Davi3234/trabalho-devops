import { DomainEvent } from '@domain/events/domain-event'

export interface ItemReservadoData {
  produtoId: number
  quantidade: number
}

export class EstoqueReservadoEvent implements DomainEvent {

  readonly eventId: string
  readonly occurredAt: Date
  readonly eventName = 'estoque.reservado'

  constructor(
    public readonly pedidoId: number,
    public readonly itens: ItemReservadoData[],
    eventId?: string,
  ) {
    this.eventId = eventId ?? crypto.randomUUID()
    this.occurredAt = new Date()
  }
}
