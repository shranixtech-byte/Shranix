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
    const [salesInvoices, purchaseInvoices, items, tasks, notifications, suppliers] =
      await Promise.all([
        this.list(this.database.salesInvoices),
        this.list(this.database.purchaseInvoices),
        this.list(this.database.items),
        this.list(this.database.workflowTasks),
        this.list(this.database.notifications),
        this.list(this.database.suppliers),
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

    const todaySalesInvoices = postedSales.filter((invoice) => {
      const date = toDate(invoice.invoiceDate || invoice.createdAt);
      return date && date >= todayStart && date < tomorrowStart;
    });

    const isCashSale = (inv: RecordData) => {
      const mode = String(inv.paymentMode || inv.paymentTerms || '').toLowerCase();
      const num = String(inv.invoiceNumber || '').toUpperCase();
      return mode === 'cash' || num.includes('SLCA') || mode.includes('cash');
    };

    const todayCashInvoices = todaySalesInvoices.filter(isCashSale);
    const todayCreditInvoices = todaySalesInvoices.filter((inv) => !isCashSale(inv));

    const todayCashSales = todayCashInvoices.reduce(
      (sum, inv) => sum + toNumber(inv.grandTotal),
      0,
    );
    const todayCreditSales = todayCreditInvoices.reduce(
      (sum, inv) => sum + toNumber(inv.grandTotal),
      0,
    );

    const todayPurchaseInvoices = postedPurchases.filter((invoice) => {
      const date = toDate(invoice.invoiceDate || invoice.createdAt);
      return date && date >= todayStart && date < tomorrowStart;
    });

    const isCashPurchase = (inv: RecordData) => {
      const mode = String(inv.paymentMode || inv.paymentTerms || '').toLowerCase();
      const num = String(inv.billNumber || inv.invoiceNumber || '').toUpperCase();
      return mode === 'cash' || num.includes('PUCA') || mode.includes('cash');
    };

    const todayCashPurchasesList = todayPurchaseInvoices.filter(isCashPurchase);
    const todayCreditPurchasesList = todayPurchaseInvoices.filter((inv) => !isCashPurchase(inv));

    const todayCashPurchases = todayCashPurchasesList.reduce(
      (sum, inv) => sum + toNumber(inv.grandTotal || inv.totalAmount),
      0,
    );
    const todayCreditPurchases = todayCreditPurchasesList.reduce(
      (sum, inv) => sum + toNumber(inv.grandTotal || inv.totalAmount),
      0,
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
        todayCashSales,
        todayCreditSales,
        todayCashCount: todayCashInvoices.length,
        todayCreditCount: todayCreditInvoices.length,
        todaySalesList: todaySalesInvoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName || inv.customerId || 'Cash Customer',
          grandTotal: toNumber(inv.grandTotal),
          paymentMode: isCashSale(inv) ? 'cash' : 'credit',
          paymentStatus: inv.paymentStatus || 'paid',
          time: inv.createdAt
            ? new Date(String(inv.createdAt)).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Today',
        })),
        todayCashPurchases,
        todayCreditPurchases,
        todayCashPurchaseCount: todayCashPurchasesList.length,
        todayCreditPurchaseCount: todayCreditPurchasesList.length,
        todayPurchaseList: todayPurchaseInvoices.map((inv) => ({
          id: inv.id,
          billNumber: inv.billNumber || inv.invoiceNumber || 'BILL-TODAY',
          supplierName: inv.supplierName || inv.vendorName || inv.supplierId || 'Cash Vendor',
          grandTotal: toNumber(inv.grandTotal || inv.totalAmount),
          paymentMode: isCashPurchase(inv) ? 'cash' : 'credit',
          paymentStatus: inv.paymentStatus || 'paid',
          time: inv.createdAt
            ? new Date(String(inv.createdAt)).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Today',
        })),
        inventoryValue: items.reduce(
          (total, item) => total + toNumber(item.currentStock) * toNumber(item.purchaseRate),
          0,
        ),
        pendingApprovals: pendingApprovals.length,
        totalSuppliersCount: suppliers.length,
        suppliersList: suppliers.map((sup) => {
          const supId = String(sup.id || '');
          const supName = String(sup.name || sup.firmName || 'Supplier');
          const matchedItems = items.filter(
            (it) =>
              String(it.supplierId) === supId ||
              String(it.supplierName).toLowerCase() === supName.toLowerCase(),
          );
          const productNames =
            matchedItems.length > 0
              ? matchedItems.map((it) => String(it.name || it.sku))
              : sup.productsSupplied
                ? String(sup.productsSupplied)
                    .split(',')
                    .map((s) => s.trim())
                : ['Agri Fertilizers', 'Pesticides & Crop Protection'];

          return {
            id: sup.id,
            name: supName,
            code: sup.code || sup.supplierCode || `SUP-${String(sup.id).slice(-4)}`,
            mobile: sup.mobile || sup.phone || '—',
            city: sup.city || sup.address || 'Maharashtra',
            gstin: sup.gstin || sup.gstNo || 'GSTIN Pending',
            productsSupplied: Array.from(new Set(productNames)).slice(0, 5),
            outstanding: toNumber(sup.currentBalance || sup.outstandingBalance || 0),
            status: sup.status || 'active',
          };
        }),
        totalProductsCount: items.length,
        productsByCategoryList: items.map((item) => {
          const category = String(
            item.category || item.categoryName || item.group || 'Agri Inputs',
          );
          return {
            id: item.id,
            name: item.name || item.sku || 'Product',
            sku: item.sku || item.code || `PRD-${String(item.id).slice(-4)}`,
            category,
            currentStock: toNumber(item.currentStock),
            unit: item.unit || item.uom || 'bag',
            sellingPrice: toNumber(item.sellingRate || item.sellingPrice || item.mrp || 0),
            purchasePrice: toNumber(item.purchaseRate || item.purchasePrice || 0),
          };
        }),
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
