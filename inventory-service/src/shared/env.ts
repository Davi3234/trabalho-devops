export interface Environment {
  ENVIRONMENT: 'PRODUCTION' | 'DEVELOPMENT' | 'TEST'
  PORT: number
  REDIS_HOST: string
  REDIS_PORT: number
  REDIS_PASSWORD: string
  RABBITMQ_URL: string
}

export function env<T extends keyof Environment>(name: T, defaultValue?: Environment[T]) {
  return (process.env[name] ?? defaultValue ?? null) as Environment[T]
}
