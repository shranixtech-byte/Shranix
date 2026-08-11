import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

const MONTHS = 6;

function monthKey(dateIso: string): string {
  return String(dateIso || '').slice(0, 7);
}

@Injectable()
export class CommercialDashboardService {
  constructor(private readonly database: DatabaseService) {}

  async getDashboard(): Promise<Record<string, any>> {
    const subs = await this.loadAllSubscriptions();
    const invoices = await this.loadAllInvoices();
    const payments = await this.loadAllPayments();
    const events = await this.loadAllEvents();
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = monthKey(today);

    const byStatus: Record<string, number> = {};
    for (const s of subs) {
      byStatus[String(s.status)] = (byStatus[String(s.status)] || 0) + 1;
    }
    const activeSubs = subs.filter((s) =>
      ['ACTIVE', 'GRACE_PERIOD', 'PAST_DUE'].includes(String(s.status)),
    );
    const expiringSoon = activeSubs.filter((s) => {
      const end = String(s.endDate || '').slice(0, 10);
      return (
        end >= today &&
        end <=
          new Date(new Date(`${today}T00:00:00`).getTime() + 7 * 86_400_000)
            .toISOString()
            .slice(0, 10)
      );
    });
    const trials = subs.filter((s) => s.status === 'TRIAL');
    const cancelled = subs.filter((s) => s.status === 'CANCELLED');
    const suspended = subs.filter((s) => s.status === 'SUSPENDED');

    // Revenue — from billing invoices (issued/paid)
    const totalBilling = round(invoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0));
    const paid = round(
      invoices
        .filter((i) => i.paymentStatus === 'paid')
        .reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0),
    );
    const pending = round(
      invoices
        .filter((i) => i.paymentStatus === 'unpaid' || i.paymentStatus === 'pending')
        .reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0),
    );
    const failedPayments = payments.filter((p) => p.status === 'FAILED').length;
    const totalPayments = payments.length;
    const paymentSuccessRate =
      totalPayments > 0
        ? round((payments.filter((p) => p.status === 'SUCCESS').length / totalPayments) * 100)
        : 0;

    // MRR / ARR — monthly-equivalent of active subscription final amounts
    let mrr = 0;
    for (const s of activeSubs) {
      const cycleMonths = cycleToMonths(s.billingCycle);
      if (cycleMonths > 0) {
        mrr += (Number(s.finalAmount) || 0) / cycleMonths;
      }
    }
    mrr = round(mrr);
    const arr = round(mrr * 12);

    // Churn (month) — cancellations this month / active at month start (approximation)
    const cancellationsThisMonth = events.filter(
      (e) => e.eventType === 'cancelled' && monthKey(e.createdAt) === thisMonth,
    ).length;
    const activeAtMonthStart = subs.filter(
      (s) =>
        String(s.createdAt).slice(0, 7) < thisMonth &&
        !['CANCELLED', 'EXPIRED', 'UPGRADED', 'DOWNGRADED'].includes(String(s.status)),
    ).length;
    const churnRate =
      activeAtMonthStart > 0 ? round((cancellationsThisMonth / activeAtMonthStart) * 100) : 0;

    // Counts
    const upgrades = events.filter(
      (e) => e.eventType === 'upgraded' && monthKey(e.createdAt) === thisMonth,
    ).length;
    const downgrades = events.filter(
      (e) => e.eventType === 'downgraded' && monthKey(e.createdAt) === thisMonth,
    ).length;
    const renewals = events.filter(
      (e) => e.eventType === 'renewed' && monthKey(e.createdAt) === thisMonth,
    ).length;
    const refunds = payments.filter(
      (p) => p.status === 'REFUNDED' || p.refundStatus === 'REFUNDED',
    ).length;
    const newSubs = subs.filter((s) => monthKey(s.createdAt) === thisMonth).length;

    // Trends
    const months: string[] = [];
    for (let i = MONTHS - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().slice(0, 7));
    }
    const subscriptionTrend = months.map(
      (m) => subs.filter((s) => monthKey(s.createdAt) === m).length,
    );
    const revenueTrend = months.map((m) =>
      round(
        invoices
          .filter((i) => monthKey(i.issuedAt || i.createdAt) === m)
          .reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0),
      ),
    );
    const cancellationTrend = months.map(
      (m) =>
        events.filter((e) => e.eventType === 'cancelled' && monthKey(e.createdAt) === m).length,
    );
    const renewalTrend = months.map(
      (m) => events.filter((e) => e.eventType === 'renewed' && monthKey(e.createdAt) === m).length,
    );

    // Plan distribution
    const planMap = new Map<string, { planId: string; planName: string; count: number }>();
    for (const s of activeSubs) {
      const planId = String(s.planId || '');
      const entry = planMap.get(planId) || {
        planId,
        planName: `Plan ${planId.slice(0, 8)}`,
        count: 0,
      };
      entry.count += 1;
      planMap.set(planId, entry);
    }
    for (const s of subs) {
      if (!['ACTIVE', 'GRACE_PERIOD', 'PAST_DUE'].includes(String(s.status)) || !s.planId) {
        continue;
      }
      const plan = await this.database.plans.findById(s.planId).catch(() => null);
      if (plan && planMap.has(s.planId)) {
        planMap.get(s.planId)!.planName = plan.displayName || plan.planName;
      }
    }
    const planDistribution = [...planMap.values()].sort((a, b) => b.count - a.count);

    return {
      totalCustomers: subs.length ? new Set(subs.map((s) => s.customerId)).size : 0,
      subscriptions: {
        total: subs.length,
        active: activeSubs.length,
        trials: trials.length,
        expiringSoon: expiringSoon.length,
        expired: byStatus.EXPIRED || 0,
        gracePeriod: byStatus.GRACE_PERIOD || 0,
        suspended: suspended.length,
        cancelled: cancelled.length,
        pendingPayment: byStatus.PENDING_PAYMENT || 0,
      },
      revenue: {
        totalBilling,
        paid,
        pending,
        failedPayments,
        paymentSuccessRate,
        mrr,
        arr,
      },
      lifecycle: {
        newSubscriptions: newSubs,
        renewals,
        upgrades,
        downgrades,
        cancellations: cancellationsThisMonth,
        refunds,
      },
      churnRate,
      trends: {
        months,
        subscriptionTrend,
        revenueTrend,
        cancellationTrend,
        renewalTrend,
      },
      planDistribution,
    };
  }

  private async loadAllSubscriptions(): Promise<any[]> {
    const res = await this.database.subscriptions
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    return (res?.data || []).filter((s: any) => !s.isDeleted);
  }

  private async loadAllInvoices(): Promise<any[]> {
    const res = await this.database.billingInvoices
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    return (res?.data || []).filter((i: any) => !i.isDeleted);
  }

  private async loadAllPayments(): Promise<any[]> {
    const res = await this.database.billingPayments
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    return (res?.data || []).filter((p: any) => !p.isDeleted);
  }

  private async loadAllEvents(): Promise<any[]> {
    const res = await this.database.subscriptionEvents
      .findAll({ page: 1, pageSize: 10000 } as any)
      .catch(() => ({ data: [] }));
    return (res?.data || []).filter((e: any) => !e.isDeleted);
  }
}

function cycleToMonths(cycle: string): number {
  switch (String(cycle || 'monthly')) {
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'half_yearly':
      return 6;
    case 'yearly':
      return 12;
    case 'lifetime':
      return 0;
    default:
      return 1;
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
