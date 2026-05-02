import { NestFactory } from '@nestjs/core'

import { AppModule } from '@app.module'
import { env } from '@shared/env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'fatal', 'log'],
  })

  await app.listen(env('PORT', 3000))
}

bootstrap()
