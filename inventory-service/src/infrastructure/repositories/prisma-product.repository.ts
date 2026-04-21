import { Produto } from '@domain/entities/produto.entity'
import { IProdutoRepository } from '@domain/repositories/produto.repository'
import { EstoqueProduto } from '@domain/value-objects/estoque-produto.vo'
import { PrismaService } from '@infrastructure/support/prisma.service'
import { Injectable, Logger } from '@nestjs/common'
import { CriticalException } from '@shared/exceptions/critical.exception'

interface ProdutoDatabase {
  id: number
  nome: string
  quantidadeTotal: number
  quantidadeReservada: number
  version: number
  criadoEm: Date
  atualizadoEm: Date
}

@Injectable()
export class PrismaProdutoRepository implements IProdutoRepository {

  private readonly logger = new Logger(PrismaProdutoRepository.name)

  constructor(
    private readonly prisma: PrismaService
  ) { }

  async findById(id: number) {
    const row = await this.prisma.produto.findUnique({ where: { id: id } })
    return row ? this.toDomain(row) : null
  }

  async findByItens(ids: { produtoId: number, quantidade: number }[]) {
    const productIds = ids.map(({ produtoId }) => produtoId)

    return await this.findByIds(productIds)
  }

  async findByIds(ids: number[]) {
    const rows = await this.prisma.produto.findMany({
      where: { id: { in: ids } },
    })

    return rows.map(row => this.toDomain(row))
  }

  async save(produto: Produto) {
    await this.saveMany([produto])
  }

  async saveMany(produtos: Produto[]) {
    await this.prisma.$transaction(async (tx) => {
      for (const produto of produtos) {
        const result = await tx.produto.updateMany({
          where: {
            id: produto.id,
            version: produto.version,
          },
          data: {
            quantidadeTotal: produto.quantidadeTotal.quantidade,
            quantidadeReservada: produto.quantidadeReservada.quantidade,
            version: { increment: 1 },
            atualizadoEm: produto.atualizadoEm,
          },
        })

        if (result.count === 0) {
          this.logger.warn(`Conflito de concorrência ao salvar produto ${produto.id} (version ${produto.version}). Outro processo atualizou este registro simultaneamente.`)

          throw new CriticalException(`Conflito de concorrência detectado para produto ${produto.id}. A reserva foi rejeitada — tente novamente.`)
        }
      }
    })
  }

  private toDomain(row: ProdutoDatabase): Produto {
    return Produto.reconstitute({
      id: row.id,
      nome: row.nome,
      quantidadeTotal: EstoqueProduto.create(row.quantidadeTotal),
      quantidadeReservada: EstoqueProduto.create(row.quantidadeReservada),
      version: row.version,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    })
  }
}
