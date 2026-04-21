import { z } from 'zod'

export const entradaEstoqueSchema = z.object({
  itens: z.array(
    z.object({
      produtoId: z.number({ error: 'Id do Produto inválido' })
        .positive('Id do Produto inválido'),
      quantidade: z.number({ error: 'Quantidade inválida' })
        .int('Quantidade de itens precisa ser inteira')
        .positive('Quantidade deve ser maior que zero'),
    })
      .default({} as any),
  )
    .min(1, 'Deve haver pelo menos um item')
    .max(100, 'Deve haver no máximo 100 itens')
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
