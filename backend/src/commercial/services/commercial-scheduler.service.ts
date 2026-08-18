import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { DatabaseService } from '../../database/database.service';

import { BillingPaymentsService } from './billing-payments.service';
import { CommercialSettingsService } from './commercial-settings.service';
import { CouponsService } from './coupons.service';
import { RemindersService } from './reminders.service';
import { SubscriptionsService } from './subscriptions.service';

/**
 * Background worker — subscription lifecycle automation.
 *
 * Runs every 60s (same pattern as the communication worker): trial expiry →
 * payment required, unpaid expiry → grace period → suspension → expiry,
 * renewal/payment/grace reminders (deduped), scheduled upgrades/downgrades,
 * auto-renewal for configured subscriptions. The loop never throws — a failing
 * job must not kill the interval.
 */
@Injectable()
export class CommercialSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommercialSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  /** H5 — Lock lease slightly shorter than tick interval to avoid overlap. */
  private static readonly LOCK_LEASE_MS = 50 * 1000; // 50s lease (tick = 60s)

  constructor(
    private readonly database: DatabaseService,
    private readonly settings: CommercialSettingsService,
    private readonly coupons: CouponsService,
    private readonly reminders: RemindersService,
    private readonly subscriptions: SubscriptionsService,
    private readonly payments: BillingPaymentsService,
    private readonly distributedLock: DistributedLockService,
  ) {}

  onModuleInit(): void {
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

  /** Single tick — H5: distributed lock prevents duplicate execution across replicas. */
  private async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const { acquired } = await this.distributedLock.runWithDistributedLock(
        'commercial_scheduler',
        { leaseMs: CommercialSchedulerService.LOCK_LEASE_MS },
        async () => {
          const result = await this.runAll();
          const total =
            result.trialExpired +
            result.graceStarted +
            result.suspended +
            result.expired +
            result.renewals +
            result.reminders +
            result.couponsExpired;
          if (total > 0) {
            this.logger.log(`Commercial worker: ${JSON.stringify(result)}`);
          }
          return result;
        },
      );
      if (!acquired) {
        this.logger.debug('Commercial worker: lock not acquired, skipping tick');
      }
    } catch (err: any) {
      this.logger.error(`Commercial worker tick failed: ${err?.message}`);
    } finally {
      this.running = false;
    }
  }

  /** Manual trigger (admin endpoint) — H5: also protected by distributed lock. */
  async runNow(): Promise<Record<string, number>> {
    const { acquired, result } = await this.distributedLock.runWithDistributedLock(
      'commercial_scheduler',
      { leaseMs: CommercialSchedulerService.LOCK_LEASE_MS },
      async () => this.runAll(),
    );
    if (!acquired) {
      this.logger.warn('Commercial runNow: lock not acquired — another instance is running');
    }
    return result ?? {};
  }

  private async runAll(): Promise<Record<string, number>> {
    const settings = await this.settings.getSettings();
    const out: Record<string, number> = {
      trialExpired: 0,
      graceStarted: 0,
      suspended: 0,
      expired: 0,
      renewals: 0,
      reminders: 0,
      couponsExpired: 0,
      scheduledTransitions: 0,
    };

    const res = await this.database.subscriptions
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    const subs = (res?.data || []).filter((s: any) => !s.isDeleted);
    const today = new Date().toISOString().slice(0, 10);

    for (const sub of subs) {
      try {
        out.trialExpired += await this.handleTrialExpiry(sub, today, settings);
        out.graceStarted += await this.handleExpiryToGrace(sub, today);
        out.suspended += await this.handleGraceToSuspended(sub, today);
        out.expired += await this.handleSuspendedToExpired(sub, today, settings);
        out.renewals += await this.handleAutoRenew(sub, today, settings);
        out.reminders += await this.handleReminders(sub, today, settings);
        out.scheduledTransitions += await this.handleScheduledChanges(sub, today);
      } catch {
        /* a failing subscription must not stop the loop */
      }
    }

    try {
      out.couponsExpired = await this.coupons.expireDueCoupons();
    } catch {
      /* best-effort */
    }
    return out;
  }

  /** TRIAL → PENDING_PAYMENT when the trial window ends. */
  private async handleTrialExpiry(
    sub: any,
    today: string,
    settings: Record<string, any>,
  ): Promise<number> {
    if (sub.status !== 'TRIAL' || !sub.trialEnd) {
      return 0;
    }
    const daysLeft = Math.round(
      (new Date(`${String(sub.trialEnd).slice(0, 10)}T00:00:00`).getTime() -
        new Date(`${today}T00:00:00`).getTime()) /
        86_400_000,
    );
    // Pre-expiry reminders (7/3/1 days) — fire BEFORE the trial ends
    const reminderDays: number[] = Array.isArray(settings.renewalReminderDays)
      ? settings.renewalReminderDays
      : [7, 3, 1];
    if (daysLeft > 0 && daysLeft <= 7 && reminderDays.includes(daysLeft)) {
      await this.reminders.createIfAbsent({
        subscriptionId: sub.id,
        reminderType: 'trial_expiring',
        periodKey: `trial:${String(sub.trialEnd).slice(0, 10)}:${daysLeft}d`,
        scheduledFor: String(sub.trialEnd).slice(0, 10),
        sentTo: sub.customerId,
        metadata: { daysLeft },
      });
    }
    if (daysLeft > 0) {
      return 0;
    }
    try {
      await this.subscriptions.transition(sub.id, 'PENDING_PAYMENT', {
        eventType: 'trial_expired',
        metadata: { trialEnd: sub.trialEnd },
      });
      return 1;
    } catch {
      return 0;
    }
  }

  /** ACTIVE/PAST_DUE unpaid past endDate → GRACE_PERIOD. */
  private async handleExpiryToGrace(sub: any, today: string): Promise<number> {
    if (!['ACTIVE', 'PAST_DUE'].includes(String(sub.status))) {
      return 0;
    }
    const endDate = String(sub.endDate || '').slice(0, 10);
    if (!endDate || endDate >= today) {
      return 0;
    }
    if (sub.paymentStatus === 'paid') {
      return 0;
    }
    try {
      await this.subscriptions.transition(sub.id, 'GRACE_PERIOD', { eventType: 'grace_started' });
      return 1;
    } catch {
      return 0;
    }
  }

  /** GRACE_PERIOD past graceEnd (unpaid) → SUSPENDED. */
  private async handleGraceToSuspended(sub: any, today: string): Promise<number> {
    if (
      sub.status !== 'GRACE_PERIOD' ||
      !sub.graceEnd ||
      String(sub.graceEnd).slice(0, 10) >= today
    ) {
      return 0;
    }
    if (sub.paymentStatus === 'paid') {
      return 0;
    }
    try {
      await this.subscriptions.transition(sub.id, 'SUSPENDED', { eventType: 'suspended' });
      return 1;
    } catch {
      return 0;
    }
  }

  /** SUSPENDED beyond retention window → EXPIRED. */
  private async handleSuspendedToExpired(
    sub: any,
    today: string,
    settings: Record<string, any>,
  ): Promise<number> {
    if (sub.status !== 'SUSPENDED') {
      return 0;
    }
    const updated = String(sub.updatedAt || sub.createdAt || today).slice(0, 10);
    const retention = Math.max(0, Number(settings.suspensionRetentionDays) || 30);
    const expiryDate = new Date(new Date(`${updated}T00:00:00`).getTime() + retention * 86_400_000)
      .toISOString()
      .slice(0, 10);
    if (expiryDate > today) {
      return 0;
    }
    try {
      await this.subscriptions.transition(sub.id, 'EXPIRED', { eventType: 'expired' });
      return 1;
    } catch {
      return 0;
    }
  }

  /** Auto-renew — active + autoRenew + method ref, due within 24h. */
  private async handleAutoRenew(
    sub: any,
    today: string,
    settings: Record<string, any>,
  ): Promise<number> {
    if (sub.status !== 'ACTIVE' || !sub.autoRenew || !sub.paymentMethodRef) {
      return 0;
    }
    if (!settings.autoRenewEnabled) {
      return 0;
    }
    const endDate = String(sub.endDate || '').slice(0, 10);
    if (!endDate) {
      return 0;
    }
    const daysToEnd = Math.round(
      (new Date(`${endDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) /
        86_400_000,
    );
    if (daysToEnd > 1 || daysToEnd < 0) {
      return 0;
    }
    // Renewal invoice
    const renewed = await this.subscriptions.renew(sub.id, {}).catch(() => null);
    if (!renewed) {
      return 0;
    }
    // Locate the fresh unpaid invoice and charge through the provider
    const invoices = await this.database.billingInvoices
      .findAll({
        page: 1,
        pageSize: 5,
        filters: [
          { field: 'subscriptionId', operator: 'eq', value: sub.id },
          { field: 'status', operator: 'eq', value: 'issued' },
          { field: 'paymentStatus', operator: 'eq', value: 'unpaid' },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    const invoice = (invoices?.data || [])[0];
    if (invoice) {
      const payment = await this.payments
        .create({
          subscriptionId: sub.id,
          billingInvoiceId: invoice.id,
          idempotencyKey: `autorenew:${sub.id}:${invoice.id}`,
        })
        .catch(() => null);
      if (payment) {
        await this.payments.verify(payment.id, {}).catch(() => undefined);
      }
    }
    return 1;
  }

  /** Renewal / payment / grace reminders — all deduped. */
  private async handleReminders(
    sub: any,
    today: string,
    settings: Record<string, any>,
  ): Promise<number> {
    let count = 0;
    if (sub.status === 'ACTIVE' && sub.endDate) {
      const daysToEnd = Math.round(
        (new Date(`${String(sub.endDate).slice(0, 10)}T00:00:00`).getTime() -
          new Date(`${today}T00:00:00`).getTime()) /
          86_400_000,
      );
      const days: number[] = Array.isArray(settings.renewalReminderDays)
        ? settings.renewalReminderDays
        : [7, 3, 1];
      if (days.includes(daysToEnd)) {
        const created = await this.reminders.createIfAbsent({
          subscriptionId: sub.id,
          reminderType: 'renewal_due',
          periodKey: `end:${String(sub.endDate).slice(0, 10)}:${daysToEnd}d`,
          scheduledFor: String(sub.endDate).slice(0, 10),
          sentTo: sub.customerId,
          metadata: { daysLeft: daysToEnd },
        });
        if (created.created) {
          count += 1;
        }
      }
    }
    if (['ACTIVE', 'GRACE_PERIOD', 'PAST_DUE'].includes(String(sub.status)) && sub.endDate) {
      const overdueDays = Math.round(
        (new Date(`${today}T00:00:00`).getTime() -
          new Date(`${String(sub.endDate).slice(0, 10)}T00:00:00`).getTime()) /
          86_400_000,
      );
      const overdue: number[] = Array.isArray(settings.overdueReminderDays)
        ? settings.overdueReminderDays
        : [1, 3];
      if (sub.paymentStatus !== 'paid' && overdue.includes(overdueDays)) {
        const created = await this.reminders.createIfAbsent({
          subscriptionId: sub.id,
          reminderType: 'payment_overdue',
          periodKey: `due:${String(sub.endDate).slice(0, 10)}:${overdueDays}d`,
          scheduledFor: String(sub.endDate).slice(0, 10),
          sentTo: sub.customerId,
          metadata: { overdueDays },
        });
        if (created.created) {
          count += 1;
        }
      }
    }
    if (sub.status === 'GRACE_PERIOD' && sub.graceEnd) {
      const daysToGraceEnd = Math.round(
        (new Date(`${String(sub.graceEnd).slice(0, 10)}T00:00:00`).getTime() -
          new Date(`${today}T00:00:00`).getTime()) /
          86_400_000,
      );
      const warnDays = Number(settings.graceEndReminderDays) || 1;
      if (daysToGraceEnd <= warnDays && daysToGraceEnd >= 0) {
        const created = await this.reminders.createIfAbsent({
          subscriptionId: sub.id,
          reminderType: 'grace_ending',
          periodKey: `grace:${String(sub.graceEnd).slice(0, 10)}`,
          scheduledFor: String(sub.graceEnd).slice(0, 10),
          sentTo: sub.customerId,
          metadata: { daysLeft: daysToGraceEnd },
        });
        if (created.created) {
          count += 1;
        }
      }
    }
    return count;
  }

  /** Apply scheduled upgrade/downgrade at endDate. */
  private async handleScheduledChanges(sub: any, today: string): Promise<number> {
    if (!['ACTIVE', 'GRACE_PERIOD', 'PAST_DUE'].includes(String(sub.status))) {
      return 0;
    }
    const endDate = String(sub.endDate || '').slice(0, 10);
    if (!endDate || endDate > today) {
      return 0;
    }
    const events = await this.database.subscriptionEvents
      .findAll({
        page: 1,
        pageSize: 50,
        filters: [
          { field: 'subscriptionId', operator: 'eq', value: sub.id },
          {
            field: 'eventType',
            operator: 'in',
            value: ['upgrade_scheduled', 'downgrade_scheduled'],
          },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    const pending = (events?.data || []).find(
      (e: any) => !e.isDeleted && e.metadata && safeJson(e.metadata)?.effectiveDate === endDate,
    );
    if (!pending) {
      return 0;
    }
    const meta = safeJson(pending.metadata);
    let applied = false;
    if (pending.eventType === 'upgrade_scheduled') {
      applied = await this.subscriptions
        .upgrade(sub.id, {
          planId: meta.targetPlanId,
          planVersionId: meta.targetPlanVersionId,
          immediate: true,
        })
        .then(() => true)
        .catch(() => false);
    } else {
      applied = await this.subscriptions
        .downgrade(sub.id, {
          planId: meta.targetPlanId,
          planVersionId: meta.targetPlanVersionId,
          immediate: true,
        })
        .then(() => true)
        .catch(() => false);
    }
    // Never fail silently — record a failed-schedule event so admins can act
    if (!applied) {
      try {
        await this.database.subscriptionEvents.create({
          subscriptionId: sub.id,
          eventType: `${pending.eventType === 'upgrade_scheduled' ? 'upgrade' : 'downgrade'}_failed`,
          fromStatus: sub.status,
          toStatus: sub.status,
          metadata: JSON.stringify({
            targetPlanId: meta.targetPlanId,
            effectiveDate: endDate,
            reason: 'usage limits or state constraint',
          }),
        } as any);
      } catch {
        /* best-effort */
      }
    }
    return 1;
  }
}

function safeJson(raw: string | null | undefined): any {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
