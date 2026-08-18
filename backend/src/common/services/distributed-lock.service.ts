import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { JobLocksRepository } from '@shranix/database';

import { DatabaseService } from '../../database/database.service';

/**
 * H5 — Distributed Lock Service
 *
 * Provides mutual-exclusion for scheduled background jobs across
 * multiple application replicas using a database-backed lock table.
 *
 * Design properties:
 *   - Unique job lock key (e.g. "commercial_scheduler")
 *   - Owner token (UUID) identifies the worker holding the lock
 *   - Bounded lease duration (configurable per job, default 5 min)
 *   - Stale lock recovery (lease expires → other workers can acquire)
 *   - Owner-safe release (only the current owner can release)
 *   - Atomic acquisition (INSERT OR IGNORE + unique constraint)
 *   - No permanent deadlock (lease always expires)
 *
 * Usage:
 *   await this.lock.runWithDistributedLock('commercial_scheduler', {
 *     leaseMs: 5 * 60 * 1000,  // 5 minutes
 *   }, async () => {
 *     await this.doWork();
 *   });
 */
@Injectable()
export class DistributedLockService implements OnModuleDestroy {
  private readonly logger = new Logger(DistributedLockService.name);

  /** Unique token identifying this worker instance. */
  private readonly ownerToken: string = crypto.randomUUID();

  private readonly lockRepo: JobLocksRepository;

  /** Active leases for cleanup on shutdown. */
  private readonly activeLeases = new Map<string, NodeJS.Timeout>();

  constructor(private readonly database: DatabaseService) {
    this.lockRepo = (this.database as any).jobLocks;
    this.logger.log(`DistributedLockService initialized (owner: ${this.ownerToken.slice(0, 8)}…)`);
  }

  async onModuleDestroy(): Promise<void> {
    // Release all locks held by this instance on graceful shutdown
    for (const [jobKey] of this.activeLeases) {
      try {
        await this.lockRepo.release(jobKey, this.ownerToken);
        this.logger.log(`Released lock on shutdown: ${jobKey}`);
      } catch {
        /* best-effort */
      }
    }
    this.activeLeases.clear();
  }

  /**
   * Run a handler with a distributed lock.
   *
   * Flow:
   *   1. Cleanup stale lock if lease expired
   *   2. Attempt atomic acquire
   *   3. If not acquired → skip safely, record reason
   *   4. If acquired → execute handler
   *   5. On success or failure → release lock (owner-only)
   *   6. Record result
   *
   * @param jobKey   Logical job identifier (e.g. "commercial_scheduler")
   * @param options  Lease duration and behavior config
   * @param handler  The job function to execute
   * @returns Whether the lock was acquired and handler executed
   */
  async runWithDistributedLock<T>(
    jobKey: string,
    options: {
      /** Lock lease duration in ms. Default: 5 minutes. */
      leaseMs?: number;
      /** If true, log debug-level details for every attempt. */
      debug?: boolean;
    },
    handler: () => Promise<T>,
  ): Promise<{ acquired: boolean; result?: T; error?: Error }> {
    const leaseMs = options.leaseMs ?? 5 * 60 * 1000; // 5 minutes default
    const startMs = Date.now();

    // Step 1: Stale lock recovery — clean up expired leases
    try {
      await this.lockRepo.cleanupStale(jobKey);
    } catch {
      /* best-effort: if cleanup fails, acquire may still succeed */
    }

    // Step 2: Attempt atomic acquire
    let acquired = false;
    try {
      const result = await this.lockRepo.acquire(jobKey, this.ownerToken, leaseMs);
      acquired = result.acquired;
    } catch (err) {
      this.logger.error(`Lock acquire failed for ${jobKey}: ${(err as Error).message}`);
      return { acquired: false, error: err as Error };
    }

    if (!acquired) {
      if (options.debug) {
        this.logger.debug(`Lock skipped: ${jobKey} (held by another worker)`);
      }
      return { acquired: false };
    }

    // Lock acquired — track for cleanup
    const renewTimer = setInterval(
      () => {
        this.lockRepo.renew(jobKey, this.ownerToken, leaseMs).catch(() => {
          /* renewal failure is non-fatal — lease will expire */
        });
      },
      Math.floor(leaseMs / 3),
    ); // renew at 1/3 of lease duration
    this.activeLeases.set(jobKey, renewTimer);

    this.logger.log(`Lock acquired: ${jobKey} (owner: ${this.ownerToken.slice(0, 8)}…)`);

    // Step 3: Execute handler
    let result: T | undefined;
    let handlerError: Error | undefined;
    try {
      result = await handler();
    } catch (err) {
      handlerError = err as Error;
      this.logger.error(`Job handler failed: ${jobKey} — ${handlerError.message}`);
    }

    // Step 4: Release lock (always, even on failure)
    try {
      const released = await this.lockRepo.release(jobKey, this.ownerToken);
      if (!released) {
        this.logger.warn(`Lock release returned false for ${jobKey} — may have been reclaimed`);
      }
    } catch (err) {
      this.logger.error(`Lock release failed for ${jobKey}: ${(err as Error).message}`);
    }

    // Cleanup tracking
    const timer = this.activeLeases.get(jobKey);
    if (timer) {
      clearInterval(timer);
      this.activeLeases.delete(jobKey);
    }

    const durationMs = Date.now() - startMs;
    if (handlerError) {
      this.logger.log(`Lock released (job failed): ${jobKey} (${durationMs}ms)`);
      return { acquired: true, error: handlerError };
    }

    if (options.debug) {
      this.logger.log(`Lock released (success): ${jobKey} (${durationMs}ms)`);
    }
    return { acquired: true, result };
  }

  /**
   * Get the current lock status for observability.
   */
  async getLockStatus(jobKey: string) {
    return this.lockRepo.status(jobKey);
  }

  /**
   * Get all active locks for the observability dashboard.
   */
  async getAllLockStatus() {
    return this.lockRepo.allStatus();
  }

  /**
   * Get this worker's owner token (for debugging/display).
   */
  getOwnerToken(): string {
    return this.ownerToken;
  }
}
