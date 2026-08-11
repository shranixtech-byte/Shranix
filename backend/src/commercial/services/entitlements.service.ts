import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

/**
 * CENTRALIZED ENTITLEMENT LAYER — the only place that reads plan features /
 * limits from the active subscription. Business modules call hasFeature() /
 * checkLimit() here instead of scattering plan logic. Frontend may display
 * entitlement status, but the backend MUST enforce it.
 *
 * Usage counters are computed live from source-of-truth tables (never trusted
 * from the frontend). Resources marked `tenant` count across the whole
 * deployment (users, branches, warehouses, customers, products); document
 * resources (invoices, sales_orders, purchase_orders) count per customer for
 * the current month.
 */
const LIMIT_DEFINITIONS: Record<string, { tenant: boolean; month: boolean }> = {
  users: { tenant: true, month: false },
  branches: { tenant: true, month: false },
  warehouses: { tenant: true, month: false },
  customers: { tenant: true, month: false },
  products: { tenant: true, month: false },
  storage: { tenant: true, month: false },
  api_requests: { tenant: true, month: true },
  invoices: { tenant: false, month: true },
  sales_orders: { tenant: false, month: true },
  purchase_orders: { tenant: false, month: true },
};

@Injectable()
export class EntitlementsService {
  constructor(private readonly database: DatabaseService) {}

  /** Resolve the customer's currently-enforced subscription (first match by recency). */
  async getActiveSubscription(customerId: string): Promise<any | null> {
    const res = await this.database.subscriptions.findAll({
      page: 1,
      pageSize: 50,
      filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
    } as any);
    const rows = (res?.data || []).filter(
      (s: any) =>
        !s.isDeleted && ['TRIAL', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'].includes(String(s.status)),
    );
    if (rows.length === 0) {
      return null;
    }
    rows.sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return rows[0];
  }

  /** Full entitlement resolution — subscription + plan + version + features + limits. */
  async getEntitlements(customerId: string): Promise<any> {
    const subscription = await this.getActiveSubscription(customerId);
    if (!subscription) {
      return {
        active: false,
        subscription: null,
        plan: null,
        features: {},
        limits: {},
      };
    }
    const version = await this.database.planVersions
      .findById(subscription.planVersionId)
      .catch(() => null);
    const plan = version
      ? await this.database.plans.findById(version.planId).catch(() => null)
      : null;
    let features: Record<string, boolean | number> = {};
    let limits: Record<string, number> = {};
    try {
      features = version?.features ? JSON.parse(version.features) : {};
    } catch {
      /* ignore */
    }
    try {
      limits = version?.limits ? JSON.parse(version.limits) : {};
    } catch {
      /* ignore */
    }
    return {
      active: true,
      subscription: {
        id: subscription.id,
        subscriptionNumber: subscription.subscriptionNumber,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        finalAmount: subscription.finalAmount,
        currency: subscription.currency,
        autoRenew: Boolean(subscription.autoRenew),
      },
      plan: plan
        ? {
            id: plan.id,
            planCode: plan.planCode,
            planName: plan.planName,
            displayName: plan.displayName,
          }
        : null,
      planVersionId: subscription.planVersionId,
      planVersion: version?.version ?? null,
      features,
      limits,
    };
  }

  async hasFeature(customerId: string, feature: string): Promise<boolean> {
    const ent = await this.getEntitlements(customerId);
    if (!ent.active) {
      return false;
    }
    return Boolean(ent.features[feature]);
  }

  async checkLimit(
    customerId: string,
    resource: string,
  ): Promise<{
    allowed: boolean;
    resource: string;
    used: number;
    limit: number | null;
    remaining: number | null;
    message?: string;
  }> {
    const ent = await this.getEntitlements(customerId);
    const limit = ent.active ? Number(ent.limits?.[resource] ?? 0) || null : null;
    const used = await this.computeUsage(customerId, resource);
    if (limit === null || limit <= 0) {
      return { allowed: true, resource, used, limit: null, remaining: null };
    }
    const allowed = used < limit;
    return {
      allowed,
      resource,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      message: allowed
        ? `${used} / ${limit} used`
        : `Limit reached — ${used} / ${limit}. Upgrade required.`,
    };
  }

  /** Live usage for a resource. Never trusts frontend counters. */
  async computeUsage(customerId: string, resource: string): Promise<number> {
    const monthPrefix = new Date().toISOString().slice(0, 10);

    switch (resource) {
      case 'users': {
        const res = await this.database.users.findAll({ page: 1, pageSize: 10000 } as any);
        return (res?.data || []).filter((r: any) => !r.isDeleted).length;
      }
      case 'branches': {
        const res = await this.database.branches.findAll({ page: 1, pageSize: 10000 } as any);
        return (res?.data || []).filter((r: any) => !r.isDeleted).length;
      }
      case 'warehouses': {
        const res = await this.database.warehouses.findAll({ page: 1, pageSize: 10000 } as any);
        return (res?.data || []).filter((r: any) => !r.isDeleted).length;
      }
      case 'customers': {
        const res = await this.database.customers.findAll({ page: 1, pageSize: 10000 } as any);
        return (res?.data || []).filter((r: any) => !r.isDeleted).length;
      }
      case 'products': {
        const res = await this.database.items.findAll({ page: 1, pageSize: 10000 } as any);
        return (res?.data || []).filter((r: any) => !r.isDeleted).length;
      }
      case 'invoices': {
        const res = await this.database.salesInvoices.findAll({
          page: 1,
          pageSize: 10000,
          filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        } as any);
        return (res?.data || []).filter(
          (r: any) => !r.isDeleted && String(r.invoiceDate || '').startsWith(monthPrefix),
        ).length;
      }
      case 'sales_orders': {
        const res = await this.database.salesOrders.findAll({
          page: 1,
          pageSize: 10000,
          filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        } as any);
        return (res?.data || []).filter(
          (r: any) => !r.isDeleted && String(r.orderDate || '').startsWith(monthPrefix),
        ).length;
      }
      case 'purchase_orders': {
        const res = await this.database.purchaseOrders.findAll({
          page: 1,
          pageSize: 10000,
          filters: [{ field: 'supplierId', operator: 'eq', value: customerId }],
        } as any);
        return (res?.data || []).filter(
          (r: any) => !r.isDeleted && String(r.orderDate || '').startsWith(monthPrefix),
        ).length;
      }
      case 'storage':
      case 'api_requests':
      default:
        return 0;
    }
  }

  /** Snapshot current usage into usage_records (unique per customer+resource+period). */
  async snapshotUsage(customerId: string, subscriptionId: string): Promise<any[]> {
    const resources = Object.keys(LIMIT_DEFINITIONS);
    const periodKey = new Date().toISOString().slice(0, 7);
    const ent = await this.getEntitlements(customerId);
    const out: any[] = [];
    for (const resource of resources) {
      const used = await this.computeUsage(customerId, resource);
      const limit = ent.active ? Number(ent.limits?.[resource] ?? 0) || null : null;
      const existing = await this.database.usageRecords.findAll({
        page: 1,
        pageSize: 1,
        filters: [
          { field: 'customerId', operator: 'eq', value: customerId },
          { field: 'resource', operator: 'eq', value: resource },
          { field: 'periodKey', operator: 'eq', value: periodKey },
        ],
      } as any);
      const data = { used, limit, recordedAt: new Date().toISOString() };
      try {
        if ((existing?.data || []).length > 0) {
          const row = existing.data[0];
          await this.database.usageRecords.update(row.id, data as any);
          out.push({ ...row, ...data });
        } else {
          const row = await this.database.usageRecords.create({
            customerId,
            subscriptionId,
            resource,
            periodKey,
            ...data,
          } as any);
          out.push(row);
        }
      } catch {
        /* best-effort snapshot */
      }
    }
    return out;
  }
}
