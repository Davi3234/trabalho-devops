import z from 'zod'

const schema = z.object({
  ENVIRONMENT: z.string(),
  PORT: z.coerce.number().default(8080),
})

export const env = schema.parse(process.env)
