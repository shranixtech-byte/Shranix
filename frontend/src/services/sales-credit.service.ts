import { apiRequest } from './api-client';

export interface CustomerCreditProfile {
  customerId: string;
  customerName: string;
  customerCode: string;
  creditLimit: number;
  creditDays: number;
  securityDeposit: number;
  openingBalance: number;
  outstanding: number;
  availableCredit: number;
  blockedAmount: number;
  overdueAmount: number;
  maxInvoiceAmount: number;
  preferredPaymentMode: string;
  creditRating: string;
  riskCategory: string;
  healthScore: number;
  isBlocked: boolean;
  blockReason: string;
  warningLevel: string;
  lastPaymentDate: string;
  averagePaymentDays: number;
}

export interface CreditDashboardData {
  summary: {
    totalCustomers: number;
    totalCreditLimit: number;
    totalOutstanding: number;
    totalOverdue: number;
    creditUtilization: number;
    blockedCustomers: number;
    nearLimitCustomers: number;
    highRiskCustomers: number;
    averageHealthScore: number;
  };
  warningDistribution: Record<string, number>;
  riskDistribution: Record<string, number>;
  topOutstanding: CustomerCreditProfile[];
}

export interface CreditCheckResult {
  canPost: boolean;
  warnings: string[];
  errors: string[];
  creditStatus: string;
  requiredApproval: boolean;
}

export interface AgeingData {
  data: CustomerCreditProfile[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  ageingSummary: { bucket: string; amount: number; count: number }[];
}

export async function getCreditDashboard(): Promise<CreditDashboardData> {
  return apiRequest<CreditDashboardData>('/sales/credit/dashboard');
}

export async function getCreditCustomers(
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    riskCategory?: string;
    isBlocked?: string;
    warningLevel?: string;
    sortBy?: string;
    sortDir?: string;
  } = {},
): Promise<{
  data: CustomerCreditProfile[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const qs = new URLSearchParams();
  if (params.page) {
    qs.set('page', String(params.page));
  }
  if (params.pageSize) {
    qs.set('pageSize', String(params.pageSize));
  }
  if (params.search) {
    qs.set('search', params.search);
  }
  if (params.riskCategory) {
    qs.set('riskCategory', params.riskCategory);
  }
  if (params.isBlocked) {
    qs.set('isBlocked', params.isBlocked);
  }
  if (params.warningLevel) {
    qs.set('warningLevel', params.warningLevel);
  }
  if (params.sortBy) {
    qs.set('sortBy', params.sortBy);
  }
  if (params.sortDir) {
    qs.set('sortDir', params.sortDir);
  }
  const query = qs.toString();
  return apiRequest(`/sales/credit/customers${query ? `?${query}` : ''}`);
}

export async function getCreditCustomer(
  id: string,
): Promise<CustomerCreditProfile & { healthScore: any }> {
  return apiRequest(`/sales/credit/${id}`);
}

export async function updateCreditProfile(
  id: string,
  data: Partial<CustomerCreditProfile>,
): Promise<CustomerCreditProfile> {
  return apiRequest(`/sales/credit/${id}/update`, { method: 'POST', body: JSON.stringify(data) });
}

export async function checkCredit(
  customerId: string,
  invoiceAmount: number,
): Promise<CreditCheckResult> {
  return apiRequest('/sales/credit/check', {
    method: 'POST',
    body: JSON.stringify({ customerId, invoiceAmount }),
  });
}

export async function creditOverride(
  customerId: string,
  reason: string,
  newLimit?: number,
): Promise<any> {
  return apiRequest('/sales/credit/override', {
    method: 'POST',
    body: JSON.stringify({ customerId, reason, newLimit }),
  });
}

export async function blockCustomer(id: string, reason: string): Promise<CustomerCreditProfile> {
  return apiRequest(`/sales/credit/${id}/block`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function releaseCustomer(id: string, reason: string): Promise<CustomerCreditProfile> {
  return apiRequest(`/sales/credit/${id}/release`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function getAgeingReport(
  params: { page?: number; pageSize?: number; search?: string } = {},
): Promise<AgeingData> {
  const qs = new URLSearchParams();
  if (params.page) {
    qs.set('page', String(params.page));
  }
  if (params.pageSize) {
    qs.set('pageSize', String(params.pageSize));
  }
  if (params.search) {
    qs.set('search', params.search);
  }
  const query = qs.toString();
  return apiRequest(`/sales/credit/ageing/list${query ? `?${query}` : ''}`);
}

export async function getRecoveryDashboard(): Promise<any> {
  return apiRequest('/sales/credit/recovery/dashboard');
}

export async function getReminders(): Promise<{
  dueSoon: CustomerCreditProfile[];
  dueToday: CustomerCreditProfile[];
  overdue: CustomerCreditProfile[];
  critical: CustomerCreditProfile[];
}> {
  return apiRequest('/sales/credit/reminders/list');
}
