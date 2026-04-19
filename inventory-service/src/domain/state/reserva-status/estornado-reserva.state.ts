import { StatusReserva } from '@domain/enums/status-reserva.enum'
import { ReservaState } from '@domain/state/reserva-status/reserva-status'
import { BusinessException } from '@shared/exceptions/business.exception'

export class EstornadoReservaState implements ReservaState {

  readonly status = StatusReserva.ESTORNADO

  confirmar() {
    throw new BusinessException('Reserva já foi estornada')
  }

  estornar() {
    throw new BusinessException('Reserva já foi estornada')
  }

  expirar() {
    throw new BusinessException('Reserva estornada não pode ser expirada')
  }
}
