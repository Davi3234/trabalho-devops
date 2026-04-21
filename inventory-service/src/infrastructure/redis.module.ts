import { Module } from '@nestjs/common'
import { Redis } from 'ioredis'

import { LOCK_SERVICE_TOKEN } from '@application/ports/lock-service.port'
import { RedisLockService } from '@infrastructure/ports/redis-lock.service'
import { REDIS_CLIENT_TOKEN } from '@infrastructure/redis.token'
import { RedisCacheService } from '@infrastructure/support/redis-cache.service'
import { env } from '@shared/env'

@Module({
  providers: [
    {
      provide: REDIS_CLIENT_TOKEN,
      useFactory: (): Redis => {
        return new Redis({
          host: env('REDIS_HOST', 'localhost'),
          port: env('REDIS_PORT', 6379),
          password: env('REDIS_PASSWORD') ?? undefined,
          lazyConnect: false,
          enableReadyCheck: true,
        })
      },
    },
    RedisCacheService,
    RedisLockService,
    {
      provide: LOCK_SERVICE_TOKEN,
      useClass: RedisLockService,
    },
  ],
  exports: [REDIS_CLIENT_TOKEN, RedisLockService, RedisCacheService, LOCK_SERVICE_TOKEN],
})
export class RedisModule { }
