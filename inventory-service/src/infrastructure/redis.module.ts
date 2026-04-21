import { Module } from '@nestjs/common'
import { Redis } from 'ioredis'

import { REDIS_CLIENT_TOKEN, RedisLockService } from '@infrastructure/ports/redis-lock.service'
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
    RedisLockService,
    RedisCacheService,
  ],
  exports: [REDIS_CLIENT_TOKEN, RedisLockService, RedisCacheService],
})
export class RedisModule { }
