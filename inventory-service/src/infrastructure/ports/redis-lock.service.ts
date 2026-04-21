import { Injectable, Logger } from '@nestjs/common'

import { ILockService } from '@application/ports/lock-service.port'
import { RedisCacheService } from '@infrastructure/support/redis-cache.service'
import { CriticalException } from '@shared/exceptions/critical.exception'

export const REDIS_CLIENT_TOKEN = 'REDIS_CLIENT'

const LOCK_PREFIX = 'lock:'
const LOCK_VALUE = '1'

@Injectable()
export class RedisLockService implements ILockService {

  private readonly logger = new Logger(RedisLockService.name)

  constructor(
    private readonly cache: RedisCacheService
  ) { }

  async acquire(key: string, ttlMs: number) {
    const fullKey = `${LOCK_PREFIX}${key}`

    return await this.cache.set(fullKey, LOCK_VALUE, ttlMs)
  }

  async release(key: string) {
    const fullKey = `${LOCK_PREFIX}${key}`

    await this.cache.delete(fullKey)
  }

  async withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>) {
    const adquiriu = await this.acquire(key, ttlMs)

    if (!adquiriu) {
      throw new CriticalException(`Não foi possível adquirir lock para a chave: ${key}`)
    }

    try {
      return await fn()
    } finally {
      await this.release(key).catch(err => {
        this.logger.error(`Erro ao liberar lock ${key}: ${(err as Error).message}`)
      })
    }
  }
}
