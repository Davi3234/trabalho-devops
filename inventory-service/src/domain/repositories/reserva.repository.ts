import { Reserva } from '@domain/entities/reserva.entity'
import { PedidoId } from '@domain/value-objects/pedido-id.vo'

export interface IReservaRepository {
  findByPedidoId(pedidoId: PedidoId): Promise<Reserva | null>
  findExpiradas(): Promise<Reserva[]>

  save(reserva: Reserva): Promise<void>
  isPedidoReservado(pedidoId: PedidoId): Promise<boolean>
}
