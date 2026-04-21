import { Inject, Injectable, Logger } from '@nestjs/common'
import { Redis } from 'ioredis'

import { REDIS_CLIENT_TOKEN } from '@infrastructure/ports/redis-lock.service'

const CACHE_PREFIX = 'cache:'

@Injectable()
export class RedisCacheService {

  private readonly logger = new Logger(RedisCacheService.name)

  constructor(
    @Inject(REDIS_CLIENT_TOKEN) private readonly redis: Redis
  ) { }

  async get<T>(key: string) {
    const value = await this.redis.get(`${CACHE_PREFIX}${key}`)

    if (!value) {
      return null
    }

    try {
      return JSON.parse(value) as T
    } catch {
      this.logger.warn(`Falha ao desserializar cache para chave ${key}`)
      return null
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    const result = await this.redis.set(`${CACHE_PREFIX}${key}`, JSON.stringify(value), 'EX', ttlSeconds)

    return result === 'OK'
  }

  async delete(key: string) {
    await this.redis.del(`${CACHE_PREFIX}${key}`)
  }

  async deleteMany(keys: string[]) {
    if (keys.length === 0) {
      return
    }

    await this.redis.del(...keys.map((k) => `${CACHE_PREFIX}${k}`))
  }
}
