import { Inject, Injectable } from '@nestjs/common'

import {
  ConsultarDisponibilidadeInput,
  ConsultarDisponibilidadeOutput,
  consultarDisponibilidadeSchema,
  DisponibilidadeItem
} from '@application/dto/consultar-disponibilidade.dto'
import type { IProdutoRepository } from '@domain/repositories/produto.repository'
import { PRODUTO_REPO_TOKEN } from '@domain/repositories/produto.repository'

@Injectable()
export class ConsultarDisponibilidadeUseCase {

  constructor(
    @Inject(PRODUTO_REPO_TOKEN) private readonly produtoRepo: IProdutoRepository
  ) { }

  async execute(input: ConsultarDisponibilidadeInput): Promise<ConsultarDisponibilidadeOutput> {
    const { produtoIds } = consultarDisponibilidadeSchema.parse(input)

    const produtos = await this.produtoRepo.findByIds(produtoIds)

    const produtoMap = new Map(produtos.map(produto => [produto.id, produto]))

    const itens: DisponibilidadeItem[] = produtoIds.map(id => {
      const produto = produtoMap.get(id)

      if (!produto) {
        return {
          produtoId: id,
          quantidadeDisponivel: 0,
          quantidadeTotal: 0,
          quantidadeReservada: 0,
          isNivelCritico: true,
        }
      }

      return {
        produtoId: id,
        quantidadeDisponivel: produto.quantidadeDisponivel.quantidade,
        quantidadeTotal: produto.quantidadeTotal.quantidade,
        quantidadeReservada: produto.quantidadeReservada.quantidade,
        isNivelCritico: produto.isNivelCritico(),
      }
    })

    return { itens }
  }
}
