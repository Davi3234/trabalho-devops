import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'

export interface ItemReservaProps {
  produtoId: number
  quantidade: EstoqueProduto
}

export class ItemReserva {

  private readonly props: ItemReservaProps

  get produtoId() { return this.props.produtoId }

  get quantidade() { return this.props.quantidade }

  private constructor(props: ItemReservaProps) {
    this.props = props
  }

  static create(props: { produtoId: number; quantidade: EstoqueProduto }) {
    if (props.quantidade.isEmpty()) {
      throw new Error('Quantidade do item de reserva deve ser maior que zero')
    }

    return new ItemReserva(props)
  }
}
