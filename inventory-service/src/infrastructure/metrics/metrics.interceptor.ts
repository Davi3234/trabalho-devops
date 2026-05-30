import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { catchError, tap } from 'rxjs/operators'

import { MetricsService } from '@infrastructure/metrics/metrics.service'

@Injectable()
export class MetricsInterceptor implements NestInterceptor {

  constructor(private readonly metricsService: MetricsService) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now()
    const request = context.switchToHttp().getRequest()
    const { method } = request
    const route: string = request.route?.path ?? request.url

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse()
        this.metricsService.recordHttpRequest(method, route, response.statusCode, Date.now() - startTime)
      }),
      catchError((error) => {
        this.metricsService.recordHttpRequest(method, route, error.status ?? 500, Date.now() - startTime)
        return throwError(() => error)
      }),
    )
  }
}
