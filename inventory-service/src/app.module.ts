import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'

import { PagamentoConfirmadoHandler } from '@application/handlers/pagamento-confirmado.handler'
import { PedidoCanceladoHandler } from '@application/handlers/pedido-cancelado.handler'
import { PedidoCriadoHandler } from '@application/handlers/pedido-criado.handler'
import { EVENT_PUBLISHER_TOKEN } from '@application/ports/event-publisher.port'
import { LOCK_SERVICE_TOKEN } from '@application/ports/lock-service.port'
import { ConfirmarBaixaUseCase } from '@application/use-cases/confirmar-baixa.use-case'
import { ConsultarDisponibilidadeUseCase } from '@application/use-cases/consultar-disponibilidade.use-case'
import { EstornarReservaUseCase } from '@application/use-cases/estornar-reserva.use-case'
import { ExpirarReservasUseCase } from '@application/use-cases/expirar-reserva.use-case'
import { PRODUTO_REPO_TOKEN, RESERVA_REPO_TOKEN, ReservarItensUseCase } from '@application/use-cases/reservar-itens.use-case'
import { RabbitMQConsumerController } from '@infrastructure/messaging/rabbitmq-consumer'
import { RabbitMQPublisher } from '@infrastructure/ports/rabbitmq-publisher'
import { RedisLockService } from '@infrastructure/ports/redis-lock.service'
import { RabbitMQModule } from '@infrastructure/rabbitmq.module'
import { RedisModule } from '@infrastructure/redis.module'
import { PrismaProdutoRepository } from '@infrastructure/repositories/prisma-product.repository'
import { PrismaReservaRepository } from '@infrastructure/repositories/prisma-reserva.repository'
import { ReservaExpiryJob } from '@infrastructure/schedulers/reserva-expiry.job'
import { PrismaService } from '@infrastructure/support/prisma.service'
import { EstoqueController } from '@presentation/controllers/estoque.controller'
import { CatchAllExceptionFilter } from '@presentation/filters/catch-all.filter'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    RabbitMQModule,
  ],
  controllers: [
    EstoqueController,
    RabbitMQConsumerController,
  ],
  providers: [
    PrismaService,

    { provide: PRODUTO_REPO_TOKEN, useClass: PrismaProdutoRepository },
    { provide: RESERVA_REPO_TOKEN, useClass: PrismaReservaRepository },

    RabbitMQPublisher,
    { provide: EVENT_PUBLISHER_TOKEN, useClass: RabbitMQPublisher },

    { provide: LOCK_SERVICE_TOKEN, useClass: RedisLockService },

    ReservarItensUseCase,
    ConfirmarBaixaUseCase,
    EstornarReservaUseCase,
    ConsultarDisponibilidadeUseCase,
    ExpirarReservasUseCase,

    PedidoCriadoHandler,
    PedidoCanceladoHandler,
    PagamentoConfirmadoHandler,

    ReservaExpiryJob,

    { provide: APP_FILTER, useClass: CatchAllExceptionFilter },
  ],
})
export class AppModule { }
