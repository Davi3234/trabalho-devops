import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class CacheService {

  abstract get<T>(key: string): Promise<T | null>
  abstract set<T>(key: string, value: T, ttlSeconds: number): Promise<boolean>
  abstract delete(key: string): Promise<void>
  abstract deleteMany(keys: string[]): Promise<void>
}
