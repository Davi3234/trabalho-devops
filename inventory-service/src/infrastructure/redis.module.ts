import { Module } from '@nestjs/common'

import { LOCK_SERVICE_TOKEN } from '@application/ports/lock-service.port'
import { CacheService } from '@infrastructure/cache/cache-service'
import { InMemoryCacheService } from '@infrastructure/cache/implementations/in-memory-cache.service'
import { RedisLockService } from '@infrastructure/ports/redis-lock.service'
import { REDIS_CLIENT_TOKEN } from '@infrastructure/redis.token'

@Module({
  providers: [
    InMemoryCacheService,
    RedisLockService,
    {
      provide: LOCK_SERVICE_TOKEN,
      useClass: RedisLockService,
    },
    {
      provide: CacheService,
      useClass: InMemoryCacheService,
    },
  ],
  exports: [REDIS_CLIENT_TOKEN, RedisLockService, CacheService, InMemoryCacheService, LOCK_SERVICE_TOKEN],
})
export class RedisModule { }
