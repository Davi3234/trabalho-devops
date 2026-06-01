import { Injectable, OnModuleDestroy } from '@nestjs/common'

import { CacheService } from '@infrastructure/cache/cache-service'

const CACHE_PREFIX = 'cache:'

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

@Injectable()
export class InMemoryCacheService extends CacheService implements OnModuleDestroy {

  private readonly store = new Map<string, CacheEntry<unknown>>()
  private readonly timers = new Map<string, NodeJS.Timeout>()

  async get<T>(key: string): Promise<T | null> {
    const prefixedKey = this.prefix(key)
    const entry = this.store.get(prefixedKey)

    if (!entry) {
      return null
    }

    if (Date.now() >= entry.expiresAt) {
      this.evict(prefixedKey)

      return null
    }

    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
    const prefixedKey = this.prefix(key)

    if (this.store.has(prefixedKey)) {
      return false
    }

    const expiresAt = Date.now() + ttlSeconds * 1_000

    this.store.set(prefixedKey, { value, expiresAt })

    const timer = setTimeout(() => this.evict(prefixedKey), ttlSeconds * 1_000)

    timer.unref?.()
    this.timers.set(prefixedKey, timer)

    return true
  }

  async delete(key: string): Promise<void> {
    this.evict(this.prefix(key))
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return
    }

    for (const key of keys) {
      this.evict(this.prefix(key))
    }
  }

  onModuleDestroy(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }

    this.timers.clear()
    this.store.clear()
  }

  private prefix(key: string): string {
    return `${CACHE_PREFIX}${key}`
  }

  private evict(prefixedKey: string): void {
    this.store.delete(prefixedKey)

    const timer = this.timers.get(prefixedKey)

    if (timer) {
      clearTimeout(timer)
      this.timers.delete(prefixedKey)
    }
  }
}
