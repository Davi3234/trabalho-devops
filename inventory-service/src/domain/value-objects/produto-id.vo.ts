export class ProdutoId {

  private readonly _id: number

  get id() {
    return this._id
  }

  private constructor(produtoId: number) {
    this._id = produtoId
  }

  static create(produtoId?: number) {
    return new ProdutoId(produtoId ?? Date.now())
  }

  equals(other: ProdutoId) {
    return this._id === other._id
  }

  toString() {
    return this._id
  }
}
