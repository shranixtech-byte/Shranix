import { apiRequest } from '@/services/api-client';

// ═════════════════════════════════════════════════════════
// PAYMENT COLLECTION API CLIENT (Phase 4)
// Invoice → Payment: Cash · UPI · Bank · Cheque · Advance.
// ═════════════════════════════════════════════════════════

export type PaymentMode = 'cash' | 'upi' | 'bank' | 'cheque' | 'advance';

export interface PaymentRecord {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  customerId: string;
  customerName?: string;
  invoiceId?: string | null;
  invoiceNumber?: string;
  mode: PaymentMode;
  modeLabel?: string;
  amount: number;
  referenceNo?: string;
  bankName?: string;
  chequeNo?: string;
  chequeDate?: string;
  notes?: string;
  status: string;
  isAdvance?: boolean;
  createdAt?: string;
}

export interface CustomerPaymentSummary {
  customer: { id: string; name: string };
  profile: {
    creditLimit: number;
    outstanding: number;
    advanceBalance: number;
    overdueAmount: number;
    lastPaymentDate: string | null;
  };
  dueInvoices: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string | null;
    grandTotal: number;
    paidAmount: number;
    balanceAmount: number;
    paymentStatus: string;
  }[];
  totalDue: number;
  payments: PaymentRecord[];
}

/** Dashboard — outstanding, overdue, advance, today + recent payments. */
export async function getPaymentDashboard() {
  const res = await apiRequest<unknown>('/sales/payments/dashboard');
  const d = (res as { data?: unknown })?.data ?? res;
  return d as {
    summary: {
      totalOutstanding: number;
      totalOverdue: number;
      totalAdvance: number;
      todayCollection: number;
      customersWithDue: number;
    };
    recent: PaymentRecord[];
  };
}

/** Customer collection summary — due invoices + advance balance + history. */
export async function getCustomerPaymentSummary(
  customerId: string,
): Promise<CustomerPaymentSummary> {
  const res = await apiRequest<unknown>(`/sales/payments/customer/${customerId}`);
  const d = (res as { data?: unknown })?.data ?? res;
  return d as CustomerPaymentSummary;
}

/** Paginated payment list with filters. */
export async function listPayments(
  params: {
    page?: number;
    pageSize?: number;
    customerId?: string;
    mode?: string;
    from?: string;
    to?: string;
    search?: string;
  } = {},
) {
  const qs = new URLSearchParams();
  if (params.page) {
    qs.set('page', String(params.page));
  }
  if (params.pageSize) {
    qs.set('pageSize', String(params.pageSize));
  }
  if (params.customerId) {
    qs.set('customerId', params.customerId);
  }
  if (params.mode && params.mode !== 'all') {
    qs.set('mode', params.mode);
  }
  if (params.from) {
    qs.set('from', params.from);
  }
  if (params.to) {
    qs.set('to', params.to);
  }
  if (params.search) {
    qs.set('search', params.search);
  }
  const q = qs.toString();
  const res = await apiRequest<unknown>(`/sales/payments${q ? `?${q}` : ''}`);
  const d = (res as { data?: unknown })?.data ?? res;
  return d as { data: PaymentRecord[]; total: number; page: number; pageSize: number };
}

/** Collect payment — cash/UPI/bank/cheque; excess auto-advance. */
export async function collectPayment(input: {
  customerId: string;
  paymentDate: string;
  mode: Exclude<PaymentMode, 'advance'>;
  amount: number;
  referenceNo?: string;
  bankName?: string;
  chequeNo?: string;
  chequeDate?: string;
  notes?: string;
  invoiceIds?: string[];
}) {
  const res = await apiRequest<unknown>('/sales/payments/collect', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const d = (res as { data?: unknown })?.data ?? res;
  return d as {
    success: boolean;
    payments: PaymentRecord[];
    settledTotal: number;
    advanceAmount: number;
  };
}

/** Apply customer advance balance to selected invoices. */
export async function applyAdvance(input: {
  customerId: string;
  invoiceIds: string[];
  amount: number;
  paymentDate?: string;
  notes?: string;
}) {
  const res = await apiRequest<unknown>('/sales/payments/apply-advance', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const d = (res as { data?: unknown })?.data ?? res;
  return d as { success: boolean; payments: PaymentRecord[]; applied: number };
}

/** Payments history for one invoice. */
export async function getInvoicePayments(invoiceId: string): Promise<PaymentRecord[]> {
  const res = await apiRequest<unknown>(`/sales/payments/invoice/${invoiceId}`);
  const d = (res as { data?: unknown })?.data ?? res;
  return Array.isArray(d) ? (d as PaymentRecord[]) : [];
}
