import { StatusReserva } from '@domain/enums/status-reserva.enum'
import { ReservaState } from '@domain/state/reserva-status/reserva-status'
import { BusinessException } from '@shared/exceptions/business.exception'

export class ExpiradoReservaState implements ReservaState {

  readonly status = StatusReserva.EXPIRADO

  confirmar() {
    throw new BusinessException('Reserva expirada não pode ser confirmada')
  }

  estornar() {
    throw new BusinessException('Reserva expirada não pode ser estornada diretamente')
  }

  expirar() {
    throw new BusinessException('Reserva já está expirada')
  }
}
