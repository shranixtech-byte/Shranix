import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

import { LicenseEventsService } from './license-events.service';
import { LicensesService } from './licenses.service';

/**
 * LICENSE BACKGROUND WORKER — interval-based, serialized (no overlapping runs).
 * Jobs:
 *   - Subscription → License state sync (explicit mapping, never conflicting)
 *   - Successor subscription rebinding on UPGRADED/DOWNGRADED
 *   - Expiry / grace handling (EXPIRED terminal)
 *   - Stale installation detection (90 days silent)
 *   - Expiry reminders (deduped per day via license_events metadata)
 * Immutable license history is never deleted.
 */
@Injectable()
export class LicenseSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LicenseSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly database: DatabaseService,
    private readonly licenses: LicensesService,
    private readonly events: LicenseEventsService,
  ) {}

  onModuleInit(): void {
    const intervalMs = Number(process.env.LICENSE_SYNC_INTERVAL_MS) || 60_000;
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
    void this.tick();
    this.logger.log(`License sync worker started (interval ${intervalMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      await this.syncAll();
      await this.markStaleInstallations();
    } catch (err) {
      this.logger.error(`License sync tick failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private async allLicenses(): Promise<any[]> {
    const res = await this.database.licenses.findAll({ page: 1, pageSize: 10000 } as any);
    return (res?.data || []).filter((l: any) => !l.isDeleted);
  }

  private async allSubscriptions(): Promise<any[]> {
    const res = await this.database.subscriptions.findAll({ page: 1, pageSize: 10000 } as any);
    return (res?.data || []).filter((s: any) => !s.isDeleted);
  }

  async syncAll(): Promise<{ synced: number; expired: number; rebound: number }> {
    const [licenses, subscriptions] = await Promise.all([
      this.allLicenses(),
      this.allSubscriptions(),
    ]);
    const byId = new Map(subscriptions.map((s) => [s.id, s]));
    const byCustomer = new Map<string, any[]>();
    for (const s of subscriptions) {
      const list = byCustomer.get(s.customerId) || [];
      list.push(s);
      byCustomer.set(s.customerId, list);
    }

    let synced = 0;
    let expired = 0;
    let rebound = 0;

    for (const license of licenses) {
      try {
        let subscription = byId.get(license.subscriptionId) || null;

        // UPGRADED/DOWNGRADED — rebind to the successor subscription.
        if (subscription && ['UPGRADED', 'DOWNGRADED'].includes(String(subscription.status))) {
          const successors = (byCustomer.get(license.customerId) || [])
            .filter((s: any) => s.upgradeFromSubscriptionId === subscription!.id)
            .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
          if (successors.length > 0) {
            await this.licenses.syncEntitlementsToSubscription(license.id, successors[0]);
            subscription = byId.get(successors[0].id) || subscription;
            rebound += 1;
          }
        }

        if (!subscription) {
          // Orphan license — expire when past validity.
          const today = new Date().toISOString().slice(0, 10);
          if (
            license.expiresAt &&
            today > String(license.expiresAt).slice(0, 10) &&
            ['ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'PENDING'].includes(String(license.status))
          ) {
            await this.licenses.transition(license.id, 'EXPIRED', {
              eventType: 'LICENSE_EXPIRED',
              reason: 'No active subscription',
              metadata: { source: 'scheduler' },
            });
            expired += 1;
          }
          continue;
        }

        await this.licenses.syncFromSubscription(license, subscription);
        synced += 1;
      } catch (err) {
        this.logger.warn(`License sync failed for ${license.id}: ${(err as Error).message}`);
      }
    }

    await this.expiryReminders(licenses, byId);
    return { synced, expired, rebound };
  }

  /** Expiry reminders — deduped per day (one LICENSE_EXPIRED reminder/day/license). */
  private async expiryReminders(licenses: any[], subs: Map<string, any>): Promise<void> {
    const todayKey = new Date().toISOString().slice(0, 10);
    for (const license of licenses) {
      try {
        if (!['ACTIVE', 'GRACE_PERIOD'].includes(String(license.status))) {
          continue;
        }
        const expiresAt = String(license.expiresAt || '');
        if (!expiresAt) {
          continue;
        }
        const daysLeft = Math.round(
          (new Date(`${String(expiresAt).slice(0, 10)}T00:00:00`).getTime() -
            new Date(`${todayKey}T00:00:00`).getTime()) /
            86_400_000,
        );
        if (daysLeft > 7 || daysLeft < 0) {
          continue;
        }
        const dedupe = await this.events.hasEventWithMeta(
          license.id,
          'LICENSE_EXPIRY_REMINDER',
          'dayKey',
          todayKey,
        );
        if (dedupe) {
          continue;
        }
        const sub = subs.get(license.subscriptionId);
        const portalUsers = await this.database.portalUsers
          .findAll({
            page: 1,
            pageSize: 50,
            filters: [{ field: 'customerId', operator: 'eq', value: license.customerId }],
          } as any)
          .catch(() => ({ data: [] }));
        for (const user of portalUsers?.data || []) {
          await this.database.notifications
            .create({
              userId: user.userId || user.id,
              title:
                daysLeft === 0 ? 'License expires today' : `License expires in ${daysLeft} day(s)`,
              message: `${license.licenseNumber}${sub ? ` — ${sub.subscriptionNumber}` : ''} expires on ${String(expiresAt).slice(0, 10)}`,
              type: 'warning',
              module: 'license',
              documentId: license.id,
              documentType: 'License',
              isRead: false,
            } as any)
            .catch(() => undefined);
        }
        await this.events.record(license.id, 'LICENSE_EXPIRY_REMINDER', {
          actor: null,
          source: 'scheduler',
          metadata: { dayKey: todayKey, daysLeft },
        });
      } catch {
        /* best-effort per license */
      }
    }
  }

  /** Stale installations — no heartbeat for 90 days. */
  private async markStaleInstallations(): Promise<void> {
    const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const res = await this.database.licenseInstallations.findAll({
      page: 1,
      pageSize: 10000,
    } as any);
    for (const inst of res?.data || []) {
      try {
        if (String(inst.status) !== 'active') {
          continue;
        }
        const lastSeen = String(inst.lastSeenAt || '');
        if (lastSeen && lastSeen < cutoff) {
          await this.database.licenseInstallations.update(inst.id, { status: 'stale' } as any);
          await this.events.record(inst.licenseId, 'VALIDATION_FAILED', {
            source: 'scheduler',
            installationRef: inst.installationPublicId,
            metadata: { reason: 'STALE_INSTALLATION' },
          });
        }
      } catch {
        /* best-effort */
      }
    }
  }
}
