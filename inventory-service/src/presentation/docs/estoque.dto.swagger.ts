import { ApiProperty } from '@nestjs/swagger'

export class ConsultarDisponibilidadeRequest {
  @ApiProperty({
    description: 'Lista de IDs dos produtos para consultar disponibilidade',
    type: [Number],
    example: [1, 2, 3],
    maxItems: 100,
  })
  produtoIds: number[]
}

export class EntradaEstoqueItemRequest {
  @ApiProperty({ description: 'ID do produto', example: 1, minimum: 1 })
  produtoId: number

  @ApiProperty({ description: 'Quantidade a adicionar ao estoque', example: 50, minimum: 1 })
  quantidade: number
}

export class EntradaEstoqueRequest {
  @ApiProperty({
    description: 'Lista de itens para entrada de estoque',
    type: [EntradaEstoqueItemRequest],
    minItems: 1,
    maxItems: 100,
  })
  itens: EntradaEstoqueItemRequest[]
}

export class DisponibilidadeItemResponse {
  @ApiProperty({ description: 'ID do produto', example: 1 })
  produtoId: number

  @ApiProperty({ description: 'Quantidade disponível para reserva', example: 45 })
  quantidadeDisponivel: number

  @ApiProperty({ description: 'Quantidade total em estoque', example: 100 })
  quantidadeTotal: number

  @ApiProperty({ description: 'Quantidade atualmente reservada', example: 55 })
  quantidadeReservada: number

  @ApiProperty({ description: 'Nível crítico atingido (abaixo de 5 unidades)', example: false })
  isNivelCritico: boolean
}

export class ConsultarDisponibilidadeResponse {
  @ApiProperty({ type: [DisponibilidadeItemResponse] })
  itens: DisponibilidadeItemResponse[]
}

export class EntradaProdutoAtualizadoResponse {
  @ApiProperty({ description: 'ID do produto atualizado', example: 1 })
  produtoId: number

  @ApiProperty({ description: 'Nova quantidade total após a entrada', example: 150 })
  novaQuantidadeTotal: number
}

export class EntradaEstoqueResponse {
  @ApiProperty({ type: [EntradaProdutoAtualizadoResponse] })
  produtosAtualizados: EntradaProdutoAtualizadoResponse[]
}

export class ReservarItemRequest {
  @ApiProperty({ description: 'ID do produto', example: 1, minimum: 1 })
  produtoId: number

  @ApiProperty({ description: 'Quantidade a reservar', example: 2, minimum: 1 })
  quantidade: number
}

export class ReservarItensRequest {
  @ApiProperty({ description: 'ID do pedido', example: 42, minimum: 1 })
  pedidoId: number

  @ApiProperty({
    description: 'Lista de itens a reservar',
    type: [ReservarItemRequest],
    minItems: 1,
  })
  itens: ReservarItemRequest[]
}

export class ReservarItensResponse {
  @ApiProperty({ description: 'ID do pedido', example: 42 })
  pedidoId: number

  @ApiProperty({ description: 'ID da reserva criada', example: 7 })
  reservaId: number

  @ApiProperty({ description: 'Data/hora de expiração da reserva', example: '2026-05-24T15:30:00.000Z' })
  expiradoEm: Date
}
