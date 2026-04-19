import { StatusReserva } from '@domain/enums/status-reserva.enum'
import { BusinessException } from '@shared/exceptions/business.exception'

export class ReservaStatusFabric {

  static create(status: StatusReserva) {
    throw new BusinessException(`Status de reserva inválido: ${status as string}`)
  }
}
