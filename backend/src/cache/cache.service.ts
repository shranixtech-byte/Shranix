import { Injectable, Logger } from '@nestjs/common';

export interface CacheConfig {
  ttl: number; // seconds
  prefix: string;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private store = new Map<string, { value: any; expiresAt: number }>();

  // In production, this would use ioredis. For now, uses in-memory Map.
  // To switch to Redis, replace the Map with ioredis calls.

  private readonly defaults: Record<string, CacheConfig> = {
    permissions: { ttl: 60, prefix: 'perm:' },
    dashboard: { ttl: 300, prefix: 'dash:' },
    kpi: { ttl: 600, prefix: 'kpi:' },
    session: { ttl: 3600, prefix: 'sess:' },
    reports: { ttl: 900, prefix: 'rpt:' },
  };

  async get<T>(key: string, type: string = 'default'): Promise<T | null> {
    const fullKey = this.getKey(key, type);
    const entry = this.store.get(fullKey);
    if (!entry) {return null;}
    if (Date.now() > entry.expiresAt) {
      this.store.delete(fullKey);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: any, type: string = 'default'): Promise<void> {
    const config = this.defaults[type] || { ttl: 300, prefix: '' };
    const fullKey = this.getKey(key, type);
    this.store.set(fullKey, {
      value,
      expiresAt: Date.now() + config.ttl * 1000,
    });
  }

  async invalidate(pattern: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key);
      }
    }
  }

  async invalidateAll(): Promise<void> {
    this.store.clear();
    this.logger.log('Cache cleared');
  }

  async getStats(): Promise<{ size: number; keys: string[] }> {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }

  private getKey(key: string, type: string): string {
    const config = this.defaults[type] || { ttl: 300, prefix: '' };
    return `${config.prefix}${key}`;
  }
}
