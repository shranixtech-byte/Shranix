import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import type { EnterpriseQuery, FilterCondition } from '@shranix/database';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
  period?: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_fy' | 'custom';
}

export interface ReportFilters extends DateRangeFilter {
  customerId?: string;
  productId?: string;
  salesPerson?: string;
  warehouseId?: string;
  paymentMode?: string;
  invoiceStatus?: string;
  gstType?: string;
  state?: string;
  district?: string;
  taluka?: string;
  village?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class SalesReportsService {
  constructor(private readonly database: DatabaseService) {}

  // ═════════════════════════════════════════════════════════
  // DATE HELPERS
  // ═════════════════════════════════════════════════════════

  private getDateRange(filter?: DateRangeFilter): { startDate: string; endDate: string } {
    const now = new Date();
    const endStr = now.toISOString();

    if (filter?.period === 'custom' && filter.startDate && filter.endDate) {
      return { startDate: filter.startDate, endDate: filter.endDate };
    }

    switch (filter?.period) {
      case 'today': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { startDate: start.toISOString(), endDate: endStr };
      }
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      }
      case 'this_week': {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const start = new Date(now.getFullYear(), now.getMonth(), diff);
        return { startDate: start.toISOString(), endDate: endStr };
      }
      case 'this_month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: start.toISOString(), endDate: endStr };
      }
      case 'this_fy': {
        const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        const start = new Date(year, 3, 1); // April 1
        return { startDate: start.toISOString(), endDate: endStr };
      }
      default: {
        // Default: this month
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: start.toISOString(), endDate: endStr };
      }
    }
  }

  // ═════════════════════════════════════════════════════════
  // HELPER: Fetch invoices with ENTERPRISE DB-level filtering
  // ═════════════════════════════════════════════════════════

  private buildInvoiceFilters(filters?: ReportFilters): FilterCondition[] {
    const dbFilters: FilterCondition[] = [];
    if (!filters) return dbFilters;

    const dateRange = this.getDateRange(filters);
    if (dateRange.startDate) {
      dbFilters.push({ field: 'invoiceDate', operator: 'gte', value: dateRange.startDate });
    }
    if (dateRange.endDate) {
      dbFilters.push({ field: 'invoiceDate', operator: 'lte', value: dateRange.endDate });
    }
    if (filters.customerId) {
      dbFilters.push({ field: 'customerId', operator: 'eq', value: filters.customerId });
    }
    if (filters.salesPerson) {
      dbFilters.push({ field: 'salesPerson', operator: 'eq', value: filters.salesPerson });
    }
    if (filters.invoiceStatus) {
      dbFilters.push({ field: 'status', operator: 'eq', value: filters.invoiceStatus });
    }
    // Note: 'search' is handled via searchFields below, not as a filter
    return dbFilters;
  }

  private async fetchInvoices(filters?: ReportFilters) {
    const searchFields = filters?.search ? ['invoiceNumber', 'customerId', 'customerGstin'] : undefined;

    const queryParams: EnterpriseQuery = {
      page: filters?.page || 1,
      pageSize: filters?.pageSize || 5000,
    };

    if (filters?.search) {
      queryParams.search = filters.search;
      queryParams.searchFields = searchFields;
    }

    const dbFilters = this.buildInvoiceFilters(filters);
    if (dbFilters.length > 0) {
      queryParams.filters = dbFilters;
    }

    const result = await this.database.salesInvoices
      .findAll(queryParams)
      .catch(() => ({ data: [], total: 0 }));
    return result.data || [];
  }

  private async fetchInvoiceItems() {
    const result = await this.database.invoiceItems
      .findAll({ page: 1, pageSize: 5000 })
      .catch(() => ({ data: [], total: 0 }));
    return result.data || [];
  }

  private async fetchItems() {
    const result = await this.database.items
      .findAll({ page: 1, pageSize: 1000 })
      .catch(() => ({ data: [], total: 0 }));
    return result.data || [];
  }

  // ═════════════════════════════════════════════════════════
  // 1. SALES DASHBOARD — KPI CARDS + CHARTS
  // ═════════════════════════════════════════════════════════

  async getDashboard(filters?: ReportFilters) {
    const invoices = await this.fetchInvoices(filters);
    const invoiceItems = await this.fetchInvoiceItems();

    // KPIs
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const todayInvoices = invoices.filter((inv: any) => inv.invoiceDate && inv.invoiceDate >= todayStart);
    const monthInvoices = invoices.filter((inv: any) => inv.invoiceDate && inv.invoiceDate >= monthStart);

    const todaySales = todayInvoices.reduce((sum: number, inv: any) => sum + (inv.grandTotal || 0), 0);
    const monthSales = monthInvoices.reduce((sum: number, inv: any) => sum + (inv.grandTotal || 0), 0);
    const outstanding = invoices
      .filter((inv: any) => inv.paymentStatus !== 'paid')
      .reduce((sum: number, inv: any) => sum + (inv.balanceAmount || inv.grandTotal || 0), 0);
    const invoiceCount = invoices.length;
    const avgInvoice = invoiceCount > 0 ? monthSales / invoiceCount : 0;
    const collection = invoices
      .filter((inv: any) => inv.paidAmount && inv.paidAmount > 0)
      .reduce((sum: number, inv: any) => sum + (inv.paidAmount || 0), 0);

    // GST totals
    const totalCgst = invoices.reduce((sum: number, inv: any) => sum + (inv.cgstTotal || 0), 0);
    const totalSgst = invoices.reduce((sum: number, inv: any) => sum + (inv.sgstTotal || 0), 0);
    const totalIgst = invoices.reduce((sum: number, inv: any) => sum + (inv.igstTotal || 0), 0);
    const totalCess = invoices.reduce((sum: number, inv: any) => sum + (inv.cessTotal || 0), 0);
    const totalTax = totalCgst + totalSgst + totalIgst + totalCess;

    const totalDiscount = invoices.reduce((sum: number, inv: any) => sum + (inv.discountAmount || 0), 0);
    const totalSubTotal = invoices.reduce((sum: number, inv: any) => sum + (inv.subTotal || 0), 0);
    const grossProfit = totalSubTotal - totalDiscount - totalTax; // simplified
    const profitMargin = totalSubTotal > 0 ? (grossProfit / totalSubTotal) * 100 : 0;

    // Top Customer
    const customerSales = new Map<string, number>();
    for (const inv of invoices) {
      const cid = inv.customerId;
      customerSales.set(cid, (customerSales.get(cid) || 0) + (inv.grandTotal || 0));
    }
    const topCustomerEntry = Array.from(customerSales.entries()).sort((a, b) => b[1] - a[1])[0];
    const topCustomer = topCustomerEntry
      ? { customerId: topCustomerEntry[0], totalSales: topCustomerEntry[1] }
      : null;

    // Top Product
    const productSales = new Map<string, { qty: number; amount: number }>();
    for (const item of invoiceItems) {
      const pid = item.itemId;
      const existing = productSales.get(pid) || { qty: 0, amount: 0 };
      existing.qty += item.quantity || 0;
      existing.amount += item.totalAmount || 0;
      productSales.set(pid, existing);
    }
    const topProductEntry = Array.from(productSales.entries()).sort(
      (a, b) => b[1].amount - a[1].amount,
    )[0];
    const topProduct = topProductEntry
      ? { productId: topProductEntry[0], ...topProductEntry[1] }
      : null;

    // Growth % (compare with previous month)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
    const prevMonthInvoices = invoices.filter(
      (inv: any) => inv.invoiceDate && inv.invoiceDate >= prevMonthStart && inv.invoiceDate <= prevMonthEnd,
    );
    const prevMonthSales = prevMonthInvoices.reduce((sum: number, inv: any) => sum + (inv.grandTotal || 0), 0);
    const growthPercent = prevMonthSales > 0 ? ((monthSales - prevMonthSales) / prevMonthSales) * 100 : 0;

    // Charts: Daily Sales (last 30 days)
    const dailySales: { date: string; amount: number; count: number }[] = [];
    const last30Days: { date: string; start: string; end: string }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();
      last30Days.push({ date: dateStr, start: dayStart, end: dayEnd });
    }
    for (const day of last30Days) {
      const dayInvs = invoices.filter(
        (inv: any) => inv.invoiceDate && inv.invoiceDate >= day.start && inv.invoiceDate <= day.end,
      );
      dailySales.push({
        date: day.date,
        amount: dayInvs.reduce((s: number, i: any) => s + (i.grandTotal || 0), 0),
        count: dayInvs.length,
      });
    }

    // Monthly Sales (last 12 months)
    const monthlySales: { month: string; amount: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const mInvs = invoices.filter(
        (inv: any) => inv.invoiceDate && inv.invoiceDate >= mStart && inv.invoiceDate <= mEnd,
      );
      monthlySales.push({
        month: monthStr,
        amount: mInvs.reduce((s: number, i: any) => s + (i.grandTotal || 0), 0),
        count: mInvs.length,
      });
    }

    // Payment Mode Wise
    const paymentWise: Record<string, number> = {};
    for (const inv of invoices) {
      const mode = inv.paymentStatus || 'unpaid';
      paymentWise[mode] = (paymentWise[mode] || 0) + (inv.grandTotal || 0);
    }

    // Category Wise
    const categoryWise: Record<string, number> = {};
    for (const item of invoiceItems) {
      // Use item description as simplified category proxy
      const cat = item.description || 'Unknown';
      categoryWise[cat] = (categoryWise[cat] || 0) + (item.totalAmount || 0);
    }

    return {
      kpis: {
        todaySales: { value: todaySales, label: `Today's Sales` },
        monthSales: { value: monthSales, label: 'This Month Sales' },
        outstanding: { value: outstanding, label: 'Outstanding' },
        invoices: { value: invoiceCount, label: 'Invoices' },
        avgInvoice: { value: avgInvoice, label: 'Average Invoice' },
        topCustomer,
        topProduct,
        collection: { value: collection, label: 'Collection' },
        profit: { value: grossProfit, label: 'Gross Profit' },
        profitMargin: { value: profitMargin, label: 'Profit Margin %' },
        growthPercent: { value: growthPercent, label: 'Growth %' },
        totalCgst: { value: totalCgst, label: 'CGST' },
        totalSgst: { value: totalSgst, label: 'SGST' },
        totalIgst: { value: totalIgst, label: 'IGST' },
        totalCess: { value: totalCess, label: 'CESS' },
        totalTax: { value: totalTax, label: 'Total Tax' },
        totalDiscount: { value: totalDiscount, label: 'Discount' },
        totalSubTotal: { value: totalSubTotal, label: 'Taxable' },
      },
      charts: {
        dailySales,
        monthlySales,
        paymentWise,
        categoryWise,
      },
      topCustomers: Array.from(customerSales.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, amount]) => ({ customerId: id, amount })),
      topProducts: Array.from(productSales.entries())
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 10)
        .map(([id, data]) => ({ productId: id, ...data })),
    };
  }

  // ═════════════════════════════════════════════════════════
  // 2. SALES REGISTER
  // ═════════════════════════════════════════════════════════

  async getSalesRegister(filters?: ReportFilters) {
    const invoices = await this.fetchInvoices(filters);
    const invoiceItems = await this.fetchInvoiceItems();

    const total = invoices.length;
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const start = (page - 1) * pageSize;
    const paged = invoices.slice(start, start + pageSize);

    const data = paged.map((inv: any) => {
      const items = invoiceItems.filter((item: any) => item.invoiceId === inv.id);
      const totalQty = items.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        customerId: inv.customerId,
        customerGstin: inv.customerGstin || '',
        salesPerson: inv.salesPerson || '',
        items: items.length,
        qty: totalQty,
        taxable: inv.subTotal || 0,
        cgst: inv.cgstTotal || 0,
        sgst: inv.sgstTotal || 0,
        igst: inv.igstTotal || 0,
        cess: inv.cessTotal || 0,
        discount: inv.discountAmount || 0,
        roundOff: inv.roundOff || 0,
        grandTotal: inv.grandTotal || 0,
        status: inv.status || 'draft',
        paymentStatus: inv.paymentStatus || 'unpaid',
      };
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ═════════════════════════════════════════════════════════
  // 3. INVOICE REGISTER
  // ═════════════════════════════════════════════════════════

  async getInvoiceRegister(filters?: ReportFilters) {
    const invoices = await this.fetchInvoices(filters);

    const total = invoices.length;
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const start = (page - 1) * pageSize;
    const paged = invoices.slice(start, start + pageSize);

    const data = paged.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      customerId: inv.customerId,
      customerGstin: inv.customerGstin || '',
      customerInvoiceNo: inv.customerInvoiceNo || '',
      mobile: '',
      reference: inv.orderId || inv.challanId || '',
      grandTotal: inv.grandTotal || 0,
      status: inv.status || 'draft',
      paymentStatus: inv.paymentStatus || 'unpaid',
      balanceAmount: inv.balanceAmount || 0,
      paidAmount: inv.paidAmount || 0,
    }));

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ═════════════════════════════════════════════════════════
  // 4. CUSTOMER LEDGER
  // ═════════════════════════════════════════════════════════

  async getCustomerLedger(filters?: ReportFilters) {
    const invoices = await this.fetchInvoices(filters);

    // Group by customer
    const customerMap = new Map<
      string,
      {
        openingBalance: number;
        invoices: number;
        invoiceAmount: number;
        payments: number;
        returns: number;
        creditNotes: number;
        debitNotes: number;
        closingBalance: number;
        transactions: any[];
      }
    >();

    for (const inv of invoices) {
      const cid = inv.customerId;
      if (!cid) continue;

      if (!customerMap.has(cid)) {
        customerMap.set(cid, {
          openingBalance: 0,
          invoices: 0,
          invoiceAmount: 0,
          payments: 0,
          returns: 0,
          creditNotes: 0,
          debitNotes: 0,
          closingBalance: 0,
          transactions: [],
        });
      }

      const entry = customerMap.get(cid)!;
      entry.invoices++;
      entry.invoiceAmount += inv.grandTotal || 0;
      entry.payments += inv.paidAmount || 0;

      if (inv.paymentStatus === 'paid') {
        entry.closingBalance += 0;
      } else {
        entry.closingBalance += inv.balanceAmount || inv.grandTotal || 0;
      }

      entry.transactions.push({
        id: inv.id,
        date: inv.invoiceDate,
        type: 'invoice',
        documentNo: inv.invoiceNumber,
        debit: inv.grandTotal || 0,
        credit: inv.paidAmount || 0,
        balance: inv.balanceAmount || inv.grandTotal || 0,
        status: inv.status,
      });
    }

    // Calculate aging
    const now = new Date();
    const customerLedger = Array.from(customerMap.entries()).map(([customerId, data]) => {
      let aging0to30 = 0;
      let aging31to60 = 0;
      let aging61to90 = 0;
      let aging90plus = 0;

      for (const txn of data.transactions) {
        if (txn.balance <= 0) continue;
        const invDate = new Date(txn.date);
        const diffDays = Math.floor((now.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) aging0to30 += txn.balance;
        else if (diffDays <= 60) aging31to60 += txn.balance;
        else if (diffDays <= 90) aging61to90 += txn.balance;
        else aging90plus += txn.balance;
      }

      return {
        customerId,
        openingBalance: data.openingBalance,
        invoiceCount: data.invoices,
        invoiceAmount: data.invoiceAmount,
        payments: data.payments,
        returns: data.returns,
        creditNotes: data.creditNotes,
        debitNotes: data.debitNotes,
        closingBalance: data.closingBalance,
        aging: {
          '0-30': aging0to30,
          '31-60': aging31to60,
          '61-90': aging61to90,
          '90+': aging90plus,
        },
        runningBalance: data.closingBalance,
        transactions: data.transactions.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
      };
    });

    return customerLedger;
  }

  // ═════════════════════════════════════════════════════════
  // 5. PRODUCT SALES REPORT
  // ═════════════════════════════════════════════════════════

  async getProductSales(filters?: ReportFilters) {
    const invoices = await this.fetchInvoices(filters);
    const invoiceItems = await this.fetchInvoiceItems();
    const productItems = await this.fetchItems();

    const invoiceIds = new Set(invoices.map((inv: any) => inv.id));
    const filteredItems = invoiceItems.filter((item: any) => invoiceIds.has(item.invoiceId));

    // Group by product
    const productMap = new Map<
      string,
      {
        productId: string;
        sku: string;
        hsn: string;
        category: string;
        brand: string;
        opening: number;
        sold: number;
        returned: number;
        closing: number;
        salesValue: number;
        profit: number;
        marginPct: number;
        qty: number;
        cost: number;
      }
    >();

    for (const item of filteredItems) {
      const pid = item.itemId;
      if (!pid) continue;

      if (!productMap.has(pid)) {
        const itemMaster = productItems.find((im: any) => im.id === pid);
        productMap.set(pid, {
          productId: pid,
          sku: itemMaster?.sku || '',
          hsn: itemMaster?.hsnCode || '',
          category: itemMaster?.categoryId || '',
          brand: itemMaster?.brandId || '',
          opening: 0,
          sold: 0,
          returned: 0,
          closing: 0,
          salesValue: 0,
          profit: 0,
          marginPct: 0,
          qty: 0,
          cost: 0,
        });
      }

      const entry = productMap.get(pid)!;
      entry.sold += item.quantity || 0;
      entry.salesValue += item.totalAmount || 0;
      entry.qty += item.quantity || 0;
      // Simplified cost tracking
      const rate = item.rate || 0;
      entry.cost += rate * (item.quantity || 0);
    }

    const products = Array.from(productMap.values()).map((p) => {
      p.profit = p.salesValue - p.cost;
      p.marginPct = p.salesValue > 0 ? (p.profit / p.salesValue) * 100 : 0;
      return p;
    });

    // Pagination
    const total = products.length;
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const start = (page - 1) * pageSize;

    return {
      data: products.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ═════════════════════════════════════════════════════════
  // 6. OUTSTANDING REPORT
  // ═════════════════════════════════════════════════════════

  async getOutstanding(filters?: ReportFilters) {
    const invoices = await this.fetchInvoices(filters);

    // Filter only unpaid/partial invoices
    const outstandingInvs = invoices.filter(
      (inv: any) => inv.paymentStatus !== 'paid' && inv.status !== 'cancelled' && inv.status !== 'draft',
    );

    // Group by customer
    const customerMap = new Map<
      string,
      {
        customerId: string;
        dueAmount: number;
        creditLimit: number;
        aging0to30: number;
        aging31to60: number;
        aging61to90: number;
        aging90plus: number;
        risk: 'low' | 'medium' | 'high' | 'critical';
      }
    >();

    const now = new Date();
    for (const inv of outstandingInvs) {
      const cid = inv.customerId;
      if (!cid) continue;

      if (!customerMap.has(cid)) {
        customerMap.set(cid, {
          customerId: cid,
          dueAmount: 0,
          creditLimit: 0,
          aging0to30: 0,
          aging31to60: 0,
          aging61to90: 0,
          aging90plus: 0,
          risk: 'low',
        });
      }

      const entry = customerMap.get(cid)!;
      const balance = inv.balanceAmount || inv.grandTotal || 0;
      entry.dueAmount += balance;

      const dueDate = inv.dueDate || inv.invoiceDate;
      const due = new Date(dueDate);
      const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) entry.aging0to30 += balance;
      else if (diffDays <= 60) entry.aging31to60 += balance;
      else if (diffDays <= 90) entry.aging61to90 += balance;
      else entry.aging90plus += balance;

      // Risk color
      if (entry.aging90plus > 0) entry.risk = 'critical';
      else if (entry.aging61to90 > 0) entry.risk = 'high';
      else if (entry.aging31to60 > 0) entry.risk = 'medium';
      else entry.risk = 'low';
    }

    const result = Array.from(customerMap.values());

    // Pagination
    const total = result.length;
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const start2 = (page - 1) * pageSize;

    return {
      data: result.slice(start2, start2 + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ═════════════════════════════════════════════════════════
  // 7. GST REPORT
  // ═════════════════════════════════════════════════════════

  async getGstReport(filters?: ReportFilters) {
    const invoices = await this.fetchInvoices(filters);
    const invoiceItems = await this.fetchInvoiceItems();

    const invoiceIds = new Set(invoices.map((inv: any) => inv.id));
    const filteredItems = invoiceItems.filter((item: any) => invoiceIds.has(item.invoiceId));

    // GST Summary
    const totalCgst = invoices.reduce((sum: number, inv: any) => sum + (inv.cgstTotal || 0), 0);
    const totalSgst = invoices.reduce((sum: number, inv: any) => sum + (inv.sgstTotal || 0), 0);
    const totalIgst = invoices.reduce((sum: number, inv: any) => sum + (inv.igstTotal || 0), 0);
    const totalCess = invoices.reduce((sum: number, inv: any) => sum + (inv.cessTotal || 0), 0);
    const totalTaxable = invoices.reduce((sum: number, inv: any) => sum + (inv.subTotal || 0), 0);

    // HSN Summary
    const hsnMap = new Map<
      string,
      {
        hsn: string;
        description: string;
        taxableAmount: number;
        cgst: number;
        sgst: number;
        igst: number;
        cess: number;
        gstRate: number;
        qty: number;
      }
    >();

    for (const item of filteredItems) {
      const hsn = item.hsnCode || item.description || 'Unknown';
      if (!hsnMap.has(hsn)) {
        hsnMap.set(hsn, {
          hsn,
          description: item.description || '',
          taxableAmount: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          cess: 0,
          gstRate: item.gstRate || 0,
          qty: 0,
        });
      }

      const entry = hsnMap.get(hsn)!;
      entry.taxableAmount += item.taxableValue || 0;
      entry.cgst += item.cgst || 0;
      entry.sgst += item.sgst || 0;
      entry.igst += item.igst || 0;
      entry.cess += item.cess || 0;
      entry.qty += item.quantity || 0;
    }

    // GST Rate Summary
    const gstRateMap = new Map<
      number,
      { gstRate: number; taxableAmount: number; gstAmount: number }
    >();
    for (const item of filteredItems) {
      const rate = item.gstRate || 0;
      if (!gstRateMap.has(rate)) {
        gstRateMap.set(rate, { gstRate: rate, taxableAmount: 0, gstAmount: 0 });
      }
      const entry = gstRateMap.get(rate)!;
      entry.taxableAmount += item.taxableValue || 0;
      entry.gstAmount += (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
    }

    return {
      summary: {
        totalCgst,
        totalSgst,
        totalIgst,
        totalCess,
        totalTaxable,
        totalGst: totalCgst + totalSgst + totalIgst,
      },
      hsnSummary: Array.from(hsnMap.values()),
      gstRateSummary: Array.from(gstRateMap.values()).sort((a, b) => a.gstRate - b.gstRate),
      invoiceCount: invoices.length,
    };
  }

  // ═════════════════════════════════════════════════════════
  // 8. PAYMENT REPORT
  // ═════════════════════════════════════════════════════════

  async getPaymentReport(filters?: ReportFilters) {
    const invoices = await this.fetchInvoices(filters);

    const cashTotal = invoices
      .filter((inv: any) => inv.paymentStatus === 'paid')
      .reduce((s: number, inv: any) => s + (inv.paidAmount || inv.grandTotal || 0), 0);

    const upiTotal = 0; // Would need payment split data
    const chequeTotal = 0;
    const cardTotal = 0;
    const bankTotal = 0;

    const creditTotal = invoices
      .filter((inv: any) => inv.paymentStatus === 'unpaid' || inv.paymentStatus === 'partial')
      .reduce((s: number, inv: any) => s + (inv.balanceAmount || inv.grandTotal || 0), 0);

    const collectionSummary = {
      totalCollected: invoices.reduce((s: number, inv: any) => s + (inv.paidAmount || 0), 0),
      totalOutstanding: invoices
        .filter((inv: any) => inv.paymentStatus !== 'paid')
        .reduce((s: number, inv: any) => s + (inv.balanceAmount || inv.grandTotal || 0), 0),
      totalInvoiced: invoices.reduce((s: number, inv: any) => s + (inv.grandTotal || 0), 0),
      collectionRate:
        invoices.reduce((s: number, inv: any) => s + (inv.grandTotal || 0), 0) > 0
          ? (invoices.reduce((s: number, inv: any) => s + (inv.paidAmount || 0), 0) /
              invoices.reduce((s: number, inv: any) => s + (inv.grandTotal || 0), 0)) *
            100
          : 0,
    };

    // Payment Status Breakdown
    const paidCount = invoices.filter((inv: any) => inv.paymentStatus === 'paid').length;
    const partialCount = invoices.filter((inv: any) => inv.paymentStatus === 'partial').length;
    const unpaidCount = invoices.filter((inv: any) => inv.paymentStatus === 'unpaid').length;

    return {
      cash: { total: cashTotal, count: paidCount },
      upi: { total: upiTotal, count: 0 },
      cheque: { total: chequeTotal, count: 0 },
      card: { total: cardTotal, count: 0 },
      bank: { total: bankTotal, count: 0 },
      credit: { total: creditTotal, count: unpaidCount + partialCount },
      collectionSummary,
      paymentBreakdown: [
        { status: 'paid', count: paidCount, total: cashTotal },
        { status: 'partial', count: partialCount, total: 0 },
        { status: 'unpaid', count: unpaidCount, total: creditTotal },
      ],
      totalInvoices: invoices.length,
    };
  }

  // ═════════════════════════════════════════════════════════
  // 9. PROFIT ANALYSIS
  // ═════════════════════════════════════════════════════════

  async getProfitAnalysis(filters?: ReportFilters) {
    const invoices = await this.fetchInvoices(filters);
    const invoiceItems = await this.fetchInvoiceItems();

    const invoiceIds = new Set(invoices.map((inv: any) => inv.id));
    const filteredItems = invoiceItems.filter((item: any) => invoiceIds.has(item.invoiceId));

    const totalRevenue = invoices.reduce((s: number, inv: any) => s + (inv.grandTotal || 0), 0);
    const totalCost = filteredItems.reduce(
      (s: number, item: any) => s + (item.rate || 0) * (item.quantity || 0),
      0,
    );
    const totalDiscount = invoices.reduce((s: number, inv: any) => s + (inv.discountAmount || 0), 0);
    const totalTax = invoices.reduce(
      (s: number, inv: any) =>
        s + (inv.cgstTotal || 0) + (inv.sgstTotal || 0) + (inv.igstTotal || 0) + (inv.cessTotal || 0),
      0,
    );

    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalTax;
    const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Top Selling Products
    const productSales = new Map<string, { qty: number; revenue: number; cost: number; profit: number }>();
    for (const item of filteredItems) {
      const pid = item.itemId;
      if (!pid) continue;
      if (!productSales.has(pid)) {
        productSales.set(pid, { qty: 0, revenue: 0, cost: 0, profit: 0 });
      }
      const entry = productSales.get(pid)!;
      entry.qty += item.quantity || 0;
      entry.revenue += item.totalAmount || 0;
      entry.cost += (item.rate || 0) * (item.quantity || 0);
    }

    const productProfitData = Array.from(productSales.entries()).map(([id, data]) => ({
      productId: id,
      ...data,
      profit: data.revenue - data.cost,
      marginPct: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0,
    }));

    const topSelling = [...productProfitData].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const lowMargin = [...productProfitData]
      .filter((p) => p.marginPct < 20)
      .sort((a, b) => a.marginPct - b.marginPct)
      .slice(0, 10);

    // Top Customers by profit
    const customerProfit = new Map<string, { revenue: number; profit: number }>();
    for (const inv of invoices) {
      const cid = inv.customerId;
      if (!cid) continue;
      if (!customerProfit.has(cid)) {
        customerProfit.set(cid, { revenue: 0, profit: 0 });
      }
      const entry = customerProfit.get(cid)!;
      entry.revenue += inv.grandTotal || 0;
      // Simplified: profit = revenue minus costs of items
      const cidItems = filteredItems.filter((item: any) => {
        const parentInv = invoices.find((i: any) => i.id === item.invoiceId);
        return parentInv?.customerId === cid;
      });
      const itemCost = cidItems.reduce(
        (s: number, it: any) => s + (it.rate || 0) * (it.quantity || 0),
        0,
      );
      entry.profit = entry.revenue - itemCost;
    }

    const topCustomers = Array.from(customerProfit.entries())
      .sort((a, b) => b[1].profit - a[1].profit)
      .slice(0, 10)
      .map(([id, data]) => ({ customerId: id, ...data }));

    // Sales Trend (monthly)
    const monthlyTrend: { month: string; revenue: number; cost: number; profit: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const mInvs = invoices.filter(
        (inv: any) => inv.invoiceDate && inv.invoiceDate >= mStart && inv.invoiceDate <= mEnd,
      );
      const mRevenue = mInvs.reduce((s: number, inv: any) => s + (inv.grandTotal || 0), 0);
      const mItems = filteredItems.filter((item: any) =>
        mInvs.some((inv: any) => inv.id === item.invoiceId),
      );
      const mCost = mItems.reduce(
        (s: number, item: any) => s + (item.rate || 0) * (item.quantity || 0),
        0,
      );
      monthlyTrend.push({
        month: monthStr,
        revenue: mRevenue,
        cost: mCost,
        profit: mRevenue - mCost,
      });
    }

    return {
      grossProfit: { value: grossProfit, label: 'Gross Profit' },
      netProfit: { value: netProfit, label: 'Net Profit' },
      margin: { value: margin, label: 'Margin %' },
      netMargin: { value: netMargin, label: 'Net Margin %' },
      totalRevenue: { value: totalRevenue, label: 'Total Revenue' },
      totalCost: { value: totalCost, label: 'Total Cost' },
      totalDiscount: { value: totalDiscount, label: 'Total Discount' },
      totalTax: { value: totalTax, label: 'Total Tax' },
      topSellingProducts: topSelling,
      lowMarginProducts: lowMargin,
      topCustomers,
      salesTrend: monthlyTrend,
    };
  }
}
