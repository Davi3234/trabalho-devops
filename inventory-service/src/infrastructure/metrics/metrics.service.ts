import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter, Gauge, Histogram } from 'prom-client'

export const METRIC_HTTP_REQUESTS_TOTAL = 'inventory_http_requests_total'
export const METRIC_HTTP_REQUEST_DURATION = 'inventory_http_request_duration_seconds'
export const METRIC_STOCK_ENTRIES_TOTAL = 'inventory_stock_entries_total'
export const METRIC_STOCK_QUERIES_TOTAL = 'inventory_stock_queries_total'
export const METRIC_AVAILABLE_STOCK = 'inventory_available_stock_units'

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric(METRIC_HTTP_REQUESTS_TOTAL) private readonly httpRequestsTotal: Counter<string>,
    @InjectMetric(METRIC_HTTP_REQUEST_DURATION) private readonly httpRequestDuration: Histogram<string>,
    @InjectMetric(METRIC_STOCK_ENTRIES_TOTAL) private readonly stockEntriesTotal: Counter<string>,
    @InjectMetric(METRIC_STOCK_QUERIES_TOTAL) private readonly stockQueriesTotal: Counter<string>,
    @InjectMetric(METRIC_AVAILABLE_STOCK) private readonly availableStock: Gauge<string>,
  ) { }

  recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    this.httpRequestsTotal.inc({ method, route, statusCode: String(statusCode) })
    this.httpRequestDuration.observe({ method, route }, durationMs / 1000)
  }

  recordStockEntry(status: 'success' | 'error'): void {
    this.stockEntriesTotal.inc({ status })
  }

  recordStockQuery(status: 'success' | 'error'): void {
    this.stockQueriesTotal.inc({ status })
  }

  setAvailableStock(produtoId: number, quantity: number): void {
    this.availableStock.set({ produtoId: String(produtoId) }, quantity)
  }
}
