import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'

import { env } from '@shared/env'
import { BusinessException } from '@shared/exceptions/business.exception'
import { CriticalException } from '@shared/exceptions/critical.exception'

@Catch()
export class CatchAllExceptionFilter implements ExceptionFilter<Error> {

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost
  ) { }

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp()

    const httpStatus = CatchAllExceptionFilter.getStatusCode(exception)
    const responseBody = CatchAllExceptionFilter.getResponseException(exception)

    this.httpAdapterHost.httpAdapter.reply(
      ctx.getResponse(),
      {
        error: { ...responseBody }
      },
      httpStatus
    )
  }

  private static getResponseException(exception: Error) {
    return CatchAllExceptionFilter.getResponseBody(exception)
  }

  private static getResponseBody(exception: Error) {
    if (env('ENVIRONMENT') == 'PRODUCTION') {
      if (exception instanceof CriticalException || (exception instanceof HttpException && exception.getStatus() >= 500)) {
        return { message: 'Internal Server Error. Try again later' }
      }
    }

    if (exception instanceof HttpException) {
      return { message: exception.message }
    }

    return { ...exception, message: exception?.message || 'Error' }
  }

  private static getStatusCode(exception: unknown) {
    if (exception instanceof BusinessException) return HttpStatus.BAD_REQUEST
    if (exception instanceof CriticalException) return HttpStatus.INTERNAL_SERVER_ERROR
    if (exception instanceof HttpException) return exception.getStatus()

    return HttpStatus.INTERNAL_SERVER_ERROR
  }
}
