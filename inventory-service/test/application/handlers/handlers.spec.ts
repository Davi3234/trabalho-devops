import { describe, expect, it, vi } from 'vitest'

import { PagamentoConfirmadoHandler } from '@application/handlers/pagamento-confirmado.handler'
import { PedidoCanceladoHandler } from '@application/handlers/pedido-cancelado.handler'
import { PedidoCriadoHandler } from '@application/handlers/pedido-criado.handler'
import { ConfirmarBaixaUseCase } from '@application/use-cases/confirmar-baixa.use-case'
import { EstornarReservaUseCase } from '@application/use-cases/estornar-reserva.use-case'
import { ReservarItensUseCase } from '@application/use-cases/reservar-itens.use-case'

const PEDIDO_ID = 3
const PRODUTO_ID = 1

describe('PedidoCriadoHandler', () => {
  it('delega ao ReservarItensUseCase com o payload correto', async () => {
    const reservarItens = { execute: vi.fn().mockResolvedValue({}) } as unknown as ReservarItensUseCase
    const handler = new PedidoCriadoHandler(reservarItens)

    const payload = {
      pedidoId: PEDIDO_ID,
      itens: [{ produtoId: PRODUTO_ID, quantidade: 5 }],
    }

    await handler.handle(payload)

    expect(reservarItens.execute).toHaveBeenCalledWith(payload)
  })

  it('propaga erros do use case', async () => {
    const reservarItens = {
      execute: vi.fn().mockRejectedValue(new Error('Estoque insuficiente')),
    } as unknown as ReservarItensUseCase

    const handler = new PedidoCriadoHandler(reservarItens)

    await expect(
      handler.handle({ pedidoId: PEDIDO_ID, itens: [{ produtoId: PRODUTO_ID, quantidade: 1 }] })
    ).rejects.toThrow('Estoque insuficiente')
  })
})

describe('PedidoCanceladoHandler', () => {
  it('delega ao EstornarReservaUseCase com o pedidoId correto', async () => {
    const estornarReserva = { execute: vi.fn().mockResolvedValue(undefined) } as unknown as EstornarReservaUseCase
    const handler = new PedidoCanceladoHandler(estornarReserva)

    await handler.handle({ pedidoId: PEDIDO_ID })

    expect(estornarReserva.execute).toHaveBeenCalledWith({ pedidoId: PEDIDO_ID })
  })

  it('propaga erros do use case', async () => {
    const estornarReserva = {
      execute: vi.fn().mockRejectedValue(new Error('Falha no estorno')),
    } as unknown as EstornarReservaUseCase

    const handler = new PedidoCanceladoHandler(estornarReserva)

    await expect(handler.handle({ pedidoId: PEDIDO_ID })).rejects.toThrow('Falha no estorno')
  })
})

describe('PagamentoConfirmadoHandler', () => {
  it('delega ao ConfirmarBaixaUseCase com o pedidoId correto', async () => {
    const confirmarBaixa = { execute: vi.fn().mockResolvedValue(undefined) } as unknown as ConfirmarBaixaUseCase
    const handler = new PagamentoConfirmadoHandler(confirmarBaixa)

    await handler.handle({ pedidoId: PEDIDO_ID })

    expect(confirmarBaixa.execute).toHaveBeenCalledWith({ pedidoId: PEDIDO_ID })
  })

  it('propaga erros do use case', async () => {
    const confirmarBaixa = {
      execute: vi.fn().mockRejectedValue(new Error('Produto não encontrado')),
    } as unknown as ConfirmarBaixaUseCase

    const handler = new PagamentoConfirmadoHandler(confirmarBaixa)

    await expect(handler.handle({ pedidoId: PEDIDO_ID })).rejects.toThrow('Produto não encontrado')
  })
})
