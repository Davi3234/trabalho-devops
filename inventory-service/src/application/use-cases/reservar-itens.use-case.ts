import { Inject, Injectable, Logger } from '@nestjs/common'

import {
  ReservarItensInput,
  ReservarItensOutput,
  reservarItensSchema,
} from '@application/dto/reservar-itens.dto'
import type { IEventPublisher } from '@application/ports/event-publisher.port'
import { EVENT_PUBLISHER_TOKEN } from '@application/ports/event-publisher.port'
import type { ILockService, } from '@application/ports/lock-service.port'
import { LOCK_SERVICE_TOKEN } from '@application/ports/lock-service.port'
import { ItemReserva } from '@domain/entities/item-reserva.entity'
import { Produto } from '@domain/entities/produto.entity'
import { Reserva } from '@domain/entities/reserva.entity'
import { EstoqueReservadoEvent } from '@domain/events/estoque-reservado.event'
import { NivelCriticoEstoqueEvent } from '@domain/events/nivel-critico-estoque.event'
import { ItemFalhouData, ReservaFalhouEvent } from '@domain/events/reserva-falhou.event'
import type { IProdutoRepository } from '@domain/repositories/produto.repository'
import { PRODUTO_REPO_TOKEN } from '@domain/repositories/produto.repository'
import type { IReservaRepository } from '@domain/repositories/reserva.repository'
import { RESERVA_REPO_TOKEN } from '@domain/repositories/reserva.repository'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'
import { PedidoId } from '@domain/value-objects/pedido-id.vo'
import { BusinessException } from '@shared/exceptions/business.exception'

const LOCK_TTL_MS = 10_000

@Injectable()
export class ReservarItensUseCase {

  private readonly logger = new Logger(ReservarItensUseCase.name)

  constructor(
    @Inject(PRODUTO_REPO_TOKEN) private readonly produtoRepository: IProdutoRepository,
    @Inject(RESERVA_REPO_TOKEN) private readonly reservaRepository: IReservaRepository,
    @Inject(EVENT_PUBLISHER_TOKEN) private readonly eventPublisher: IEventPublisher,
    @Inject(LOCK_SERVICE_TOKEN) private readonly lockService: ILockService,
  ) { }

  async execute(input: ReservarItensInput): Promise<ReservarItensOutput> {
    const dto = reservarItensSchema.parse(input)
    const pedidoId = PedidoId.create(dto.pedidoId)

    const pedidoReservado = await this.reservaRepository.findByPedidoId(pedidoId)

    if (pedidoReservado) {
      this.logger.warn(`Pedido ${pedidoId.id} já possui reserva. Ignorando duplicata.`)

      return {
        pedidoId: pedidoReservado.pedidoId.id,
        reservaId: pedidoReservado.id,
        expiradoEm: pedidoReservado.expiradoEm,
      }
    }

    const lockKey = `reserva:pedido:${pedidoId.id}`

    await this.lock(lockKey, pedidoId.id)

    try {
      return await this.processarReserva(pedidoId, dto)
    } finally {
      await this.lockService.release(lockKey)
    }
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

    const reserva = Reserva.create(pedidoId, itensReserva)

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

    this.logger.log(`Reserva criada: ${reserva.id} para pedido ${pedidoId.id}`)

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
      this.logger.log(`Reserva falhou para pedido ${pedidoId}. Itens faltantes: ${JSON.stringify(itensFaltantes)}`)

      await this.eventPublisher.publish(new ReservaFalhouEvent(
        pedidoId,
        'Estoque insuficiente para um ou mais itens',
        itensFaltantes,
      ))

      throw new BusinessException(`Estoque insuficiente para ${itensFaltantes.length} item(s) do pedido`)
    }
  }

  private async lock(lockKey: string, pedidoId: number) {
    const isAcquired = await this.lockService.acquire(lockKey, LOCK_TTL_MS)

    if (!isAcquired) {
      this.logger.warn(`Lock não adquirido para pedido ${pedidoId}. Possível retry concorrente.`)

      throw new BusinessException('Reserva em processamento para este pedido. Tente novamente.')
    }
  }
}
