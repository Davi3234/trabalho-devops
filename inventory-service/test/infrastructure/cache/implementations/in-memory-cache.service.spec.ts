import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { InMemoryCacheService } from '@infrastructure/cache/implementations/in-memory-cache.service'

describe('InMemoryCacheService', () => {
  let service: InMemoryCacheService

  beforeEach(() => {
    vi.useFakeTimers()
    service = new InMemoryCacheService()
  })

  afterEach(() => {
    service.onModuleDestroy()
    vi.useRealTimers()
  })

  describe('get', () => {
    it('retorna null quando chave não existe no store', async () => {
      const result = await service.get('chave-inexistente')

      expect(result).toBeNull()
    })

    it('retorna o valor quando chave existe e não está expirada', async () => {
      await service.set('chave', { dado: 42 }, 60)

      const result = await service.get<{ dado: number }>('chave')

      expect(result).toEqual({ dado: 42 })
    })

    it('retorna null quando a entrada está expirada', async () => {
      await service.set('chave', 'valor', 10)

      // Avança o relógio sem disparar o timer de evicção automática,
      // forçando a detecção de expiração dentro do get()
      vi.setSystemTime(new Date(Date.now() + 11_000))

      const result = await service.get('chave')

      expect(result).toBeNull()
    })

    it('evicta a entrada expirada ao tentar lê-la', async () => {
      await service.set('chave', 'valor', 10)

      vi.setSystemTime(new Date(Date.now() + 11_000))
      await service.get('chave')

      const resultado = await service.get('chave')

      expect(resultado).toBeNull()
    })

    it('retorna null para chave deletada manualmente antes de expirar', async () => {
      await service.set('chave', 'valor', 60)
      await service.delete('chave')

      const result = await service.get('chave')

      expect(result).toBeNull()
    })
  })

  describe('set', () => {
    it('retorna true ao inserir uma nova chave', async () => {
      const result = await service.set('chave', 'valor', 60)

      expect(result).toBe(true)
    })

    it('retorna false quando a chave já existe no store', async () => {
      await service.set('chave', 'valor-original', 60)

      const result = await service.set('chave', 'valor-novo', 60)

      expect(result).toBe(false)
    })

    it('não sobrescreve o valor existente quando retorna false', async () => {
      await service.set('chave', 'valor-original', 60)
      await service.set('chave', 'valor-novo', 60)

      const result = await service.get<string>('chave')

      expect(result).toBe('valor-original')
    })

    it('aceita qualquer tipo de valor serializável', async () => {
      const objeto = { id: 1, nomes: ['a', 'b'], ativo: true }

      await service.set('chave', objeto, 60)

      const result = await service.get<typeof objeto>('chave')

      expect(result).toEqual(objeto)
    })

    it('evicta automaticamente a entrada após o TTL expirar', async () => {
      await service.set('chave', 'valor', 5)

      vi.advanceTimersByTime(5_001)

      const result = await service.get('chave')

      expect(result).toBeNull()
    })

    it('mantém chaves diferentes de forma independente', async () => {
      await service.set('chave-a', 'valor-a', 60)
      await service.set('chave-b', 'valor-b', 60)

      expect(await service.get<string>('chave-a')).toBe('valor-a')
      expect(await service.get<string>('chave-b')).toBe('valor-b')
    })
  })

  describe('delete', () => {
    it('remove a chave do store', async () => {
      await service.set('chave', 'valor', 60)
      await service.delete('chave')

      const result = await service.get('chave')

      expect(result).toBeNull()
    })

    it('não lança erro ao deletar chave inexistente', async () => {
      await expect(service.delete('chave-inexistente')).resolves.toBeUndefined()
    })

    it('cancela o timer de evicção ao deletar a chave', async () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

      await service.set('chave', 'valor', 60)
      await service.delete('chave')

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    it('não afeta outras chaves ao deletar uma específica', async () => {
      await service.set('chave-a', 'valor-a', 60)
      await service.set('chave-b', 'valor-b', 60)

      await service.delete('chave-a')

      expect(await service.get<string>('chave-a')).toBeNull()
      expect(await service.get<string>('chave-b')).toBe('valor-b')
    })
  })

  describe('deleteMany', () => {
    it('retorna sem fazer nada quando o array está vazio', async () => {
      await service.set('chave', 'valor', 60)

      await service.deleteMany([])

      const result = await service.get<string>('chave')

      expect(result).toBe('valor')
    })

    it('remove todas as chaves especificadas', async () => {
      await service.set('chave-a', 'valor-a', 60)
      await service.set('chave-b', 'valor-b', 60)
      await service.set('chave-c', 'valor-c', 60)

      await service.deleteMany(['chave-a', 'chave-b'])

      expect(await service.get('chave-a')).toBeNull()
      expect(await service.get('chave-b')).toBeNull()
    })

    it('preserva chaves não listadas na deleção', async () => {
      await service.set('chave-a', 'valor-a', 60)
      await service.set('chave-b', 'valor-b', 60)

      await service.deleteMany(['chave-a'])

      expect(await service.get<string>('chave-b')).toBe('valor-b')
    })

    it('não lança erro ao deletar chaves inexistentes', async () => {
      await expect(
        service.deleteMany(['inexistente-a', 'inexistente-b']),
      ).resolves.toBeUndefined()
    })

    it('cancela os timers de todas as chaves removidas', async () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

      await service.set('chave-a', 'valor-a', 60)
      await service.set('chave-b', 'valor-b', 60)

      await service.deleteMany(['chave-a', 'chave-b'])

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('onModuleDestroy', () => {
    it('limpa todas as entradas do store', async () => {
      await service.set('chave-a', 'valor-a', 60)
      await service.set('chave-b', 'valor-b', 60)

      service.onModuleDestroy()

      expect(await service.get('chave-a')).toBeNull()
      expect(await service.get('chave-b')).toBeNull()
    })

    it('cancela todos os timers ativos', async () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

      await service.set('chave-a', 'valor-a', 60)
      await service.set('chave-b', 'valor-b', 60)

      service.onModuleDestroy()

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2)
    })

    it('não lança erro quando destruído com store vazio', () => {
      expect(() => service.onModuleDestroy()).not.toThrow()
    })

    it('permite set após destroy sem efeito nos dados antigos', async () => {
      await service.set('chave-antiga', 'valor-antigo', 60)
      service.onModuleDestroy()

      await service.set('chave-nova', 'valor-novo', 60)

      expect(await service.get<string>('chave-nova')).toBe('valor-novo')
      expect(await service.get('chave-antiga')).toBeNull()
    })
  })
})
