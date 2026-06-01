import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

@ApiTags('saude')
@Controller()
export class AppController {

  @Get('/health')
  @ApiOperation({ summary: 'Verificar saúde do serviço', description: 'Retorna true quando o inventory-service está operacional' })
  @ApiResponse({ status: 200, description: 'Serviço operacional', schema: { example: true } })
  getHealth() {
    return true
  }
}
