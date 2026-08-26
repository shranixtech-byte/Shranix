import { Injectable } from '@nestjs/common';

import { KpiEngineService } from '../automation/kpi-engine.service';
import { DatabaseService } from '../database/database.service';

// ═══════════════════════════════════════════════════════════════════
// Analytics payload contract (shared shape for every BI dashboard page)
// ═══════════════════════════════════════════════════════════════════

export interface AnalyticsKpi {
  key: string;
  label: string;
  value: number;
  format?: 'currency' | 'number' | 'percent';
  trend?: 'up' | 'down' | 'flat';
  color?: string;
}

export interface AnalyticsChartSeries {
  key: string;
  name: string;
  color: string;
}

export interface AnalyticsChart {
  title: string;
  type: 'bar' | 'area';
  data: Record<string, unknown>[];
  series: AnalyticsChartSeries[];
  height?: number;
}

export interface AnalyticsTableColumn {
  key: string;
  label: string;
  format?: 'currency' | 'number' | 'percent' | 'date';
}

export interface AnalyticsTable {
  title: string;
  columns: AnalyticsTableColumn[];
  rows: Record<string, unknown>[];
}

export interface AnalyticsPayload {
  generatedAt: string;
  kpis: AnalyticsKpi[];
  charts: AnalyticsChart[];
  tables: AnalyticsTable[];
}

export interface AnalyticsFilters {
  fromDate?: string;
  toDate?: string;
  period?: string;
}

// Statuses that are financially/operationally valid for totals.
const EXCLUDED_STATUSES = ['draft', 'cancelled', 'void', 'rejected'];

// ═══════════════════════════════════════════════════════════════════

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly kpiEngine: KpiEngineService,
  ) {}

  // ── Shared helpers ────────────────────────────────────────────────

  /** Account ids whose name/code indicates a cash or bank account. */
  private async cashBankAccountIds(): Promise<Set<string>> {
    try {
      const accounts = await this.all<any>(this.database.chartOfAccounts);
      const ids = new Set<string>();
      for (const a of accounts) {
        const name = String(a.accountName || a.accountCode || '').toLowerCase();
        if (name.includes('cash') || name.includes('bank')) {
          ids.add(a.id);
        }
      }
      return ids;
    } catch {
      return new Set();
    }
  }

  /** Outstanding receivables from unpaid sales invoices (source of truth). */
  private async receivablesTotal(invoices?: any[]): Promise<number> {
    const active =
      invoices ||
      (await this.all<any>(this.database.salesInvoices)).filter((i) => this.isActive(i.status));
    return active
      .filter((i) => i.paymentStatus !== 'paid')
      .reduce((s, i) => s + this.num(i.balanceAmount ?? i.grandTotal), 0);
  }

  /** Outstanding payables from unpaid purchase invoices (source of truth). */
  private async payablesTotal(invoices?: any[]): Promise<number> {
    const active =
      invoices ||
      (await this.all<any>(this.database.purchaseInvoices)).filter((i) => this.isActive(i.status));
    return active
      .filter((i) => i.paymentStatus !== 'paid')
      .reduce((s, i) => s + this.num(i.balanceAmount ?? i.grandTotal), 0);
  }

  /** Cash + bank balance derived from GL entries on cash/bank accounts. */
  private async cashBalance(): Promise<number> {
    try {
      const cashIds = await this.cashBankAccountIds();
      if (cashIds.size === 0) {
        return 0;
      }
      const entries = await this.all<any>(this.database.glEntries);
      return entries.reduce((s, e) => {
        if (!cashIds.has(e.accountId)) {
          return s;
        }
        return s + this.num(e.debit) - this.num(e.credit);
      }, 0);
    } catch {
      return 0;
    }
  }

  private num(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private round(v: number, d = 2): number {
    const m = 10 ** d;
    return Math.round(v * m) / m;
  }

  private pct(part: number, whole: number): number {
    return whole > 0 ? this.round((part / whole) * 100, 1) : 0;
  }

  private monthKey(iso: string | undefined | null): string {
    if (!iso) {
      return '';
    }
    const s = String(iso);
    return s.slice(0, 7); // YYYY-MM
  }

  private monthLabel(key: string): string {
    const [y, m] = key.split('-');
    const names = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${names[Number(m) - 1]} ${y?.slice(2)}`;
  }

  private lastMonths(n: number): { key: string; label: string }[] {
    const out: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push({ key, label: this.monthLabel(key) });
    }
    return out;
  }

  private fillSeries(
    months: { key: string; label: string }[],
    map: Map<string, number>,
  ): Record<string, unknown>[] {
    return months.map((m) => ({
      label: m.label,
      key: m.key,
      value: this.round(map.get(m.key) || 0),
    }));
  }

  private isActive(status: string | undefined | null): boolean {
    return !EXCLUDED_STATUSES.includes(String(status || ''));
  }

  /** Build a date-range filter condition for a given column name. */
  private dateFilter(field: string, filters?: AnalyticsFilters): any[] {
    if (!filters) {return [];}
    const conds: any[] = [];
    if (filters.fromDate) {
      conds.push({ field, operator: 'gte', value: filters.fromDate });
    }
    if (filters.toDate) {
      conds.push({ field, operator: 'lte', value: filters.toDate });
    }
    return conds;
  }

  private async all<T = any>(repo: any, pageSize = 5000, filters?: any[]): Promise<T[]> {
    try {
      const q: any = { page: 1, pageSize };
      if (filters && filters.length) {
        q.filters = filters;
      }
      const res = await repo.findAll(q);
      return (res?.data || []) as T[];
    } catch {
      return [];
    }
  }

  private async nameMaps() {
    const items = await this.all<any>(this.database.items);
    const categories = await this.all<any>(this.database.categories);
    const warehouses = await this.all<any>(this.database.warehouses);
    const customers = await this.all<any>(this.database.ledgerMaster, 5000, [
      { field: 'ledgerType', operator: 'eq', value: 'customer' },
    ]);
    const suppliers = await this.all<any>(this.database.suppliers);

    const itemName = new Map(items.map((i) => [i.id, i.name || i.sku || i.id]));
    const categoryName = new Map(categories.map((c) => [c.id, c.name || c.id]));
    const warehouseName = new Map(warehouses.map((w) => [w.id, w.name || w.code || w.id]));
    const customerName = new Map(customers.map((c) => [c.id, c.partyId || c.id]));
    const supplierName = new Map(suppliers.map((s) => [s.id, s.name || s.id]));

    return {
      itemName,
      categoryName,
      warehouseName,
      customerName,
      supplierName,
      items,
      suppliers,
      customers,
      warehouses,
    };
  }

  // ═════════════════════════════════════════════════════════════════
  // 1. MANAGEMENT DASHBOARD (Phase 5.11)
  // ═════════════════════════════════════════════════════════════════

  async getOverview(filters?: AnalyticsFilters): Promise<AnalyticsPayload> {
    const dfInv = this.dateFilter('invoiceDate', filters);
    const [kpis, invoices, purchaseInvoices, items, names] = await Promise.all([
      this.kpiEngine.calculateAllKpis().catch(() => []),
      this.all<any>(this.database.salesInvoices, 5000, dfInv),
      this.all<any>(this.database.purchaseInvoices, 5000, dfInv),
      this.all<any>(this.database.items),
      this.nameMaps(),
    ]);

    const activeInvoices = invoices.filter((i) => this.isActive(i.status));
    const activePurchases = purchaseInvoices.filter((i) => this.isActive(i.status));

    const totalSales = activeInvoices.reduce((s, i) => s + this.num(i.grandTotal), 0);
    const totalPurchase = activePurchases.reduce((s, i) => s + this.num(i.grandTotal), 0);
    const inventoryValue = items.reduce(
      (s, i) => s + this.num(i.currentStock) * this.num(i.purchaseRate),
      0,
    );
    const receivables = await this.receivablesTotal(activeInvoices);
    const payables = await this.payablesTotal(activePurchases);
    const cashBank = await this.cashBalance();

    const kpiMap = new Map(kpis.map((k: any) => [k.kpi.id, k.value]));

    const kpiCards: AnalyticsKpi[] = [
      {
        key: 'totalSales',
        label: 'Total Sales',
        value: this.round(totalSales),
        format: 'currency',
        color: 'border-l-green-500',
      },
      {
        key: 'totalPurchase',
        label: 'Total Purchase',
        value: this.round(totalPurchase),
        format: 'currency',
        color: 'border-l-blue-500',
      },
      {
        key: 'grossProfit',
        label: 'Gross Profit',
        value: this.round(this.num(kpiMap.get('gross_profit'))),
        format: 'currency',
        color: 'border-l-purple-500',
      },
      {
        key: 'netProfit',
        label: 'Net Profit',
        value: this.round(this.num(kpiMap.get('net_profit'))),
        format: 'currency',
        color: 'border-l-violet-500',
      },
      {
        key: 'receivables',
        label: 'Receivables',
        value: this.round(receivables),
        format: 'currency',
        color: 'border-l-amber-500',
      },
      {
        key: 'payables',
        label: 'Payables',
        value: this.round(payables),
        format: 'currency',
        color: 'border-l-orange-500',
      },
      {
        key: 'inventoryValue',
        label: 'Inventory Value',
        value: this.round(inventoryValue),
        format: 'currency',
        color: 'border-l-teal-500',
      },
      {
        key: 'cashBalance',
        label: 'Cash / Bank Balance',
        value: this.round(cashBank),
        format: 'currency',
        color: 'border-l-emerald-500',
      },
      {
        key: 'gstPayable',
        label: 'GST Payable',
        value: this.round(this.num(kpiMap.get('gst_payable'))),
        format: 'currency',
        color: 'border-l-red-500',
      },
      {
        key: 'invoiceCount',
        label: 'Sales Invoices',
        value: activeInvoices.length,
        format: 'number',
        color: 'border-l-slate-500',
      },
    ];

    // Monthly trend charts
    const months = this.lastMonths(12);
    const salesByMonth = new Map<string, number>();
    const purchaseByMonth = new Map<string, number>();
    for (const inv of activeInvoices) {
      const k = this.monthKey(inv.invoiceDate);
      salesByMonth.set(k, (salesByMonth.get(k) || 0) + this.num(inv.grandTotal));
    }
    for (const inv of activePurchases) {
      const k = this.monthKey(inv.invoiceDate);
      purchaseByMonth.set(k, (purchaseByMonth.get(k) || 0) + this.num(inv.grandTotal));
    }

    const salesSeries = this.fillSeries(months, salesByMonth);

    const charts: AnalyticsChart[] = [
      {
        title: 'Sales vs Purchase Trend',
        type: 'area',
        data: months.map((m) => ({
          label: m.label,
          Sales: this.round(salesByMonth.get(m.key) || 0),
          Purchase: this.round(purchaseByMonth.get(m.key) || 0),
        })),
        series: [
          { key: 'Sales', name: 'Sales', color: '#22c55e' },
          { key: 'Purchase', name: 'Purchase', color: '#6366f1' },
        ],
      },
      {
        title: 'Monthly Sales',
        type: 'bar',
        data: salesSeries,
        series: [{ key: 'value', name: 'Sales', color: '#22c55e' }],
      },
    ];

    // Top customers / products tables
    const customerSales = new Map<string, number>();
    for (const inv of activeInvoices) {
      customerSales.set(
        inv.customerId,
        (customerSales.get(inv.customerId) || 0) + this.num(inv.grandTotal),
      );
    }
    const topCustomers = Array.from(customerSales.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, amount]) => ({
        customer: names.customerName.get(id) || id,
        amount: this.round(amount),
      }));

    const productSales = await this.productSalesAgg(activeInvoices, names);

    const tables: AnalyticsTable[] = [
      {
        title: 'Top Customers',
        columns: [
          { key: 'customer', label: 'Customer' },
          { key: 'amount', label: 'Sales', format: 'currency' },
        ],
        rows: topCustomers,
      },
      {
        title: 'Top Products',
        columns: [
          { key: 'product', label: 'Product' },
          { key: 'qty', label: 'Qty', format: 'number' },
          { key: 'amount', label: 'Sales', format: 'currency' },
        ],
        rows: productSales
          .slice(0, 10)
          .map((p) => ({ product: p.product, qty: p.qty, amount: p.amount })),
      },
    ];

    return { generatedAt: new Date().toISOString(), kpis: kpiCards, charts, tables };
  }

  // ═════════════════════════════════════════════════════════════════
  // 2. SALES ANALYTICS (Phase 5.12)
  // ═════════════════════════════════════════════════════════════════

  async getSales(filters?: AnalyticsFilters): Promise<AnalyticsPayload> {
    const df = this.dateFilter('invoiceDate', filters);
    const [invoices, items, productItems, returns, quotations, orders, names] = await Promise.all([
      this.all<any>(this.database.salesInvoices, 5000, df),
      this.all<any>(this.database.items),
      this.all<any>(this.database.invoiceItems),
      this.all<any>(this.database.salesReturns),
      this.all<any>(this.database.salesQuotations),
      this.all<any>(this.database.salesOrders),
      this.nameMaps(),
    ]);

    const active = invoices.filter((i) => this.isActive(i.status));
    const totalSales = active.reduce((s, i) => s + this.num(i.grandTotal), 0);
    const monthSales = active
      .filter((i) => this.monthKey(i.invoiceDate) === this.lastMonths(1)[0].key)
      .reduce((s, i) => s + this.num(i.grandTotal), 0);
    const outstanding = active
      .filter((i) => i.paymentStatus !== 'paid')
      .reduce((s, i) => s + this.num(i.balanceAmount ?? i.grandTotal), 0);
    const returnsTotal = returns.reduce((s, r) => s + this.num(r.grandTotal), 0);

    const kpis: AnalyticsKpi[] = [
      {
        key: 'totalRevenue',
        label: 'Total Revenue',
        value: this.round(totalSales),
        format: 'currency',
        color: 'border-l-green-500',
      },
      {
        key: 'totalOrders',
        label: 'Invoices',
        value: active.length,
        format: 'number',
        color: 'border-l-blue-500',
      },
      {
        key: 'avgOrderValue',
        label: 'Avg Invoice Value',
        value: this.round(active.length ? totalSales / active.length : 0),
        format: 'currency',
        color: 'border-l-purple-500',
      },
      {
        key: 'monthSales',
        label: 'This Month',
        value: this.round(monthSales),
        format: 'currency',
        color: 'border-l-teal-500',
      },
      {
        key: 'outstanding',
        label: 'Outstanding',
        value: this.round(outstanding),
        format: 'currency',
        color: 'border-l-amber-500',
      },
      {
        key: 'returns',
        label: 'Returns',
        value: this.round(returnsTotal),
        format: 'currency',
        color: 'border-l-red-500',
      },
    ];

    // Monthly + daily trends
    const months = this.lastMonths(12);
    const byMonth = new Map<string, number>();
    const byDay = new Map<string, number>();
    for (const inv of active) {
      const mk = this.monthKey(inv.invoiceDate);
      byMonth.set(mk, (byMonth.get(mk) || 0) + this.num(inv.grandTotal));
      const dk = String(inv.invoiceDate || '').slice(0, 10);
      byDay.set(dk, (byDay.get(dk) || 0) + this.num(inv.grandTotal));
    }
    const dailySeries = Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([d, v]) => ({ label: d.slice(5), value: this.round(v) }));

    const itemCategory = new Map(items.map((it: any) => [it.itemId ?? it.id, it.categoryId]));
    const catMap = new Map<string, number>();
    const prodMap = new Map<string, { qty: number; amount: number }>();
    const activeIds = new Set(active.map((i: any) => i.id));

    for (const line of productItems) {
      if (!activeIds.has(line.invoiceId)) {
        continue;
      }
      const catId = itemCategory.get(line.itemId);
      catMap.set(
        catId || 'uncategorized',
        (catMap.get(catId || 'uncategorized') || 0) +
          this.num(line.totalAmount ?? line.taxableValue),
      );
      const cur = prodMap.get(line.itemId) || { qty: 0, amount: 0 };
      cur.qty += this.num(line.quantity);
      cur.amount += this.num(line.totalAmount ?? line.taxableValue);
      prodMap.set(line.itemId, cur);
    }

    const categorySeries = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, v]) => ({
        label: names.categoryName.get(id) || (id === 'uncategorized' ? 'Uncategorized' : id),
        value: this.round(v),
      }));

    const productSeries = Array.from(prodMap.entries())
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 8)
      .map(([id, v]) => ({ label: names.itemName.get(id) || id, value: this.round(v.amount) }));

    const customerMap = new Map<string, number>();
    for (const inv of active) {
      customerMap.set(
        inv.customerId,
        (customerMap.get(inv.customerId) || 0) + this.num(inv.grandTotal),
      );
    }
    const customerSeries = Array.from(customerMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, v]) => ({ label: names.customerName.get(id) || id, value: this.round(v) }));

    const returnByMonth = new Map<string, number>();
    for (const r of returns) {
      const k = this.monthKey(r.returnDate);
      returnByMonth.set(k, (returnByMonth.get(k) || 0) + this.num(r.grandTotal));
    }

    const charts: AnalyticsChart[] = [
      {
        title: 'Monthly Sales Trend',
        type: 'area',
        data: this.fillSeries(months, byMonth),
        series: [{ key: 'value', name: 'Sales', color: '#22c55e' }],
      },
      {
        title: 'Daily Sales (last 14 days)',
        type: 'bar',
        data: dailySeries,
        series: [{ key: 'value', name: 'Sales', color: '#6366f1' }],
      },
      {
        title: 'Sales by Category',
        type: 'bar',
        data: categorySeries,
        series: [{ key: 'value', name: 'Sales', color: '#8b5cf6' }],
      },
      {
        title: 'Top Products',
        type: 'bar',
        data: productSeries,
        series: [{ key: 'value', name: 'Sales', color: '#06b6d4' }],
      },
      {
        title: 'Top Customers',
        type: 'bar',
        data: customerSeries,
        series: [{ key: 'value', name: 'Sales', color: '#f59e0b' }],
      },
      {
        title: 'Sales Returns Trend',
        type: 'bar',
        data: this.fillSeries(months, returnByMonth),
        series: [{ key: 'value', name: 'Returns', color: '#ef4444' }],
      },
    ];

    // Quotation funnel
    const quoteCount = quotations.length;
    const converted = quotations.filter(
      (q: any) => q.status === 'approved' && q.convertedToOrder,
    ).length;
    const pendingQ = quotations.filter((q: any) =>
      ['draft', 'pending'].includes(String(q.status)),
    ).length;
    const rejectedQ = quotations.filter((q: any) =>
      ['rejected', 'expired', 'cancelled'].includes(String(q.status)),
    ).length;
    const orderCount = orders.length;
    const ordersConverted = orders.filter((o: any) => o.status !== 'cancelled').length;

    const tables: AnalyticsTable[] = [
      {
        title: 'Top Customers',
        columns: [
          { key: 'customer', label: 'Customer' },
          { key: 'amount', label: 'Sales', format: 'currency' },
        ],
        rows: Array.from(customerMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([id, v]) => ({
            customer: names.customerName.get(id) || id,
            amount: this.round(v),
          })),
      },
      {
        title: 'Top Products',
        columns: [
          { key: 'product', label: 'Product' },
          { key: 'qty', label: 'Qty', format: 'number' },
          { key: 'amount', label: 'Sales', format: 'currency' },
        ],
        rows: Array.from(prodMap.entries())
          .sort((a, b) => b[1].amount - a[1].amount)
          .slice(0, 10)
          .map(([id, v]) => ({
            product: names.itemName.get(id) || id,
            qty: this.round(v.qty, 0),
            amount: this.round(v.amount),
          })),
      },
      {
        title: 'Quotation Funnel',
        columns: [
          { key: 'stage', label: 'Stage' },
          { key: 'count', label: 'Count', format: 'number' },
        ],
        rows: [
          { stage: 'Total Quotations', count: quoteCount },
          { stage: 'Pending / Draft', count: pendingQ },
          { stage: 'Converted to Order', count: converted },
          { stage: 'Rejected / Expired', count: rejectedQ },
          { stage: 'Conversion Rate', count: `${this.pct(converted, quoteCount)}%` },
          {
            stage: 'Orders → Invoiced',
            count: `${this.pct(ordersConverted, Math.max(orderCount, 1))}%`,
          },
        ],
      },
    ];

    return { generatedAt: new Date().toISOString(), kpis, charts, tables };
  }

  // ═════════════════════════════════════════════════════════════════
  // 3. PURCHASE ANALYTICS (Phase 5.13)
  // ═════════════════════════════════════════════════════════════════

  async getPurchase(filters?: AnalyticsFilters): Promise<AnalyticsPayload> {
    const df = this.dateFilter('invoiceDate', filters);
    const [invoices, purchaseItems, orders, returns, names] = await Promise.all([
      this.all<any>(this.database.purchaseInvoices, 5000, df),
      this.all<any>(this.database.purchaseInvoiceItems).catch(() => []),
      this.all<any>(this.database.purchaseOrders),
      this.all<any>(this.database.purchaseReturns),
      this.nameMaps(),
    ]);

    const active = invoices.filter((i) => this.isActive(i.status));
    const totalSpend = active.reduce((s, i) => s + this.num(i.grandTotal), 0);
    const pendingPayments = active
      .filter((i) => i.paymentStatus !== 'paid')
      .reduce((s, i) => s + this.num(i.balanceAmount ?? i.grandTotal), 0);
    const pendingPOs = orders.filter((o: any) =>
      ['draft', 'pending', 'approved', 'partial'].includes(String(o.status)),
    ).length;

    const kpis: AnalyticsKpi[] = [
      {
        key: 'totalSpend',
        label: 'Total Spend',
        value: this.round(totalSpend),
        format: 'currency',
        color: 'border-l-blue-500',
      },
      {
        key: 'invoiceCount',
        label: 'Purchase Invoices',
        value: active.length,
        format: 'number',
        color: 'border-l-green-500',
      },
      {
        key: 'avgInvoice',
        label: 'Avg Invoice Value',
        value: this.round(active.length ? totalSpend / active.length : 0),
        format: 'currency',
        color: 'border-l-purple-500',
      },
      {
        key: 'pendingPayments',
        label: 'Pending Payments',
        value: this.round(pendingPayments),
        format: 'currency',
        color: 'border-l-amber-500',
      },
      {
        key: 'pendingPOs',
        label: 'Pending POs',
        value: pendingPOs,
        format: 'number',
        color: 'border-l-red-500',
      },
    ];

    const months = this.lastMonths(12);
    const byMonth = new Map<string, number>();
    for (const inv of active) {
      const k = this.monthKey(inv.invoiceDate);
      byMonth.set(k, (byMonth.get(k) || 0) + this.num(inv.grandTotal));
    }

    const supplierMap = new Map<string, number>();
    for (const inv of active) {
      supplierMap.set(
        inv.supplierId,
        (supplierMap.get(inv.supplierId) || 0) + this.num(inv.grandTotal),
      );
    }

    // Product + category from purchase invoice items
    const itemById = new Map((await this.all<any>(this.database.items)).map((i: any) => [i.id, i]));
    const prodMap = new Map<string, number>();
    const catMap = new Map<string, number>();
    const activeIds = new Set(active.map((i: any) => i.id));
    for (const line of purchaseItems) {
      if (!activeIds.has(line.invoiceId)) {
        continue;
      }
      const item = itemById.get(line.itemId);
      prodMap.set(
        line.itemId,
        (prodMap.get(line.itemId) || 0) + this.num(line.totalAmount ?? line.taxableValue),
      );
      const catId = item?.categoryId;
      catMap.set(
        catId || 'uncategorized',
        (catMap.get(catId || 'uncategorized') || 0) +
          this.num(line.totalAmount ?? line.taxableValue),
      );
    }

    const topSuppliers = Array.from(supplierMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, v]) => ({ label: names.supplierName.get(id) || id, value: this.round(v) }));

    const concentration = Array.from(supplierMap.entries()).sort((a, b) => b[1] - a[1]);
    const topShare = concentration.length ? this.pct(concentration[0][1], totalSpend) : 0;

    const returnByMonth = new Map<string, number>();
    for (const r of returns) {
      const k = this.monthKey(r.returnDate);
      returnByMonth.set(k, (returnByMonth.get(k) || 0) + this.num(r.grandTotal));
    }

    const charts: AnalyticsChart[] = [
      {
        title: 'Monthly Purchase Trend',
        type: 'area',
        data: this.fillSeries(months, byMonth),
        series: [{ key: 'value', name: 'Purchase', color: '#6366f1' }],
      },
      {
        title: 'Purchase by Supplier',
        type: 'bar',
        data: topSuppliers,
        series: [{ key: 'value', name: 'Spend', color: '#8b5cf6' }],
      },
      {
        title: 'Purchase by Product',
        type: 'bar',
        data: Array.from(prodMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([id, v]) => ({ label: names.itemName.get(id) || id, value: this.round(v) })),
        series: [{ key: 'value', name: 'Spend', color: '#06b6d4' }],
      },
      {
        title: 'Purchase by Category',
        type: 'bar',
        data: Array.from(catMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([id, v]) => ({
            label: names.categoryName.get(id) || (id === 'uncategorized' ? 'Uncategorized' : id),
            value: this.round(v),
          })),
        series: [{ key: 'value', name: 'Spend', color: '#f59e0b' }],
      },
      {
        title: 'Purchase Returns Trend',
        type: 'bar',
        data: this.fillSeries(months, returnByMonth),
        series: [{ key: 'value', name: 'Returns', color: '#ef4444' }],
      },
    ];

    const tables: AnalyticsTable[] = [
      {
        title: 'Top Suppliers',
        columns: [
          { key: 'supplier', label: 'Supplier' },
          { key: 'amount', label: 'Spend', format: 'currency' },
          { key: 'share', label: 'Share', format: 'percent' },
        ],
        rows: concentration.slice(0, 10).map(([id, v]) => ({
          supplier: names.supplierName.get(id) || id,
          amount: this.round(v),
          share: this.pct(v, totalSpend),
        })),
      },
      {
        title: 'Supplier Concentration',
        columns: [
          { key: 'metric', label: 'Metric' },
          { key: 'value', label: 'Value' },
        ],
        rows: [
          { metric: 'Top Supplier Share', value: `${topShare}%` },
          { metric: 'Active Suppliers', value: supplierMap.size },
          { metric: 'Total Suppliers', value: names.suppliers.length },
          { metric: 'Pending Purchase Orders', value: pendingPOs },
        ],
      },
    ];

    return { generatedAt: new Date().toISOString(), kpis, charts, tables };
  }

  // ═════════════════════════════════════════════════════════════════
  // 4. INVENTORY ANALYTICS (Phase 5.14)
  // ═════════════════════════════════════════════════════════════════

  async getInventory(filters?: AnalyticsFilters): Promise<AnalyticsPayload> {
    const df = this.dateFilter('createdAt', filters);
    const [items, movements, warehouseStock, names] = await Promise.all([
      this.all<any>(this.database.items),
      this.all<any>(this.database.invStockLedger, 5000, df),
      this.all<any>(this.database.invStockBalance),
      this.nameMaps(),
    ]);

    const activeItems = items.filter((i) => this.isActive(i.status) && i.isActive !== false);
    const stockValue = items.reduce(
      (s, i) => s + this.num(i.currentStock) * this.num(i.purchaseRate),
      0,
    );
    const lowStock = items.filter(
      (i) => this.num(i.currentStock) < this.num(i.minStock) && this.num(i.minStock) > 0,
    );
    const outOfStock = items.filter(
      (i) => this.num(i.currentStock) <= 0 && this.num(i.minStock) > 0,
    );

    const kpis: AnalyticsKpi[] = [
      {
        key: 'totalItems',
        label: 'Total Products',
        value: activeItems.length,
        format: 'number',
        color: 'border-l-blue-500',
      },
      {
        key: 'stockValue',
        label: 'Stock Value',
        value: this.round(stockValue),
        format: 'currency',
        color: 'border-l-green-500',
      },
      {
        key: 'lowStock',
        label: 'Low Stock Items',
        value: lowStock.length,
        format: 'number',
        color: 'border-l-amber-500',
      },
      {
        key: 'outOfStock',
        label: 'Out of Stock',
        value: outOfStock.length,
        format: 'number',
        color: 'border-l-red-500',
      },
    ];

    // Movement in/out by month (direction field: in/out or signed quantity)
    const months = this.lastMonths(6);
    const inMap = new Map<string, number>();
    const outMap = new Map<string, number>();
    for (const m of movements) {
      const k = this.monthKey(m.createdAt || m.transactionDate);
      const qty = this.num(m.quantity);
      const dir = String(m.direction || '').toLowerCase();
      if (dir === 'in' || qty > 0) {
        inMap.set(k, (inMap.get(k) || 0) + Math.abs(qty));
      } else {
        outMap.set(k, (outMap.get(k) || 0) + Math.abs(qty));
      }
    }
    const movementData = months.map((m) => ({
      label: m.label,
      In: this.round(inMap.get(m.key) || 0, 0),
      Out: this.round(outMap.get(m.key) || 0, 0),
    }));

    // Warehouse + category distribution (canonical balance projection)
    const itemRate = new Map(items.map((i: any) => [i.id, i.purchaseRate]));
    const whMap = new Map<string, number>();
    for (const ws of warehouseStock) {
      const val = this.num(ws.onHand) * this.num(itemRate.get(ws.itemId) || 0);
      whMap.set(ws.warehouseId, (whMap.get(ws.warehouseId) || 0) + val);
    }
    const whSeries = Array.from(whMap.entries()).map(([id, v]) => ({
      label: names.warehouseName.get(id) || id,
      value: this.round(v),
    }));

    const catMap = new Map<string, number>();
    for (const i of items) {
      const val = this.num(i.currentStock) * this.num(i.purchaseRate);
      catMap.set(
        i.categoryId || 'uncategorized',
        (catMap.get(i.categoryId || 'uncategorized') || 0) + val,
      );
    }
    const catSeries = Array.from(catMap.entries()).map(([id, v]) => ({
      label: names.categoryName.get(id) || (id === 'uncategorized' ? 'Uncategorized' : id),
      value: this.round(v),
    }));

    // Movement frequency per item (last 90 days) — fast/slow/dead
    const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    const itemQty = new Map<string, { qty: number; last: string }>();
    for (const m of movements) {
      if (String(m.createdAt || '') < cutoff) {
        continue;
      }
      const cur = itemQty.get(m.itemId) || { qty: 0, last: '' };
      cur.qty += Math.abs(this.num(m.quantity));
      const ts = String(m.createdAt || '');
      if (ts > cur.last) {
        cur.last = ts;
      }
      itemQty.set(m.itemId, cur);
    }
    const fastMoving = Array.from(itemQty.entries())
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10)
      .map(([id, v]) => ({
        product: names.itemName.get(id) || id,
        qty: this.round(v.qty, 0),
        last: v.last ? v.last.slice(0, 10) : '—',
      }));
    const deadStock = items
      .filter((i) => this.num(i.currentStock) > 0 && !itemQty.has(i.id))
      .map((i) => ({
        product: i.name || i.sku,
        stock: this.round(i.currentStock, 0),
        value: this.round(this.num(i.currentStock) * this.num(i.purchaseRate)),
      }))
      .slice(0, 10);

    const lowStockRows = lowStock.slice(0, 10).map((i) => ({
      product: i.name || i.sku,
      stock: this.round(i.currentStock, 0),
      min: this.round(i.minStock, 0),
      reorder: this.round(i.reorderLevel ?? i.minStock, 0),
    }));

    const charts: AnalyticsChart[] = [
      {
        title: 'Stock Movement (6 months)',
        type: 'bar',
        data: movementData,
        series: [
          { key: 'In', name: 'In', color: '#22c55e' },
          { key: 'Out', name: 'Out', color: '#ef4444' },
        ],
      },
      {
        title: 'Warehouse Distribution (value)',
        type: 'bar',
        data: whSeries,
        series: [{ key: 'value', name: 'Value', color: '#8b5cf6' }],
      },
      {
        title: 'Category Distribution (value)',
        type: 'bar',
        data: catSeries,
        series: [{ key: 'value', name: 'Value', color: '#06b6d4' }],
      },
      {
        title: 'Low Stock Items',
        type: 'bar',
        data: lowStock.slice(0, 8).map((i) => ({
          label: (i.name || i.sku).slice(0, 12),
          current: this.round(i.currentStock, 0),
          min: this.round(i.minStock, 0),
        })),
        series: [
          { key: 'current', name: 'Current', color: '#f59e0b' },
          { key: 'min', name: 'Min', color: '#ef4444' },
        ],
      },
    ];

    const tables: AnalyticsTable[] = [
      {
        title: 'Low Stock',
        columns: [
          { key: 'product', label: 'Product' },
          { key: 'stock', label: 'Stock', format: 'number' },
          { key: 'min', label: 'Min', format: 'number' },
          { key: 'reorder', label: 'Reorder', format: 'number' },
        ],
        rows: lowStockRows,
      },
      {
        title: 'Fast Moving (90 days)',
        columns: [
          { key: 'product', label: 'Product' },
          { key: 'qty', label: 'Qty', format: 'number' },
          { key: 'last', label: 'Last Movement' },
        ],
        rows: fastMoving,
      },
      {
        title: 'Dead Stock',
        columns: [
          { key: 'product', label: 'Product' },
          { key: 'stock', label: 'Stock', format: 'number' },
          { key: 'value', label: 'Value', format: 'currency' },
        ],
        rows: deadStock,
      },
    ];

    return { generatedAt: new Date().toISOString(), kpis, charts, tables };
  }

  // ═════════════════════════════════════════════════════════════════
  // 5. FINANCIAL ANALYTICS (Phase 5.15)
  // ═════════════════════════════════════════════════════════════════

  async getFinance(filters?: AnalyticsFilters): Promise<AnalyticsPayload> {
    const df = this.dateFilter('entryDate', filters);
    const [kpis, glEntries, _names] = await Promise.all([
      this.kpiEngine.calculateAllKpis().catch(() => []),
      this.all<any>(this.database.glEntries, 5000, df),
      this.nameMaps(),
    ]);

    const kpiMap = new Map(kpis.map((k: any) => [k.kpi.id, k.value]));
    const revenue = this.num(kpiMap.get('revenue'));
    const grossProfit = this.num(kpiMap.get('gross_profit'));
    const netProfit = this.num(kpiMap.get('net_profit'));

    const months = this.lastMonths(12);
    const incomeByMonth = new Map<string, number>();
    const expenseByMonth = new Map<string, number>();
    for (const e of glEntries) {
      const k = this.monthKey(e.entryDate);
      if (this.num(e.credit) > 0) {
        incomeByMonth.set(k, (incomeByMonth.get(k) || 0) + this.num(e.credit));
      }
      if (this.num(e.debit) > 0) {
        expenseByMonth.set(k, (expenseByMonth.get(k) || 0) + this.num(e.debit));
      }
    }

    const profitData = months.map((m) => ({
      label: m.label,
      Income: this.round(incomeByMonth.get(m.key) || 0),
      Expense: this.round(expenseByMonth.get(m.key) || 0),
      Profit: this.round((incomeByMonth.get(m.key) || 0) - (expenseByMonth.get(m.key) || 0)),
    }));

    // Sales vs Purchase from module data (fallback if GL sparse)
    const [invoices, purchaseInvoices] = await Promise.all([
      this.all<any>(this.database.salesInvoices),
      this.all<any>(this.database.purchaseInvoices),
    ]);
    const salesByMonth = new Map<string, number>();
    const purchaseByMonth = new Map<string, number>();
    for (const inv of invoices.filter((i) => this.isActive(i.status))) {
      const k = this.monthKey(inv.invoiceDate);
      salesByMonth.set(k, (salesByMonth.get(k) || 0) + this.num(inv.grandTotal));
    }
    for (const inv of purchaseInvoices.filter((i) => this.isActive(i.status))) {
      const k = this.monthKey(inv.invoiceDate);
      purchaseByMonth.set(k, (purchaseByMonth.get(k) || 0) + this.num(inv.grandTotal));
    }
    const salesVsPurchase = months.map((m) => ({
      label: m.label,
      Sales: this.round(salesByMonth.get(m.key) || 0),
      Purchase: this.round(purchaseByMonth.get(m.key) || 0),
    }));

    const totalExpense = Array.from(expenseByMonth.values()).reduce((a, b) => a + b, 0);
    const totalIncome = Array.from(incomeByMonth.values()).reduce((a, b) => a + b, 0);
    const receivables = await this.receivablesTotal();
    const payables = await this.payablesTotal();

    const kpiCards: AnalyticsKpi[] = [
      {
        key: 'revenue',
        label: 'Revenue',
        value: this.round(revenue || totalIncome),
        format: 'currency',
        color: 'border-l-green-500',
      },
      {
        key: 'expenses',
        label: 'Expenses',
        value: this.round(totalExpense),
        format: 'currency',
        color: 'border-l-red-500',
      },
      {
        key: 'grossProfit',
        label: 'Gross Profit',
        value: this.round(grossProfit),
        format: 'currency',
        color: 'border-l-blue-500',
      },
      {
        key: 'grossMargin',
        label: 'Gross Margin',
        value: this.pct(grossProfit, revenue || totalIncome),
        format: 'percent',
        color: 'border-l-purple-500',
      },
      {
        key: 'netProfit',
        label: 'Net Profit',
        value: this.round(netProfit || totalIncome - totalExpense),
        format: 'currency',
        color: 'border-l-violet-500',
      },
      {
        key: 'netMargin',
        label: 'Net Margin',
        value: this.pct(netProfit || totalIncome - totalExpense, revenue || totalIncome),
        format: 'percent',
        color: 'border-l-teal-500',
      },
      {
        key: 'receivables',
        label: 'Receivables',
        value: this.round(receivables),
        format: 'currency',
        color: 'border-l-amber-500',
      },
      {
        key: 'payables',
        label: 'Payables',
        value: this.round(payables),
        format: 'currency',
        color: 'border-l-orange-500',
      },
    ];

    // Account-level summary table
    const accountMap = new Map<string, { debit: number; credit: number }>();
    for (const e of glEntries) {
      const cur = accountMap.get(e.accountId) || { debit: 0, credit: 0 };
      cur.debit += this.num(e.debit);
      cur.credit += this.num(e.credit);
      accountMap.set(e.accountId, cur);
    }

    const charts: AnalyticsChart[] = [
      {
        title: 'Monthly Profit Trend',
        type: 'area',
        data: profitData,
        series: [
          { key: 'Income', name: 'Income', color: '#22c55e' },
          { key: 'Expense', name: 'Expense', color: '#ef4444' },
          { key: 'Profit', name: 'Profit', color: '#6366f1' },
        ],
      },
      {
        title: 'Sales vs Purchase',
        type: 'bar',
        data: salesVsPurchase,
        series: [
          { key: 'Sales', name: 'Sales', color: '#22c55e' },
          { key: 'Purchase', name: 'Purchase', color: '#f59e0b' },
        ],
      },
    ];

    const tables: AnalyticsTable[] = [
      {
        title: 'Account Summary (GL)',
        columns: [
          { key: 'account', label: 'Account' },
          { key: 'debit', label: 'Debit', format: 'currency' },
          { key: 'credit', label: 'Credit', format: 'currency' },
        ],
        rows: Array.from(accountMap.entries()).map(([id, v]) => ({
          account: id,
          debit: this.round(v.debit),
          credit: this.round(v.credit),
        })),
      },
    ];

    return { generatedAt: new Date().toISOString(), kpis: kpiCards, charts, tables };
  }

  // ═════════════════════════════════════════════════════════════════
  // 6. GST ANALYTICS (Phase 5.10)
  // ═════════════════════════════════════════════════════════════════

  async getGst(filters?: AnalyticsFilters): Promise<AnalyticsPayload> {
    const df = this.dateFilter('invoiceDate', filters);
    const [invoices, items, purchaseInvoices, purchaseItems] = await Promise.all([
      this.all<any>(this.database.salesInvoices, 5000, df),
      this.all<any>(this.database.invoiceItems),
      this.all<any>(this.database.purchaseInvoices, 5000, df),
      this.all<any>(this.database.purchaseInvoiceItems).catch(() => []),
    ]);

    const activeIds = new Set(
      invoices.filter((i) => this.isActive(i.status)).map((i: any) => i.id),
    );
    let outCgst = 0,
      outSgst = 0,
      outIgst = 0,
      outCess = 0;
    const rateMap = new Map<
      string,
      { taxable: number; tax: number; cgst: number; sgst: number; igst: number }
    >();
    const monthlyOut = new Map<string, number>();

    for (const line of items) {
      if (!activeIds.has(line.invoiceId)) {
        continue;
      }
      outCgst += this.num(line.cgst);
      outSgst += this.num(line.sgst);
      outIgst += this.num(line.igst);
      outCess += this.num(line.cess);
      const rate = String(line.gstRate ?? 0);
      const cur = rateMap.get(rate) || { taxable: 0, tax: 0, cgst: 0, sgst: 0, igst: 0 };
      cur.taxable += this.num(
        line.taxableValue ??
          this.num(line.totalAmount) -
            this.num(line.cgst) -
            this.num(line.sgst) -
            this.num(line.igst),
      );
      cur.tax +=
        this.num(line.cgst) + this.num(line.sgst) + this.num(line.igst) + this.num(line.cess);
      cur.cgst += this.num(line.cgst);
      cur.sgst += this.num(line.sgst);
      cur.igst += this.num(line.igst);
      rateMap.set(rate, cur);
    }

    const activeInvoiceById = new Map(
      invoices.filter((i) => this.isActive(i.status)).map((i: any) => [i.id, i]),
    );
    for (const line of items) {
      const inv = activeInvoiceById.get(line.invoiceId);
      if (!inv) {
        continue;
      }
      const k = this.monthKey(inv.invoiceDate);
      monthlyOut.set(
        k,
        (monthlyOut.get(k) || 0) + this.num(line.cgst) + this.num(line.sgst) + this.num(line.igst),
      );
    }

    const pActiveIds = new Set(
      purchaseInvoices.filter((i) => this.isActive(i.status)).map((i: any) => i.id),
    );
    let inCgst = 0,
      inSgst = 0,
      inIgst = 0;
    for (const line of purchaseItems) {
      if (!pActiveIds.has(line.invoiceId)) {
        continue;
      }
      inCgst += this.num(line.cgst);
      inSgst += this.num(line.sgst);
      inIgst += this.num(line.igst);
    }

    const outputTax = outCgst + outSgst + outIgst + outCess;
    const inputTax = inCgst + inSgst + inIgst;
    const netPayable = outputTax - inputTax;

    const kpis: AnalyticsKpi[] = [
      {
        key: 'outputGst',
        label: 'Output GST',
        value: this.round(outputTax),
        format: 'currency',
        color: 'border-l-red-500',
      },
      {
        key: 'inputGst',
        label: 'Input Credit',
        value: this.round(inputTax),
        format: 'currency',
        color: 'border-l-green-500',
      },
      {
        key: 'netPayable',
        label: 'Net Payable',
        value: this.round(netPayable),
        format: 'currency',
        color: 'border-l-blue-500',
      },
      {
        key: 'outCgst',
        label: 'Output CGST',
        value: this.round(outCgst),
        format: 'currency',
        color: 'border-l-indigo-500',
      },
      {
        key: 'outSgst',
        label: 'Output SGST',
        value: this.round(outSgst),
        format: 'currency',
        color: 'border-l-violet-500',
      },
      {
        key: 'outIgst',
        label: 'Output IGST',
        value: this.round(outIgst),
        format: 'currency',
        color: 'border-l-purple-500',
      },
    ];

    const months = this.lastMonths(12);
    const charts: AnalyticsChart[] = [
      {
        title: 'GST by Period (output)',
        type: 'bar',
        data: this.fillSeries(months, monthlyOut),
        series: [{ key: 'value', name: 'Output GST', color: '#ef4444' }],
      },
      {
        title: 'Output vs Input Tax',
        type: 'bar',
        data: [
          { label: 'CGST', Output: this.round(outCgst), Input: this.round(inCgst) },
          { label: 'SGST', Output: this.round(outSgst), Input: this.round(inSgst) },
          { label: 'IGST', Output: this.round(outIgst), Input: this.round(inIgst) },
        ],
        series: [
          { key: 'Output', name: 'Output', color: '#ef4444' },
          { key: 'Input', name: 'Input', color: '#22c55e' },
        ],
      },
    ];

    const tables: AnalyticsTable[] = [
      {
        title: 'GST by Rate',
        columns: [
          { key: 'rate', label: 'Rate', format: 'percent' },
          { key: 'taxable', label: 'Taxable Value', format: 'currency' },
          { key: 'cgst', label: 'CGST', format: 'currency' },
          { key: 'sgst', label: 'SGST', format: 'currency' },
          { key: 'igst', label: 'IGST', format: 'currency' },
          { key: 'tax', label: 'Total Tax', format: 'currency' },
        ],
        rows: Array.from(rateMap.entries())
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([rate, v]) => ({
            rate: Number(rate) / 100,
            taxable: this.round(v.taxable),
            cgst: this.round(v.cgst),
            sgst: this.round(v.sgst),
            igst: this.round(v.igst),
            tax: this.round(v.tax),
          })),
      },
    ];

    return { generatedAt: new Date().toISOString(), kpis, charts, tables };
  }

  // ═════════════════════════════════════════════════════════════════
  // 7. CUSTOMER ANALYTICS (Phase 5.6)
  // ═════════════════════════════════════════════════════════════════

  async getCustomers(filters?: AnalyticsFilters): Promise<AnalyticsPayload> {
    const df = this.dateFilter('invoiceDate', filters);
    const [invoices, names, customers] = await Promise.all([
      this.all<any>(this.database.salesInvoices, 5000, df),
      this.nameMaps(),
      this.all<any>(this.database.ledgerMaster, 5000, [
        { field: 'ledgerType', operator: 'eq', value: 'customer' },
      ]),
    ]);

    const active = invoices.filter((i) => this.isActive(i.status));
    const customerSales = new Map<string, number>();
    const customerCounts = new Map<string, number>();
    const customerOutstanding = new Map<string, number>();
    for (const inv of active) {
      customerSales.set(
        inv.customerId,
        (customerSales.get(inv.customerId) || 0) + this.num(inv.grandTotal),
      );
      customerCounts.set(inv.customerId, (customerCounts.get(inv.customerId) || 0) + 1);
      if (inv.paymentStatus !== 'paid') {
        customerOutstanding.set(
          inv.customerId,
          (customerOutstanding.get(inv.customerId) || 0) +
            this.num(inv.balanceAmount ?? inv.grandTotal),
        );
      }
    }

    const totalCustomers = customers.length;
    const activeCustomers = new Set(active.map((i) => i.customerId)).size;
    const totalOutstanding = Array.from(customerOutstanding.values()).reduce((a, b) => a + b, 0);
    const repeatCustomers = Array.from(customerCounts.values()).filter((c) => c > 1).length;

    const kpis: AnalyticsKpi[] = [
      {
        key: 'totalCustomers',
        label: 'Total Customers',
        value: totalCustomers,
        format: 'number',
        color: 'border-l-blue-500',
      },
      {
        key: 'activeCustomers',
        label: 'Active Customers',
        value: activeCustomers,
        format: 'number',
        color: 'border-l-green-500',
      },
      {
        key: 'outstanding',
        label: 'Total Outstanding',
        value: this.round(totalOutstanding),
        format: 'currency',
        color: 'border-l-amber-500',
      },
      {
        key: 'repeatRate',
        label: 'Repeat Purchase Rate',
        value: this.pct(repeatCustomers, activeCustomers || 1),
        format: 'percent',
        color: 'border-l-purple-500',
      },
    ];

    const months = this.lastMonths(12);
    const byMonth = new Map<string, number>();
    for (const inv of active) {
      const k = this.monthKey(inv.invoiceDate);
      byMonth.set(k, (byMonth.get(k) || 0) + this.num(inv.grandTotal));
    }

    const creditRows = customers
      .filter((c) => this.num(c.creditLimit) > 0)
      .map((c) => {
        const bal = this.num(c.currentBalance);
        return {
          customer: c.partyId || c.id,
          outstanding: this.round(bal),
          creditLimit: this.round(c.creditLimit),
          utilization: this.pct(bal, c.creditLimit),
        };
      })
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 10);

    const charts: AnalyticsChart[] = [
      {
        title: 'Customer Sales Trend',
        type: 'area',
        data: this.fillSeries(months, byMonth),
        series: [{ key: 'value', name: 'Sales', color: '#22c55e' }],
      },
      {
        title: 'Top Customers',
        type: 'bar',
        data: Array.from(customerSales.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([id, v]) => ({ label: names.customerName.get(id) || id, value: this.round(v) })),
        series: [{ key: 'value', name: 'Sales', color: '#f59e0b' }],
      },
    ];

    const tables: AnalyticsTable[] = [
      {
        title: 'Top Customers',
        columns: [
          { key: 'customer', label: 'Customer' },
          { key: 'invoices', label: 'Invoices', format: 'number' },
          { key: 'sales', label: 'Sales', format: 'currency' },
          { key: 'outstanding', label: 'Outstanding', format: 'currency' },
        ],
        rows: Array.from(customerSales.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([id, v]) => ({
            customer: names.customerName.get(id) || id,
            invoices: customerCounts.get(id) || 0,
            sales: this.round(v),
            outstanding: this.round(customerOutstanding.get(id) || 0),
          })),
      },
      {
        title: 'Inactive Customers (no sales)',
        columns: [
          { key: 'customer', label: 'Customer' },
          { key: 'creditLimit', label: 'Credit Limit', format: 'currency' },
        ],
        rows: customers
          .filter((c) => !customerSales.has(c.id))
          .slice(0, 10)
          .map((c) => ({ customer: c.partyId || c.id, creditLimit: this.round(c.creditLimit) })),
      },
      {
        title: 'Credit Limit Utilization',
        columns: [
          { key: 'customer', label: 'Customer' },
          { key: 'outstanding', label: 'Outstanding', format: 'currency' },
          { key: 'creditLimit', label: 'Credit Limit', format: 'currency' },
          { key: 'utilization', label: 'Utilization', format: 'percent' },
        ],
        rows: creditRows,
      },
    ];

    return { generatedAt: new Date().toISOString(), kpis, charts, tables };
  }

  // ═════════════════════════════════════════════════════════════════
  // 8. SUPPLIER ANALYTICS (Phase 5.7)
  // ═════════════════════════════════════════════════════════════════

  async getSuppliers(filters?: AnalyticsFilters): Promise<AnalyticsPayload> {
    const df = this.dateFilter('invoiceDate', filters);
    const [invoices, names, suppliers] = await Promise.all([
      this.all<any>(this.database.purchaseInvoices, 5000, df),
      this.nameMaps(),
      this.all<any>(this.database.suppliers),
    ]);

    const active = invoices.filter((i) => this.isActive(i.status));
    const supplierSpend = new Map<string, number>();
    const supplierPending = new Map<string, number>();
    for (const inv of active) {
      supplierSpend.set(
        inv.supplierId,
        (supplierSpend.get(inv.supplierId) || 0) + this.num(inv.grandTotal),
      );
      if (inv.paymentStatus !== 'paid') {
        supplierPending.set(
          inv.supplierId,
          (supplierPending.get(inv.supplierId) || 0) +
            this.num(inv.balanceAmount ?? inv.grandTotal),
        );
      }
    }

    const totalSpend = Array.from(supplierSpend.values()).reduce((a, b) => a + b, 0);
    const totalPending = Array.from(supplierPending.values()).reduce((a, b) => a + b, 0);
    const activeSuppliers = new Set(active.map((i) => i.supplierId)).size;

    const kpis: AnalyticsKpi[] = [
      {
        key: 'totalSuppliers',
        label: 'Total Suppliers',
        value: suppliers.length,
        format: 'number',
        color: 'border-l-blue-500',
      },
      {
        key: 'activeSuppliers',
        label: 'Active Suppliers',
        value: activeSuppliers,
        format: 'number',
        color: 'border-l-green-500',
      },
      {
        key: 'totalSpend',
        label: 'Total Spend',
        value: this.round(totalSpend),
        format: 'currency',
        color: 'border-l-purple-500',
      },
      {
        key: 'pendingPayables',
        label: 'Pending Payables',
        value: this.round(totalPending),
        format: 'currency',
        color: 'border-l-amber-500',
      },
    ];

    const months = this.lastMonths(12);
    const byMonth = new Map<string, number>();
    for (const inv of active) {
      const k = this.monthKey(inv.invoiceDate);
      byMonth.set(k, (byMonth.get(k) || 0) + this.num(inv.grandTotal));
    }

    const pendingRows = Array.from(supplierPending.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, v]) => ({
        supplier: names.supplierName.get(id) || id,
        pending: this.round(v),
      }));

    const charts: AnalyticsChart[] = [
      {
        title: 'Supplier Purchase Trend',
        type: 'area',
        data: this.fillSeries(months, byMonth),
        series: [{ key: 'value', name: 'Purchase', color: '#6366f1' }],
      },
      {
        title: 'Top Suppliers',
        type: 'bar',
        data: Array.from(supplierSpend.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([id, v]) => ({ label: names.supplierName.get(id) || id, value: this.round(v) })),
        series: [{ key: 'value', name: 'Spend', color: '#8b5cf6' }],
      },
    ];

    const tables: AnalyticsTable[] = [
      {
        title: 'Supplier Spend',
        columns: [
          { key: 'supplier', label: 'Supplier' },
          { key: 'spend', label: 'Spend', format: 'currency' },
          { key: 'share', label: 'Share', format: 'percent' },
          { key: 'pending', label: 'Pending', format: 'currency' },
        ],
        rows: Array.from(supplierSpend.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([id, v]) => ({
            supplier: names.supplierName.get(id) || id,
            spend: this.round(v),
            share: this.pct(v, totalSpend),
            pending: this.round(supplierPending.get(id) || 0),
          })),
      },
      {
        title: 'Pending Supplier Payments',
        columns: [
          { key: 'supplier', label: 'Supplier' },
          { key: 'pending', label: 'Pending', format: 'currency' },
        ],
        rows: pendingRows,
      },
    ];

    return { generatedAt: new Date().toISOString(), kpis, charts, tables };
  }

  // ═════════════════════════════════════════════════════════════════
  // 9. WAREHOUSE ANALYTICS (Phase 5.14)
  // ═════════════════════════════════════════════════════════════════

  async getWarehouses(_filters?: AnalyticsFilters): Promise<AnalyticsPayload> {
    const [warehouseStock, items, transfers, names] = await Promise.all([
      this.all<any>(this.database.invStockBalance),
      this.all<any>(this.database.items),
      this.all<any>(this.database.stockTransfers),
      this.nameMaps(),
    ]);

    const itemRate = new Map(items.map((i: any) => [i.id, i.purchaseRate]));
    const whMap = new Map<string, { qty: number; value: number }>();
    for (const ws of warehouseStock) {
      const cur = whMap.get(ws.warehouseId) || { qty: 0, value: 0 };
      cur.qty += this.num(ws.onHand);
      cur.value += this.num(ws.onHand) * this.num(itemRate.get(ws.itemId));
      whMap.set(ws.warehouseId, cur);
    }

    const transferStatus = new Map<string, number>();
    for (const t of transfers) {
      transferStatus.set(t.status, (transferStatus.get(t.status) || 0) + 1);
    }

    const kpis: AnalyticsKpi[] = [
      {
        key: 'totalWarehouses',
        label: 'Total Warehouses',
        value: names.warehouses.length,
        format: 'number',
        color: 'border-l-blue-500',
      },
      {
        key: 'itemsInStock',
        label: 'Items in Stock',
        value: new Set(warehouseStock.map((w) => w.itemId)).size,
        format: 'number',
        color: 'border-l-green-500',
      },
      {
        key: 'stockValue',
        label: 'Stock Value',
        value: this.round(Array.from(whMap.values()).reduce((a, b) => a + b.value, 0)),
        format: 'currency',
        color: 'border-l-purple-500',
      },
      {
        key: 'transfers',
        label: 'Stock Transfers',
        value: transfers.length,
        format: 'number',
        color: 'border-l-amber-500',
      },
    ];

    const charts: AnalyticsChart[] = [
      {
        title: 'Warehouse Stock Distribution',
        type: 'bar',
        data: Array.from(whMap.entries()).map(([id, v]) => ({
          label: names.warehouseName.get(id) || id,
          value: this.round(v.value),
        })),
        series: [{ key: 'value', name: 'Value', color: '#8b5cf6' }],
      },
      {
        title: 'Transfers by Status',
        type: 'bar',
        data: Array.from(transferStatus.entries()).map(([s, v]) => ({ label: s, value: v })),
        series: [{ key: 'value', name: 'Transfers', color: '#06b6d4' }],
      },
    ];

    const tables: AnalyticsTable[] = [
      {
        title: 'Warehouse Stock Summary',
        columns: [
          { key: 'warehouse', label: 'Warehouse' },
          { key: 'qty', label: 'Qty', format: 'number' },
          { key: 'value', label: 'Value', format: 'currency' },
        ],
        rows: Array.from(whMap.entries()).map(([id, v]) => ({
          warehouse: names.warehouseName.get(id) || id,
          qty: this.round(v.qty, 0),
          value: this.round(v.value),
        })),
      },
    ];

    return { generatedAt: new Date().toISOString(), kpis, charts, tables };
  }

  // ═════════════════════════════════════════════════════════════════
  // 10. PROFITABILITY ANALYTICS (Phase 5.16)
  // ═════════════════════════════════════════════════════════════════

  async getProfitability(filters?: AnalyticsFilters): Promise<AnalyticsPayload> {
    const df = this.dateFilter('invoiceDate', filters);
    const [invoices, items, invoiceLines, names] = await Promise.all([
      this.all<any>(this.database.salesInvoices, 5000, df),
      this.all<any>(this.database.items),
      this.all<any>(this.database.invoiceItems),
      this.nameMaps(),
    ]);

    const activeIds = new Set(
      invoices.filter((i) => this.isActive(i.status)).map((i: any) => i.id),
    );
    const itemById = new Map(items.map((i: any) => [i.id, i]));
    const prodAgg = new Map<string, { qty: number; revenue: number; cost: number }>();

    for (const line of invoiceLines) {
      if (!activeIds.has(line.invoiceId)) {
        continue;
      }
      const item = itemById.get(line.itemId);
      if (!item) {
        continue;
      }
      const qty = this.num(line.quantity);
      const revenue = this.num(line.totalAmount ?? line.taxableValue);
      const cost = qty * this.num(item.purchaseRate);
      const cur = prodAgg.get(line.itemId) || { qty: 0, revenue: 0, cost: 0 };
      cur.qty += qty;
      cur.revenue += revenue;
      cur.cost += cost;
      prodAgg.set(line.itemId, cur);
    }

    const rows = Array.from(prodAgg.entries())
      .map(([id, v]) => ({
        product: names.itemName.get(id) || id,
        qty: this.round(v.qty, 0),
        revenue: this.round(v.revenue),
        cost: this.round(v.cost),
        profit: this.round(v.revenue - v.cost),
        margin: this.pct(v.revenue - v.cost, v.revenue),
      }))
      .sort((a, b) => b.profit - a.profit);

    const grossProfit = rows.reduce((s, r) => s + r.profit, 0);
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

    const kpis: AnalyticsKpi[] = [
      {
        key: 'grossProfit',
        label: 'Gross Profit',
        value: this.round(grossProfit),
        format: 'currency',
        color: 'border-l-green-500',
      },
      {
        key: 'grossMargin',
        label: 'Gross Margin',
        value: this.pct(grossProfit, totalRevenue),
        format: 'percent',
        color: 'border-l-purple-500',
      },
      {
        key: 'productCount',
        label: 'Products Sold',
        value: rows.length,
        format: 'number',
        color: 'border-l-blue-500',
      },
      {
        key: 'avgMargin',
        label: 'Avg Product Margin',
        value: this.round(
          rows.length ? rows.reduce((s, r) => s + r.margin, 0) / rows.length : 0,
          1,
        ),
        format: 'percent',
        color: 'border-l-teal-500',
      },
    ];

    const charts: AnalyticsChart[] = [
      {
        title: 'Top Products by Profit',
        type: 'bar',
        data: rows.slice(0, 8).map((r) => ({ label: r.product.slice(0, 12), profit: r.profit })),
        series: [{ key: 'profit', name: 'Profit', color: '#22c55e' }],
      },
      {
        title: 'Product Margins',
        type: 'bar',
        data: rows.slice(0, 8).map((r) => ({ label: r.product.slice(0, 12), margin: r.margin })),
        series: [{ key: 'margin', name: 'Margin %', color: '#8b5cf6' }],
      },
    ];

    const tables: AnalyticsTable[] = [
      {
        title: 'Product Profitability',
        columns: [
          { key: 'product', label: 'Product' },
          { key: 'qty', label: 'Qty', format: 'number' },
          { key: 'revenue', label: 'Revenue', format: 'currency' },
          { key: 'cost', label: 'Cost', format: 'currency' },
          { key: 'profit', label: 'Profit', format: 'currency' },
          { key: 'margin', label: 'Margin', format: 'percent' },
        ],
        rows,
      },
      {
        title: 'Bottom Products',
        columns: [
          { key: 'product', label: 'Product' },
          { key: 'profit', label: 'Profit', format: 'currency' },
          { key: 'margin', label: 'Margin', format: 'percent' },
        ],
        rows: rows.slice(-8).reverse(),
      },
      {
        title: 'Low Margin Products',
        columns: [
          { key: 'product', label: 'Product' },
          { key: 'margin', label: 'Margin', format: 'percent' },
        ],
        rows: rows.filter((r) => r.margin < 20).slice(0, 10),
      },
    ];

    return { generatedAt: new Date().toISOString(), kpis, charts, tables };
  }

  // ═════════════════════════════════════════════════════════════════
  // 11. CASH FLOW ANALYTICS (Phase 5.15)
  // ═════════════════════════════════════════════════════════════════

  async getCashFlow(filters?: AnalyticsFilters): Promise<AnalyticsPayload> {
    const df = this.dateFilter('entryDate', filters);
    const [glEntries, salesPayments, purchasePayments] = await Promise.all([
      this.all<any>(this.database.glEntries, 5000, df),
      this.all<any>(this.database.salesPayments),
      this.all<any>(this.database.purchasePayments).catch(() => []),
    ]);
    const cashIds = await this.cashBankAccountIds();

    const months = this.lastMonths(12);
    const inMap = new Map<string, number>();
    const outMap = new Map<string, number>();

    for (const e of glEntries) {
      const k = this.monthKey(e.entryDate);
      // Cash/bank accounts only: debit = inflow, credit = outflow
      if (cashIds.size === 0 || !cashIds.has(e.accountId)) {
        continue;
      }
      if (this.num(e.debit) > 0) {
        inMap.set(k, (inMap.get(k) || 0) + this.num(e.debit));
      }
      if (this.num(e.credit) > 0) {
        outMap.set(k, (outMap.get(k) || 0) + this.num(e.credit));
      }
    }

    // Fallback: if GL sparse, derive from payment records
    if (glEntries.length === 0) {
      for (const p of salesPayments) {
        const k = this.monthKey(p.paymentDate || p.createdAt);
        inMap.set(k, (inMap.get(k) || 0) + this.num(p.amount));
      }
      for (const p of purchasePayments) {
        const k = this.monthKey(p.paymentDate || p.createdAt);
        outMap.set(k, (outMap.get(k) || 0) + this.num(p.amount));
      }
    }

    const totalIn = Array.from(inMap.values()).reduce((a, b) => a + b, 0);
    const totalOut = Array.from(outMap.values()).reduce((a, b) => a + b, 0);

    const kpis: AnalyticsKpi[] = [
      {
        key: 'cashIn',
        label: 'Cash Inflow',
        value: this.round(totalIn),
        format: 'currency',
        color: 'border-l-green-500',
      },
      {
        key: 'cashOut',
        label: 'Cash Outflow',
        value: this.round(totalOut),
        format: 'currency',
        color: 'border-l-red-500',
      },
      {
        key: 'netCash',
        label: 'Net Cash Flow',
        value: this.round(totalIn - totalOut),
        format: 'currency',
        color: 'border-l-blue-500',
      },
    ];

    const flowData = months.map((m) => ({
      label: m.label,
      In: this.round(inMap.get(m.key) || 0),
      Out: this.round(outMap.get(m.key) || 0),
    }));

    const charts: AnalyticsChart[] = [
      {
        title: 'Cash Inflow vs Outflow',
        type: 'area',
        data: flowData,
        series: [
          { key: 'In', name: 'Inflow', color: '#22c55e' },
          { key: 'Out', name: 'Outflow', color: '#ef4444' },
        ],
      },
    ];

    const tables: AnalyticsTable[] = [
      {
        title: 'Monthly Cash Flow',
        columns: [
          { key: 'label', label: 'Month' },
          { key: 'in', label: 'Inflow', format: 'currency' },
          { key: 'out', label: 'Outflow', format: 'currency' },
          { key: 'net', label: 'Net', format: 'currency' },
        ],
        rows: flowData.map((f) => ({
          label: f.label,
          in: f.In as number,
          out: f.Out as number,
          net: this.round((f.In as number) - (f.Out as number)),
        })),
      },
    ];

    return { generatedAt: new Date().toISOString(), kpis, charts, tables };
  }

  // ═════════════════════════════════════════════════════════════════
  // 12. GROWTH ANALYTICS (Phase 5.16)
  // ═════════════════════════════════════════════════════════════════

  async getGrowth(filters?: AnalyticsFilters): Promise<AnalyticsPayload> {
    const df = this.dateFilter('invoiceDate', filters);
    const [invoices, customers, _names] = await Promise.all([
      this.all<any>(this.database.salesInvoices, 5000, df),
      this.all<any>(this.database.ledgerMaster, 5000, [
        { field: 'ledgerType', operator: 'eq', value: 'customer' },
      ]),
      this.nameMaps(),
    ]);

    const active = invoices.filter((i) => this.isActive(i.status));
    const months = this.lastMonths(12);
    const byMonth = new Map<string, number>();
    const countByMonth = new Map<string, number>();
    for (const inv of active) {
      const k = this.monthKey(inv.invoiceDate);
      byMonth.set(k, (byMonth.get(k) || 0) + this.num(inv.grandTotal));
      countByMonth.set(k, (countByMonth.get(k) || 0) + 1);
    }

    const curKey = months[months.length - 1].key;
    const prevKey = months[months.length - 2]?.key;
    const curSales = byMonth.get(curKey) || 0;
    const prevSales = byMonth.get(prevKey) || 0;
    const curOrders = countByMonth.get(curKey) || 0;
    const prevOrders = countByMonth.get(prevKey) || 0;
    const totalSales = Array.from(byMonth.values()).reduce((a, b) => a + b, 0);

    const revenueGrowth =
      prevSales > 0 ? this.pct(curSales - prevSales, prevSales) : curSales > 0 ? 100 : 0;
    const orderGrowth =
      prevOrders > 0 ? this.pct(curOrders - prevOrders, prevOrders) : curOrders > 0 ? 100 : 0;

    const kpis: AnalyticsKpi[] = [
      {
        key: 'revenueGrowth',
        label: 'Revenue Growth (MoM)',
        value: revenueGrowth,
        format: 'percent',
        color: 'border-l-green-500',
        trend: revenueGrowth >= 0 ? 'up' : 'down',
      },
      {
        key: 'orderGrowth',
        label: 'Order Growth (MoM)',
        value: orderGrowth,
        format: 'percent',
        color: 'border-l-blue-500',
        trend: orderGrowth >= 0 ? 'up' : 'down',
      },
      {
        key: 'totalRevenue',
        label: 'Total Revenue',
        value: this.round(totalSales),
        format: 'currency',
        color: 'border-l-purple-500',
      },
      {
        key: 'customerCount',
        label: 'Total Customers',
        value: customers.length,
        format: 'number',
        color: 'border-l-teal-500',
      },
    ];

    const growthRows = months.map((m, i) => {
      const cur = byMonth.get(m.key) || 0;
      const prev = i > 0 ? byMonth.get(months[i - 1].key) || 0 : 0;
      return {
        label: m.label,
        sales: this.round(cur),
        growth: prev > 0 ? this.pct(cur - prev, prev) : cur > 0 ? 100 : 0,
      };
    });

    const charts: AnalyticsChart[] = [
      {
        title: 'Revenue Growth Trend',
        type: 'area',
        data: growthRows.map((g) => ({ label: g.label, Revenue: g.sales })),
        series: [{ key: 'Revenue', name: 'Revenue', color: '#22c55e' }],
      },
      {
        title: 'Month-over-Month Growth %',
        type: 'bar',
        data: growthRows.map((g) => ({ label: g.label, Growth: g.growth })),
        series: [{ key: 'Growth', name: 'Growth %', color: '#8b5cf6' }],
      },
    ];

    const tables: AnalyticsTable[] = [
      {
        title: 'Monthly Growth',
        columns: [
          { key: 'label', label: 'Month' },
          { key: 'sales', label: 'Sales', format: 'currency' },
          { key: 'growth', label: 'Growth', format: 'percent' },
        ],
        rows: growthRows,
      },
    ];

    return { generatedAt: new Date().toISOString(), kpis, charts, tables };
  }

  // ═════════════════════════════════════════════════════════════════
  // 13. TOP / BOTTOM ANALYTICS (Phase 5.16)
  // ═════════════════════════════════════════════════════════════════

  async getTopBottom(filters?: AnalyticsFilters): Promise<AnalyticsPayload> {
    const df = this.dateFilter('invoiceDate', filters);
    const [invoices, items, invoiceLines, names] = await Promise.all([
      this.all<any>(this.database.salesInvoices, 5000, df),
      this.all<any>(this.database.items),
      this.all<any>(this.database.invoiceItems),
      this.nameMaps(),
    ]);

    const active = invoices.filter((i) => this.isActive(i.status));
    const customerSales = new Map<string, number>();
    for (const inv of active) {
      customerSales.set(
        inv.customerId,
        (customerSales.get(inv.customerId) || 0) + this.num(inv.grandTotal),
      );
    }

    const itemById = new Map(items.map((i: any) => [i.id, i]));
    const activeIds = new Set(active.map((i: any) => i.id));
    const prodAgg = new Map<string, { qty: number; revenue: number; cost: number }>();
    for (const line of invoiceLines) {
      if (!activeIds.has(line.invoiceId)) {
        continue;
      }
      const item = itemById.get(line.itemId);
      const qty = this.num(line.quantity);
      const revenue = this.num(line.totalAmount ?? line.taxableValue);
      const cur = prodAgg.get(line.itemId) || { qty: 0, revenue: 0, cost: 0 };
      cur.qty += qty;
      cur.revenue += revenue;
      cur.cost += qty * this.num(item?.purchaseRate);
      prodAgg.set(line.itemId, cur);
    }

    const productRows = Array.from(prodAgg.entries()).map(([id, v]) => ({
      product: names.itemName.get(id) || id,
      qty: this.round(v.qty, 0),
      revenue: this.round(v.revenue),
      profit: this.round(v.revenue - v.cost),
      margin: this.pct(v.revenue - v.cost, v.revenue),
    }));

    const top10Customers = Array.from(customerSales.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, v]) => ({ customer: names.customerName.get(id) || id, sales: this.round(v) }));

    const supplierSpend = new Map<string, number>();
    const purchaseInvoices = await this.all<any>(this.database.purchaseInvoices);
    for (const inv of purchaseInvoices.filter((i) => this.isActive(i.status))) {
      supplierSpend.set(
        inv.supplierId,
        (supplierSpend.get(inv.supplierId) || 0) + this.num(inv.grandTotal),
      );
    }
    const top10Suppliers = Array.from(supplierSpend.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, v]) => ({ supplier: names.supplierName.get(id) || id, spend: this.round(v) }));

    const tables: AnalyticsTable[] = [
      {
        title: 'Top 10 Customers',
        columns: [
          { key: 'customer', label: 'Customer' },
          { key: 'sales', label: 'Sales', format: 'currency' },
        ],
        rows: top10Customers,
      },
      {
        title: 'Top 10 Suppliers',
        columns: [
          { key: 'supplier', label: 'Supplier' },
          { key: 'spend', label: 'Spend', format: 'currency' },
        ],
        rows: top10Suppliers,
      },
      {
        title: 'Top 10 Products by Sales',
        columns: [
          { key: 'product', label: 'Product' },
          { key: 'revenue', label: 'Sales', format: 'currency' },
        ],
        rows: [...productRows].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      },
      {
        title: 'Top 10 Products by Quantity',
        columns: [
          { key: 'product', label: 'Product' },
          { key: 'qty', label: 'Qty', format: 'number' },
        ],
        rows: [...productRows].sort((a, b) => b.qty - a.qty).slice(0, 10),
      },
      {
        title: 'Top 10 Products by Profit',
        columns: [
          { key: 'product', label: 'Product' },
          { key: 'profit', label: 'Profit', format: 'currency' },
          { key: 'margin', label: 'Margin', format: 'percent' },
        ],
        rows: [...productRows].sort((a, b) => b.profit - a.profit).slice(0, 10),
      },
      {
        title: 'Bottom Performing Products',
        columns: [
          { key: 'product', label: 'Product' },
          { key: 'profit', label: 'Profit', format: 'currency' },
        ],
        rows: [...productRows].sort((a, b) => a.profit - b.profit).slice(0, 10),
      },
      {
        title: 'Low Margin Products',
        columns: [
          { key: 'product', label: 'Product' },
          { key: 'margin', label: 'Margin', format: 'percent' },
        ],
        rows: productRows.filter((r) => r.margin < 20).slice(0, 10),
      },
    ];

    return { generatedAt: new Date().toISOString(), kpis: [], charts: [], tables };
  }

  // ── private aggregation helpers ───────────────────────────────────

  private async productSalesAgg(
    activeInvoices: any[],
    names: Awaited<ReturnType<AnalyticsService['nameMaps']>>,
  ): Promise<{ product: string; qty: number; amount: number }[]> {
    const items = await this.all<any>(this.database.invoiceItems);
    const activeIds = new Set(activeInvoices.map((i: any) => i.id));
    const prodMap = new Map<string, { qty: number; amount: number }>();
    for (const line of items) {
      if (!activeIds.has(line.invoiceId)) {
        continue;
      }
      const cur = prodMap.get(line.itemId) || { qty: 0, amount: 0 };
      cur.qty += this.num(line.quantity);
      cur.amount += this.num(line.totalAmount ?? line.taxableValue);
      prodMap.set(line.itemId, cur);
    }
    return Array.from(prodMap.entries())
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([id, v]) => ({
        product: names.itemName.get(id) || id,
        qty: this.round(v.qty, 0),
        amount: this.round(v.amount),
      }));
  }
}
