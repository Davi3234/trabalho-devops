import z from 'zod'

export const consultarDisponibilidadeSchema = z.object({
  produtoIds: z.array(
    z.number({ error: 'Id do Pedido Inválido' })
      .positive('Id do Pedido Inválido')
  )
    .min(1)
    .max(100),
})

export type ConsultarDisponibilidadeInput = z.infer<typeof consultarDisponibilidadeSchema>

export interface DisponibilidadeItem {
  produtoId: number
  quantidadeDisponivel: number
  quantidadeTotal: number
  quantidadeReservada: number
  emNivelCritico: boolean
}

export interface ConsultarDisponibilidadeOutput {
  itens: DisponibilidadeItem[]
}
