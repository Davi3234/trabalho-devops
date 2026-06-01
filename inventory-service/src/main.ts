import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { AppModule } from '@app.module'
import { INestApplication } from '@nestjs/common'
import { env } from '@shared/env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'fatal', 'log'],
  })

  if (env('ENVIRONMENT', 'DEVELOPMENT') == 'DEVELOPMENT') {
    loadSwagger(app)
  }

  await app.listen(env('PORT', 3000))
}

function loadSwagger(app: INestApplication) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Inventory Service')
    .setDescription('API de controle de estoque - gerenciamento de produtos, reservas e entradas de estoque')
    .setVersion('1.0')
    .addTag('estoque', 'Operações de controle de estoque')
    .addTag('saude', 'Monitoramento e saúde do serviço')
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('docs', app, document)
}

bootstrap()
