import { StatusReserva } from '@domain/enums/status-reserva.enum'
import { ReservaState } from '@domain/state/reserva-status/reserva-status'
import { BusinessException } from '@shared/exceptions/business.exception'

export class ConfirmadoReservaState implements ReservaState {

  readonly status = StatusReserva.CONFIRMADO

  confirmar() {
    throw new BusinessException('Reserva já está confirmada')
  }

  estornar() {
    throw new BusinessException('Reserva confirmada não pode ser estornada diretamente')
  }

  expirar() {
    throw new BusinessException('Reserva confirmada não pode ser expirada')
  }
}
