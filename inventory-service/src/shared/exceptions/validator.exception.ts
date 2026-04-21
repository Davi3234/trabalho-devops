import { ApplicationException } from '@shared/exceptions/application.exception'

export interface ValidatorExceptionDetails {
  causes: {
    field: string
    message: string
  }[]
}

export class ValidatorException extends ApplicationException<ValidatorExceptionDetails> {
}
