import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'

import type { ConsultarDisponibilidadeInput } from '@application/dto/consultar-disponibilidade.dto'
import { consultarDisponibilidadeSchema } from '@application/dto/consultar-disponibilidade.dto'
import type { EntradaEstoqueInput } from '@application/dto/entrada-estoque.dto'
import { entradaEstoqueSchema } from '@application/dto/entrada-estoque.dto'
import { ConsultarDisponibilidadeUseCase } from '@application/use-cases/consultar-disponibilidade.use-case'
import { EntradaEstoqueUseCase } from '@application/use-cases/entrada-estoque.use-case'
import { ZodValidationPipe } from '@presentation/pipes/zod-validation.pipe'

@Controller('/estoque')
export class EstoqueController {

  constructor(
    private readonly consultarDisponibilidade: ConsultarDisponibilidadeUseCase,
    private readonly entradaEstoque: EntradaEstoqueUseCase,
  ) { }

  @Post('/disponibilidade')
  @HttpCode(HttpStatus.OK)
  async disponibilidade(@Body(new ZodValidationPipe(consultarDisponibilidadeSchema)) body: ConsultarDisponibilidadeInput) {
    return this.consultarDisponibilidade.execute(body)
  }

  @Post('/entrada')
  async entrada(@Body(new ZodValidationPipe(entradaEstoqueSchema)) body: EntradaEstoqueInput) {
    return this.entradaEstoque.execute(body)
  }
}
