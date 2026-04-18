export class PedidoId {

  private readonly _id: number

  get id() {
    return this._id
  }

  private constructor(pedidoId: number) {
    this._id = pedidoId
  }

  static create(pedidoId: number) {
    return new PedidoId(pedidoId)
  }

  equals(other: PedidoId) {
    return this._id === other._id
  }

  toString() {
    return this._id
  }
}
