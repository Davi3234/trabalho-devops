import { ItemReserva } from '@domain/entities/item-reserva.entity'
import { StatusReserva } from '@domain/enums/status-reserva.enum'
import { ReservaState } from '@domain/state/reserva-status/reserva-status'
import { ReservaStatusFabric } from '@domain/state/reserva-status/reserva-status-fabric'
import { PedidoId } from '@domain/value-objects/pedido-id.vo'
import { BusinessException } from '@shared/exceptions/business.exception'

export const RESERVA_TIMEOUT_MINUTOS = 15

export interface ReservaProps {
  id: number
  pedidoId: PedidoId
  itens: ItemReserva[]
  status: StatusReserva
  criadoEm: Date
  expiradoEm: Date
  atualizadoEm: Date
}

export class Reserva {

  private readonly props: ReservaProps
  private state: ReservaState

  get id() { return this.props.id }
  get pedidoId() { return this.props.pedidoId }
  get status() { return this.props.status }

  get itens() { return [...this.props.itens] }

  get criadoEm() { return this.props.criadoEm }
  get expiradoEm() { return this.props.expiradoEm }
  get atualizadoEm() { return this.props.atualizadoEm }

  private constructor(props: ReservaProps) {
    this.props = props
    this.state = ReservaStatusFabric.create(props.status)
  }

  static create(pedidoId: PedidoId, itens: ItemReserva[]) {
    if (!itens.length) {
      throw new BusinessException('Reserva deve ter ao menos um item')
    }

    const now = new Date()
    const expiradoEm = new Date(now.getTime() + RESERVA_TIMEOUT_MINUTOS * 60 * 1000)

    return new Reserva({
      id: null as any,
      pedidoId,
      itens,
      status: StatusReserva.PENDENTE,
      criadoEm: now,
      expiradoEm,
      atualizadoEm: now,
    })
  }

  static reconstitute(props: ReservaProps) {
    return new Reserva(props)
  }

  isAtiva() {
    return this.state.status === StatusReserva.PENDENTE
  }

  isExpirada() {
    return this.state.status === StatusReserva.PENDENTE && new Date() > this.props.expiradoEm
  }

  confirmar() {
    this.state.confirmar(this)
  }

  estornar() {
    this.state.estornar(this)
  }

  expirar() {
    this.state.expirar(this)
  }

  setStatus(status: StatusReserva) {
    this.props.status = status
    this.props.atualizadoEm = new Date()
    this.state = ReservaStatusFabric.create(status)
  }

  toJSON() {
    return { ...this.props }
  }
}
