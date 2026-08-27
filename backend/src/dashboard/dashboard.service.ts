import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

type RecordData = Record<string, unknown>;

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {return Number.isNaN(value) ? 0 : value;}
  if (!value) {return 0;}
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const toDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

function formatCurrency(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)} K`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatTimeAgo(date: Date | null, now: Date): string {
  if (!date) {return 'Today';}
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) {return 'आत्ताच';}
  if (diffMinutes < 60) {return `${diffMinutes} मिनिटांपूर्वी`;}
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {return `${diffHours} तासांपूर्वी`;}
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {return 'काल';}
  if (diffDays < 30) {return `${diffDays} दिवसांपूर्वी`;}
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  async getDashboard(_userId: string) {
    const [
      salesInvoices,
      purchaseInvoices,
      items,
      customers,
      suppliers,
      batches,
      salesOrders,
      purchaseOrders,
      stockTransfers,
      cashBook,
      _tasks,
      _notifications,
    ] = await Promise.all([
      this.list(this.database.salesInvoices),
      this.list(this.database.purchaseInvoices),
      this.list(this.database.items),
      this.list(this.database.customers),
      this.list(this.database.suppliers),
      this.list(this.database.batchMaster),
      this.list(this.database.salesOrders),
      this.list(this.database.purchaseOrders),
      this.list(this.database.stockTransfers),
      this.list(this.database.cashBook),
      this.list(this.database.workflowTasks),
      this.list(this.database.notifications),
    ]);

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    const isPosted = (invoice: RecordData) => {
      const status = String(invoice.status || '').toLowerCase();
      return status === 'posted' || status === 'paid' || status === 'completed';
    };

    const postedSales = salesInvoices.filter(isPosted);
    const postedPurchases = purchaseInvoices.filter(isPosted);

    // ── 1. KPI: TODAY'S & MONTHLY SALES ──
    const currentYearStart = new Date(now.getFullYear(), 0, 1);
    const previousYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const previousYearEnd = new Date(now.getFullYear(), 0, 1);

    const _currentMonthSales = this.sumWithin(postedSales, currentMonthStart, now);
    const previousMonthSales = this.sumWithin(postedSales, previousMonthStart, currentMonthStart);
    const todaySales = this.sumWithin(postedSales, todayStart, tomorrowStart);
    const yesterdaySales = this.sumWithin(postedSales, yesterdayStart, todayStart);
    const currentYearSales = this.sumWithin(postedSales, currentYearStart, now);
    const previousYearSales = this.sumWithin(postedSales, previousYearStart, previousYearEnd);

    const _currentMonthPurchases = this.sumWithin(postedPurchases, currentMonthStart, now);
    const previousMonthPurchases = this.sumWithin(
      postedPurchases,
      previousMonthStart,
      currentMonthStart,
    );
    const todayPurchases = this.sumWithin(postedPurchases, todayStart, tomorrowStart);
    const yesterdayPurchases = this.sumWithin(postedPurchases, yesterdayStart, todayStart);
    const currentYearPurchases = this.sumWithin(postedPurchases, currentYearStart, now);
    const previousYearPurchases = this.sumWithin(
      postedPurchases,
      previousYearStart,
      previousYearEnd,
    );

    // ── 3. KPI: TODAY'S INVOICE COUNT ──
    const todaySalesInvoices = postedSales.filter((invoice) => {
      const date = toDate(invoice.invoiceDate || invoice.createdAt);
      return date && date >= todayStart && date < tomorrowStart;
    });
    const yesterdaySalesInvoices = postedSales.filter((invoice) => {
      const date = toDate(invoice.invoiceDate || invoice.createdAt);
      return date && date >= yesterdayStart && date < todayStart;
    });
    const todayInvoiceCount = todaySalesInvoices.length;
    const yesterdayInvoiceCount = yesterdaySalesInvoices.length;

    // ── CASH VS CREDIT SALES BREAKDOWN ──
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

    // ── CASH VS CREDIT PURCHASE BREAKDOWN ──
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

    // ── 4. CUSTOMERS & INVENTORY MASTER STATS ──
    const activeCustomers = customers.filter((c) => !c.isDeleted);
    const activeItems = items.filter((it) => !it.isDeleted);

    // Compute real growth changes from actual data
    const currentMonthCustomers = activeCustomers.filter((c) => {
      const d = toDate(c.createdAt);
      return d && d >= currentMonthStart && d < now;
    }).length;
    const previousMonthCustomers = activeCustomers.filter((c) => {
      const d = toDate(c.createdAt);
      return d && d >= previousMonthStart && d < currentMonthStart;
    }).length;
    const customerGrowthChange = this.change(currentMonthCustomers, previousMonthCustomers);

    const currentMonthProducts = activeItems.filter((it) => {
      const d = toDate(it.createdAt);
      return d && d >= currentMonthStart && d < now;
    }).length;
    const previousMonthProducts = activeItems.filter((it) => {
      const d = toDate(it.createdAt);
      return d && d >= previousMonthStart && d < currentMonthStart;
    }).length;
    const productGrowthChange = this.change(currentMonthProducts, previousMonthProducts);

    const totalStockValuation = activeItems.reduce((total, item) => {
      const stock = toNumber(item.currentStock || item.stock || 0);
      const rate = toNumber(item.purchaseRate || item.purchasePrice || item.sellingRate || 0);
      return total + stock * rate;
    }, 0);

    // ── 5. STOCK STATUS CALCULATION ──
    const inStockItems = activeItems.filter((item) => {
      const stock = toNumber(item.currentStock || item.stock || 0);
      const reorder = toNumber(item.reorderLevel || 10);
      const min = toNumber(item.minStock || 5);
      return stock > Math.max(reorder, min);
    });

    const lowStockItems = activeItems.filter((item) => {
      const stock = toNumber(item.currentStock || item.stock || 0);
      const reorder = toNumber(item.reorderLevel || 10);
      const min = toNumber(item.minStock || 5);
      return stock > 0 && stock <= reorder && stock > min;
    });

    const criticalStockItems = activeItems.filter((item) => {
      const stock = toNumber(item.currentStock || item.stock || 0);
      const min = toNumber(item.minStock || 5);
      return stock > 0 && stock <= min;
    });

    const outOfStockItems = activeItems.filter((item) => {
      const stock = toNumber(item.currentStock || item.stock || 0);
      return stock <= 0;
    });

    // ── 6. MULTI-PERIOD SALES & PURCHASE CHART SERIES ──
    const salesSeriesWeekly = this.dailySeries(postedSales, now, 7);
    const salesSeriesMonthly = this.weeklySeries(postedSales, now, 4);
    const salesSeriesYearly = this.quarterlySeries(postedSales, now);

    const purchaseSeriesWeekly = this.dailySeries(postedPurchases, now, 7);
    const purchaseSeriesMonthly = this.weeklySeries(postedPurchases, now, 4);
    const purchaseSeriesYearly = this.quarterlySeries(postedPurchases, now);

    const weekSalesTotal = salesSeriesWeekly.reduce((sum, d) => sum + d.amount, 0);
    const monthSalesTotal = salesSeriesMonthly.reduce((sum, d) => sum + d.amount, 0);
    const yearSalesTotal = salesSeriesYearly.reduce((sum, d) => sum + d.amount, 0);

    const weekPurchaseTotal = purchaseSeriesWeekly.reduce((sum, d) => sum + d.amount, 0);
    const monthPurchaseTotal = purchaseSeriesMonthly.reduce((sum, d) => sum + d.amount, 0);
    const yearPurchaseTotal = purchaseSeriesYearly.reduce((sum, d) => sum + d.amount, 0);

    // ── 7. REAL EXPIRY ALERTS ──
    const expiryAlertsList = this.buildExpiryAlerts(batches, activeItems, now);

    // ── 8. REAL RECENT TRANSACTIONS ──
    const recentTransactionsList = this.buildRecentTransactions(
      salesInvoices,
      purchaseInvoices,
      stockTransfers,
      cashBook,
      activeCustomers,
      suppliers,
      now,
    );

    // ── 9. REAL TOP SELLING PRODUCTS ──
    const topSellingProductsList = this.buildTopSellingProducts(postedSales, activeItems);

    // ── 10. REAL BOTTOM SUMMARY CARDS ──
    const pendingOrdersCount =
      salesOrders.filter((so) =>
        ['pending', 'open', 'confirmed', 'draft'].includes(String(so.status || '')),
      ).length +
      purchaseOrders.filter((po) =>
        ['pending', 'open', 'ordered', 'draft'].includes(String(po.status || '')),
      ).length;

    const pendingInvoicesCount = salesInvoices.filter((si) =>
      ['pending', 'unpaid', 'overdue', 'partially_paid', 'draft'].includes(
        String(si.paymentStatus || si.status || ''),
      ),
    ).length;

    const outstandingTotal = activeCustomers.reduce(
      (sum, c) => sum + toNumber(c.currentBalance || c.outstandingBalance || c.balance || 0),
      0,
    );

    const cashBookBalance = cashBook.reduce((bal, entry) => {
      const debit = toNumber(entry.debit || entry.receiptAmount || entry.amount || 0);
      const credit = toNumber(entry.credit || entry.paymentAmount || 0);
      return bal + (debit - credit);
    }, 0);

    const cashInHandValue = cashBookBalance;

    return {
      generatedAt: now.toISOString(),
      kpis: {
        revenue: {
          value: todaySales,
          change: this.change(todaySales, yesterdaySales),
          period: 'today',
        },
        purchases: {
          value: todayPurchases,
          change: this.change(todayPurchases, yesterdayPurchases),
          period: 'today',
        },
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
        todayInvoiceChange: this.change(todayInvoiceCount, yesterdayInvoiceCount),
        todayCashSales,
        todayCreditSales,
        todayCashCount: todayCashInvoices.length,
        todayCreditCount: todayCreditInvoices.length,
        todaySalesList: todaySalesInvoices.map((inv) => ({
          id: String(inv.id),
          invoiceNumber: String(inv.invoiceNumber || `INV-${String(inv.id).slice(-4)}`),
          customerName: String(inv.customerName || inv.customerId || 'Cash Customer'),
          grandTotal: toNumber(inv.grandTotal),
          paymentMode: isCashSale(inv) ? 'cash' : 'credit',
          paymentStatus: String(inv.paymentStatus || 'paid'),
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
          id: String(inv.id),
          billNumber: String(
            inv.billNumber || inv.invoiceNumber || `BILL-${String(inv.id).slice(-4)}`,
          ),
          supplierName: String(
            inv.supplierName || inv.vendorName || inv.supplierId || 'Cash Vendor',
          ),
          grandTotal: toNumber(inv.grandTotal || inv.totalAmount),
          paymentMode: isCashPurchase(inv) ? 'cash' : 'credit',
          paymentStatus: String(inv.paymentStatus || 'paid'),
          time: inv.createdAt
            ? new Date(String(inv.createdAt)).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Today',
        })),
        totalCustomersCount: activeCustomers.length,
        customerGrowthChange: customerGrowthChange ?? 0,
        totalProductsCount: activeItems.length,
        productGrowthChange: productGrowthChange ?? 0,
        inventoryValue: totalStockValuation,
        stockValueChange: 0,
        totalSuppliersCount: suppliers.length,
        suppliersList: suppliers.map((sup) => {
          const supId = String(sup.id || '');
          const supName = String(sup.name || sup.firmName || 'Supplier');
          const matchedItems = activeItems.filter(
            (it) =>
              String(it.supplierId) === supId ||
              String(it.supplierName || '').toLowerCase() === supName.toLowerCase(),
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
            id: String(sup.id),
            name: supName,
            code: String(sup.code || sup.supplierCode || `SUP-${String(sup.id).slice(-4)}`),
            mobile: String(sup.mobile || sup.phone || '—'),
            city: String(sup.city || sup.address || 'Maharashtra'),
            gstin: String(sup.gstin || sup.gstNo || 'GSTIN Pending'),
            productsSupplied: Array.from(new Set(productNames)).slice(0, 5),
            outstanding: toNumber(sup.currentBalance || sup.outstandingBalance || 0),
            status: String(sup.status || 'active'),
          };
        }),
        productsByCategoryList: activeItems.map((item) => {
          const category = String(
            item.category || item.categoryName || item.group || 'Agri Inputs',
          );
          return {
            id: String(item.id),
            name: String(item.name || item.sku || 'Product'),
            sku: String(item.sku || item.code || `PRD-${String(item.id).slice(-4)}`),
            category,
            currentStock: toNumber(item.currentStock || item.stock || 0),
            unit: String(item.unit || item.uom || 'bag'),
            sellingPrice: toNumber(item.sellingRate || item.sellingPrice || item.mrp || 0),
            purchasePrice: toNumber(item.purchaseRate || item.purchasePrice || 0),
          };
        }),
      },
      stockStatus: {
        totalProducts: activeItems.length,
        inStockCount: inStockItems.length,
        lowStockCount: lowStockItems.length,
        criticalStockCount: criticalStockItems.length,
        outOfStockCount: outOfStockItems.length,
      },
      salesOverview: {
        weekly: {
          data: salesSeriesWeekly,
          total: formatCurrency(weekSalesTotal),
          changePercent: this.change(weekSalesTotal, previousMonthSales / 4) ?? 0,
          label: 'या आठवड्यात',
        },
        monthly: {
          data: salesSeriesMonthly,
          total: formatCurrency(monthSalesTotal),
          changePercent: this.change(monthSalesTotal, previousMonthSales) ?? 0,
          label: 'या महिन्यात',
        },
        yearly: {
          data: salesSeriesYearly,
          total: formatCompactCurrency(yearSalesTotal),
          changePercent: this.change(currentYearSales, previousYearSales) ?? 0,
          label: 'या वर्षात',
        },
      },
      purchaseOverview: {
        weekly: {
          data: purchaseSeriesWeekly,
          total: formatCurrency(weekPurchaseTotal),
          changePercent: this.change(weekPurchaseTotal, previousMonthPurchases / 4) ?? 0,
          label: 'या आठवड्यात',
        },
        monthly: {
          data: purchaseSeriesMonthly,
          total: formatCurrency(monthPurchaseTotal),
          changePercent: this.change(monthPurchaseTotal, previousMonthPurchases) ?? 0,
          label: 'या महिन्यात',
        },
        yearly: {
          data: purchaseSeriesYearly,
          total: formatCompactCurrency(yearPurchaseTotal),
          changePercent: this.change(currentYearPurchases, previousYearPurchases) ?? 0,
          label: 'या वर्षात',
        },
      },
      expiryAlerts: expiryAlertsList,
      recentTransactions: recentTransactionsList,
      topSellingProducts: topSellingProductsList,
      bottomSummary: {
        pendingOrders: pendingOrdersCount,
        pendingInvoices: pendingInvoicesCount,
        outstandingAmount: formatCurrency(outstandingTotal),
        cashInHand: formatCurrency(cashInHandValue),
      },
    };
  }

  private async list(repository: {
    findAll?: (params: { page: number; pageSize: number }) => Promise<{ data: RecordData[] }>;
    findMany?: () => Promise<RecordData[]>;
  }): Promise<RecordData[]> {
    if (!repository) {return [];}
    try {
      if (typeof repository.findAll === 'function') {
        const result = await repository.findAll({ page: 1, pageSize: 1000 });
        return result.data || [];
      }
      if (typeof repository.findMany === 'function') {
        return await repository.findMany();
      }
    } catch (err: any) {
      console.warn('[DashboardService] Repository list query error:', err.message);
      return [];
    }
    return [];
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
      return current === 0 ? 0 : 100;
    }
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private dailySeries(records: RecordData[], now: Date, days: number) {
    return Array.from({ length: days }, (_, index) => {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - index));
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 2 - index));
      const dateStr = start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      return {
        date: dateStr,
        amount: this.sumWithin(records, start, end),
      };
    });
  }

  private weeklySeries(records: RecordData[], now: Date, weeks: number) {
    return Array.from({ length: weeks }, (_, index) => {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - (weeks - index) * 7,
      );
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - (weeks - 1 - index) * 7,
      );
      return {
        date: `Week ${index + 1}`,
        amount: this.sumWithin(records, start, end),
      };
    });
  }

  private quarterlySeries(records: RecordData[], now: Date) {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const currentYear = now.getFullYear();
    return quarters.map((q, idx) => {
      const start = new Date(currentYear, idx * 3, 1);
      const end = new Date(currentYear, (idx + 1) * 3, 1);
      return {
        date: q,
        amount: this.sumWithin(records, start, end),
      };
    });
  }

  private buildExpiryAlerts(batches: RecordData[], items: RecordData[], now: Date) {
    const alerts: Array<{
      id: string;
      name: string;
      batchNumber: string;
      expiryDate: string;
      daysLeft: number;
      quantityText: string;
      category: string;
    }> = [];

    for (const b of batches) {
      const exp = toDate(b.expDate || b.expiryDate || b.bestBeforeDate);
      if (!exp) {continue;}
      const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const matchedItem = items.find((it) => String(it.id) === String(b.itemId));
      const itemName = matchedItem
        ? String(matchedItem.name || matchedItem.sku)
        : String(b.batchNo || 'Agri Batch');
      const qty = toNumber(b.availableQuantity || b.quantity || 10);
      const unit = matchedItem?.unit || matchedItem?.uom || 'पिशव्या';

      alerts.push({
        id: String(b.id || b.batchNo),
        name: itemName,
        batchNumber: String(b.batchNo || ''),
        expiryDate: `EXP: ${exp.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
        daysLeft,
        quantityText: `${qty} ${unit}`,
        category: String(matchedItem?.category || 'Fertilizer'),
      });
    }

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }

  private buildRecentTransactions(
    salesInvoices: RecordData[],
    purchaseInvoices: RecordData[],
    stockTransfers: RecordData[],
    cashBook: RecordData[],
    customers: RecordData[],
    suppliers: RecordData[],
    now: Date,
  ) {
    const list: Array<{
      id: string;
      type: 'sale' | 'purchase' | 'stock' | 'payment';
      title: string;
      reference: string;
      timeAgo: string;
      amount?: string;
      date: Date | null;
    }> = [];

    // Sales transactions
    salesInvoices.slice(0, 15).forEach((inv) => {
      const date = toDate(inv.createdAt || inv.invoiceDate);
      const matchedCust = customers.find((c) => String(c.id) === String(inv.customerId));
      const custName = inv.customerName || matchedCust?.name || 'Customer';
      list.push({
        id: String(inv.id),
        type: 'sale',
        title: `विक्री: ${custName}`,
        reference: String(inv.invoiceNumber || `INV-${String(inv.id).slice(-4)}`),
        timeAgo: formatTimeAgo(date, now),
        amount: formatCurrency(toNumber(inv.grandTotal)),
        date,
      });
    });

    // Purchase transactions
    purchaseInvoices.slice(0, 15).forEach((inv) => {
      const date = toDate(inv.createdAt || inv.invoiceDate);
      const matchedSup = suppliers.find((s) => String(s.id) === String(inv.supplierId));
      const supName = inv.supplierName || matchedSup?.name || 'Supplier';
      list.push({
        id: String(inv.id),
        type: 'purchase',
        title: `खरेदी: ${supName}`,
        reference: String(inv.billNumber || inv.invoiceNumber || `PO-${String(inv.id).slice(-4)}`),
        timeAgo: formatTimeAgo(date, now),
        amount: formatCurrency(toNumber(inv.grandTotal || inv.totalAmount)),
        date,
      });
    });

    // Stock transfers
    stockTransfers.slice(0, 5).forEach((st) => {
      const date = toDate(st.createdAt || st.transferDate);
      list.push({
        id: String(st.id),
        type: 'stock',
        title: `स्टॉक ट्रान्सफर: ${st.destinationWarehouseName || 'Warehouse'}`,
        reference: String(st.transferNumber || `STK-${String(st.id).slice(-4)}`),
        timeAgo: formatTimeAgo(date, now),
        date,
      });
    });

    // Cashbook entries
    cashBook.slice(0, 5).forEach((cb) => {
      const date = toDate(cb.createdAt || cb.entryDate);
      const amt = toNumber(cb.debit || cb.credit || cb.amount || 0);
      list.push({
        id: String(cb.id),
        type: 'payment',
        title: `पेमेंट: ${cb.description || cb.partyName || 'Cash Transaction'}`,
        reference: String(cb.voucherNumber || `VCH-${String(cb.id).slice(-4)}`),
        timeAgo: formatTimeAgo(date, now),
        amount: formatCurrency(amt),
        date,
      });
    });

    // Sort by timestamp descending
    list.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    return list.slice(0, 10);
  }

  private buildTopSellingProducts(postedSales: RecordData[], items: RecordData[]) {
    const productStats: Record<
      string,
      { id: string; name: string; quantity: number; revenue: number; unit: string }
    > = {};

    postedSales.forEach((inv) => {
      const invItems = Array.isArray(inv.items) ? inv.items : [];
      invItems.forEach((it: any) => {
        const key = String(it.itemId || it.id || it.name);
        if (!productStats[key]) {
          productStats[key] = {
            id: key,
            name: String(it.name || it.productName || 'Product'),
            quantity: 0,
            revenue: 0,
            unit: String(it.unit || 'पिशव्या'),
          };
        }
        productStats[key].quantity += toNumber(it.quantity || 1);
        productStats[key].revenue += toNumber(it.total || it.amount || it.price || 0);
      });
    });

    const entries = Object.values(productStats);
    if (entries.length > 0) {
      entries.sort((a, b) => b.revenue - a.revenue);
      const maxRev = entries[0].revenue || 1;
      return entries.slice(0, 5).map((p, idx) => ({
        id: `tp-${p.id || idx}`,
        name: p.name,
        quantityText: `${p.quantity.toLocaleString('en-IN')} ${p.unit}`,
        revenue: formatCurrency(p.revenue),
        percentage: Math.round((p.revenue / maxRev) * 100),
      }));
    }

    // When no invoice line items exist yet, show top inventory items by real valuation
    const topInventory = items.slice(0, 5);
    const maxVal = topInventory.reduce(
      (max, it) =>
        Math.max(
          max,
          toNumber(it.currentStock || 0) *
            toNumber(it.sellingRate || it.sellingPrice || it.purchaseRate || 0),
        ),
      1,
    );

    return topInventory.map((it, idx) => {
      const stock = toNumber(it.currentStock || 0);
      const rate = toNumber(it.sellingRate || it.sellingPrice || it.purchaseRate || 0);
      const val = stock * rate;
      return {
        id: `tp-${it.id || idx}`,
        name: String(it.name || it.sku || 'Agri Product'),
        quantityText: `${stock.toLocaleString('en-IN')} ${it.unit || 'पिशव्या'}`,
        revenue: formatCurrency(val),
        percentage: maxVal > 0 && val > 0 ? Math.round((val / maxVal) * 100) : 0,
      };
    });
  }
}
