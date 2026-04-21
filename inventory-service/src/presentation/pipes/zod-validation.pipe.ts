import { BadRequestException, PipeTransform } from '@nestjs/common'
import { z } from 'zod'

export class ZodValidationPipe<T extends z.ZodTypeAny> implements PipeTransform {

  constructor(
    private readonly schema: T
  ) { }

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      const errors = result.error.issues.map(cause => ({
        field: cause.path.join('.'),
        message: cause.message,
      }))

      throw new BadRequestException({ message: 'Dados inválidos', errors })
    }

    return result.data
  }
}
