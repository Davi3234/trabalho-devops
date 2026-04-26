import z from 'zod'

export const estornarReservaSchema = z.object({
  pedidoId: z.number({ error: 'Id do Pedido é obrigatório' })
    .positive('Id do Pedido Inválido')
})
  .default({} as any)

export type EstornarReservaInput = z.infer<typeof estornarReservaSchema>
