import { describe, expect, it, vi, beforeEach } from 'vitest';

import { SalesReportsService } from './reports.service';

function makeQuoteRepo(rows: any[] = []) {
  const list = rows.map((r) => ({ isDeleted: false, ...r }));
  return {
    findAll: vi.fn(async () => ({ data: list, total: list.length })),
  };
}

function makeService(quotes: any[]) {
  const database = {
    salesQuotations: makeQuoteRepo(quotes),
    // Not used by getQuotationSummary
    salesInvoices: makeQuoteRepo(),
    invoiceItems: makeQuoteRepo(),
    items: makeQuoteRepo(),
  };
  return new SalesReportsService(database as any);
}

const today = new Date().toISOString().split('T')[0];
const yesterday = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
})();

function quote(id: string, status: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    status,
    quoteDate: today,
    grandTotal: 1000,
    convertedToOrder: false,
    ...overrides,
  };
}

describe('SalesReportsService.getQuotationSummary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns zeros for an empty quotation list', async () => {
    const service = makeService([]);
    const s = await service.getQuotationSummary();

    expect(s.total).toBe(0);
    expect(s.converted).toBe(0);
    expect(s.lost).toBe(0);
    expect(s.kpis.total.value).toBe(0);
    expect(s.kpis.conversionRate.value).toBe(0);
    expect(s.statusBreakdown).toEqual([]);
    expect(s.dailyTrend).toHaveLength(14);
    expect(s.monthlyTrend).toHaveLength(6);
  });

  it('computes status counts, today, converted, and lost', async () => {
    const service = makeService([
      quote('q1', 'draft'),
      quote('q2', 'pending'),
      quote('q3', 'under_review'),
      quote('q4', 'submitted'),
      quote('q5', 'approved'),
      quote('q6', 'rejected'),
      quote('q7', 'converted'),
      quote('q8', 'convertedToOrder', { status: 'approved', convertedToOrder: true }),
      quote('q9', 'lost'),
      quote('q10', 'expired'),
      quote('q11', 'draft', { quoteDate: yesterday }),
    ]);

    const s = await service.getQuotationSummary();

    expect(s.total).toBe(11);
    expect(s.kpis.total.value).toBe(11);
    expect(s.kpis.draft.value).toBe(2);
    // pending + submitted + under_review
    expect(s.kpis.pending.value).toBe(3);
    // q5 approved + q8 approved (with convertedToOrder flag — stays approved too)
    expect(s.kpis.approved.value).toBe(2);
    expect(s.kpis.rejected.value).toBe(1);
    // status 'converted' OR convertedToOrder flag
    expect(s.converted).toBe(2);
    expect(s.kpis.converted.value).toBe(2);
    // lost + expired
    expect(s.lost).toBe(2);
    expect(s.kpis.lost.value).toBe(2);
    // 10 of 11 quotes created today (q11 is yesterday)
    expect(s.kpis.today.value).toBe(10);
  });

  it('computes conversion rate and win rate', async () => {
    const service = makeService([
      quote('q1', 'converted'),
      quote('q2', 'converted'),
      quote('q3', 'rejected'),
      quote('q4', 'lost'),
      quote('q5', 'pending'),
    ]);

    const s = await service.getQuotationSummary();

    // 2 / 5 total
    expect(s.kpis.conversionRate.value).toBeCloseTo(40, 5);
    // 2 / (2 + 1 rejected + 1 lost) decided
    expect(s.kpis.winRate.value).toBeCloseTo(50, 5);
  });

  it('only includes non-zero statuses in the funnel', async () => {
    const service = makeService([quote('q1', 'converted'), quote('q2', 'draft')]);
    const s = await service.getQuotationSummary();

    const statuses = s.statusBreakdown.map((b) => b.status);
    expect(statuses).toContain('converted');
    expect(statuses).toContain('draft');
    expect(statuses).not.toContain('rejected');
    expect(statuses).not.toContain('approved');
  });

  it('funnel segments are mutually exclusive and sum to total (flag-overlap safe)', async () => {
    // q2 has status 'approved' but also convertedToOrder flag — it must land in
    // exactly one funnel bucket so the stacked bar never exceeds 100%.
    const service = makeService([
      quote('q1', 'converted'),
      quote('q2', 'approved', { convertedToOrder: true }),
      quote('q3', 'lost'),
    ]);
    const s = await service.getQuotationSummary();

    const funnelTotal = s.statusBreakdown.reduce((sum, b) => sum + b.count, 0);
    expect(funnelTotal).toBe(3); // === total
    expect(s.converted).toBe(2); // KPI keeps the broader status-OR-flag definition
    const convertedSegment = s.statusBreakdown.find((b) => b.status === 'converted')?.count || 0;
    expect(convertedSegment).toBe(1); // funnel uses status only
  });

  it('sums quotation value and computes averages', async () => {
    const service = makeService([
      quote('q1', 'converted', { grandTotal: 5000 }),
      quote('q2', 'draft', { grandTotal: 1500 }),
    ]);
    const s = await service.getQuotationSummary();

    expect(s.kpis.totalValue.value).toBe(6500);
    expect(s.kpis.convertedValue.value).toBe(5000);
    expect(s.kpis.avgValue.value).toBeCloseTo(3250, 5);
  });
});
