import { z } from 'zod'

export const entradaEstoqueSchema = z.object({
  itens: z.array(
    z.object({
      produtoId: z.number({ error: 'Id do Produto inválido' })
        .positive('Id do Produto inválido'),
      quantidade: z.number({ error: 'Quantidade inválida' })
        .int('Quantidade de itens precisa ser inteira')
        .positive('Quantidade inválida'),
    })
      .default({} as any),
  )
    .default([]),
})
  .default({} as any)

export type EntradaEstoqueInput = z.infer<typeof entradaEstoqueSchema>

export interface EntradaEstoqueOutput {
  produtosAtualizados: {
    produtoId: number
    novaQuantidadeTotal: number
  }[]
}
