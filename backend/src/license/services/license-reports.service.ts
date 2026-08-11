import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

import { LicensesService } from './licenses.service';

@Injectable()
export class LicenseReportsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly licenses: LicensesService,
  ) {}

  /** License register (all licenses, enriched). */
  async register(query: { page?: number; pageSize?: number; status?: string } = {}): Promise<any> {
    return this.licenses.findAll({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
    });
  }

  async byStatus(): Promise<Record<string, any>> {
    const res = await this.database.licenses.findAll({ page: 1, pageSize: 10000 } as any);
    const rows = (res?.data || []).filter((l: any) => !l.isDeleted);
    const byStatus: Record<string, number> = {};
    for (const l of rows) {
      byStatus[String(l.status)] = (byStatus[String(l.status)] || 0) + 1;
    }
    return { data: byStatus, total: rows.length };
  }

  /** Device utilization — per license: allowed vs used vs free. */
  async deviceUtilization(): Promise<{ data: any[]; totalSlots: number; usedSlots: number }> {
    const res = await this.database.licenses.findAll({ page: 1, pageSize: 10000 } as any);
    const rows = (res?.data || []).filter((l: any) => !l.isDeleted);
    const customers = await this.database.customers
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    const nameBy = new Map<string, string>();
    for (const c of customers.data || []) {
      nameBy.set(c.id, String(c.customerName || c.firmName || c.name || ''));
    }
    const data = rows.map((l: any) => {
      const max = Number(l.maxDevices) || 1;
      const used = Number(l.activeDevices) || 0;
      return {
        licenseId: l.id,
        licenseNumber: l.licenseNumber,
        customerName: nameBy.get(l.customerId) || l.customerId,
        status: l.status,
        allowed: max,
        used,
        free: Math.max(0, max - used),
      };
    });
    return {
      data,
      totalSlots: data.reduce((s, d) => s + d.allowed, 0),
      usedSlots: data.reduce((s, d) => s + d.used, 0),
    };
  }

  async activationReport(): Promise<{ data: any[]; total: number }> {
    const res = await this.database.licenseActivations.findAll({ page: 1, pageSize: 10000 } as any);
    const rows = (res?.data || [])
      .filter((a: any) => !a.isDeleted)
      .sort((a: any, b: any) => String(b.requestedAt).localeCompare(String(a.requestedAt)));
    return {
      data: rows.map((a: any) => ({
        activationPublicId: a.activationPublicId,
        licenseId: a.licenseId,
        activationType: a.activationType,
        status: a.status,
        requestedAt: a.requestedAt,
        approvedAt: a.approvedAt,
        reason: a.reason,
      })),
      total: rows.length,
    };
  }

  async transferReport(): Promise<{ data: any[]; total: number }> {
    const res = await this.database.licenseTransfers.findAll({ page: 1, pageSize: 10000 } as any);
    const rows = (res?.data || [])
      .filter((t: any) => !t.isDeleted)
      .sort((a: any, b: any) => String(b.requestedAt).localeCompare(String(a.requestedAt)));
    return { data: rows, total: rows.length };
  }

  /** Expiry forecast — expiring licenses grouped by month. */
  async expiryForecast(): Promise<Record<string, any>> {
    const res = await this.database.licenses.findAll({ page: 1, pageSize: 10000 } as any);
    const rows = (res?.data || []).filter(
      (l: any) =>
        !l.isDeleted && ['ACTIVE', 'GRACE_PERIOD'].includes(String(l.status)) && l.expiresAt,
    );
    const byMonth: Record<string, number> = {};
    for (const l of rows) {
      const key = String(l.expiresAt).slice(0, 7);
      byMonth[key] = (byMonth[key] || 0) + 1;
    }
    return {
      data: Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
      total: rows.length,
    };
  }

  async planWise(): Promise<{ data: any[] }> {
    const res = await this.database.licenses.findAll({ page: 1, pageSize: 10000 } as any);
    const rows = (res?.data || []).filter((l: any) => !l.isDeleted);
    const plans = await this.database.plans
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    const nameBy = new Map<string, string>();
    for (const p of plans.data || []) {
      nameBy.set(p.id, String(p.planName || p.planCode));
    }
    const byPlan: Record<string, { count: number; statuses: Record<string, number> }> = {};
    for (const l of rows) {
      const key = nameBy.get(l.planId) || l.planId;
      byPlan[key] = byPlan[key] || { count: 0, statuses: {} };
      byPlan[key].count += 1;
      byPlan[key].statuses[String(l.status)] = (byPlan[key].statuses[String(l.status)] || 0) + 1;
    }
    return {
      data: Object.entries(byPlan).map(([planName, v]) => ({ planName, ...v })),
    };
  }
}
