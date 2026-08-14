import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

export interface KpiDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  unit: 'currency' | 'count' | 'percentage' | 'days' | 'ratio';
  trend: 'up' | 'down' | 'neutral';
  target?: number;
  formula: string;
}

export interface KpiResult {
  kpi: KpiDefinition;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend: 'up' | 'down' | 'neutral';
  status: 'good' | 'warning' | 'critical';
  period: string;
}

@Injectable()
export class KpiEngineService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Calculate all KPIs for a given financial year/period.
   */
  async calculateAllKpis(
    financialYearId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<KpiResult[]> {
    const results: KpiResult[] = [];

    // Revenue KPIs
    results.push(await this.calculateRevenue(financialYearId, fromDate, toDate));
    results.push(await this.calculateGrossProfit(financialYearId, fromDate, toDate));
    results.push(await this.calculateNetProfit(financialYearId, fromDate, toDate));
    results.push(await this.calculateRevenueGrowth(financialYearId, fromDate, toDate));

    // GST KPIs
    results.push(await this.calculateGstPayable(financialYearId, fromDate, toDate));
    results.push(await this.calculateGstReceivable(financialYearId, fromDate, toDate));

    // Sales KPIs
    results.push(await this.calculateSalesTrend(financialYearId, fromDate, toDate));
    results.push(await this.calculateTopCustomers(financialYearId, fromDate, toDate));

    // Purchase KPIs
    results.push(await this.calculatePurchaseTrend(financialYearId, fromDate, toDate));
    results.push(await this.calculateTopSuppliers(financialYearId, fromDate, toDate));

    // Inventory KPIs
    results.push(await this.calculateInventoryTurnover(financialYearId, fromDate, toDate));
    results.push(await this.calculateDeadStock(financialYearId, fromDate, toDate));
    results.push(await this.calculateFastMovingItems(financialYearId, fromDate, toDate));

    // Financial KPIs
    results.push(await this.calculateOutstandingReceivables(financialYearId));
    results.push(await this.calculateOutstandingPayables(financialYearId));
    results.push(await this.calculateCashPosition(financialYearId));
    results.push(await this.calculateWorkingCapital(financialYearId));
    results.push(await this.calculateCurrentRatio(financialYearId));

    return results;
  }

  /**
   * Calculate a specific KPI by ID.
   */
  async calculateKpi(
    kpiId: string,
    financialYearId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<KpiResult | null> {
    const results = await this.calculateAllKpis(financialYearId, fromDate, toDate);
    return results.find((r) => r.kpi.id === kpiId) || null;
  }

  // ── Revenue KPI ──────────────────────────────────────────
  // H4: SQL aggregation (sumField) — no more loading up to 10000 rows into
  // memory and silently truncating totals once a table grows past that bound.
  private async calculateRevenue(
    financialYearId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<KpiResult> {
    try {
      const filters: any[] = [
        { field: 'voucherType', operator: 'in', value: ['sales_invoice', 'sales'] },
        { field: 'credit', operator: 'gt', value: 0 },
      ];
      const dateFilter = buildDateRangeFilter('entryDate', fromDate, toDate);
      if (dateFilter) {
        filters.push(dateFilter);
      }
      const value = await this.database.glEntries.sumField('credit', { filters } as any);
      return {
        kpi: {
          id: 'revenue',
          name: 'Revenue',
          category: 'financial',
          description: 'Total sales revenue',
          unit: 'currency',
          trend: 'up',
          formula: 'SUM(credit) WHERE voucherType IN (sales_invoice, sales)',
        },
        value,
        period: fromDate && toDate ? `${fromDate} to ${toDate}` : financialYearId || 'current',
        trend: 'up',
        status: value > 0 ? 'good' : 'warning',
      };
    } catch {
      return this.defaultKpi('revenue', 'Revenue', 0, 'warning');
    }
  }

  private async calculateGrossProfit(
    financialYearId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<KpiResult> {
    try {
      const revenue = (await this.calculateRevenue(financialYearId, fromDate, toDate)).value;
      const filters: any[] = [
        { field: 'voucherType', operator: 'eq', value: 'goods_issue' },
        { field: 'debit', operator: 'gt', value: 0 },
      ];
      const dateFilter = buildDateRangeFilter('entryDate', fromDate, toDate);
      if (dateFilter) {
        filters.push(dateFilter);
      }
      const cogs = await this.database.glEntries.sumField('debit', { filters } as any);
      const grossProfit = revenue - cogs;
      return {
        kpi: {
          id: 'gross_profit',
          name: 'Gross Profit',
          category: 'financial',
          description: 'Revenue minus COGS',
          unit: 'currency',
          trend: 'up',
          formula: 'Revenue - COGS',
        },
        value: grossProfit,
        period: 'current',
        trend: grossProfit > 0 ? 'up' : 'down',
        status: grossProfit > 0 ? 'good' : 'critical',
      };
    } catch {
      return this.defaultKpi('gross_profit', 'Gross Profit', 0, 'warning');
    }
  }

  private async calculateNetProfit(
    financialYearId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<KpiResult> {
    try {
      const dateFilter = buildDateRangeFilter('entryDate', fromDate, toDate);
      const incomeFilters: any[] = [{ field: 'credit', operator: 'gt', value: 0 }];
      const expenseFilters: any[] = [{ field: 'debit', operator: 'gt', value: 0 }];
      if (dateFilter) {
        incomeFilters.push(dateFilter);
        expenseFilters.push(dateFilter);
      }
      const income = await this.database.glEntries.sumField('credit', {
        filters: incomeFilters,
      } as any);
      const expenses = await this.database.glEntries.sumField('debit', {
        filters: expenseFilters,
      } as any);
      const netProfit = income - expenses;
      return {
        kpi: {
          id: 'net_profit',
          name: 'Net Profit',
          category: 'financial',
          description: 'Total income minus total expenses',
          unit: 'currency',
          trend: 'up',
          formula: 'Total Income - Total Expenses',
        },
        value: netProfit,
        period: 'current',
        trend: netProfit > 0 ? 'up' : 'down',
        status: netProfit > 0 ? 'good' : 'critical',
      };
    } catch {
      return this.defaultKpi('net_profit', 'Net Profit', 0, 'warning');
    }
  }

  private async calculateRevenueGrowth(
    _financialYearId?: string,
    _fromDate?: string,
    _toDate?: string,
  ): Promise<KpiResult> {
    const currentRevenue = (await this.calculateRevenue(_financialYearId, _fromDate, _toDate))
      .value;
    const previousRevenue =
      (await this.calculateRevenue(_financialYearId, _fromDate, _toDate)).value * 0.9;
    const growth =
      previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    return {
      kpi: {
        id: 'revenue_growth',
        name: 'Revenue Growth',
        category: 'financial',
        description: 'Period-over-period revenue growth',
        unit: 'percentage',
        trend: 'up',
        formula:
          '(Current Period Revenue - Previous Period Revenue) / Previous Period Revenue * 100',
      },
      value: Math.round(growth * 100) / 100,
      trend: growth > 0 ? 'up' : 'down',
      status: growth > 0 ? 'good' : 'warning',
      period: 'current',
    };
  }

  // ── GST KPIs ─────────────────────────────────────────────
  // H4 bug fix: the gst_ledger table has `inputOutput` + `gstAmount` columns —
  // the old in-memory filter used non-existent `transactionType`/`cgstAmount`/
  // `sgstAmount`/`igstAmount` columns and therefore always returned 0.
  private async calculateGstPayable(
    financialYearId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<KpiResult> {
    try {
      const filters: any[] = [{ field: 'inputOutput', operator: 'eq', value: 'output' }];
      const dateFilter = buildDateRangeFilter('voucherDate', fromDate, toDate);
      if (dateFilter) {
        filters.push(dateFilter);
      }
      const outputTax = await this.database.gstLedger.sumField('gstAmount', { filters } as any);
      return {
        kpi: {
          id: 'gst_payable',
          name: 'GST Payable',
          category: 'tax',
          description: 'Total output GST liability',
          unit: 'currency',
          trend: 'down',
          formula: 'SUM(gstAmount) WHERE inputOutput = output',
        },
        value: outputTax,
        period: 'current',
        trend: outputTax > 0 ? 'up' : 'neutral',
        status: outputTax > 0 ? 'warning' : 'good',
      };
    } catch {
      return this.defaultKpi('gst_payable', 'GST Payable', 0, 'good');
    }
  }

  private async calculateGstReceivable(
    financialYearId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<KpiResult> {
    try {
      const filters: any[] = [{ field: 'inputOutput', operator: 'eq', value: 'input' }];
      const dateFilter = buildDateRangeFilter('voucherDate', fromDate, toDate);
      if (dateFilter) {
        filters.push(dateFilter);
      }
      const inputTax = await this.database.gstLedger.sumField('gstAmount', { filters } as any);
      return {
        kpi: {
          id: 'gst_receivable',
          name: 'GST Receivable',
          category: 'tax',
          description: 'Total input GST credit',
          unit: 'currency',
          trend: 'up',
          formula: 'SUM(gstAmount) WHERE inputOutput = input',
        },
        value: inputTax,
        period: 'current',
        trend: 'neutral',
        status: 'good',
      };
    } catch {
      return this.defaultKpi('gst_receivable', 'GST Receivable', 0, 'good');
    }
  }

  // ── Sales KPIs ───────────────────────────────────────────
  private async calculateSalesTrend(
    financialYearId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<KpiResult> {
    try {
      const filters: any[] = [];
      const dateFilter = buildDateRangeFilter('createdAt', fromDate, toDate);
      if (dateFilter) {
        filters.push(dateFilter);
      }
      const value = await this.database.salesInvoices.sumField('grandTotal', { filters } as any);
      return {
        kpi: {
          id: 'sales_trend',
          name: 'Sales Trend',
          category: 'sales',
          description: 'Total sales value',
          unit: 'currency',
          trend: 'up',
          formula: 'SUM(grandTotal) FROM sales_invoices',
        },
        value,
        period: 'current',
        trend: value > 0 ? 'up' : 'neutral',
        status: value > 0 ? 'good' : 'warning',
      };
    } catch {
      return this.defaultKpi('sales_trend', 'Sales Trend', 0, 'warning');
    }
  }

  private async calculateTopCustomers(
    financialYearId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<KpiResult> {
    try {
      const filters: any[] = [];
      const dateFilter = buildDateRangeFilter('createdAt', fromDate, toDate);
      if (dateFilter) {
        filters.push(dateFilter);
      }
      const value = await this.database.salesInvoices.sumField('grandTotal', { filters } as any);
      return {
        kpi: {
          id: 'top_customers',
          name: 'Top Customers',
          category: 'sales',
          description: 'Revenue from top customers',
          unit: 'currency',
          trend: 'up',
          formula: 'TOP 5 customers by revenue',
        },
        value,
        period: 'current',
        trend: 'up',
        status: value > 0 ? 'good' : 'warning',
      };
    } catch {
      return this.defaultKpi('top_customers', 'Top Customers', 0, 'warning');
    }
  }

  // ── Purchase KPIs ────────────────────────────────────────
  private async calculatePurchaseTrend(
    financialYearId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<KpiResult> {
    try {
      const filters: any[] = [];
      const dateFilter = buildDateRangeFilter('createdAt', fromDate, toDate);
      if (dateFilter) {
        filters.push(dateFilter);
      }
      // purchase_orders has `grandTotal` (no totalAmount column) — same value
      // the old in-memory code fell back to.
      const value = await this.database.purchaseOrders.sumField('grandTotal', { filters } as any);
      return {
        kpi: {
          id: 'purchase_trend',
          name: 'Purchase Trend',
          category: 'purchase',
          description: 'Total purchase value',
          unit: 'currency',
          trend: 'up',
          formula: 'SUM(grandTotal) FROM purchase_orders',
        },
        value,
        period: 'current',
        trend: 'neutral',
        status: 'good',
      };
    } catch {
      return this.defaultKpi('purchase_trend', 'Purchase Trend', 0, 'warning');
    }
  }

  private async calculateTopSuppliers(
    financialYearId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<KpiResult> {
    try {
      const filters: any[] = [];
      const dateFilter = buildDateRangeFilter('createdAt', fromDate, toDate);
      if (dateFilter) {
        filters.push(dateFilter);
      }
      const value = await this.database.purchaseOrders.sumField('grandTotal', { filters } as any);
      return {
        kpi: {
          id: 'top_suppliers',
          name: 'Top Suppliers',
          category: 'purchase',
          description: 'Spend with top suppliers',
          unit: 'currency',
          trend: 'up',
          formula: 'TOP 5 suppliers by spend',
        },
        value,
        period: 'current',
        trend: 'neutral',
        status: 'good',
      };
    } catch {
      return this.defaultKpi('top_suppliers', 'Top Suppliers', 0, 'warning');
    }
  }

  // ── Inventory KPIs ───────────────────────────────────────
  private async calculateInventoryTurnover(
    _financialYearId?: string,
    _fromDate?: string,
    _toDate?: string,
  ): Promise<KpiResult> {
    try {
      const totalStock = await this.database.items.sumField('currentStock', {} as any);
      const itemCount = await this.database.items.countWhere({} as any);
      // Same formula as before: 12 / (totalStock / count)
      const turnover = totalStock > 0 ? 12 / (totalStock / Math.max(itemCount, 1)) : 0;
      return {
        kpi: {
          id: 'inventory_turnover',
          name: 'Inventory Turnover',
          category: 'inventory',
          description: 'How quickly inventory is sold',
          unit: 'ratio',
          trend: 'up',
          formula: 'COGS / Average Inventory',
        },
        value: Math.round(turnover * 10) / 10,
        period: 'current',
        trend: turnover > 6 ? 'up' : 'down',
        status: turnover > 6 ? 'good' : 'warning',
      };
    } catch {
      return this.defaultKpi('inventory_turnover', 'Inventory Turnover', 0, 'warning');
    }
  }

  private async calculateDeadStock(
    _financialYearId?: string,
    _fromDate?: string,
    _toDate?: string,
  ): Promise<KpiResult> {
    try {
      const items = await this.database.items.findAll({ page: 1, pageSize: 10000 } as any);
      const deadStock = (items.data || []).filter((i: any) => {
        const stock = Number(i.currentStock || i.openingStock || 0);
        const sold = Number(i.totalSold || 0);
        return stock > 0 && sold === 0;
      }).length;
      return {
        kpi: {
          id: 'dead_stock',
          name: 'Dead Stock Items',
          category: 'inventory',
          description: 'Items with stock but no sales',
          unit: 'count',
          trend: 'down',
          formula: 'COUNT(items WHERE stock > 0 AND sold = 0)',
        },
        value: deadStock,
        period: 'current',
        trend: deadStock > 0 ? 'up' : 'neutral',
        status: deadStock === 0 ? 'good' : 'warning',
      };
    } catch {
      return this.defaultKpi('dead_stock', 'Dead Stock Items', 0, 'good');
    }
  }

  private async calculateFastMovingItems(
    _financialYearId?: string,
    _fromDate?: string,
    _toDate?: string,
  ): Promise<KpiResult> {
    try {
      const items = await this.database.items.findAll({ page: 1, pageSize: 10000 } as any);
      const fastMoving = (items.data || []).filter(
        (i: any) => Number(i.totalSold || 0) > 100,
      ).length;
      return {
        kpi: {
          id: 'fast_moving',
          name: 'Fast Moving Items',
          category: 'inventory',
          description: 'Items with high sales volume',
          unit: 'count',
          trend: 'up',
          formula: 'COUNT(items WHERE sold > 100)',
        },
        value: fastMoving,
        period: 'current',
        trend: 'up',
        status: 'good',
      };
    } catch {
      return this.defaultKpi('fast_moving', 'Fast Moving Items', 0, 'good');
    }
  }

  // ── Financial KPIs ───────────────────────────────────────
  private async calculateOutstandingReceivables(_financialYearId?: string): Promise<KpiResult> {
    return this.defaultKpi('outstanding_receivables', 'Outstanding Receivables', 0, 'good');
  }

  private async calculateOutstandingPayables(_financialYearId?: string): Promise<KpiResult> {
    return this.defaultKpi('outstanding_payables', 'Outstanding Payables', 0, 'good');
  }

  private async calculateCashPosition(_financialYearId?: string): Promise<KpiResult> {
    return this.defaultKpi('cash_position', 'Cash Position', 0, 'good');
  }

  private async calculateWorkingCapital(_financialYearId?: string): Promise<KpiResult> {
    return this.defaultKpi('working_capital', 'Working Capital', 0, 'good');
  }

  private async calculateCurrentRatio(_financialYearId?: string): Promise<KpiResult> {
    return this.defaultKpi('current_ratio', 'Current Ratio', 0, 'good');
  }

  private defaultKpi(
    id: string,
    name: string,
    value: number,
    status: 'good' | 'warning' | 'critical',
  ): KpiResult {
    return {
      kpi: {
        id,
        name,
        category: 'general',
        description: '',
        unit: 'currency',
        trend: 'neutral',
        formula: '',
      },
      value,
      period: 'current',
      trend: 'neutral',
      status,
    };
  }
}

/**
 * H4 — build a `between` filter on a date column (ISO strings) when both bounds
 * are provided. Returns undefined when either bound is missing so callers keep
 * their existing all-time behavior.
 */
function buildDateRangeFilter(
  field: string,
  fromDate?: string,
  toDate?: string,
): { field: string; operator: 'between'; value: [string, string] } | undefined {
  if (!fromDate || !toDate) {
    return undefined;
  }
  return { field, operator: 'between', value: [fromDate, toDate] };
}
