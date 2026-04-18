export const LOCK_SERVICE_TOKEN = 'ILockService'

export interface ILockService {
  acquire(key: string, ttlMs: number): Promise<boolean>
  release(key: string): Promise<void>
  withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>
}
