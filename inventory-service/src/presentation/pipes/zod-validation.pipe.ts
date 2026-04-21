import { PipeTransform } from '@nestjs/common'
import { z } from 'zod'

import { ValidatorException } from '@shared/exceptions/validator.exception'

export class ZodValidationPipe<T extends z.ZodTypeAny> implements PipeTransform {

  constructor(
    private readonly schema: T
  ) { }

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      const causes = result.error.issues.map(cause => ({
        field: cause.path.join('.'),
        message: cause.message,
      }))

      throw new ValidatorException('Dados inválidos', { causes })
    }

    return result.data
  }
}
