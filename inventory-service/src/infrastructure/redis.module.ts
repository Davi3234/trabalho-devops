import { Module } from '@nestjs/common'

import { LOCK_SERVICE_TOKEN } from '@application/ports/lock-service.port'
import { CacheService } from '@infrastructure/cache/cache-service'
import { RedisCacheService } from '@infrastructure/cache/implementations/redis-cache.service'
import { RedisLockService } from '@infrastructure/ports/redis-lock.service'
import { REDIS_CLIENT_TOKEN } from '@infrastructure/redis.token'

@Module({
  providers: [
    RedisCacheService,
    RedisLockService,
    {
      provide: LOCK_SERVICE_TOKEN,
      useClass: RedisLockService,
    },
    {
      provide: CacheService,
      useClass: RedisCacheService,
    },
  ],
  exports: [REDIS_CLIENT_TOKEN, RedisLockService, CacheService, RedisCacheService, LOCK_SERVICE_TOKEN],
})
export class RedisModule { }
