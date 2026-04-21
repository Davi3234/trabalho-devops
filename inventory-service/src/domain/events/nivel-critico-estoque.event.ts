import { DomainEvent } from '@domain/events/domain-event'

export class NivelCriticoEstoqueEvent implements DomainEvent {

  readonly eventId: string
  readonly occurredAt: Date
  readonly eventName = 'estoque.nivel_critico'

  constructor(
    public readonly produtoId: number,
    public readonly quantidadeDisponivel: number,
    eventId?: string,
  ) {
    this.eventId = eventId ?? crypto.randomUUID()
    this.occurredAt = new Date()
  }
}
