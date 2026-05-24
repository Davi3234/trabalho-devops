import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import type { ConsultarDisponibilidadeInput } from '@application/dto/consultar-disponibilidade.dto'
import { consultarDisponibilidadeSchema } from '@application/dto/consultar-disponibilidade.dto'
import type { EntradaEstoqueInput } from '@application/dto/entrada-estoque.dto'
import { entradaEstoqueSchema } from '@application/dto/entrada-estoque.dto'
import { ConsultarDisponibilidadeUseCase } from '@application/use-cases/consultar-disponibilidade.use-case'
import { EntradaEstoqueUseCase } from '@application/use-cases/entrada-estoque.use-case'
import { MetricsService } from '@infrastructure/metrics/metrics.service'
import {
  ConsultarDisponibilidadeRequest,
  ConsultarDisponibilidadeResponse,
  EntradaEstoqueRequest,
  EntradaEstoqueResponse,
} from '@presentation/docs/estoque.dto.swagger'
import { ZodValidationPipe } from '@presentation/pipes/zod-validation.pipe'

@ApiTags('estoque')
@Controller('/estoque')
export class EstoqueController {

  constructor(
    private readonly consultarDisponibilidade: ConsultarDisponibilidadeUseCase,
    private readonly entradaEstoque: EntradaEstoqueUseCase,
    private readonly metricsService: MetricsService,
  ) { }

  @Post('/disponibilidade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consultar disponibilidade de produtos',
    description: 'Retorna a quantidade disponível, total e reservada para uma lista de produtos. Também informa se o nível crítico foi atingido.',
  })
  @ApiBody({ type: ConsultarDisponibilidadeRequest })
  @ApiResponse({ status: 200, description: 'Disponibilidade retornada com sucesso', type: ConsultarDisponibilidadeResponse })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async disponibilidade(@Body(new ZodValidationPipe(consultarDisponibilidadeSchema)) body: ConsultarDisponibilidadeInput) {
    try {
      const result = await this.consultarDisponibilidade.execute(body)

      this.metricsService.recordStockQuery('success')

      for (const item of result.itens) {
        this.metricsService.setAvailableStock(item.produtoId, item.quantidadeDisponivel)
      }

      return result
    } catch (error) {
      this.metricsService.recordStockQuery('error')
      throw error
    }
  }

  @Post('/entrada')
  @ApiOperation({
    summary: 'Registrar entrada de estoque',
    description: 'Adiciona quantidade ao estoque de um ou mais produtos. Aceita lotes de até 100 itens por requisição.',
  })
  @ApiBody({ type: EntradaEstoqueRequest })
  @ApiResponse({ status: 201, description: 'Entrada de estoque registrada com sucesso', type: EntradaEstoqueResponse })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async entrada(@Body(new ZodValidationPipe(entradaEstoqueSchema)) body: EntradaEstoqueInput) {
    try {
      const result = await this.entradaEstoque.execute(body)

      this.metricsService.recordStockEntry('success')

      return result
    } catch (error) {
      this.metricsService.recordStockEntry('error')
      throw error
    }
  }
}
