import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'

import type { ConsultarDisponibilidadeInput } from '@application/dto/consultar-disponibilidade.dto'
import { consultarDisponibilidadeSchema } from '@application/dto/consultar-disponibilidade.dto'
import { ConsultarDisponibilidadeUseCase } from '@application/use-cases/consultar-disponibilidade.use-case'
import { ZodValidationPipe } from '@presentation/pipes/zod-validation.pipe'

@Controller('/estoque')
export class EstoqueController {

  constructor(
    private readonly consultarDisponibilidade: ConsultarDisponibilidadeUseCase,
  ) { }

  @Post('/disponibilidade')
  @HttpCode(HttpStatus.OK)
  async disponibilidade(@Body(new ZodValidationPipe(consultarDisponibilidadeSchema)) body: ConsultarDisponibilidadeInput) {
    return this.consultarDisponibilidade.execute(body)
  }
}
