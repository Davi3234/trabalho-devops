import { randomUUID } from 'node:crypto'

import { BusinessException } from '@shared/exceptions/business.exception'

export class PedidoId {

  private readonly _id: string

  get id() {
    return this._id
  }

  private constructor(pedidoId: string) {
    this._id = pedidoId
  }

  static create(pedidoId?: string) {
    const id = pedidoId ?? randomUUID()

    if (!id || id.trim().length === 0) {
      throw new BusinessException('Id do Pedido não pode ser vazio')
    }

    return new PedidoId(id)
  }

  equals(other: PedidoId) {
    return this._id === other._id
  }

  toString() {
    return this._id
  }
}
