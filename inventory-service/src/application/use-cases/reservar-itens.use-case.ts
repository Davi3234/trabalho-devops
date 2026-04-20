import { Inject, Injectable } from '@nestjs/common'

import {
  ReservarItensInput,
  ReservarItensOutput,
  reservarItensSchema,
} from '@application/dto/reservar-itens.dto'
import type { IEventPublisher } from '@application/ports/event-publisher.port'
import { EVENT_PUBLISHER_TOKEN } from '@application/ports/event-publisher.port'
import { ItemReserva } from '@domain/entities/item-reserva.entity'
import { Produto } from '@domain/entities/produto.entity'
import { Reserva } from '@domain/entities/reserva.entity'
import { EstoqueReservadoEvent } from '@domain/events/estoque-reservado.event'
import { NivelCriticoEstoqueEvent } from '@domain/events/nivel-critico-estoque.event'
import { ItemFalhouData, ReservaFalhouEvent } from '@domain/events/reserva-falhou.event'
import type { IProdutoRepository } from '@domain/repositories/produto.repository'
import type { IReservaRepository } from '@domain/repositories/reserva.repository'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'
import { PedidoId } from '@domain/value-objects/pedido-id.vo'
import { BusinessException } from '@shared/exceptions/business.exception'

export const PRODUTO_REPO_TOKEN = 'IProdutoRepository'
export const RESERVA_REPO_TOKEN = 'IReservaRepository'

@Injectable()
export class ReservarItensUseCase {

  constructor(
    @Inject(PRODUTO_REPO_TOKEN) private readonly produtoRepository: IProdutoRepository,
    @Inject(RESERVA_REPO_TOKEN) private readonly reservaRepository: IReservaRepository,
    @Inject(EVENT_PUBLISHER_TOKEN) private readonly eventPublisher: IEventPublisher,
  ) { }

  async execute(input: ReservarItensInput): Promise<ReservarItensOutput> {
    const dto = reservarItensSchema.parse(input)
    const pedidoId = PedidoId.create(dto.pedidoId)

    const pedidoReservado = await this.reservaRepository.findByPedidoId(pedidoId)

    if (pedidoReservado) {
      return {
        pedidoId: pedidoReservado.pedidoId.id,
        reservaId: pedidoReservado.id,
        expiradoEm: pedidoReservado.expiradoEm,
      }
    }

    return await this.processarReserva(pedidoId, dto)
  }

  private async processarReserva(pedidoId: PedidoId, dto: ReservarItensInput) {
    const produtos = await this.produtoRepository.findByItens(dto.itens)

    const produtoMap = new Map<number, Produto>(
      produtos.map(produto => [produto.id, produto])
    )

    await this.validarEstoqueItens(pedidoId.id, dto.itens, produtoMap)

    const itensReserva: ItemReserva[] = []
    const produtosAlterados: Produto[] = []
    const eventosNivelCritico: NivelCriticoEstoqueEvent[] = []

    for (const item of dto.itens) {
      const produto = produtoMap.get(item.produtoId)!
      const quantidade = EstoqueProduto.create(item.quantidade)

      produto.reservar(quantidade)
      itensReserva.push(ItemReserva.create({ produtoId: produto.id, quantidade: quantidade }))
      produtosAlterados.push(produto)

      if (produto.isNivelCritico()) {
        eventosNivelCritico.push(new NivelCriticoEstoqueEvent(produto.id, produto.quantidadeDisponivel.quantidade))
      }
    }

    const reserva = Reserva.criar(pedidoId, itensReserva)

    await this.produtoRepository.saveMany(produtosAlterados)
    await this.reservaRepository.save(reserva)

    const eventos = [
      new EstoqueReservadoEvent(
        pedidoId.id,
        itensReserva.map(item => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade.quantidade,
        })),
      ),
      ...eventosNivelCritico,
    ]

    await this.eventPublisher.publishMany(eventos)

    return {
      pedidoId: pedidoId.id,
      reservaId: reserva.id,
      expiradoEm: reserva.expiradoEm,
    }
  }

  private async validarEstoqueItens(pedidoId: number, itens: { produtoId: number, quantidade: number }[], produtoMap: Map<number, Produto>) {
    const itensFaltantes: ItemFalhouData[] = []

    for (const item of itens) {
      const produto = produtoMap.get(item.produtoId)
      const quantidade = EstoqueProduto.create(item.quantidade)

      if (!produto) {
        itensFaltantes.push({
          produtoId: item.produtoId,
          quantidadeSolicitada: item.quantidade,
          quantidadeDisponivel: 0,
        })

        continue
      }

      if (!produto.hasDisponivel(quantidade)) {
        itensFaltantes.push({
          produtoId: item.produtoId,
          quantidadeSolicitada: item.quantidade,
          quantidadeDisponivel: produto.quantidadeDisponivel.quantidade,
        })
      }
    }

    if (itensFaltantes.length > 0) {
      await this.eventPublisher.publish(
        new ReservaFalhouEvent(
          pedidoId,
          'Estoque insuficiente para um ou mais itens',
          itensFaltantes,
        )
      )

      throw new BusinessException(`Estoque insuficiente para ${itensFaltantes.length} item(s) do pedido`)
    }
  }
}
