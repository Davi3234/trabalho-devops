import { Produto } from '@domain/entities/produto.entity'
import { ProdutoId } from '@domain/value-objects/produto-id.vo'

export interface IProdutoRepository {
  findById(id: ProdutoId): Promise<Produto | null>
  findByIds(ids: ProdutoId[]): Promise<Produto[]>

  save(produto: Produto): Promise<void>
  saveMany(produtos: Produto[]): Promise<void>
}
