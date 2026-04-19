import { Reserva } from '@domain/entities/reserva.entity'
import { StatusReserva } from '@domain/enums/status-reserva.enum'

export interface ReservaState {
  readonly status: StatusReserva

  confirmar(reserva: Reserva): void
  estornar(reserva: Reserva): void
  expirar(reserva: Reserva): void
}
