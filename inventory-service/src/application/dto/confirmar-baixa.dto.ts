import z from 'zod'

export const confirmarBaixaSchema = z.object({
  pedidoId: z.number({ error: 'Id do Pedido inválido' })
    .positive('Id do Pedido inválido'),
})

export type ConfirmarBaixaInput = z.infer<typeof confirmarBaixaSchema>
