import { z } from 'zod'

export const reservarItensSchema = z.object({
  pedidoId: z.number({ error: 'Id do Pedido inválido' })
    .positive('Id do Pedido inválido'),
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
    .default([]),
})

export type ReservarItensInput = z.infer<typeof reservarItensSchema>

export interface ReservarItensOutput {
  pedidoId: number
  reservaId: number
  expiradoEm: Date
}
