import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

type RecordData = Record<string, unknown>;

const toNumber = (value: unknown): number => Number(value) || 0;
const toDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  async getDashboard(userId: string) {
    const [salesInvoices, purchaseInvoices, items, tasks, notifications] = await Promise.all([
      this.list(this.database.salesInvoices),
      this.list(this.database.purchaseInvoices),
      this.list(this.database.items),
      this.list(this.database.workflowTasks),
      this.list(this.database.notifications),
    ]);

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const currentSales = this.sumWithin(salesInvoices, currentMonthStart, now);
    const previousSales = this.sumWithin(salesInvoices, previousMonthStart, currentMonthStart);
    const currentPurchases = this.sumWithin(purchaseInvoices, currentMonthStart, now);
    const previousPurchases = this.sumWithin(
      purchaseInvoices,
      previousMonthStart,
      currentMonthStart,
    );
    // Aaj (today) ke invoices ka real sum — dashboard ke 'Today's Sales' card ke liye.
    // Sirf posted invoices count karo — draft/cancelled bill 'Today's Sales' inflate
    // na karein (re-saved draft double-count bhi rokta hai). Existing sumWithin
    // helper reuse karte hain taaki duplicate logic na ho.
    const isPosted = (invoice: RecordData) => String(invoice.status) === 'posted';
    const postedSales = salesInvoices.filter(isPosted);
    const postedPurchases = purchaseInvoices.filter(isPosted);
    const todaySales = this.sumWithin(postedSales, todayStart, tomorrowStart);
    const yesterdaySales = this.sumWithin(postedSales, yesterdayStart, todayStart);
    const todayPurchases = this.sumWithin(postedPurchases, todayStart, tomorrowStart);
    const yesterdayPurchases = this.sumWithin(postedPurchases, yesterdayStart, todayStart);
    const todayInvoiceCount = postedSales.filter((invoice) => {
      const date = toDate(invoice.invoiceDate || invoice.createdAt);
      return date && date >= todayStart && date < tomorrowStart;
    }).length;
    const lowStock = items.filter(
      (item) =>
        toNumber(item.currentStock) <=
        Math.max(toNumber(item.reorderLevel), toNumber(item.minStock)),
    );
    const pendingApprovals = tasks.filter((task) => task.status === 'pending');
    const unreadNotifications = notifications.filter(
      (notification) => notification.userId === userId && !notification.isRead,
    );

    const revenueChange = this.change(currentSales, previousSales);
    const purchaseChange = this.change(currentPurchases, previousPurchases);
    const monthlySeries = this.monthlySeries(salesInvoices, purchaseInvoices, now);

    return {
      generatedAt: now.toISOString(),
      kpis: {
        revenue: { value: currentSales, change: revenueChange, period: 'Current month' },
        purchases: { value: currentPurchases, change: purchaseChange, period: 'Current month' },
        today: {
          value: todaySales,
          change: this.change(todaySales, yesterdaySales),
          period: 'Today',
        },
        todayPurchase: {
          value: todayPurchases,
          change: this.change(todayPurchases, yesterdayPurchases),
          period: 'Today',
        },
        todayInvoiceCount,
        inventoryValue: items.reduce(
          (total, item) => total + toNumber(item.currentStock) * toNumber(item.purchaseRate),
          0,
        ),
        pendingApprovals: pendingApprovals.length,
      },
      sales: {
        invoiceCount: salesInvoices.length,
        monthToDate: currentSales,
        previousMonth: previousSales,
        overdue: salesInvoices.filter((invoice) => invoice.status === 'overdue').length,
      },
      purchases: {
        invoiceCount: purchaseInvoices.length,
        monthToDate: currentPurchases,
        previousMonth: previousPurchases,
        unpaid: purchaseInvoices.filter((invoice) =>
          ['pending', 'unpaid', 'overdue'].includes(String(invoice.status)),
        ).length,
      },
      inventory: {
        itemCount: items.length,
        lowStockCount: lowStock.length,
        lowStock: lowStock.slice(0, 8).map((item) => ({
          id: item.id,
          name: item.name || item.sku || 'Unnamed item',
          sku: item.sku || '',
          currentStock: toNumber(item.currentStock),
          reorderLevel: Math.max(toNumber(item.reorderLevel), toNumber(item.minStock)),
        })),
      },
      charts: { monthlySeries },
      recentTransactions: this.recentTransactions(salesInvoices, purchaseInvoices),
      pendingApprovals: pendingApprovals.slice(0, 8).map((task) => ({
        id: task.id,
        title: task.title || 'Approval task',
        documentType: task.documentType || 'Workflow',
        dueDate: task.dueDate || null,
        priority: task.priority || 'normal',
      })),
      notifications: unreadNotifications.slice(0, 8).map((notification) => ({
        id: notification.id,
        title: notification.title || 'Notification',
        message: notification.message || '',
        type: notification.type || 'info',
        createdAt: notification.createdAt || null,
      })),
      insights: this.buildInsights({
        lowStock,
        pendingApprovals,
        currentSales,
        previousSales,
        currentPurchases,
        previousPurchases,
      }),
    };
  }

  private async list(repository: {
    findAll: (params: { page: number; pageSize: number }) => Promise<{ data: RecordData[] }>;
  }): Promise<RecordData[]> {
    const result = await repository.findAll({ page: 1, pageSize: 1000 });
    return result.data || [];
  }

  private sumWithin(records: RecordData[], start: Date, end: Date): number {
    return records.reduce((total, record) => {
      const date = toDate(record.invoiceDate || record.createdAt);
      return date && date >= start && date < end
        ? total + toNumber(record.grandTotal || record.totalAmount)
        : total;
    }, 0);
  }

  private change(current: number, previous: number): number | null {
    if (previous === 0) {
      return current === 0 ? 0 : null;
    }
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private monthlySeries(salesInvoices: RecordData[], purchaseInvoices: RecordData[], now: Date) {
    return Array.from({ length: 6 }, (_, index) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const end = new Date(now.getFullYear(), now.getMonth() - (4 - index), 1);
      return {
        month: start.toLocaleString('en-US', { month: 'short' }),
        sales: this.sumWithin(salesInvoices, start, end),
        purchases: this.sumWithin(purchaseInvoices, start, end),
      };
    });
  }

  private recentTransactions(salesInvoices: RecordData[], purchaseInvoices: RecordData[]) {
    return [
      ...salesInvoices.map((invoice) => ({
        id: invoice.id,
        type: 'sales' as const,
        reference: invoice.invoiceNumber || invoice.id,
        party: invoice.customerName || invoice.customerId || 'Customer',
        amount: toNumber(invoice.grandTotal),
        date: invoice.invoiceDate || invoice.createdAt || null,
        status: invoice.status || 'draft',
      })),
      ...purchaseInvoices.map((invoice) => ({
        id: invoice.id,
        type: 'purchase' as const,
        reference: invoice.invoiceNumber || invoice.id,
        party: invoice.supplierName || invoice.supplierId || 'Supplier',
        amount: toNumber(invoice.grandTotal),
        date: invoice.invoiceDate || invoice.createdAt || null,
        status: invoice.status || 'draft',
      })),
    ]
      .sort(
        (left, right) => (toDate(right.date)?.getTime() || 0) - (toDate(left.date)?.getTime() || 0),
      )
      .slice(0, 10);
  }

  private buildInsights(data: {
    lowStock: RecordData[];
    pendingApprovals: RecordData[];
    currentSales: number;
    previousSales: number;
    currentPurchases: number;
    previousPurchases: number;
  }) {
    const insights: Array<{
      type: 'positive' | 'warning' | 'info';
      title: string;
      description: string;
      actionPath: string;
    }> = [];
    if (data.lowStock.length) {
      insights.push({
        type: 'warning',
        title: 'Replenishment required',
        description: `${data.lowStock.length} item(s) are at or below their reorder level.`,
        actionPath: '/inventory/items',
      });
    }
    if (data.pendingApprovals.length) {
      insights.push({
        type: 'warning',
        title: 'Approvals waiting',
        description: `${data.pendingApprovals.length} workflow task(s) need attention.`,
        actionPath: '/workflow/approvals',
      });
    }
    if (data.previousSales > 0) {
      insights.push({
        type: data.currentSales >= data.previousSales ? 'positive' : 'info',
        title: 'Sales trend',
        description: `Current-month sales are ${Math.abs(this.change(data.currentSales, data.previousSales) || 0)}% ${data.currentSales >= data.previousSales ? 'above' : 'below'} the prior month.`,
        actionPath: '/sales/dashboard',
      });
    }
    if (data.previousPurchases > 0) {
      insights.push({
        type: 'info',
        title: 'Procurement trend',
        description: `Current-month purchases are ${Math.abs(this.change(data.currentPurchases, data.previousPurchases) || 0)}% ${data.currentPurchases >= data.previousPurchases ? 'above' : 'below'} the prior month.`,
        actionPath: '/purchase/dashboard',
      });
    }
    return insights;
  }
}
