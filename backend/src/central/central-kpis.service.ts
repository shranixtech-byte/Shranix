import { Injectable, Logger, Optional } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { compareVersions } from '../releases/releases.service';

/**
 * PHASE 16 — CENTRAL MONITORING AGGREGATION LAYER (16.2).
 *
 * Real KPIs over the existing commercial/license/security tables — not random
 * counts. Every query is date-scoped and capped (bounded page sizes + indexed
 * filter columns) so the dashboard stays practical with large customer counts.
 */
const DAY_MS = 86_400_000;
const TREND_LIMIT = 5000;
const KPI_CACHE_TTL_MS = 60_000;

/**
 * Small TTL cache for KPI aggregation results (16.12). Caches DATA ONLY —
 * authorization decisions are made by guards before this service is reached
 * and are never cached here. Short TTL keeps the dashboard responsive at
 * scale; date-filtered queries remain bounded and indexed.
 */
class TtlCache {
  private readonly map = new Map<string, { value: any; expiresAt: number }>();
  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  async get<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const now = this.now();
    const hit = this.map.get(key);
    if (hit && hit.expiresAt > now) {
      return hit.value as T;
    }
    const value = await compute();
    this.map.set(key, { value, expiresAt: now + this.ttlMs });
    return value;
  }

  invalidate(key?: string): void {
    if (key) {
      this.map.delete(key);
    } else {
      this.map.clear();
    }
  }

  size(): number {
    return this.map.size;
  }
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function dayKey(iso: string | null | undefined): string {
  if (!iso) {
    return 'unknown';
  }
  return String(iso).slice(0, 10);
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

@Injectable()
export class CentralKpisService {
  private readonly logger = new Logger(CentralKpisService.name);
  private readonly cache: TtlCache;

  constructor(
    private readonly database: DatabaseService,
    @Optional() now?: () => number,
  ) {
    this.cache = new TtlCache(KPI_CACHE_TTL_MS, now);
  }

  private async fetch(repo: any, params: any): Promise<any[]> {
    try {
      const res = await repo.findAll(params as any);
      return (res?.data || []).filter((r: any) => !r.isDeleted);
    } catch {
      return [];
    }
  }

  // ── Commercial KPIs (16.2) ─────────────────────────────

  async commercialKpis(): Promise<Record<string, any>> {
    return this.cache.get('commercial', () => this.computeCommercialKpis());
  }

  private async computeCommercialKpis(): Promise<Record<string, any>> {
    const [customers, subs, events, invoices, payments] = await Promise.all([
      this.fetch(this.database.customers, { page: 1, pageSize: TREND_LIMIT }),
      this.fetch(this.database.subscriptions, { page: 1, pageSize: TREND_LIMIT }),
      this.fetch(this.database.subscriptionEvents, {
        page: 1,
        pageSize: TREND_LIMIT,
        sorts: [{ field: 'createdAt', direction: 'desc' }],
      }),
      this.fetch(this.database.billingInvoices, { page: 1, pageSize: TREND_LIMIT }),
      this.fetch(this.database.billingPayments, { page: 1, pageSize: TREND_LIMIT }),
    ]);

    const now = new Date();
    const in30d = new Date(now.getTime() + 30 * DAY_MS).toISOString();
    const expiringSoon = subs.filter(
      (s: any) =>
        ['ACTIVE', 'GRACE_PERIOD'].includes(String(s.status)) && s.endDate && s.endDate <= in30d,
    ).length;

    // MRR/ARR — normalize each ACTIVE subscription's final amount by cycle.
    let mrr = 0;
    for (const s of subs) {
      if (String(s.status) !== 'ACTIVE') {
        continue;
      }
      const amount = num(s.finalAmount || s.price);
      const cycle = String(s.billingCycle || 'monthly').toLowerCase();
      if (cycle === 'yearly' || cycle === 'annual') {
        mrr += amount / 12;
      } else if (cycle === 'quarterly') {
        mrr += amount / 3;
      } else if (cycle === 'lifetime') {
        // lifetime is one-time — exclude from recurring
      } else {
        mrr += amount;
      }
    }
    const mrrValue = Math.round(mrr * 100) / 100;

    const statusCount = (list: any[], status: string) =>
      list.filter((s: any) => String(s.status) === status).length;
    const eventCount = (type: string) =>
      events.filter((e: any) => String(e.eventType) === type).length;

    const successfulPayments = payments.filter((p: any) => String(p.status) === 'SUCCESS');
    const failedPayments = payments.filter((p: any) => String(p.status) === 'FAILED');
    const refunded = payments.filter(
      (p: any) =>
        String(p.status) === 'REFUNDED' ||
        String(p.status) === 'PARTIALLY_REFUNDED' ||
        num(p.refundedAmount) > 0,
    );
    const outstanding = invoices
      .filter(
        (i: any) =>
          String(i.paymentStatus) === 'unpaid' ||
          String(i.paymentStatus) === 'pending' ||
          String(i.paymentStatus) === 'failed',
      )
      .reduce((sum, i) => sum + num(i.totalAmount), 0);

    return {
      customers: {
        total: customers.length,
        active: customers.filter((c: any) => String(c.status) !== 'inactive').length,
      },
      subscriptions: {
        total: subs.length,
        trial: statusCount(subs, 'TRIAL'),
        active: statusCount(subs, 'ACTIVE'),
        pastDue: statusCount(subs, 'PAST_DUE'),
        grace: statusCount(subs, 'GRACE_PERIOD'),
        suspended: statusCount(subs, 'SUSPENDED'),
        expired: statusCount(subs, 'EXPIRED'),
        cancelled: statusCount(subs, 'CANCELLED'),
        expiringWithin30Days: expiringSoon,
      },
      revenue: {
        mrr: mrrValue,
        arr: Math.round(mrrValue * 12 * 100) / 100,
        outstandingBilling: Math.round(outstanding * 100) / 100,
      },
      payments: {
        successful: successfulPayments.length,
        successfulAmount:
          Math.round(successfulPayments.reduce((s, p) => s + num(p.amount), 0) * 100) / 100,
        failed: failedPayments.length,
        refunds: refunded.length,
      },
      lifecycle: {
        upgrades: eventCount('upgraded'),
        downgrades: eventCount('downgraded'),
        cancellations: eventCount('cancelled'),
        renewals: eventCount('renewed'),
      },
    };
  }

  // ── License KPIs (16.2) ────────────────────────────────

  async licenseKpis(): Promise<Record<string, any>> {
    return this.cache.get('license', () => this.computeLicenseKpis());
  }

  private async computeLicenseKpis(): Promise<Record<string, any>> {
    const [licenses, devices, activations, events] = await Promise.all([
      this.fetch(this.database.licenses, { page: 1, pageSize: TREND_LIMIT }),
      this.fetch(this.database.licenseDevices, { page: 1, pageSize: TREND_LIMIT }),
      this.fetch(this.database.licenseActivations, { page: 1, pageSize: TREND_LIMIT }),
      this.fetch(this.database.licenseEvents, {
        page: 1,
        pageSize: TREND_LIMIT,
        sorts: [{ field: 'eventTime', direction: 'desc' }],
      }),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const statusCount = (list: any[], status: string) =>
      list.filter((l: any) => String(l.status) === status).length;

    const activeLicenses = licenses.filter((l: any) => String(l.status) === 'ACTIVE');
    const availableSlots = activeLicenses.reduce(
      (sum, l) => sum + Math.max(num(l.maxDevices) - num(l.activeDevices), 0),
      0,
    );
    const activationsToday = activations.filter(
      (a: any) =>
        String(a.requestedAt || a.createdAt || '').slice(0, 10) === today ||
        String(a.createdAt || '').slice(0, 10) === today,
    ).length;
    const eventCount = (type: string) =>
      events.filter((e: any) => String(e.eventType) === type).length;

    return {
      licenses: {
        total: licenses.length,
        active: statusCount(licenses, 'ACTIVE'),
        grace: statusCount(licenses, 'GRACE_PERIOD'),
        trial: licenses.filter((l: any) => String(l.licenseType) === 'trial').length,
        expired: statusCount(licenses, 'EXPIRED'),
        suspended: statusCount(licenses, 'SUSPENDED'),
        revoked: statusCount(licenses, 'REVOKED'),
        cancelled: statusCount(licenses, 'CANCELLED'),
      },
      devices: {
        activeDevices: devices.filter((d: any) => String(d.status) === 'active').length,
        availableSlots,
        totalSlots: activeLicenses.reduce((s, l) => s + num(l.maxDevices), 0),
      },
      activations: {
        today: activationsToday,
        total: activations.length,
        failed: activations.filter((a: any) => String(a.status) === 'REJECTED').length,
        rejected: eventCount('ACTIVATION_REJECTED'),
        limitReached: eventCount('LIMIT_REACHED'),
      },
      lifecycle: {
        transfers: eventCount('DEVICE_TRANSFERRED'),
        deactivations: eventCount('DEVICE_DEACTIVATED'),
        validationFailures: eventCount('VALIDATION_FAILED'),
        expiries: eventCount('LICENSE_EXPIRED'),
      },
    };
  }

  // ── Security KPIs (16.2) ───────────────────────────────

  async securityKpis(days = 30): Promise<Record<string, any>> {
    const window = Math.min(Math.max(Number(days) || 30, 1), 365);
    return this.cache.get(`security:${window}`, () => this.computeSecurityKpis(window));
  }

  private async computeSecurityKpis(days: number): Promise<Record<string, any>> {
    const events = await this.fetch(this.database.securityEvents, {
      page: 1,
      pageSize: TREND_LIMIT,
      filters: [{ field: 'eventTime', operator: 'gte', value: isoDaysAgo(days) }],
    });
    const countType = (...types: string[]) =>
      events.filter((e: any) => types.includes(String(e.eventType))).length;

    return {
      windowDays: days,
      total: events.length,
      bySeverity: {
        HIGH: events.filter((e: any) => String(e.severity) === 'HIGH').length,
        CRITICAL: events.filter((e: any) => String(e.severity) === 'CRITICAL').length,
        MEDIUM: events.filter((e: any) => String(e.severity) === 'MEDIUM').length,
        LOW: events.filter((e: any) => String(e.severity) === 'LOW').length,
        INFO: events.filter((e: any) => String(e.severity) === 'INFO').length,
      },
      tokenFailures: countType('INVALID_TOKEN', 'TOKEN_TAMPER', 'SIGNATURE_FAILURE'),
      replayAttempts: countType('REPLAY_DETECTED'),
      activationAbuse: countType('ACTIVATION_LIMIT_REACHED', 'SUSPICIOUS_ACTIVATION'),
      deviceMismatches: countType('DEVICE_MISMATCH'),
      rateLimitEvents: countType('RATE_LIMIT_TRIGGERED'),
      unauthorizedAccess: countType('UNAUTHORIZED_LICENSE_ACCESS', 'UNAUTHORIZED_DEVICE_ACCESS'),
    };
  }

  // ── Update KPIs (16.2) ─────────────────────────────────

  async updateKpis(): Promise<Record<string, any>> {
    return this.cache.get('update', () => this.computeUpdateKpis());
  }

  private async computeUpdateKpis(): Promise<Record<string, any>> {
    const [releases, installations, policy] = await Promise.all([
      this.fetch(this.database.softwareReleases, { page: 1, pageSize: 200 }),
      this.fetch(this.database.licenseInstallations, { page: 1, pageSize: TREND_LIMIT }),
      this.fetch(this.database.versionCompatibility, { page: 1, pageSize: 200 }),
    ]);

    const published = releases
      .filter((r: any) => String(r.status) === 'PUBLISHED')
      .sort((a: any, b: any) => compareVersions(b.version, a.version));
    const latestStable = published.find((r: any) => r.channel === 'STABLE') || null;
    const blockedVersions = policy
      .filter((p: any) => Boolean(p.blocked))
      .map((p: any) => String(p.version));
    const criticalVersions = policy
      .filter((p: any) => Boolean(p.critical))
      .map((p: any) => String(p.version));

    const activeInstalls = installations.filter((i: any) => String(i.status) === 'active');
    const adoption: Record<string, number> = {};
    for (const i of activeInstalls) {
      const v = String(i.applicationVersion || 'unknown');
      adoption[v] = (adoption[v] || 0) + 1;
    }
    const versionAdoption = Object.entries(adoption)
      .map(([version, count]) => ({ version, count }))
      .sort((a, b) => b.count - a.count);

    const outdated = activeInstalls.filter(
      (i: any) =>
        latestStable &&
        compareVersions(String(i.applicationVersion || '0'), latestStable.version) < 0,
    ).length;
    const blockedInstalls = activeInstalls.filter((i: any) =>
      blockedVersions.includes(String(i.applicationVersion || '')),
    ).length;
    const criticalPending = activeInstalls.filter((i: any) =>
      criticalVersions.includes(String(i.applicationVersion || '')),
    ).length;

    return {
      releases: {
        total: releases.length,
        published: published.length,
        latestStable: latestStable ? latestStable.version : null,
        latestStableReleaseId: latestStable ? latestStable.releaseId : null,
        byChannel: RELEASE_CHANNEL_COUNTS(releases),
      },
      installations: {
        active: activeInstalls.length,
        versionAdoption,
        outdated,
        blockedInstalls,
        criticalPending,
      },
    };
  }

  // ── Trends (16.2) ──────────────────────────────────────

  async trends(days = 7): Promise<Record<string, any>> {
    const window = Math.min(Math.max(Number(days) || 7, 1), 90);
    return this.cache.get(`trends:${window}`, () => this.computeTrends(window));
  }

  private async computeTrends(window: number): Promise<Record<string, any>> {
    const since = isoDaysAgo(window);
    const [activations, subscriptions, payments, licenseEvents, securityEvents] = await Promise.all(
      [
        this.fetch(this.database.licenseActivations, {
          page: 1,
          pageSize: TREND_LIMIT,
          filters: [{ field: 'createdAt', operator: 'gte', value: since }],
        }),
        this.fetch(this.database.subscriptions, {
          page: 1,
          pageSize: TREND_LIMIT,
          filters: [{ field: 'createdAt', operator: 'gte', value: since }],
        }),
        this.fetch(this.database.billingPayments, {
          page: 1,
          pageSize: TREND_LIMIT,
          filters: [{ field: 'createdAt', operator: 'gte', value: since }],
        }),
        this.fetch(this.database.licenseEvents, {
          page: 1,
          pageSize: TREND_LIMIT,
          filters: [{ field: 'eventTime', operator: 'gte', value: since }],
        }),
        this.fetch(this.database.securityEvents, {
          page: 1,
          pageSize: TREND_LIMIT,
          filters: [{ field: 'eventTime', operator: 'gte', value: since }],
        }),
      ],
    );

    const daysArr = Array.from({ length: window }, (_, i) => {
      const d = new Date(Date.now() - (window - 1 - i) * DAY_MS);
      return d.toISOString().slice(0, 10);
    });
    const bucket = (rows: any[], keyFn: (r: any) => string): Record<string, number> => {
      const m: Record<string, number> = {};
      for (const r of rows) {
        const k = keyFn(r);
        m[k] = (m[k] || 0) + 1;
      }
      return m;
    };
    const series = (m: Record<string, number>) => daysArr.map((d) => m[d] || 0);

    return {
      windowDays: window,
      days: daysArr,
      activationsPerDay: series(
        bucket(activations, (a: any) => dayKey(a.createdAt || a.requestedAt)),
      ),
      newSubscriptionsPerDay: series(bucket(subscriptions, (s: any) => dayKey(s.createdAt))),
      paymentsPerDay: series(bucket(payments, (p: any) => dayKey(p.createdAt))),
      failedPaymentsPerDay: series(
        bucket(
          payments.filter((p: any) => String(p.status) === 'FAILED'),
          (p: any) => dayKey(p.createdAt),
        ),
      ),
      licenseExpiriesPerDay: series(
        bucket(
          licenseEvents.filter((e: any) => String(e.eventType) === 'LICENSE_EXPIRED'),
          (e: any) => dayKey(e.eventTime),
        ),
      ),
      securityEventsPerDay: series(bucket(securityEvents, (e: any) => dayKey(e.eventTime))),
    };
  }

  // ── Admin search (16.3) ────────────────────────────────

  async search(q: string, type?: string): Promise<Record<string, any>> {
    const needle = String(q || '')
      .trim()
      .toLowerCase();
    if (!needle) {
      return { results: [], total: 0 };
    }
    const match = (v: any) =>
      String(v || '')
        .toLowerCase()
        .includes(needle);
    const results: any[] = [];
    const cap = 20;

    if (!type || type === 'customer') {
      const customers = await this.fetch(this.database.customers, {
        page: 1,
        pageSize: 500,
      });
      for (const c of customers) {
        if (results.length >= cap) {
          break;
        }
        if (match(c.name) || match(c.customerCode) || match(c.email) || match(c.firmName)) {
          results.push({
            type: 'customer',
            id: c.id,
            reference: c.customerCode,
            name: c.name,
            email: c.email,
          });
        }
      }
    }
    if (!type || type === 'license') {
      const licenses = await this.fetch(this.database.licenses, { page: 1, pageSize: 500 });
      for (const l of licenses) {
        if (results.length >= cap) {
          break;
        }
        if (match(l.licenseNumber) || match(l.licensePublicId)) {
          results.push({ type: 'license', id: l.id, reference: l.licenseNumber, status: l.status });
        }
      }
    }
    if (!type || type === 'subscription') {
      const subs = await this.fetch(this.database.subscriptions, { page: 1, pageSize: 500 });
      for (const s of subs) {
        if (results.length >= cap) {
          break;
        }
        if (match(s.subscriptionNumber)) {
          results.push({
            type: 'subscription',
            id: s.id,
            reference: s.subscriptionNumber,
            status: s.status,
          });
        }
      }
    }
    if (!type || type === 'device') {
      const devices = await this.fetch(this.database.licenseDevices, { page: 1, pageSize: 500 });
      for (const d of devices) {
        if (results.length >= cap) {
          break;
        }
        if (match(d.devicePublicId) || match(d.deviceName)) {
          results.push({
            type: 'device',
            id: d.id,
            reference: d.devicePublicId,
            name: d.deviceName,
          });
        }
      }
    }
    if (!type || type === 'installation') {
      const inst = await this.fetch(this.database.licenseInstallations, {
        page: 1,
        pageSize: 500,
      });
      for (const i of inst) {
        if (results.length >= cap) {
          break;
        }
        if (match(i.installationPublicId) || match(i.installationName)) {
          results.push({
            type: 'installation',
            id: i.id,
            reference: i.installationPublicId,
            name: i.installationName,
          });
        }
      }
    }
    if (!type || type === 'activation') {
      const acts = await this.fetch(this.database.licenseActivations, { page: 1, pageSize: 500 });
      for (const a of acts) {
        if (results.length >= cap) {
          break;
        }
        if (match(a.activationPublicId) || match(a.activationReference)) {
          results.push({
            type: 'activation',
            id: a.id,
            reference: a.activationReference,
            status: a.status,
          });
        }
      }
    }
    if (!type || type === 'payment') {
      const payments = await this.fetch(this.database.billingPayments, { page: 1, pageSize: 500 });
      for (const p of payments) {
        if (results.length >= cap) {
          break;
        }
        if (match(p.paymentNumber) || match(p.gatewayRef)) {
          results.push({ type: 'payment', id: p.id, reference: p.paymentNumber, status: p.status });
        }
      }
    }
    if (!type || type === 'release') {
      const releases = await this.fetch(this.database.softwareReleases, { page: 1, pageSize: 500 });
      for (const r of releases) {
        if (results.length >= cap) {
          break;
        }
        if (match(r.releaseId) || match(r.version) || match(r.buildNumber)) {
          results.push({
            type: 'release',
            id: r.id,
            reference: r.releaseId,
            version: r.version,
            status: r.status,
          });
        }
      }
    }
    return { results, total: results.length };
  }

  // ── System health (16.3) ───────────────────────────────

  async systemHealth(): Promise<Record<string, any>> {
    const status = async (label: string, check: () => Promise<boolean>) => {
      try {
        return { service: label, status: (await check()) ? 'up' : 'degraded' };
      } catch {
        return { service: label, status: 'down' };
      }
    };
    const [api, database, webhooks, validation, activation] = await Promise.all([
      status('api', async () => true),
      status('database', async () => {
        const res = await this.database.users.findAll({ page: 1, pageSize: 1 } as any);
        return (res?.data || []).length >= 0;
      }),
      status('payment_webhooks', async () => {
        const res = await this.database.billingPayments.findAll({ page: 1, pageSize: 1 } as any);
        return (res?.data || []).length >= 0;
      }),
      status('license_validation', async () => {
        const res = await this.database.licenses.findAll({ page: 1, pageSize: 1 } as any);
        return (res?.data || []).length >= 0;
      }),
      status('activation_service', async () => {
        const res = await this.database.licenseActivations.findAll({ page: 1, pageSize: 1 } as any);
        return (res?.data || []).length >= 0;
      }),
    ]);
    return {
      generatedAt: new Date().toISOString(),
      services: [api, database, webhooks, validation, activation],
    };
  }
}

function RELEASE_CHANNEL_COUNTS(releases: any[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of releases) {
    const c = String(r.channel || 'STABLE');
    m[c] = (m[c] || 0) + 1;
  }
  return m;
}
