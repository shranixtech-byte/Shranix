import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

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

  constructor(
    private readonly communications: CommunicationService,
    private readonly reminders: ReminderEngineService,
    private readonly templates: TemplateEngineService,
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

  /** Single tick — serialize to avoid overlapping runs. */
  private async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const { processed } = await this.communications.processDue();
      if (processed > 0) {
        this.logger.log(`Communication worker dispatched ${processed} messages`);
      }
      const reminders = await this.reminders.runAll();
      const anySent = Object.values(reminders).some((v) => v > 0);
      if (anySent) {
        this.logger.log(`Reminder run: ${JSON.stringify(reminders)}`);
      }
    } catch (err: any) {
      this.logger.error(`Communication worker tick failed: ${err?.message}`);
    } finally {
      this.running = false;
    }
  }

  /** Manual trigger (admin endpoint). */
  async runNow(): Promise<Record<string, unknown>> {
    const { processed } = await this.communications.processDue();
    const reminders = await this.reminders.runAll();
    return { processed, reminders };
  }
}
