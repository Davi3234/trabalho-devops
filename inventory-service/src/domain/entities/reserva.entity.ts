import { randomUUID } from 'node:crypto'

import { ItemReserva } from '@domain/entities/item-reserva.entity'
import { StatusReserva } from '@domain/enums/status-reserva.enum'
import { PedidoId } from '@domain/value-objects/pedido-id.vo'
import { BusinessException } from '@shared/exceptions/business.exception'

export const RESERVA_TIMEOUT_MINUTOS = 15

export interface ReservaProps {
  id: string
  pedidoId: PedidoId
  itens: ItemReserva[]
  status: StatusReserva
  criadoEm: Date
  expiradoEm: Date
  atualizadoEm: Date
}

export class Reserva {

  private readonly props: ReservaProps

  get id() { return this.props.id }
  get pedidoId() { return this.props.pedidoId }
  get status() { return this.props.status }

  get itens() { return [...this.props.itens] }

  get criadoEm() { return this.props.criadoEm }
  get expiradoEm() { return this.props.expiradoEm }
  get atualizadoEm() { return this.props.atualizadoEm }

  private constructor(props: ReservaProps) {
    this.props = props
  }

  static criar(pedidoId: PedidoId, itens: ItemReserva[]) {
    if (!itens.length) {
      throw new BusinessException('Reserva deve ter ao menos um item')
    }

    const now = new Date()
    const expiradoEm = new Date(now.getTime() + RESERVA_TIMEOUT_MINUTOS * 60 * 1000)

    return new Reserva({
      id: randomUUID(),
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
    return this.props.status === StatusReserva.PENDENTE
  }

  isExpirada() {
    return this.props.status === StatusReserva.PENDENTE && new Date() > this.props.expiradoEm
  }

  confirmar() {
    if (this.props.status !== StatusReserva.PENDENTE) {
      throw new Error(`Reserva não pode ser confirmada no status '${this.props.status}'`)
    }

    this.props.status = StatusReserva.CONFIRMADO
    this.props.atualizadoEm = new Date()
  }

  estornar() {
    if (this.props.status === StatusReserva.ESTORNADO) {
      throw new Error('Reserva já foi estornada')
    }

    if (this.props.status === StatusReserva.CONFIRMADO) {
      throw new Error('Reserva confirmada não pode ser estornada diretamente')
    }

    this.props.status = StatusReserva.ESTORNADO
    this.props.atualizadoEm = new Date()
  }

  expirar() {
    if (this.props.status !== StatusReserva.PENDENTE) {
      throw new Error(`Reserva não pode ser expirada no status '${this.props.status}'`)
    }

    this.props.status = StatusReserva.EXPIRADO
    this.props.atualizadoEm = new Date()
  }
}
