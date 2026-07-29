import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class PermissionCacheService implements OnApplicationShutdown {
  private readonly logger = new Logger(PermissionCacheService.name);
  private cache = new Map<string, CacheEntry<unknown>>();

  private readonly DEFAULT_TTL_MS = 60_000; // 1 minute
  private readonly CLEANUP_INTERVAL_MS = 120_000; // 2 minutes
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL_MS);
    this.logger.log('PermissionCacheService initialized with 60s TTL');
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {return null;}
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.DEFAULT_TTL_MS),
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateAll(): void {
    this.cache.clear();
    this.logger.log('Permission cache fully invalidated');
  }

  /** Invalidate all user permissions and roles caches */
  invalidateAllPermissionCaches(): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith('user_permissions:') || key.startsWith('user_roles:')) {
        this.cache.delete(key);
      }
    }
  }

  get size(): number {
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired cache entries`);
    }
  }

  onApplicationShutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}
