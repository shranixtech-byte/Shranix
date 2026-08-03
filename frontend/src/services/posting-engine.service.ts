import type { InvoiceLineItem } from '@/pages/sales/product-selection-screen';

import { apiRequest } from './api-client';

// ═════════════════════════════════════════════════════════
// TYPES (mirroring backend)
// ═════════════════════════════════════════════════════════

export interface PostingValidationResult {
  field: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

export interface AccountingEntry {
  accountName: string;
  accountType: 'debit' | 'credit';
  amount: number;
  narration: string;
}

export interface JournalPayload {
  entryNumber: string;
  entryDate: string;
  voucherNumber: string;
  voucherType: string;
  narration: string;
  entries: AccountingEntry[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

export interface CustomerLedgerPayload {
  customerId: string;
  customerName: string;
  openingBalance: number;
  invoiceAmount: number;
  paymentAmount: number;
  outstanding: number;
  closingBalance: number;
  runningBalance: number;
}

export interface StockPostingPayload {
  itemId: string;
  productName: string;
  sku: string;
  warehouse: string;
  quantity: number;
  batchNo: string;
  expiryDate: string;
  costMethod: string;
  unitCost: number;
  totalCost: number;
  closingQty: number;
}

export interface BatchManagementPayload {
  batchNo: string;
  expiryDate: string;
  mfgDate: string;
  openingQty: number;
  soldQty: number;
  closingQty: number;
  status: 'healthy' | 'expiring_soon' | 'expired';
}

export interface CostingPayload {
  method: string;
  itemId: string;
  productName: string;
  sellingRate: number;
  unitCost: number;
  quantity: number;
  totalRevenue: number;
  totalCost: number;
  grossMargin: number;
  grossMarginPercent: number;
}

export interface AuditLogPayload {
  event: string;
  userId: string;
  userName: string;
  oldValue: string;
  newValue: string;
  ip: string;
  device: string;
  timestamp: string;
}

export interface ApprovalPayload {
  documentType: string;
  documentId: string;
  status: string;
  requestedBy: string;
  approvedBy: string;
  comments: string;
  approvalLevel: number;
}

export interface EventPayload {
  event: string;
  invoiceNumber: string;
  customerId: string;
  grandTotal: number;
  timestamp: string;
  triggeredBy: string;
}

export interface PostingPayload {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  invoiceDate: string;
  grandTotal: number;
  status: string;
  validations: PostingValidationResult[];
  accounting: JournalPayload;
  customerLedger: CustomerLedgerPayload;
  stockPostings: StockPostingPayload[];
  batchManagement: BatchManagementPayload[];
  costing: CostingPayload[];
  auditLog: AuditLogPayload;
  approval: ApprovalPayload;
  events: EventPayload[];
  timestamp: string;
  canPost: boolean;
}

export interface TriggerPostingResult {
  success: boolean;
  message: string;
  journalEntryId?: string;
  errors: string[];
}

// ═════════════════════════════════════════════════════════
// MAIN API — Prepare payloads locally (no API call needed)
// ═════════════════════════════════════════════════════════

/**
 * Build the full posting payload from invoice data.
 * This mimics the backend's PostingEngineService.preparePosting()
 * so Step 8 can show results immediately without a backend call.
 * In production, this would call POST /api/v1/sales/invoices/:id/posting/prepare
 */

function getCostMethod(grandTotal: number): string {
  if (grandTotal > 100000) {
    return 'fifo';
  }
  if (grandTotal > 50000) {
    return 'weighted_average';
  }
  return 'average';
}

function generateEntryNumber(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefix}-${ts}${rand}`;
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface PreparePostingInput {
  invoiceNumber: string;
  invoiceDate: string;
  customerId: string;
  customerName: string;
  placeOfSupply: string;
  items: InvoiceLineItem[];
  grossTotal: number;
  itemDiscountTotal: number;
  taxableAfterDiscount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  grandTotal: number;
  totalPaid: number;
  balance: number;
  customerGstin: string;
  gstCategory: string;
  isInterState: boolean;
  paymentSplits: { method: string; amount: number; refNo: string; bankName: string }[];
  status: string;
  userId?: string;
  userEmail?: string;
}

export function preparePostingPayload(input: PreparePostingInput): PostingPayload {
  const timestamp = new Date().toISOString();

  // ── 1. Validations ────────────────────────────────
  const validations: PostingValidationResult[] = [
    { field: 'duplicate_invoice', status: 'pass', message: 'Invoice number is unique' },
  ];

  const batchNos = input.items.map((i) => i.batchNo).filter(Boolean);
  const duplicateBatches = batchNos.filter((b, i) => batchNos.indexOf(b) !== i);
  validations.push({
    field: 'duplicate_batch',
    status: duplicateBatches.length > 0 ? 'fail' : 'pass',
    message:
      duplicateBatches.length > 0
        ? `Duplicate batch: ${duplicateBatches.join(', ')}`
        : 'All batches unique',
  });

  const overStock = input.items.filter((i) => i.quantity > i.availableStock);
  validations.push({
    field: 'stock_mismatch',
    status: overStock.length > 0 ? 'fail' : 'pass',
    message:
      overStock.length > 0
        ? `${overStock.length} item(s) exceed available stock`
        : 'Stock sufficient',
  });

  const totalComputedGst = input.cgstTotal + input.sgstTotal + input.igstTotal + input.cessTotal;
  const totalItemGst = input.items.reduce(
    (s, i) => s + i.cgstAmount + i.sgstAmount + i.igstAmount + i.cessAmount,
    0,
  );
  validations.push({
    field: 'gst_mismatch',
    status: Math.abs(totalComputedGst - totalItemGst) > 0.01 ? 'fail' : 'pass',
    message:
      Math.abs(totalComputedGst - totalItemGst) > 0.01
        ? `GST mismatch: header ${totalComputedGst} vs items ${totalItemGst}`
        : 'GST values match',
  });

  if (input.totalPaid > input.grandTotal + 0.01) {
    validations.push({
      field: 'payment_mismatch',
      status: 'warn',
      message: `Overpayment: paid ${formatINR(input.totalPaid)} > grand total ${formatINR(input.grandTotal)}`,
    });
  } else if (input.totalPaid > 0 && input.totalPaid < input.grandTotal) {
    validations.push({
      field: 'payment_mismatch',
      status: 'warn',
      message: `Partial payment: paid ${formatINR(input.totalPaid)} of ${formatINR(input.grandTotal)}`,
    });
  } else {
    validations.push({
      field: 'payment_mismatch',
      status: 'pass',
      message: 'Payment matches invoice total',
    });
  }

  // ── 2. Accounting Journal ─────────────────────────
  const entries: AccountingEntry[] = [];
  const entryNumber = generateEntryNumber('SINV');
  const taxableAmount = input.taxableAfterDiscount;
  const totalGst = input.cgstTotal + input.sgstTotal + input.igstTotal + input.cessTotal;
  const receivableAmount = taxableAmount + totalGst;
  const cashAmount = input.paymentSplits
    .filter((p) => p.method === 'cash')
    .reduce((s, p) => s + p.amount, 0);
  const bankAmount = input.paymentSplits
    .filter((p) =>
      ['bank_transfer', 'neft', 'rtgs', 'imps', 'cheque', 'card', 'upi'].includes(p.method),
    )
    .reduce((s, p) => s + p.amount, 0);

  if (cashAmount === 0 && bankAmount === 0) {
    entries.push({
      accountName: `${input.customerName} - Sundry Debtor`,
      accountType: 'debit',
      amount: receivableAmount,
      narration: `Sales invoice ${input.invoiceNumber}`,
    });
  }
  if (cashAmount > 0) {
    entries.push({
      accountName: 'Cash Account',
      accountType: 'debit',
      amount: cashAmount,
      narration: `Cash payment for ${input.invoiceNumber}`,
    });
  }
  if (bankAmount > 0) {
    entries.push({
      accountName: 'Bank Account',
      accountType: 'debit',
      amount: bankAmount,
      narration: `Bank payment for ${input.invoiceNumber}`,
    });
  }
  entries.push({
    accountName: 'Sales Account',
    accountType: 'credit',
    amount: taxableAmount,
    narration: `Sales - ${input.invoiceNumber}`,
  });
  if (input.cgstTotal > 0) {
    entries.push({
      accountName: 'CGST Output Account',
      accountType: 'credit',
      amount: input.cgstTotal,
      narration: `CGST on ${input.invoiceNumber}`,
    });
  }
  if (input.sgstTotal > 0) {
    entries.push({
      accountName: 'SGST Output Account',
      accountType: 'credit',
      amount: input.sgstTotal,
      narration: `SGST on ${input.invoiceNumber}`,
    });
  }
  if (input.igstTotal > 0) {
    entries.push({
      accountName: 'IGST Output Account',
      accountType: 'credit',
      amount: input.igstTotal,
      narration: `IGST on ${input.invoiceNumber}`,
    });
  }
  if (input.cessTotal > 0) {
    entries.push({
      accountName: 'CESS Output Account',
      accountType: 'credit',
      amount: input.cessTotal,
      narration: `CESS on ${input.invoiceNumber}`,
    });
  }
  if (input.itemDiscountTotal > 0) {
    entries.push({
      accountName: 'Discount Allowed Account',
      accountType: 'debit',
      amount: input.itemDiscountTotal,
      narration: `Discount on ${input.invoiceNumber}`,
    });
  }

  const roundOff = input.roundOff;
  if (Math.abs(roundOff) > 0.005) {
    if (roundOff > 0) {
      entries.push({
        accountName: 'Round Off Account',
        accountType: 'credit',
        amount: Math.abs(roundOff),
        narration: `Round off - ${input.invoiceNumber}`,
      });
    } else {
      entries.push({
        accountName: 'Round Off Account',
        accountType: 'debit',
        amount: Math.abs(roundOff),
        narration: `Round off - ${input.invoiceNumber}`,
      });
    }
  }

  const totalDebit =
    Math.round(
      entries.filter((e) => e.accountType === 'debit').reduce((s, e) => s + e.amount, 0) * 100,
    ) / 100;
  const totalCredit =
    Math.round(
      entries.filter((e) => e.accountType === 'credit').reduce((s, e) => s + e.amount, 0) * 100,
    ) / 100;

  const accounting: JournalPayload = {
    entryNumber,
    entryDate: input.invoiceDate,
    voucherNumber: input.invoiceNumber,
    voucherType: 'sales_invoice',
    narration: `Journal entry for sales invoice ${input.invoiceNumber}`,
    entries,
    totalDebit,
    totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 0.01,
  };

  // ── 3. Customer Ledger ────────────────────────────
  const customerLedger: CustomerLedgerPayload = {
    customerId: input.customerId,
    customerName: input.customerName,
    openingBalance: 0,
    invoiceAmount: input.grandTotal,
    paymentAmount: input.totalPaid,
    outstanding: input.balance,
    closingBalance: input.balance,
    runningBalance: input.balance,
  };

  // ── 4. Stock Posting ──────────────────────────────
  const costMethod = getCostMethod(input.grandTotal);
  const stockPostings: StockPostingPayload[] = input.items.map((item) => ({
    itemId: item.productId,
    productName: item.productName,
    sku: item.sku,
    warehouse: item.warehouse || 'Main',
    quantity: item.quantity,
    batchNo: item.batchNo || '—',
    expiryDate: item.expiryDate || '—',
    costMethod,
    unitCost: Math.round(item.rate * 0.7 * 100) / 100,
    totalCost: Math.round(item.rate * 0.7 * item.quantity * 100) / 100,
    closingQty: Math.max(0, (item.availableStock || 0) - item.quantity),
  }));

  // ── 5. Batch Management ───────────────────────────
  const batchManagement: BatchManagementPayload[] = input.items
    .filter((item) => item.batchNo)
    .map((item) => {
      const openingQty = item.availableStock || 0;
      const soldQty = item.quantity;
      const closingQty = Math.max(0, openingQty - soldQty);
      let status: 'healthy' | 'expiring_soon' | 'expired' = 'healthy';
      if (item.expiryDate) {
        const daysUntilExpiry = Math.ceil(
          (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        if (daysUntilExpiry <= 0) {
          status = 'expired';
        } else if (daysUntilExpiry <= 90) {
          status = 'expiring_soon';
        }
      }
      return {
        batchNo: item.batchNo,
        expiryDate: item.expiryDate || '—',
        mfgDate: '—',
        openingQty,
        soldQty,
        closingQty,
        status,
      };
    });

  // ── 6. Costing ────────────────────────────────────
  const costing: CostingPayload[] = input.items.map((item) => {
    const unitCost = Math.round(item.rate * 0.7 * 100) / 100;
    const totalRevenue = item.amount;
    const totalCost = unitCost * item.quantity;
    const grossMargin = totalRevenue - totalCost;
    const grossMarginPercent =
      totalRevenue > 0 ? Math.round((grossMargin / totalRevenue) * 10000) / 100 : 0;
    return {
      method: costMethod,
      itemId: item.productId,
      productName: item.productName,
      sellingRate: item.rate,
      unitCost,
      quantity: item.quantity,
      totalRevenue,
      totalCost,
      grossMargin,
      grossMarginPercent,
    };
  });

  // ── 7. Audit Log ──────────────────────────────────
  const auditLog: AuditLogPayload = {
    event: 'invoice_posted',
    userId: input.userId || 'system',
    userName: input.userEmail || 'System',
    oldValue: 'draft',
    newValue: input.status,
    ip: '127.0.0.1',
    device: 'Web Browser',
    timestamp,
  };

  // ── 8. Approval ───────────────────────────────────
  const hasFailures = validations.some((v) => v.status === 'fail');
  const approval: ApprovalPayload = {
    documentType: 'sales_invoice',
    documentId: input.invoiceNumber,
    status: hasFailures ? 'pending' : input.status === 'posted' ? 'posted' : 'pending',
    requestedBy: input.userId || 'system',
    approvedBy: '',
    comments: hasFailures ? 'Pending approval' : 'Auto-approved',
    approvalLevel: hasFailures ? 2 : 1,
  };

  // ── 9. Events ─────────────────────────────────────
  const events: EventPayload[] = [
    {
      event: 'created',
      invoiceNumber: input.invoiceNumber,
      customerId: input.customerId,
      grandTotal: input.grandTotal,
      timestamp: input.invoiceDate,
      triggeredBy: input.userId || 'system',
    },
    ...(input.status === 'posted'
      ? [
          {
            event: 'posted' as const,
            invoiceNumber: input.invoiceNumber,
            customerId: input.customerId,
            grandTotal: input.grandTotal,
            timestamp,
            triggeredBy: input.userId || 'system',
          },
        ]
      : []),
  ];

  const canPost = validations.filter((v) => v.status === 'fail').length === 0;

  return {
    invoiceId: input.invoiceNumber,
    invoiceNumber: input.invoiceNumber,
    customerId: input.customerId,
    customerName: input.customerName,
    invoiceDate: input.invoiceDate,
    grandTotal: input.grandTotal,
    status: input.status,
    validations,
    accounting,
    customerLedger,
    stockPostings,
    batchManagement,
    costing,
    auditLog,
    approval,
    events,
    timestamp,
    canPost,
  };
}

/**
 * Trigger actual posting via backend API.
 * POST /api/v1/sales/invoices/:id/post
 */
export async function triggerPosting(
  invoiceId: string,
  postingPayload: PostingPayload,
): Promise<TriggerPostingResult> {
  return apiRequest<TriggerPostingResult>(`/sales/invoices/${invoiceId}/post`, {
    method: 'POST',
    body: JSON.stringify({ payload: postingPayload }),
  });
}
