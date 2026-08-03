import { apiRequest } from './api-client';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export interface ReportFilters {
  period?: string;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  productId?: string;
  salesPerson?: string;
  warehouseId?: string;
  paymentMode?: string;
  invoiceStatus?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface DashboardData {
  kpis: Record<string, { value: number; label: string }>;
  charts: {
    dailySales: { date: string; amount: number; count: number }[];
    monthlySales: { month: string; amount: number; count: number }[];
    paymentWise: Record<string, number>;
    categoryWise: Record<string, number>;
  };
  topCustomers: { customerId: string; amount: number }[];
  topProducts: { productId: string; qty: number; amount: number }[];
}

export interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ═════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════

function buildQuery(filters?: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters?.period) {
    params.set('period', filters.period);
  }
  if (filters?.startDate) {
    params.set('startDate', filters.startDate);
  }
  if (filters?.endDate) {
    params.set('endDate', filters.endDate);
  }
  if (filters?.customerId) {
    params.set('customerId', filters.customerId);
  }
  if (filters?.productId) {
    params.set('productId', filters.productId);
  }
  if (filters?.salesPerson) {
    params.set('salesPerson', filters.salesPerson);
  }
  if (filters?.warehouseId) {
    params.set('warehouseId', filters.warehouseId);
  }
  if (filters?.paymentMode) {
    params.set('paymentMode', filters.paymentMode);
  }
  if (filters?.invoiceStatus) {
    params.set('invoiceStatus', filters.invoiceStatus);
  }
  if (filters?.search) {
    params.set('search', filters.search);
  }
  if (filters?.page) {
    params.set('page', String(filters.page));
  }
  if (filters?.pageSize) {
    params.set('pageSize', String(filters.pageSize));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ═════════════════════════════════════════════════════════
// API METHODS
// ═════════════════════════════════════════════════════════

/**
 * GET /sales/reports/dashboard
 */
export async function getSalesDashboard(filters?: ReportFilters): Promise<DashboardData> {
  return apiRequest<DashboardData>(`/sales/reports/dashboard${buildQuery(filters)}`);
}

/**
 * GET /sales/reports/register
 */
export async function getSalesRegister(filters?: ReportFilters): Promise<PaginatedData<any>> {
  return apiRequest<PaginatedData<any>>(`/sales/reports/register${buildQuery(filters)}`);
}

/**
 * GET /sales/reports/invoices
 */
export async function getInvoiceRegister(filters?: ReportFilters): Promise<PaginatedData<any>> {
  return apiRequest<PaginatedData<any>>(`/sales/reports/invoices${buildQuery(filters)}`);
}

/**
 * GET /sales/reports/customer-ledger
 */
export async function getCustomerLedger(filters?: ReportFilters): Promise<any[]> {
  return apiRequest<any[]>(`/sales/reports/customer-ledger${buildQuery(filters)}`);
}

/**
 * GET /sales/reports/products
 */
export async function getProductSales(filters?: ReportFilters): Promise<PaginatedData<any>> {
  return apiRequest<PaginatedData<any>>(`/sales/reports/products${buildQuery(filters)}`);
}

/**
 * GET /sales/reports/outstanding
 */
export async function getOutstandingReport(filters?: ReportFilters): Promise<PaginatedData<any>> {
  return apiRequest<PaginatedData<any>>(`/sales/reports/outstanding${buildQuery(filters)}`);
}

/**
 * GET /sales/reports/gst
 */
export async function getGstReport(filters?: ReportFilters): Promise<any> {
  return apiRequest<any>(`/sales/reports/gst${buildQuery(filters)}`);
}

/**
 * GET /sales/reports/payment
 */
export async function getPaymentReport(filters?: ReportFilters): Promise<any> {
  return apiRequest<any>(`/sales/reports/payment${buildQuery(filters)}`);
}

/**
 * GET /sales/reports/profit
 */
export async function getProfitAnalysis(filters?: ReportFilters): Promise<any> {
  return apiRequest<any>(`/sales/reports/profit${buildQuery(filters)}`);
}
