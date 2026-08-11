import { apiRequest } from '@/services/api-client';

// ═════════════════════════════════════════════════════════
// PURCHASE PAYMENT COLLECTION API CLIENT (Phase 3.3 — G3)
// Supplier Invoice → Payment: Cash · UPI · Bank · Cheque · Advance.
// ═════════════════════════════════════════════════════════

export type PurchasePaymentMode = 'cash' | 'upi' | 'bank' | 'cheque' | 'advance';

export interface PurchasePaymentRecord {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  supplierId: string;
  supplierName?: string;
  invoiceId?: string | null;
  invoiceNumber?: string;
  mode: PurchasePaymentMode;
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

export interface SupplierPaymentSummary {
  supplier: { id: string; name: string; code: string | null };
  profile: {
    outstanding: number;
    advanceBalance: number;
    creditLimit: number;
    creditDays: number;
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
  payments: PurchasePaymentRecord[];
}

/** Dashboard — total payable, overdue, advance, today + recent payments. */
export async function getPurchasePaymentDashboard() {
  const res = await apiRequest<unknown>('/purchase/payments/dashboard');
  const d = (res as { data?: unknown })?.data ?? res;
  return d as {
    summary: {
      totalPayable: number;
      totalOverdue: number;
      totalAdvance: number;
      todayCollection: number;
      suppliersWithDue: number;
    };
    recent: PurchasePaymentRecord[];
  };
}

/** Supplier payment summary — due invoices + advance balance + history. */
export async function getSupplierPaymentSummary(
  supplierId: string,
): Promise<SupplierPaymentSummary> {
  const res = await apiRequest<unknown>(`/purchase/payments/supplier/${supplierId}`);
  const d = (res as { data?: unknown })?.data ?? res;
  return d as SupplierPaymentSummary;
}

/** Paginated payment list with filters. */
export async function listPurchasePayments(
  params: {
    page?: number;
    pageSize?: number;
    supplierId?: string;
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
  if (params.supplierId) {
    qs.set('supplierId', params.supplierId);
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
  const res = await apiRequest<unknown>(`/purchase/payments${q ? `?${q}` : ''}`);
  const d = (res as { data?: unknown })?.data ?? res;
  return d as { data: PurchasePaymentRecord[]; total: number; page: number; pageSize: number };
}

/** Make supplier payment — cash/UPI/bank/cheque; excess auto-advance. */
export async function collectPurchasePayment(input: {
  supplierId: string;
  paymentDate: string;
  mode: Exclude<PurchasePaymentMode, 'advance'>;
  amount: number;
  referenceNo?: string;
  bankName?: string;
  chequeNo?: string;
  chequeDate?: string;
  notes?: string;
  invoiceIds?: string[];
}) {
  const res = await apiRequest<unknown>('/purchase/payments/collect', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const d = (res as { data?: unknown })?.data ?? res;
  return d as {
    success: boolean;
    payments: PurchasePaymentRecord[];
    settledTotal: number;
    advanceAmount: number;
  };
}

/** Apply supplier advance balance to selected invoices. */
export async function applySupplierAdvance(input: {
  supplierId: string;
  invoiceIds: string[];
  amount: number;
  paymentDate?: string;
  notes?: string;
}) {
  const res = await apiRequest<unknown>('/purchase/payments/apply-advance', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const d = (res as { data?: unknown })?.data ?? res;
  return d as { success: boolean; payments: PurchasePaymentRecord[]; applied: number };
}

/** Payments history for one purchase invoice. */
export async function getPurchaseInvoicePayments(
  invoiceId: string,
): Promise<PurchasePaymentRecord[]> {
  const res = await apiRequest<unknown>(`/purchase/payments/invoice/${invoiceId}`);
  const d = (res as { data?: unknown })?.data ?? res;
  return Array.isArray(d) ? (d as PurchasePaymentRecord[]) : [];
}
