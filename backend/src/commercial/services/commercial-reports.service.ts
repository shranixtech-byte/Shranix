import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class CommercialReportsService {
  constructor(private readonly database: DatabaseService) {}

  async subscriptionRegister(
    query: { status?: string; from?: string; to?: string } = {},
  ): Promise<any[]> {
    const res = await this.database.subscriptions
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    let rows = (res?.data || []).filter((s: any) => !s.isDeleted);
    if (query.status) {
      rows = rows.filter((s: any) => s.status === query.status);
    }
    if (query.from) {
      rows = rows.filter(
        (s: any) => String(s.startDate || '').slice(0, 10) >= String(query.from).slice(0, 10),
      );
    }
    if (query.to) {
      rows = rows.filter(
        (s: any) => String(s.startDate || '').slice(0, 10) <= String(query.to).slice(0, 10),
      );
    }
    return rows
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((s: any) => this.projectSubscription(s));
  }

  async activeSubscriptions(): Promise<any[]> {
    const res = await this.database.subscriptions
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    return (res?.data || [])
      .filter(
        (s: any) =>
          !s.isDeleted && ['ACTIVE', 'GRACE_PERIOD', 'PAST_DUE'].includes(String(s.status)),
      )
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((s: any) => this.projectSubscription(s));
  }

  async expiringSubscriptions(days = 30): Promise<any[]> {
    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(new Date(`${today}T00:00:00`).getTime() + days * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const res = await this.database.subscriptions
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    return (res?.data || [])
      .filter(
        (s: any) =>
          !s.isDeleted &&
          ['ACTIVE', 'TRIAL', 'GRACE_PERIOD'].includes(String(s.status)) &&
          String(s.endDate || '').slice(0, 10) >= today &&
          String(s.endDate || '').slice(0, 10) <= horizon,
      )
      .sort((a: any, b: any) => String(a.endDate).localeCompare(String(b.endDate)))
      .map((s: any) => this.projectSubscription(s));
  }

  async trialReport(): Promise<any[]> {
    const res = await this.database.subscriptions
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    return (res?.data || [])
      .filter((s: any) => !s.isDeleted && s.status === 'TRIAL')
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((s: any) => this.projectSubscription(s));
  }

  async lifecycleReport(
    eventType: string,
    query: { from?: string; to?: string } = {},
  ): Promise<any[]> {
    const res = await this.database.subscriptionEvents
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    let rows = (res?.data || []).filter((e: any) => !e.isDeleted && e.eventType === eventType);
    if (query.from) {
      rows = rows.filter(
        (e: any) => String(e.createdAt).slice(0, 10) >= String(query.from).slice(0, 10),
      );
    }
    if (query.to) {
      rows = rows.filter(
        (e: any) => String(e.createdAt).slice(0, 10) <= String(query.to).slice(0, 10),
      );
    }
    return rows.sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  async revenueReport(query: { from?: string; to?: string; status?: string } = {}): Promise<any> {
    const res = await this.database.billingInvoices
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    let rows = (res?.data || []).filter((i: any) => !i.isDeleted);
    if (query.status) {
      rows = rows.filter((i: any) => i.status === query.status);
    }
    if (query.from) {
      rows = rows.filter(
        (i: any) =>
          String(i.issuedAt || i.createdAt).slice(0, 10) >= String(query.from).slice(0, 10),
      );
    }
    if (query.to) {
      rows = rows.filter(
        (i: any) => String(i.issuedAt || i.createdAt).slice(0, 10) <= String(query.to).slice(0, 10),
      );
    }
    const total = rows.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
    const tax = rows.reduce((sum, i) => sum + (Number(i.taxAmount) || 0), 0);
    const discount = rows.reduce((sum, i) => sum + (Number(i.discountAmount) || 0), 0);
    return {
      count: rows.length,
      total: Math.round(total * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      invoices: rows.sort((a: any, b: any) =>
        String(b.createdAt).localeCompare(String(a.createdAt)),
      ),
    };
  }

  async paymentReport(query: { status?: string; from?: string; to?: string } = {}): Promise<any> {
    const res = await this.database.billingPayments
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    let rows = (res?.data || []).filter((p: any) => !p.isDeleted);
    if (query.status) {
      rows = rows.filter((p: any) => p.status === query.status);
    }
    if (query.from) {
      rows = rows.filter(
        (p: any) => String(p.createdAt).slice(0, 10) >= String(query.from).slice(0, 10),
      );
    }
    if (query.to) {
      rows = rows.filter(
        (p: any) => String(p.createdAt).slice(0, 10) <= String(query.to).slice(0, 10),
      );
    }
    const byStatus: Record<string, number> = {};
    for (const p of rows) {
      byStatus[String(p.status)] = (byStatus[String(p.status)] || 0) + 1;
    }
    return {
      count: rows.length,
      collected:
        Math.round(
          rows
            .filter((p) => p.status === 'SUCCESS')
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) * 100,
        ) / 100,
      byStatus,
      payments: rows.sort((a: any, b: any) =>
        String(b.createdAt).localeCompare(String(a.createdAt)),
      ),
    };
  }

  async refundReport(query: { from?: string; to?: string } = {}): Promise<any[]> {
    const res = await this.database.billingPayments
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    let rows = (res?.data || []).filter(
      (p: any) =>
        !p.isDeleted &&
        (p.status === 'REFUNDED' || String(p.refundStatus || '').includes('REFUND')),
    );
    if (query.from) {
      rows = rows.filter(
        (p: any) => String(p.createdAt).slice(0, 10) >= String(query.from).slice(0, 10),
      );
    }
    if (query.to) {
      rows = rows.filter(
        (p: any) => String(p.createdAt).slice(0, 10) <= String(query.to).slice(0, 10),
      );
    }
    return rows.sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  async couponUsageReport(): Promise<any[]> {
    const couponsRes = await this.database.coupons
      .findAll({ page: 1, pageSize: 500 } as any)
      .catch(() => ({ data: [] }));
    const coupons = (couponsRes?.data || []).filter((c: any) => !c.isDeleted);
    const out: any[] = [];
    for (const c of coupons) {
      const redRes = await this.database.couponRedemptions.findAll({
        page: 1,
        pageSize: 10000,
        filters: [{ field: 'couponId', operator: 'eq', value: c.id }],
      } as any);
      const redemptions = (redRes?.data || []).filter((r: any) => !r.isDeleted);
      out.push({
        id: c.id,
        couponCode: c.couponCode,
        discountType: c.discountType,
        discountValue: c.discountValue,
        status: c.status,
        usedCount: redemptions.length,
        totalDiscount:
          Math.round(
            redemptions.reduce((sum, r) => sum + (Number(r.discountAmount) || 0), 0) * 100,
          ) / 100,
        usageLimit: c.usageLimit,
      });
    }
    return out;
  }

  async mrrArr(): Promise<{ mrr: number; arr: number; activeCount: number }> {
    const res = await this.database.subscriptions
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    const active = (res?.data || []).filter(
      (s: any) => !s.isDeleted && ['ACTIVE', 'GRACE_PERIOD', 'PAST_DUE'].includes(String(s.status)),
    );
    let mrr = 0;
    for (const s of active) {
      const months = cycleMonths(s.billingCycle);
      if (months > 0) {
        mrr += (Number(s.finalAmount) || 0) / months;
      }
    }
    mrr = Math.round(mrr * 100) / 100;
    return { mrr, arr: Math.round(mrr * 12 * 100) / 100, activeCount: active.length };
  }

  async churnReport(query: { from?: string; to?: string } = {}): Promise<any> {
    const eventsRes = await this.database.subscriptionEvents
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    let cancels = (eventsRes?.data || []).filter(
      (e: any) => !e.isDeleted && e.eventType === 'cancelled',
    );
    if (query.from) {
      cancels = cancels.filter(
        (e: any) => String(e.createdAt).slice(0, 10) >= String(query.from).slice(0, 10),
      );
    }
    if (query.to) {
      cancels = cancels.filter(
        (e: any) => String(e.createdAt).slice(0, 10) <= String(query.to).slice(0, 10),
      );
    }
    return {
      count: cancels.length,
      events: cancels.sort((a: any, b: any) =>
        String(b.createdAt).localeCompare(String(a.createdAt)),
      ),
    };
  }

  private projectSubscription(s: any): any {
    return {
      id: s.id,
      subscriptionNumber: s.subscriptionNumber,
      customerId: s.customerId,
      planId: s.planId,
      planVersionId: s.planVersionId,
      billingCycle: s.billingCycle,
      startDate: s.startDate,
      endDate: s.endDate,
      trialStart: s.trialStart,
      trialEnd: s.trialEnd,
      status: s.status,
      paymentStatus: s.paymentStatus,
      price: s.price,
      discountAmount: s.discountAmount,
      taxAmount: s.taxAmount,
      finalAmount: s.finalAmount,
      currency: s.currency,
      autoRenew: Boolean(s.autoRenew),
      source: s.source,
      createdAt: s.createdAt,
    };
  }
}

function cycleMonths(cycle: string): number {
  switch (String(cycle || 'monthly')) {
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'half_yearly':
      return 6;
    case 'yearly':
      return 12;
    default:
      return 0;
  }
}
