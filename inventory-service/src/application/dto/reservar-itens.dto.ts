import { z } from 'zod'

export const reservarItensSchema = z.object({
  pedidoId: z.number({ error: 'Id do Pedido é obrigatório' })
    .positive('Id do Pedido inválido'),
  itens: z.array(
    z.object({
      produtoId: z.number({ error: 'Id do Produto é obrigatório' })
        .positive('Id do Produto inválido'),
      quantidade: z.number({ error: 'Quantidade é obrigatório' })
        .int('Quantidade de itens precisa ser inteira')
        .positive('Quantidade deve ser maior que zero'),
    })
      .default({} as any),
    { error: 'Itens é obrigatório' }
  )
    .min(1, 'Deve haver pelo menos um item'),
})

export type ReservarItensInput = z.infer<typeof reservarItensSchema>

export interface ReservarItensOutput {
  pedidoId: number
  reservaId: number
  expiradoEm: Date
}
