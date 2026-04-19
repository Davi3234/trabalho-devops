import { StatusReserva } from '@domain/enums/status-reserva.enum'
import { ConfirmadoReservaState } from '@domain/state/reserva-status/confirmado-reserva.state'
import { EstornadoReservaState } from '@domain/state/reserva-status/estornado-reserva.state'
import { ExpiradoReservaState } from '@domain/state/reserva-status/expirado-reserva.state'
import { PendenteReservaState } from '@domain/state/reserva-status/pendente-reserva.state'
import { BusinessException } from '@shared/exceptions/business.exception'

export class ReservaStatusFabric {

  static create(status: StatusReserva) {
    switch (status) {
      case StatusReserva.PENDENTE:
        return new PendenteReservaState()
      case StatusReserva.CONFIRMADO:
        return new ConfirmadoReservaState()
      case StatusReserva.ESTORNADO:
        return new EstornadoReservaState()
      case StatusReserva.EXPIRADO:
        return new ExpiradoReservaState()
      default:
        throw new BusinessException(`Status de reserva inválido: ${status as string}`)
    }
  }
}
