import { Reserva } from '@domain/entities/reserva.entity'
import { StatusReserva } from '@domain/enums/status-reserva.enum'
import { ReservaState } from '@domain/state/reserva-status/reserva-status'

export class PendenteReservaState implements ReservaState {

  readonly status = StatusReserva.PENDENTE

  confirmar(reserva: Reserva) {
    reserva.setStatus(StatusReserva.CONFIRMADO)
  }

  estornar(reserva: Reserva) {
    reserva.setStatus(StatusReserva.ESTORNADO)
  }

  expirar(reserva: Reserva) {
    reserva.setStatus(StatusReserva.EXPIRADO)
  }
}
