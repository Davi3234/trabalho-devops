import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RedisLockService } from '@infrastructure/ports/redis-lock.service'
import { RedisCacheService } from '@infrastructure/support/redis-cache.service'
import { CriticalException } from '@shared/exceptions/critical.exception'

function makeRedisMock() {
  return {
    set: vi.fn(),
    del: vi.fn(),
  }
}

describe('RedisLockService', () => {
  let redis: ReturnType<typeof makeRedisMock>
  let cache: RedisCacheService
  let service: RedisLockService

  beforeEach(() => {
    redis = makeRedisMock()
    cache = new RedisCacheService(redis as any)
    service = new RedisLockService(cache)
  })

  describe('acquire', () => {
    it('retorna true quando Redis confirma SET NX', async () => {
      redis.set.mockResolvedValue('OK')

      const result = await service.acquire('minha-chave', 5000)

      expect(result).toBe(true)
      expect(redis.set).toHaveBeenCalledWith('cache:lock:minha-chave', '1', 'PX', 5000, 'NX')
    })

    it('retorna false quando chave já existe (lock ocupado)', async () => {
      redis.set.mockResolvedValue(null)

      const result = await service.acquire('minha-chave', 5000)

      expect(result).toBe(false)
    })
  })

  describe('release', () => {
    it('deleta a chave com prefixo correto', async () => {
      redis.del.mockResolvedValue(1)

      await service.release('minha-chave')

      expect(redis.del).toHaveBeenCalledWith('cache:lock:minha-chave')
    })
  })

  describe('withLock', () => {
    it('executa fn e libera o lock ao final', async () => {
      redis.set.mockResolvedValue('OK')
      redis.del.mockResolvedValue(1)

      const fn = vi.fn().mockResolvedValue('resultado')
      const result = await service.withLock('chave', 5000, fn)

      expect(result).toBe('resultado')
      expect(fn).toHaveBeenCalledOnce()
      expect(redis.del).toHaveBeenCalledWith('cache:lock:chave')
    })

    it('lança CriticalException quando não consegue adquirir lock', async () => {
      redis.set.mockResolvedValue(null)

      await expect(
        service.withLock('chave', 5000, vi.fn()),
      ).rejects.toThrow(CriticalException)
    })

    it('libera o lock mesmo quando fn lança exceção', async () => {
      redis.set.mockResolvedValue('OK')
      redis.del.mockResolvedValue(1)

      const fn = vi.fn().mockRejectedValue(new Error('Falha interna'))

      await expect(service.withLock('chave', 5000, fn)).rejects.toThrow('Falha interna')
      expect(redis.del).toHaveBeenCalledWith('cache:lock:chave')
    })
  })
})
