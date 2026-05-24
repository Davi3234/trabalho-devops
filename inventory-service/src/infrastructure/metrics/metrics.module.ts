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
  METRIC_HTTP_REQUEST_DURATION,
  METRIC_HTTP_REQUESTS_TOTAL,
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
      help: 'Quantidade disponível atual por produto (atualizada após consultas)',
      labelNames: ['produto_id'],
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
