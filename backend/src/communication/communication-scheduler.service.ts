import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { DistributedLockService } from '../common/services/distributed-lock.service';

import { CommunicationService } from './communication.service';
import { ReminderEngineService } from './reminder-engine.service';
import { TemplateEngineService } from './template-engine.service';

/**
 * Background worker — communication queue + automated reminders.
 *
 * Runs every 60s: dispatches due queued/retry messages, then runs the
 * reminder engine (payment due/overdue, low stock, expiry, CRM follow-ups).
 * Templates are seeded once at startup. The loop never throws — a failing
 * job must not kill the interval.
 */
@Injectable()
export class CommunicationSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommunicationSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  /** H5 — Lock lease: 50s (tick interval = 60s). */
  private static readonly LOCK_LEASE_MS = 50 * 1000;

  constructor(
    private readonly communications: CommunicationService,
    private readonly reminders: ReminderEngineService,
    private readonly templates: TemplateEngineService,
    private readonly distributedLock: DistributedLockService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Seed default templates once (idempotent).
    setTimeout(() => {
      void this.templates
        .seedDefaults()
        .then((n) => {
          if (n > 0) {
            this.logger.log(`Seeded ${n} default communication templates`);
          }
        })
        .catch(() => undefined);
    }, 4000);

    this.timer = setInterval(() => {
      void this.tick();
    }, 60_000);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Single tick — H5: distributed lock prevents duplicate dispatch across replicas. */
  private async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const { acquired } = await this.distributedLock.runWithDistributedLock(
        'communication_scheduler',
        { leaseMs: CommunicationSchedulerService.LOCK_LEASE_MS },
        async () => {
          const { processed } = await this.communications.processDue();
          if (processed > 0) {
            this.logger.log(`Communication worker dispatched ${processed} messages`);
          }
          const reminders = await this.reminders.runAll();
          const anySent = Object.values(reminders).some((v) => v > 0);
          if (anySent) {
            this.logger.log(`Reminder run: ${JSON.stringify(reminders)}`);
          }
        },
      );
      if (!acquired) {
        this.logger.debug('Communication worker: lock not acquired, skipping tick');
      }
    } catch (err: any) {
      this.logger.error(`Communication worker tick failed: ${err?.message}`);
    } finally {
      this.running = false;
    }
  }

  /** Manual trigger (admin endpoint) — H5: protected by distributed lock. */
  async runNow(): Promise<Record<string, unknown>> {
    const { acquired, result } = await this.distributedLock.runWithDistributedLock(
      'communication_scheduler',
      { leaseMs: CommunicationSchedulerService.LOCK_LEASE_MS },
      async () => {
        const { processed } = await this.communications.processDue();
        const reminders = await this.reminders.runAll();
        return { processed, reminders };
      },
    );
    if (!acquired) {
      this.logger.warn('Communication runNow: lock not acquired');
    }
    return (result as Record<string, unknown>) ?? {};
  }
}
