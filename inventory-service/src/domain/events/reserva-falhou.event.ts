import { DomainEvent } from '@domain/events/domain-event'

export interface ItemFalhouData {
  produtoId: number
  quantidadeSolicitada: number
  quantidadeDisponivel: number
}

export class ReservaFalhouEvent implements DomainEvent {

  readonly eventId: string
  readonly occurredAt: Date
  readonly eventName = 'inventory.reserva.falhou'

  constructor(
    public readonly pedidoId: number,
    public readonly motivo: string,
    public readonly itensFaltantes: ItemFalhouData[],
    eventId?: string,
  ) {
    this.eventId = eventId ?? crypto.randomUUID()
    this.occurredAt = new Date()
  }
}
