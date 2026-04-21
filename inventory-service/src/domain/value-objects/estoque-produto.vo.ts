import { BusinessException } from '@shared/exceptions/business.exception'

export class EstoqueProduto {

  private readonly _quantidade: number

  get quantidade() {
    return this._quantidade
  }

  private constructor(quantidade: number) {
    this._quantidade = quantidade
  }

  static create(quantidade: number) {
    if (!Number.isInteger(quantidade)) {
      throw new BusinessException('Quantidade deve ser um número inteiro')
    }

    if (quantidade < 0) {
      throw new BusinessException('Quantidade não pode ser negativa')
    }

    return new EstoqueProduto(quantidade)
  }

  static zero() {
    return new EstoqueProduto(0)
  }

  add(other: EstoqueProduto) {
    return new EstoqueProduto(this._quantidade + other._quantidade)
  }

  subtract(other: EstoqueProduto) {
    const result = this._quantidade - other._quantidade

    if (result < 0) {
      throw new BusinessException(`Operação resultaria em quantidade negativa: ${this._quantidade} - ${other._quantidade}`)
    }

    return new EstoqueProduto(result)
  }

  isGreaterThanOrEqualTo(other: EstoqueProduto) {
    return this._quantidade >= other._quantidade
  }

  isLessThan(other: EstoqueProduto) {
    return this._quantidade < other._quantidade
  }

  isEmpty() {
    return this._quantidade == 0
  }

  equals(other: EstoqueProduto) {
    return this._quantidade == other._quantidade
  }

  toString() {
    return String(this._quantidade)
  }
}
