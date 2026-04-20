import { Produto } from '@domain/entities/produto.entity'

export interface IProdutoRepository {
  findById(id: number): Promise<Produto | null>
  findByIds(ids: number[]): Promise<Produto[]>
  findByItens(ids: { produtoId: number, quantidade: number }[]): Promise<Produto[]>

  save(produto: Produto): Promise<void>
  saveMany(produtos: Produto[]): Promise<void>
}
