import { Injectable } from '@nestjs/common'

import { ItemReserva } from '@domain/entities/item-reserva.entity'
import { Reserva } from '@domain/entities/reserva.entity'
import { StatusReserva } from '@domain/enums/status-reserva.enum'
import { IReservaRepository } from '@domain/repositories/reserva.repository'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'
import { PedidoId } from '@domain/value-objects/pedido-id.vo'
import { StatusReserva as StatusReservaDatabase } from '@infrastructure/generated/enums'
import { PrismaService } from '@infrastructure/support/prisma.service'

interface ReservaDatabase {
  id: number
  pedidoId: number
  status: string
  criadoEm: Date
  expiradoEm: Date
  atualizadoEm: Date
  itens: { produtoId: number; quantidade: number }[]
}

const includeItens = { itens: true } as const

@Injectable()
export class PrismaReservaRepository implements IReservaRepository {

  constructor(
    private readonly prisma: PrismaService
  ) { }

  async findByPedidoId(pedidoId: PedidoId) {
    const row = await this.prisma.reserva.findUnique({
      where: { pedidoId: pedidoId.id },
      include: includeItens,
    })

    return row ? this.toDomain(row) : null
  }

  async isPedidoReservado(pedidoId: PedidoId): Promise<boolean> {
    const count = await this.prisma.reserva.count({ where: { pedidoId: pedidoId.id } })
    return count > 0
  }

  async findExpiradas() {
    const rows = await this.prisma.reserva.findMany({
      where: {
        status: StatusReserva.PENDENTE,
        expiradoEm: { lt: new Date() },
      },
      include: includeItens
    })

    return rows.map((row) => this.toDomain(row))
  }

  async save(reserva: Reserva) {
    const pedidoExistente = await this.isPedidoReservado(reserva.pedidoId)

    if (pedidoExistente) {
      const row = await this.prisma.reserva.update({
        where: { pedidoId: reserva.pedidoId.id },
        data: {
          status: reserva.status as StatusReservaDatabase,
          atualizadoEm: reserva.atualizadoEm,
        },
        include: includeItens
      })

      return this.toDomain(row)
    }

    const row = await this.prisma.reserva.create({
      data: {
        pedidoId: reserva.pedidoId.id,
        status: reserva.status as StatusReservaDatabase,
        criadoEm: reserva.criadoEm,
        expiradoEm: reserva.expiradoEm,
        atualizadoEm: reserva.atualizadoEm,
        itens: {
          create: reserva.itens.map(item => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade.quantidade,
          }))
        }
      },
      include: includeItens
    })

    return this.toDomain(row)
  }

  private toDomain(row: ReservaDatabase): Reserva {
    return Reserva.reconstitute({
      id: row.id,
      pedidoId: PedidoId.create(row.pedidoId),
      status: row.status as StatusReserva,
      criadoEm: row.criadoEm,
      expiradoEm: row.expiradoEm,
      atualizadoEm: row.atualizadoEm,
      itens: row.itens.map(item =>
        ItemReserva.create({
          produtoId: item.produtoId,
          quantidade: EstoqueProduto.create(item.quantidade),
        })
      )
    })
  }
}
