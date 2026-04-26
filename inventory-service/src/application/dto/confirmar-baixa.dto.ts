import z from 'zod'

export const confirmarBaixaSchema = z.object({
  pedidoId: z.number({ error: 'Id do Pedido é obrigatório' })
    .positive('Id do Pedido inválido'),
})
  .default({} as any)

export type ConfirmarBaixaInput = z.infer<typeof confirmarBaixaSchema>
