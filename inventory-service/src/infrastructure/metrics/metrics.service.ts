import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter, Gauge, Histogram } from 'prom-client'

export const METRIC_HTTP_REQUESTS_TOTAL = 'inventory_http_requests_total'
export const METRIC_HTTP_REQUEST_DURATION = 'inventory_http_request_duration_seconds'
export const METRIC_STOCK_ENTRIES_TOTAL = 'inventory_stock_entries_total'
export const METRIC_STOCK_QUERIES_TOTAL = 'inventory_stock_queries_total'
export const METRIC_AVAILABLE_STOCK = 'inventory_available_stock_units'
export const METRIC_RESERVATIONS_TOTAL = 'inventory_reservations_total'
export const METRIC_CONFIRMATIONS_TOTAL = 'inventory_confirmations_total'
export const METRIC_REVERSALS_TOTAL = 'inventory_reversals_total'
export const METRIC_EXPIRED_RESERVATIONS_TOTAL = 'inventory_expired_reservations_total'
export const METRIC_EXPIRY_JOB_RUNS_TOTAL = 'inventory_expiry_job_runs_total'
export const METRIC_MESSAGING_MESSAGES_TOTAL = 'inventory_messaging_messages_total'
export const METRIC_MESSAGING_DURATION = 'inventory_messaging_duration_seconds'

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric(METRIC_HTTP_REQUESTS_TOTAL) private readonly httpRequestsTotal: Counter<string>,
    @InjectMetric(METRIC_HTTP_REQUEST_DURATION) private readonly httpRequestDuration: Histogram<string>,
    @InjectMetric(METRIC_STOCK_ENTRIES_TOTAL) private readonly stockEntriesTotal: Counter<string>,
    @InjectMetric(METRIC_STOCK_QUERIES_TOTAL) private readonly stockQueriesTotal: Counter<string>,
    @InjectMetric(METRIC_AVAILABLE_STOCK) private readonly availableStock: Gauge<string>,
    @InjectMetric(METRIC_RESERVATIONS_TOTAL) private readonly reservationsTotal: Counter<string>,
    @InjectMetric(METRIC_CONFIRMATIONS_TOTAL) private readonly confirmationsTotal: Counter<string>,
    @InjectMetric(METRIC_REVERSALS_TOTAL) private readonly reversalsTotal: Counter<string>,
    @InjectMetric(METRIC_EXPIRED_RESERVATIONS_TOTAL) private readonly expiredReservationsTotal: Counter<string>,
    @InjectMetric(METRIC_EXPIRY_JOB_RUNS_TOTAL) private readonly expiryJobRunsTotal: Counter<string>,
    @InjectMetric(METRIC_MESSAGING_MESSAGES_TOTAL) private readonly messagingMessagesTotal: Counter<string>,
    @InjectMetric(METRIC_MESSAGING_DURATION) private readonly messagingDuration: Histogram<string>,
  ) { }

  recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    this.httpRequestsTotal.inc({ method, route, 'status_code': String(statusCode) })
    this.httpRequestDuration.observe({ method, route }, durationMs / 1000)
  }

  recordStockEntry(status: 'success' | 'error'): void {
    this.stockEntriesTotal.inc({ status })
  }

  recordStockQuery(status: 'success' | 'error'): void {
    this.stockQueriesTotal.inc({ status })
  }

  setAvailableStock(produtoId: number, quantity: number): void {
    this.availableStock.set({ 'produto_id': String(produtoId) }, quantity)
  }

  recordReservation(status: 'success' | 'error'): void {
    this.reservationsTotal.inc({ status })
  }

  recordConfirmation(status: 'success' | 'error'): void {
    this.confirmationsTotal.inc({ status })
  }

  recordReversal(status: 'success' | 'error'): void {
    this.reversalsTotal.inc({ status })
  }

  recordExpiredReservations(count: number): void {
    if (count > 0) {
      this.expiredReservationsTotal.inc(count)
    }
  }

  recordExpiryJobRun(status: 'success' | 'skipped' | 'error'): void {
    this.expiryJobRunsTotal.inc({ status })
  }

  recordMessagingEvent(event: string, status: 'success' | 'error', durationMs: number): void {
    this.messagingMessagesTotal.inc({ event, status })
    this.messagingDuration.observe({ event }, durationMs / 1000)
  }
}
