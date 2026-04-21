import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'
import { BusinessException } from '@shared/exceptions/business.exception'

export const NIVEL_CRITICO_THRESHOLD = 5

export interface ProdutoProps {
  id: number
  quantidadeTotal: EstoqueProduto
  quantidadeReservada: EstoqueProduto
  version: number
  criadoEm: Date
  atualizadoEm: Date
}

export interface ProdutoCreateArgs {
  id: number
  quantidadeTotal?: EstoqueProduto
  version?: number
}

export class Produto {

  private readonly props: ProdutoProps

  get id() { return this.props.id }

  get quantidadeTotal() { return this.props.quantidadeTotal }
  get quantidadeReservada() { return this.props.quantidadeReservada }
  get quantidadeDisponivel() { return this.props.quantidadeTotal.subtract(this.props.quantidadeReservada) }

  get criadoEm() { return this.props.criadoEm }
  get atualizadoEm() { return this.props.atualizadoEm }

  get version() { return this.props.version }

  private constructor(props: ProdutoProps) {
    this.props = props
  }

  static create(args: ProdutoCreateArgs) {
    return new Produto({
      id: args.id,
      quantidadeTotal: args.quantidadeTotal ?? EstoqueProduto.zero(),
      quantidadeReservada: EstoqueProduto.zero(),
      version: args.version ?? 0,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    })
  }

  static reconstitute(props: ProdutoProps) {
    return new Produto(props)
  }

  hasDisponivel(quantidade: EstoqueProduto) {
    return this.quantidadeDisponivel.isGreaterThanOrEqualTo(quantidade)
  }

  isNivelCritico() {
    return this.quantidadeDisponivel.quantidade < NIVEL_CRITICO_THRESHOLD
  }

  reservar(quantidade: EstoqueProduto) {
    if (!this.hasDisponivel(quantidade)) {
      throw new BusinessException(
        `Estoque insuficiente para produto ${this.props.id}. ` +
        `Disponível: ${this.quantidadeDisponivel.quantidade}, solicitado: ${quantidade.quantidade}`,
      )
    }

    this.props.quantidadeReservada = this.props.quantidadeReservada.add(quantidade)
    this.props.atualizadoEm = new Date()
  }

  confirmarBaixa(quantidade: EstoqueProduto) {
    this.props.quantidadeReservada = this.props.quantidadeReservada.subtract(quantidade)
    this.props.quantidadeTotal = this.props.quantidadeTotal.subtract(quantidade)
    this.props.atualizadoEm = new Date()
  }

  estornarReserva(quantidade: EstoqueProduto) {
    this.props.quantidadeReservada = this.props.quantidadeReservada.subtract(quantidade)
    this.props.atualizadoEm = new Date()
  }
}
