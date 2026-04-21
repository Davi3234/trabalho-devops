import z from 'zod'

export const consultarDisponibilidadeSchema = z.object({
  produtoIds: z.array(
    z.number({ error: 'Id do Pedido Inválido' })
      .positive('Id do Pedido Inválido')
  )
    .max(100, 'Deve haver no máximo 100 itens')
    .default([]),
})
  .default({} as any)

export type ConsultarDisponibilidadeInput = z.infer<typeof consultarDisponibilidadeSchema>

export interface DisponibilidadeItem {
  produtoId: number
  quantidadeDisponivel: number
  quantidadeTotal: number
  quantidadeReservada: number
  isNivelCritico: boolean
}

export interface ConsultarDisponibilidadeOutput {
  itens: DisponibilidadeItem[]
}
