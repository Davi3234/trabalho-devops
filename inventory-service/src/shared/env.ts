export interface Environment {
  ENVIRONMENT: 'PRODUCTION' | 'DEVELOPMENT' | 'TEST'
  PORT: number
}

export function env<T extends keyof Environment>(name: T, defaultValue?: Environment[T]) {
  return (process.env[name] ?? defaultValue ?? null) as Environment[T]
}
