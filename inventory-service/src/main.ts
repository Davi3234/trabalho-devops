import { NestFactory } from '@nestjs/core'

import { AppModule } from '@app.module'
import { env } from '@shared/env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'fatal'],
  })

  await app.listen(env.PORT)
}

bootstrap()
