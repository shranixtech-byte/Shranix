import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { EntitlementsService } from '../../commercial/services/entitlements.service';
import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';
import { actor, nextLicenseNumber, publicId } from '../numbering';

import { LicenseEventsService } from './license-events.service';
import { LicenseTokensService } from './license-tokens.service';

export const LICENSE_STATUSES = [
  'PENDING',
  'ACTIVE',
  'GRACE_PERIOD',
  'SUSPENDED',
  'EXPIRED',
  'REVOKED',
  'CANCELLED',
] as const;

/**
 * Guarded license state machine. Terminal states CANCELLED / REVOKED may only
 * leave via an authorized reactivation (subscription eligible + permission).
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'EXPIRED', 'REVOKED', 'CANCELLED'],
  ACTIVE: ['GRACE_PERIOD', 'SUSPENDED', 'EXPIRED', 'REVOKED', 'CANCELLED'],
  GRACE_PERIOD: ['ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'EXPIRED', 'REVOKED', 'CANCELLED'],
  EXPIRED: ['ACTIVE'],
  REVOKED: ['ACTIVE'],
  CANCELLED: ['ACTIVE'],
};

/** Explicit subscription → license status mapping (never conflicting auto-states). */
const SYNC_MAP: Record<string, string> = {
  TRIAL: 'ACTIVE',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'GRACE_PERIOD',
  GRACE_PERIOD: 'GRACE_PERIOD',
  SUSPENDED: 'SUSPENDED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
};

@Injectable()
export class LicensesService {
  private readonly logger = new Logger(LicensesService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
    private readonly events: LicenseEventsService,
    private readonly tokens: LicenseTokensService,
  ) {}

  // ── Query ──────────────────────────────────────────────
  async findAll(
    query: {
      page?: number;
      pageSize?: number;
      status?: string;
      customerId?: string;
      planId?: string;
      search?: string;
      expiringWithinDays?: number;
    } = {},
  ) {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.customerId) {
      filters.push({ field: 'customerId', operator: 'eq', value: query.customerId });
    }
    if (query.planId) {
      filters.push({ field: 'planId', operator: 'eq', value: query.planId });
    }
    const res = await this.database.licenses.findAll({
      page: Number(query.page) || 1,
      pageSize: Math.min(Number(query.pageSize) || 50, 500),
      filters,
    } as any);
    let data = (res?.data || []).filter((l: any) => !l.isDeleted);
    data.sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));

    if (query.search) {
      const q = String(query.search).toLowerCase();
      const customerRes = await this.database.customers
        .findAll({ page: 1, pageSize: 10000 } as any)
        .catch(() => ({ data: [] }));
      const nameByCustomer = new Map<string, string>();
      for (const c of customerRes.data || []) {
        nameByCustomer.set(c.id, String(c.customerName || c.firmName || c.name || ''));
      }
      data = data.filter((l: any) => {
        const hay = [
          String(l.licenseNumber || ''),
          String(l.licensePublicId || ''),
          String(nameByCustomer.get(l.customerId) || ''),
          String(l.licenseType || ''),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    if (query.expiringWithinDays) {
      const horizon = new Date(
        Date.now() + Number(query.expiringWithinDays) * 86_400_000,
      ).toISOString();
      data = data.filter(
        (l: any) =>
          ['ACTIVE', 'GRACE_PERIOD'].includes(String(l.status)) &&
          l.expiresAt &&
          String(l.expiresAt) <= horizon,
      );
    }

    const enriched = await Promise.all(data.map(async (l: any) => this.enrich(l)));
    return { data: enriched, total: enriched.length, page: 1, pageSize: enriched.length };
  }

  private async enrich(license: any): Promise<any> {
    const [plan, subscription, customer] = await Promise.all([
      this.database.plans.findById(license.planId).catch(() => null),
      this.database.subscriptions.findById(license.subscriptionId).catch(() => null),
      this.database.customers.findById(license.customerId).catch(() => null),
    ]);
    let entitlements: Record<string, any> = {};
    let limits: Record<string, number> = {};
    try {
      entitlements = license.entitlements ? JSON.parse(license.entitlements) : {};
    } catch {
      /* ignore */
    }
    try {
      limits = license.limits ? JSON.parse(license.limits) : {};
    } catch {
      /* ignore */
    }
    return {
      ...license,
      entitlements,
      limits,
      plan: plan
        ? {
            id: plan.id,
            planCode: plan.planCode,
            planName: plan.planName,
            displayName: plan.displayName,
          }
        : null,
      subscription: subscription
        ? {
            id: subscription.id,
            subscriptionNumber: subscription.subscriptionNumber,
            status: subscription.status,
            endDate: subscription.endDate,
          }
        : null,
      customer: customer
        ? { id: customer.id, name: customer.customerName || customer.firmName || customer.name }
        : null,
      availableDeviceSlots: Math.max(
        0,
        (Number(license.maxDevices) || 0) - (Number(license.activeDevices) || 0),
      ),
    };
  }

  async findById(id: string): Promise<any> {
    const license = await this.database.licenses.findById(id).catch(() => null);
    if (!license || license.isDeleted) {
      throw new NotFoundException('License not found');
    }
    return this.enrich(license);
  }

  async findByPublicId(licenseReference: string): Promise<any> {
    const res = await this.database.licenses.findAll({
      page: 1,
      pageSize: 5,
      filters: [
        {
          field: 'licensePublicId',
          operator: 'eq',
          value: String(licenseReference),
        },
      ],
    } as any);
    const row = (res?.data || []).find((l: any) => !l.isDeleted);
    if (!row) {
      throw new NotFoundException('License not found');
    }
    return row;
  }

  async findByNumber(licenseNumber: string): Promise<any> {
    const res = await this.database.licenses.findAll({
      page: 1,
      pageSize: 5,
      filters: [{ field: 'licenseNumber', operator: 'eq', value: String(licenseNumber) }],
    } as any);
    const row = (res?.data || []).find((l: any) => !l.isDeleted);
    if (!row) {
      throw new NotFoundException('License not found');
    }
    return row;
  }

  /** The customer's primary license (portal). Never trusts customerId from the frontend. */
  async getForCustomer(customerId: string): Promise<any | null> {
    const res = await this.database.licenses.findAll({
      page: 1,
      pageSize: 50,
      filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
    } as any);
    const rows = (res?.data || [])
      .filter((l: any) => !l.isDeleted)
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (rows.length === 0) {
      return null;
    }
    return this.enrich(rows[0]);
  }

  // ── Creation (from subscription) ───────────────────────
  async createFromSubscription(
    subscriptionId: string,
    opts: { userId?: string; force?: boolean } = {},
  ): Promise<any> {
    const subscription = await this.database.subscriptions
      .findById(subscriptionId)
      .catch(() => null);
    if (!subscription || subscription.isDeleted) {
      throw new BadRequestException('Subscription not found');
    }
    const customerId = subscription.customerId;
    const customer = await this.database.customers.findById(customerId).catch(() => null);
    if (!customer || customer.isDeleted) {
      throw new BadRequestException('Customer not found');
    }

    // One primary license per subscription — return the existing one (no dupes).
    const existingRes = await this.database.licenses.findAll({
      page: 1,
      pageSize: 5,
      filters: [{ field: 'subscriptionId', operator: 'eq', value: subscriptionId }],
    } as any);
    const existing = (existingRes?.data || []).find((l: any) => !l.isDeleted);
    if (existing) {
      if (opts.force) {
        // re-derive plan/limits below from the current subscription state
      } else {
        return this.findById(existing.id);
      }
    }

    const [plan, version] = await Promise.all([
      this.database.plans.findById(subscription.planId).catch(() => null),
      this.database.planVersions.findById(subscription.planVersionId).catch(() => null),
    ]);
    if (!plan || plan.isDeleted || plan.status !== 'active') {
      throw new BadRequestException('Subscribed plan is not active');
    }
    let features: Record<string, any> = {};
    let limitsRaw: Record<string, number> = {};
    try {
      features = version?.features ? JSON.parse(version.features) : {};
    } catch {
      /* ignore */
    }
    try {
      limitsRaw = version?.limits ? JSON.parse(version.limits) : {};
    } catch {
      /* ignore */
    }

    // License limits derive from the subscribed plan — never hardcoded.
    const maxUsers = Math.max(1, Number(limitsRaw.users) || 5);
    const maxDevices = Math.max(
      1,
      Number(limitsRaw.devices) || Number(limitsRaw.installations) || 1,
    );
    const maxBranches = Math.max(1, Number(limitsRaw.branches) || 1);
    const maxInstallations = Math.max(1, Number(limitsRaw.installations) || maxDevices);

    const planType = String(plan.planType || '').toLowerCase();
    const planCode = String(plan.planCode || '').toLowerCase();
    let licenseType = 'STANDARD';
    if (planType === 'trial') {
      licenseType = 'TRIAL';
    } else if (planType === 'lifetime') {
      licenseType = 'LIFETIME';
    } else if (planType === 'enterprise' || planCode.includes('enterprise')) {
      licenseType = 'ENTERPRISE';
    } else if (
      planCode.includes('pro') ||
      String(plan.planName || '')
        .toLowerCase()
        .includes('professional')
    ) {
      licenseType = 'PROFESSIONAL';
    }

    const today = new Date().toISOString().slice(0, 10);
    const graceDays = Math.max(0, Number(plan.gracePeriodDays) || 0);
    const expiresAt = String(subscription.endDate || today).slice(0, 10);
    const graceUntil =
      String(subscription.graceEnd || '').slice(0, 10) ||
      new Date(new Date(`${expiresAt}T00:00:00`).getTime() + graceDays * 86_400_000)
        .toISOString()
        .slice(0, 10);
    const targetStatus =
      SYNC_MAP[String(subscription.status)] ||
      (subscription.status === 'PENDING_PAYMENT' ? 'PENDING' : 'PENDING');

    let attempts = 0;
    while (attempts < 5) {
      try {
        const license = await this.database.licenses.create({
          licenseNumber: await nextLicenseNumber(this.database.licenses),
          licensePublicId: publicId('lic'),
          customerId,
          subscriptionId,
          planId: plan.id,
          planVersionId: version?.id || null,
          licenseType,
          status: targetStatus,
          issuedAt: new Date().toISOString(),
          startsAt: String(subscription.startDate || today).slice(0, 10),
          expiresAt,
          graceUntil,
          maxUsers,
          maxDevices,
          maxBranches,
          maxInstallations,
          activeDevices: 0,
          autoRenew: Boolean(subscription.autoRenew),
          entitlements: JSON.stringify(features),
          limits: JSON.stringify(limitsRaw),
          revokedAt: null,
          revocationReason: null,
          lastValidatedAt: null,
          metadata: JSON.stringify({
            source: opts.userId ? 'admin' : 'api',
            planVersion: version?.version ?? null,
          }),
          createdBy: opts.userId || null,
          updatedBy: opts.userId || null,
        } as any);

        await this.events.record(license.id, 'LICENSE_CREATED', {
          fromStatus: null,
          toStatus: license.status,
          actor: actor(opts.userId),
          source: opts.userId ? 'admin' : 'api',
          metadata: { subscriptionId, planId: plan.id, licenseType, maxDevices },
        });
        await this.audit.log({
          userId: actor(opts.userId),
          event: 'license.created',
          resource: 'License',
          action: 'create',
          details: {
            licenseId: license.id,
            licenseNumber: license.licenseNumber,
            licensePublicId: license.licensePublicId,
            customerId,
            subscriptionId,
            planId: plan.id,
            maxDevices,
          },
        });
        return this.findById(license.id);
      } catch (err: any) {
        const dup = /UNIQUE|already exists|license_number|license_public_id/i.test(
          String(err?.message || ''),
        );
        if (!dup || attempts >= 4) {
          throw err;
        }
        attempts += 1;
      }
    }
    throw new BadRequestException('Could not allocate a unique license number');
  }

  // ── State machine ──────────────────────────────────────
  async transition(
    id: string,
    toStatus: string,
    opts: {
      eventType?: string;
      reason?: string;
      metadata?: Record<string, any>;
      userId?: string;
    } = {},
  ): Promise<any> {
    const license = await this.database.licenses.findById(id).catch(() => null);
    if (!license || license.isDeleted) {
      throw new NotFoundException('License not found');
    }
    if (String(license.status) === toStatus) {
      return this.findById(id);
    }
    const allowed = VALID_TRANSITIONS[String(license.status)] || [];
    if (!allowed.includes(toStatus)) {
      throw new BadRequestException(`Invalid license transition ${license.status} → ${toStatus}`);
    }

    const claimed = await this.database.licenses.claimTransition(
      id,
      String(license.status),
      toStatus,
    );
    if (!claimed) {
      // Lost the race — another request moved it first. Re-read and verify.
      const fresh = await this.database.licenses.findById(id).catch(() => null);
      if (fresh && String(fresh.status) === toStatus) {
        return this.findById(id);
      }
      throw new BadRequestException(
        `License status changed concurrently (${license.status} → ${toStatus} failed)`,
      );
    }

    const updates: Record<string, any> = { status: toStatus, updatedBy: opts.userId || null };
    if (toStatus === 'ACTIVE') {
      updates.revokedAt = null;
      updates.revocationReason = null;
    }
    if (opts.reason && ['REVOKED', 'CANCELLED'].includes(toStatus)) {
      updates.revokedAt = new Date().toISOString();
      updates.revocationReason = opts.reason;
    }
    await this.database.licenses.update(id, updates as any);
    await this.events.record(id, opts.eventType || `LICENSE_${toStatus}`, {
      fromStatus: license.status,
      toStatus,
      actor: actor(opts.userId),
      source: opts.userId ? 'admin' : 'scheduler',
      metadata: { ...(opts.metadata || {}), reason: opts.reason || null },
    });
    await this.audit.log({
      userId: actor(opts.userId),
      event: `license.${String(opts.eventType || toStatus).toLowerCase()}`,
      resource: 'License',
      action: 'transition',
      details: { licenseId: id, fromStatus: license.status, toStatus, reason: opts.reason || null },
    });
    return this.findById(id);
  }

  async revoke(id: string, body: { reason: string; userId?: string }): Promise<any> {
    const reason = String(body.reason || '').trim();
    if (!reason) {
      throw new BadRequestException('Revocation reason is required');
    }
    const license = await this.database.licenses.findById(id).catch(() => null);
    if (!license || license.isDeleted) {
      throw new NotFoundException('License not found');
    }
    if (['REVOKED', 'CANCELLED', 'EXPIRED'].includes(String(license.status))) {
      throw new BadRequestException(`License already ${license.status}`);
    }
    // Revocation prevents new activations and invalidates current state.
    const revoked = await this.transition(id, 'REVOKED', {
      eventType: 'LICENSE_REVOKED',
      reason,
      metadata: { revokedBy: actor(body.userId) },
      userId: body.userId,
    });
    // Outstanding signed tokens must stop working immediately.
    await this.tokens.revokeAllForLicense(id, `License revoked: ${reason}`).catch(() => undefined);
    return revoked;
  }

  async reactivate(id: string, body: { reason?: string; userId?: string }): Promise<any> {
    const license = await this.database.licenses.findById(id).catch(() => null);
    if (!license || license.isDeleted) {
      throw new NotFoundException('License not found');
    }
    // Subscription must be eligible for reactivation.
    const sub = await this.database.subscriptions
      .findById(license.subscriptionId)
      .catch(() => null);
    const eligible =
      sub &&
      !sub.isDeleted &&
      ['TRIAL', 'ACTIVE', 'GRACE_PERIOD', 'PAST_DUE'].includes(String(sub.status));
    if (!eligible) {
      throw new BadRequestException('Cannot reactivate — subscription is not eligible');
    }
    if (
      !['EXPIRED', 'REVOKED', 'CANCELLED', 'SUSPENDED', 'GRACE_PERIOD'].includes(
        String(license.status),
      )
    ) {
      throw new BadRequestException(`License already ${license.status}`);
    }
    return this.transition(id, 'ACTIVE', {
      eventType: 'LICENSE_REACTIVATED',
      reason: body.reason || 'Admin reactivation',
      metadata: { reactivatedBy: actor(body.userId) },
      userId: body.userId,
    });
  }

  // ── Subscription sync (scheduler + lifecycle hooks) ────
  /**
   * Explicit subscription → license mapping. Updates license status and validity
   * from the bound subscription. Never creates conflicting automatic states.
   * Returns the updated license.
   */
  async syncFromSubscription(license: any, subscription: any): Promise<any> {
    if (!license || !subscription) {
      return license;
    }
    let changed = false;
    const target = SYNC_MAP[String(subscription.status)];

    if (target && String(license.status) !== target) {
      if (
        target === 'ACTIVE' &&
        ['EXPIRED', 'REVOKED', 'CANCELLED'].includes(String(license.status))
      ) {
        // Subscription renewed/restored — reactivate terminal license.
        await this.transition(license.id, 'ACTIVE', {
          eventType: 'LICENSE_REACTIVATED',
          reason: `Subscription ${subscription.subscriptionNumber} ${subscription.status}`,
          metadata: { source: 'sync' },
        });
        changed = true;
      } else if (String(license.status) !== 'EXPIRED' && target === 'EXPIRED') {
        await this.transition(license.id, 'EXPIRED', {
          eventType: 'LICENSE_EXPIRED',
          reason: 'Subscription expired',
          metadata: { source: 'sync' },
        });
        changed = true;
      } else if (String(license.status) !== 'REVOKED' && String(license.status) !== 'CANCELLED') {
        // Normal sync transitions (ACTIVE ↔ GRACE_PERIOD ↔ SUSPENDED, etc.)
        const claimed = await this.database.licenses.claimTransition(
          license.id,
          String(license.status),
          target,
        );
        if (claimed) {
          // Sync validity windows (esp. graceUntil) so validation decisions use
          // the subscription's authoritative dates.
          await this.database.licenses.update(license.id, {
            status: target,
            expiresAt: String(subscription.endDate || license.expiresAt || '').slice(0, 10),
            graceUntil: String(
              subscription.graceEnd || license.graceUntil || subscription.endDate || '',
            ).slice(0, 10),
            autoRenew: Boolean(subscription.autoRenew),
            updatedBy: null,
          } as any);
          await this.events.record(license.id, `LICENSE_${target}`, {
            fromStatus: license.status,
            toStatus: target,
            actor: null,
            source: 'scheduler',
            metadata: { syncedFromSubscription: subscription.subscriptionNumber },
          });
          changed = true;
        }
      }
      // Tokens must not survive suspension/expiry — invalidate them.
      if (['SUSPENDED', 'EXPIRED', 'CANCELLED'].includes(target)) {
        await this.tokens
          .revokeAllForLicense(license.id, `License ${target}`)
          .catch(() => undefined);
      }
    }

    // Extend validity when the subscription renewed (LICENSE_RENEWED event).
    const subEnd = String(subscription.endDate || '').slice(0, 10);
    const licEnd = String(license.expiresAt || '').slice(0, 10);
    if (subEnd && licEnd && subEnd !== licEnd && subEnd > licEnd) {
      await this.database.licenses.update(license.id, {
        expiresAt: subEnd,
        graceUntil: String(subscription.graceEnd || license.graceUntil || subEnd).slice(0, 10),
        autoRenew: Boolean(subscription.autoRenew),
        updatedBy: null,
      } as any);
      await this.events.record(license.id, 'LICENSE_RENEWED', {
        fromStatus: license.status,
        toStatus: license.status,
        actor: null,
        source: 'scheduler',
        metadata: {
          oldExpiry: licEnd,
          newExpiry: subEnd,
          subscriptionId: subscription.id,
          subscriptionNumber: subscription.subscriptionNumber,
        },
      });
      changed = true;
    }

    return changed ? this.findById(license.id) : license;
  }

  /**
   * Plan upgrade/downgrade — refresh entitlement state through Phase 12.
   * Used when a subscription is replaced (UPGRADED/DOWNGRADED) and the license
   * should follow the successor subscription. Never deletes devices.
   */
  async syncEntitlementsToSubscription(
    licenseId: string,
    subscription: any,
    opts: { userId?: string } = {},
  ): Promise<any> {
    if (!subscription) {
      return this.findById(licenseId);
    }
    const version = await this.database.planVersions
      .findById(subscription.planVersionId)
      .catch(() => null);
    let features: Record<string, any> = {};
    let limitsRaw: Record<string, number> = {};
    try {
      features = version?.features ? JSON.parse(version.features) : {};
    } catch {
      /* ignore */
    }
    try {
      limitsRaw = version?.limits ? JSON.parse(version.limits) : {};
    } catch {
      /* ignore */
    }
    const old = await this.database.licenses.findById(licenseId).catch(() => null);
    await this.database.licenses.update(licenseId, {
      subscriptionId: subscription.id,
      planId: subscription.planId,
      planVersionId: subscription.planVersionId || null,
      maxUsers: Math.max(1, Number(limitsRaw.users) || 5),
      maxDevices: Math.max(1, Number(limitsRaw.devices) || Number(limitsRaw.installations) || 1),
      maxBranches: Math.max(1, Number(limitsRaw.branches) || 1),
      maxInstallations: Math.max(
        1,
        Number(limitsRaw.installations) || Number(limitsRaw.devices) || 1,
      ),
      expiresAt: String(subscription.endDate || old?.expiresAt || '').slice(0, 10),
      graceUntil: String(subscription.graceEnd || old?.graceUntil || '').slice(0, 10),
      autoRenew: Boolean(subscription.autoRenew),
      entitlements: JSON.stringify(features),
      limits: JSON.stringify(limitsRaw),
      updatedBy: opts.userId || null,
    } as any);

    await this.events.record(licenseId, 'LICENSE_REACTIVATED', {
      fromStatus: old?.status,
      toStatus: old?.status,
      actor: actor(opts.userId),
      source: opts.userId ? 'admin' : 'scheduler',
      metadata: {
        entitlementRefresh: true,
        subscriptionId: subscription.id,
        planId: subscription.planId,
      },
    });
    await this.audit.log({
      userId: actor(opts.userId),
      event: 'license.entitlements_updated',
      resource: 'License',
      action: 'update',
      details: { licenseId, subscriptionId: subscription.id, planId: subscription.planId },
    });
    return this.findById(licenseId);
  }

  /**
   * Downgrade guard — never silently deactivate devices. When active devices
   * exceed the target plan's limit, return DOWNGRADE_REQUIRES_DEVICE_RESOLUTION
   * so the caller can warn/schedule instead of auto-killing devices.
   */
  async validateDowngrade(
    licenseId: string,
    targetPlanId: string,
  ): Promise<{
    ok: boolean;
    activeDevices: number;
    targetMaxDevices: number;
    code?: string;
    message?: string;
  }> {
    const license = await this.database.licenses.findById(licenseId).catch(() => null);
    if (!license || license.isDeleted) {
      throw new NotFoundException('License not found');
    }
    const versionsRes = await this.database.planVersions.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'planId', operator: 'eq', value: targetPlanId }],
    } as any);
    const version =
      (versionsRes?.data || []).find((v: any) => !v.isDeleted && v.status === 'active') ||
      [...(versionsRes?.data || [])].sort(
        (a: any, b: any) => Number(b.version) - Number(a.version),
      )[0];
    let targetMaxDevices = 1;
    try {
      const limits = version?.limits ? JSON.parse(version.limits) : {};
      targetMaxDevices = Math.max(1, Number(limits.devices) || Number(limits.installations) || 1);
    } catch {
      /* ignore */
    }
    const activeDevices = Number(license.activeDevices) || 0;
    if (activeDevices > targetMaxDevices) {
      return {
        ok: false,
        activeDevices,
        targetMaxDevices,
        code: 'DOWNGRADE_REQUIRES_DEVICE_RESOLUTION',
        message: `License has ${activeDevices} active device(s); the target plan allows ${targetMaxDevices}. Deactivate devices or schedule the downgrade.`,
      };
    }
    return { ok: true, activeDevices, targetMaxDevices };
  }
}
