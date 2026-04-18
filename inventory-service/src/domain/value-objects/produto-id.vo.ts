import { randomUUID } from 'node:crypto'

import { BusinessException } from '@shared/exceptions/business.exception'

export class ProdutoId {

  private readonly _id: string

  get id() {
    return this._id
  }

  private constructor(produtoId: string) {
    this._id = produtoId
  }

  static create(produtoId?: string) {
    const id = produtoId ?? randomUUID()

    if (!id || id.trim().length === 0) {
      throw new BusinessException('Id do Produto não pode ser vazio')
    }

    return new ProdutoId(id)
  }

  equals(other: ProdutoId) {
    return this._id === other._id
  }

  toString() {
    return this._id
  }
}
