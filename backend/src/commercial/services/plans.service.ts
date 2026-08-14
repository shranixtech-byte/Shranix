import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueConstraintError } from '@shranix/database';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';
import { actor } from '../numbering.util';

const PLAN_TYPES = ['trial', 'monthly', 'quarterly', 'yearly', 'lifetime', 'enterprise'];
const BILLING_CYCLES = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'lifetime', 'custom'];
const PLAN_STATUSES = ['active', 'inactive', 'archived'];

function parseJson(raw: string | null | undefined, fallback: any): any {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

@Injectable()
export class PlansService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    query: {
      page?: number;
      pageSize?: number;
      status?: string;
      search?: string;
    } = {},
  ): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    const res = await this.database.plans.findAll({
      page: Number(query.page) || 1,
      pageSize: Number(query.pageSize) || 50,
      filters,
    } as any);
    let data = (res?.data || []).filter((p: any) => !p.isDeleted);
    if (query.search) {
      const q = String(query.search).toLowerCase();
      data = data.filter(
        (p: any) =>
          String(p.planName || '')
            .toLowerCase()
            .includes(q) ||
          String(p.planCode || '')
            .toLowerCase()
            .includes(q) ||
          String(p.displayName || '')
            .toLowerCase()
            .includes(q),
      );
    }
    data = data.sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    // attach the active version + all versions for admin views
    const enriched = await Promise.all(data.map(async (p: any) => this.enrichWithVersions(p)));
    return { data: enriched, total: enriched.length, page: 1, pageSize: enriched.length };
  }

  private async enrichWithVersions(plan: any): Promise<any> {
    const versionsRes = await this.database.planVersions.findAll({
      page: 1,
      pageSize: 200,
      filters: [{ field: 'planId', operator: 'eq', value: plan.id }],
    } as any);
    const versions = (versionsRes?.data || []).filter((v: any) => !v.isDeleted);
    const activeVersion =
      versions.find((v: any) => v.status === 'active') ||
      [...versions].sort((a: any, b: any) => b.version - a.version)[0] ||
      null;
    return {
      ...plan,
      features: activeVersion ? parseJson(activeVersion.features, {}) : {},
      limits: activeVersion ? parseJson(activeVersion.limits, {}) : {},
      price: activeVersion?.price ?? 0,
      discountPercent: activeVersion?.discountPercent ?? 0,
      taxRate: activeVersion?.taxRate ?? 0,
      currency: activeVersion?.currency ?? plan.currency ?? 'INR',
      currentVersion: activeVersion ? activeVersion.version : null,
      versions: versions
        .map((v: any) => ({
          ...v,
          features: parseJson(v.features, {}),
          limits: parseJson(v.limits, {}),
        }))
        .sort((a: any, b: any) => b.version - a.version),
    };
  }

  async findById(id: string): Promise<any> {
    const plan = await this.database.plans.findById(id).catch(() => null);
    if (!plan || plan.isDeleted) {
      throw new NotFoundException('Plan not found');
    }
    return this.enrichWithVersions(plan);
  }

  async create(body: any, userId?: string): Promise<any> {
    const name = String(body.planName || '').trim();
    if (!name) {
      throw new BadRequestException('planName is required');
    }
    if (body.planType && !PLAN_TYPES.includes(body.planType)) {
      throw new BadRequestException(`Invalid planType — allowed: ${PLAN_TYPES.join(', ')}`);
    }
    const cycle = body.billingCycle || body.planType || 'monthly';
    if (!BILLING_CYCLES.includes(cycle)) {
      throw new BadRequestException(`Invalid billingCycle — allowed: ${BILLING_CYCLES.join(', ')}`);
    }

    let attempts = 0;
    while (attempts < 5) {
      try {
        const planCode = String(
          body.planCode || `PLAN-${Date.now().toString(36).toUpperCase()}`,
        ).trim();
        const plan = await this.database.plans.create({
          planCode,
          planName: name,
          displayName: body.displayName || name,
          description: body.description || null,
          status: body.status && PLAN_STATUSES.includes(body.status) ? body.status : 'active',
          planType: body.planType || 'monthly',
          billingCycle: cycle,
          currency: body.currency || 'INR',
          trialPeriodDays: Math.max(0, Number(body.trialPeriodDays) || 0),
          gracePeriodDays: Math.max(0, Number(body.gracePeriodDays) ?? 3),
          setupFee: Math.max(0, Number(body.setupFee) || 0),
          effectiveFrom: body.effectiveFrom || null,
          effectiveTo: body.effectiveTo || null,
          displayOrder: Math.max(0, Number(body.displayOrder) || 0),
          isRecommended: Boolean(body.isRecommended),
          isPublic: body.isPublic !== false,
          internalNotes: body.internalNotes || null,
          createdBy: userId || null,
          updatedBy: userId || null,
        } as any);
        // Initial version v1 — pricing + features + limits are versioned
        const version = await this.database.planVersions.create({
          planId: plan.id,
          version: 1,
          price: Math.max(0, Number(body.price) || 0),
          discountPercent: Math.max(0, Number(body.discountPercent) || 0),
          taxRate: Math.max(0, Number(body.taxRate) || 0),
          currency: body.currency || 'INR',
          features: JSON.stringify(body.features || {}),
          limits: JSON.stringify(body.limits || {}),
          effectiveFrom: body.effectiveFrom || null,
          status: 'active',
          createdBy: userId || null,
          updatedBy: userId || null,
        } as any);

        await this.audit.log({
          userId: actor(userId),
          event: 'commercial.plan_created',
          resource: 'Plan',
          action: 'create',
          details: { planId: plan.id, planCode: plan.planCode, version: version.version },
        });
        return this.findById(plan.id);
      } catch (err: any) {
        const dup = isUniqueConstraintError(err) || /plan_code/i.test(String(err?.message || ''));
        if (!dup || attempts >= 4) {
          throw err;
        }
        attempts += 1;
      }
    }
    throw new BadRequestException('Could not allocate a unique plan code');
  }

  async update(id: string, body: any, userId?: string): Promise<any> {
    const plan = await this.database.plans.findById(id).catch(() => null);
    if (!plan || plan.isDeleted) {
      throw new NotFoundException('Plan not found');
    }
    const updates: Record<string, any> = {};
    if (body.planName !== undefined) {
      updates.planName = String(body.planName).trim();
    }
    if (body.displayName !== undefined) {
      updates.displayName = String(body.displayName);
    }
    if (body.description !== undefined) {
      updates.description = body.description || null;
    }
    if (body.planType !== undefined) {
      if (!PLAN_TYPES.includes(body.planType)) {
        throw new BadRequestException('Invalid planType');
      }
      updates.planType = body.planType;
    }
    if (body.billingCycle !== undefined) {
      if (!BILLING_CYCLES.includes(body.billingCycle)) {
        throw new BadRequestException('Invalid billingCycle');
      }
      updates.billingCycle = body.billingCycle;
    }
    if (body.currency !== undefined) {
      updates.currency = body.currency;
    }
    if (body.trialPeriodDays !== undefined) {
      updates.trialPeriodDays = Math.max(0, Number(body.trialPeriodDays) || 0);
    }
    if (body.gracePeriodDays !== undefined) {
      updates.gracePeriodDays = Math.max(0, Number(body.gracePeriodDays) || 0);
    }
    if (body.setupFee !== undefined) {
      updates.setupFee = Math.max(0, Number(body.setupFee) || 0);
    }
    if (body.effectiveFrom !== undefined) {
      updates.effectiveFrom = body.effectiveFrom || null;
    }
    if (body.effectiveTo !== undefined) {
      updates.effectiveTo = body.effectiveTo || null;
    }
    if (body.displayOrder !== undefined) {
      updates.displayOrder = Math.max(0, Number(body.displayOrder) || 0);
    }
    if (body.isRecommended !== undefined) {
      updates.isRecommended = Boolean(body.isRecommended);
    }
    if (body.isPublic !== undefined) {
      updates.isPublic = Boolean(body.isPublic);
    }
    if (body.internalNotes !== undefined) {
      updates.internalNotes = body.internalNotes || null;
    }
    updates.updatedBy = userId || null;

    if (Object.keys(updates).length > 0) {
      await this.database.plans.update(id, updates as any);
      await this.audit.log({
        userId: actor(userId),
        event: 'commercial.plan_updated',
        resource: 'Plan',
        action: 'update',
        details: { planId: id, changes: Object.keys(updates) },
      });
    }
    return this.findById(id);
  }

  /** Create a new version — supersedes the previous active version. */
  async createVersion(planId: string, body: any, userId?: string): Promise<any> {
    const plan = await this.database.plans.findById(planId).catch(() => null);
    if (!plan || plan.isDeleted) {
      throw new NotFoundException('Plan not found');
    }
    const versionsRes = await this.database.planVersions.findAll({
      page: 1,
      pageSize: 200,
      filters: [{ field: 'planId', operator: 'eq', value: planId }],
    } as any);
    const versions = (versionsRes?.data || []).filter((v: any) => !v.isDeleted);
    const nextVersion =
      versions.reduce((m: number, v: any) => Math.max(m, Number(v.version) || 0), 0) + 1;

    // Supersede currently-active version — historical subscriptions keep their version.
    for (const v of versions) {
      if (v.status === 'active') {
        try {
          await this.database.planVersions.update(v.id, { status: 'superseded' } as any);
        } catch {
          /* best-effort */
        }
      }
    }

    await this.database.planVersions.create({
      planId,
      version: nextVersion,
      price: Math.max(0, Number(body.price) || 0),
      discountPercent: Math.max(0, Number(body.discountPercent) || 0),
      taxRate: Math.max(0, Number(body.taxRate) || 0),
      currency: body.currency || plan.currency || 'INR',
      features: JSON.stringify(body.features || {}),
      limits: JSON.stringify(body.limits || {}),
      effectiveFrom: body.effectiveFrom || null,
      status: 'active',
      createdBy: userId || null,
      updatedBy: userId || null,
    } as any);

    await this.audit.log({
      userId: actor(userId),
      event: 'commercial.plan_version_created',
      resource: 'PlanVersion',
      action: 'create',
      details: { planId, version: nextVersion },
    });
    return this.findById(planId);
  }

  async setStatus(planId: string, status: string, userId?: string): Promise<any> {
    if (!PLAN_STATUSES.includes(status)) {
      throw new BadRequestException(`Invalid status — allowed: ${PLAN_STATUSES.join(', ')}`);
    }
    const plan = await this.database.plans.findById(planId).catch(() => null);
    if (!plan || plan.isDeleted) {
      throw new NotFoundException('Plan not found');
    }
    await this.database.plans.update(planId, { status, updatedBy: userId || null } as any);
    await this.audit.log({
      userId: actor(userId),
      event: `commercial.plan_${status === 'active' ? 'activated' : 'deactivated'}`,
      resource: 'Plan',
      action: 'status',
      details: { planId, status },
    });
    return this.findById(planId);
  }

  /** Feature matrix — plans × features for the admin view. */
  async getMatrix(): Promise<any> {
    const res = await this.database.plans.findAll({ page: 1, pageSize: 200 } as any);
    const plans = (res?.data || [])
      .filter((p: any) => !p.isDeleted && p.status !== 'archived')
      .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    const enriched: any[] = [];
    const featureKeys = new Set<string>();
    for (const p of plans) {
      const full = await this.enrichWithVersions(p);
      enriched.push(full);
      for (const key of Object.keys(full.features || {})) {
        featureKeys.add(key);
      }
    }
    return {
      features: [...featureKeys].sort(),
      plans: enriched.map((p) => ({
        id: p.id,
        planCode: p.planCode,
        planName: p.planName,
        displayName: p.displayName,
        status: p.status,
        version: p.currentVersion,
        price: p.price,
        currency: p.currency,
        features: p.features,
        limits: p.limits,
      })),
    };
  }

  /** Public plans for the portal checkout — active + public + current version only. */
  async getPublicPlans(): Promise<any[]> {
    const res = await this.database.plans.findAll({ page: 1, pageSize: 200 } as any);
    const plans = (res?.data || [])
      .filter((p: any) => !p.isDeleted && p.status === 'active' && Boolean(p.isPublic))
      .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    const out: any[] = [];
    for (const p of plans) {
      const full = await this.enrichWithVersions(p);
      if (!full.currentVersion) {
        continue;
      }
      out.push({
        id: full.id,
        planCode: full.planCode,
        planName: full.planName,
        displayName: full.displayName,
        description: full.description,
        planType: full.planType,
        billingCycle: full.billingCycle,
        currency: full.currency,
        trialPeriodDays: full.trialPeriodDays,
        gracePeriodDays: full.gracePeriodDays,
        setupFee: full.setupFee,
        isRecommended: full.isRecommended,
        version: full.currentVersion,
        planVersionId: full.versions[0]?.id ?? null,
        price: full.price,
        discountPercent: full.discountPercent,
        taxRate: full.taxRate,
        features: full.features,
        limits: full.limits,
      });
    }
    return out;
  }
}
