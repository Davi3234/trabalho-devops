import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import {
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
  PrometheusModule,
} from '@willsoto/nestjs-prometheus'

import { MetricsInterceptor } from '@infrastructure/metrics/metrics.interceptor'
import {
  METRIC_AVAILABLE_STOCK,
  METRIC_CONFIRMATIONS_TOTAL,
  METRIC_EXPIRED_RESERVATIONS_TOTAL,
  METRIC_EXPIRY_JOB_RUNS_TOTAL,
  METRIC_HTTP_REQUEST_DURATION,
  METRIC_HTTP_REQUESTS_TOTAL,
  METRIC_MESSAGING_DURATION,
  METRIC_MESSAGING_MESSAGES_TOTAL,
  METRIC_RESERVATIONS_TOTAL,
  METRIC_REVERSALS_TOTAL,
  METRIC_STOCK_ENTRIES_TOTAL,
  METRIC_STOCK_QUERIES_TOTAL,
  MetricsService,
} from '@infrastructure/metrics/metrics.service'

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: [
    makeCounterProvider({
      name: METRIC_HTTP_REQUESTS_TOTAL,
      help: 'Total de requisições HTTP recebidas pelo inventory-service',
      labelNames: ['method', 'route', 'status_code'],
    }),
    makeHistogramProvider({
      name: METRIC_HTTP_REQUEST_DURATION,
      help: 'Duração das requisições HTTP em segundos',
      labelNames: ['method', 'route'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    }),
    makeCounterProvider({
      name: METRIC_STOCK_ENTRIES_TOTAL,
      help: 'Total de entradas de estoque registradas',
      labelNames: ['status'],
    }),
    makeCounterProvider({
      name: METRIC_STOCK_QUERIES_TOTAL,
      help: 'Total de consultas de disponibilidade realizadas',
      labelNames: ['status'],
    }),
    makeGaugeProvider({
      name: METRIC_AVAILABLE_STOCK,
      help: 'Quantidade disponível atual por produto (atualizada após consultas de disponibilidade)',
      labelNames: ['produto_id'],
    }),
    makeCounterProvider({
      name: METRIC_RESERVATIONS_TOTAL,
      help: 'Total de reservas de estoque processadas via mensageria (pedido.criado)',
      labelNames: ['status'],
    }),
    makeCounterProvider({
      name: METRIC_CONFIRMATIONS_TOTAL,
      help: 'Total de confirmações de baixa de estoque processadas via mensageria (pedido.pago)',
      labelNames: ['status'],
    }),
    makeCounterProvider({
      name: METRIC_REVERSALS_TOTAL,
      help: 'Total de estornos de reserva processados via mensageria (pedido.cancelado)',
      labelNames: ['status'],
    }),
    makeCounterProvider({
      name: METRIC_EXPIRED_RESERVATIONS_TOTAL,
      help: 'Total acumulado de reservas expiradas pelo job de expiração',
      labelNames: [],
    }),
    makeCounterProvider({
      name: METRIC_EXPIRY_JOB_RUNS_TOTAL,
      help: 'Total de execuções do job de expiração de reservas',
      labelNames: ['status'],
    }),
    makeCounterProvider({
      name: METRIC_MESSAGING_MESSAGES_TOTAL,
      help: 'Total de mensagens RabbitMQ processadas pelo inventory-service',
      labelNames: ['event', 'status'],
    }),
    makeHistogramProvider({
      name: METRIC_MESSAGING_DURATION,
      help: 'Duração do processamento de mensagens RabbitMQ em segundos',
      labelNames: ['event'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
    }),
    MetricsService,
    MetricsInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [MetricsService],
})
export class MetricsModule { }
