import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'

import { AppModule } from '@app.module'
import { env } from '@shared/env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'fatal', 'log'],
  })

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [env('RABBITMQ_URL', 'amqp://localhost')],
      queue: 'estoque_consumer',
      queueOptions: { durable: true },
      noAck: false,
      prefetchCount: 10,
    }
  })

  await app.listen(env('PORT', 3000))
}

bootstrap()
