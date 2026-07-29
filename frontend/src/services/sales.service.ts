import { apiRequest } from './api-client';
import type { InvoiceLineItem } from '@/pages/sales/product-selection-screen';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export interface CreateInvoiceItemPayload {
  itemId: string;
  variantId?: string;
  description?: string;
  quantity: number;
  unitId?: string;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  taxableValue: number;
  gstRate: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalAmount: number;
}

export interface CreateInvoicePayload {
  invoiceNumber: string;
  customerId: string;
  customerInvoiceNo?: string;
  invoiceDate: string;
  dueDate?: string;
  status: string;
  subTotal: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  placeOfSupply?: string;
  billingAddress?: string;
  salesPerson?: string;
  gstCategory?: string;
  customerGstin?: string;
  financialYear?: string;
  notes?: string;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  items: CreateInvoiceItemPayload[];
}

export interface InvoiceResponse {
  id: string;
  invoiceNumber: string;
  customerId: string;
  invoiceDate: string;
  status: string;
  grandTotal: number;
  items?: any[];
  [key: string]: any;
}

// ═════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════

/**
 * Map frontend InvoiceLineItem to backend CreateInvoiceItemPayload.
 */
function mapLineItemToPayload(item: InvoiceLineItem): CreateInvoiceItemPayload {
  return {
    itemId: item.productId,
    description: item.productName,
    quantity: item.quantity,
    rate: item.rate,
    discountPercent: item.discountPercent,
    discountAmount: item.discountValue,
    taxableValue: item.taxableAmount,
    gstRate: item.gstPercent,
    igst: item.igstAmount,
    cgst: item.cgstAmount,
    sgst: item.sgstAmount,
    cess: item.cessAmount,
    totalAmount: item.amount,
  };
}

// ═════════════════════════════════════════════════════════
// API METHODS
// ═════════════════════════════════════════════════════════

/**
 * Create a new sales invoice with line items.
 * POST /api/v1/sales/invoices
 */
export async function createSalesInvoice(
  payload: CreateInvoicePayload,
): Promise<InvoiceResponse> {
  return apiRequest<InvoiceResponse>('/sales/invoices', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch a single sales invoice by ID.
 * GET /api/v1/sales/invoices/:id
 */
export async function getSalesInvoice(id: string): Promise<InvoiceResponse> {
  return apiRequest<InvoiceResponse>(`/sales/invoices/${id}`);
}

/**
 * Fetch paginated sales invoices list.
 * GET /api/v1/sales/invoices?page=1&pageSize=50&search=
 */
export async function getSalesInvoices(
  page = 1,
  pageSize = 50,
  search?: string,
): Promise<{ data: InvoiceResponse[]; total: number }> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search) params.set('search', search);
  return apiRequest(`/sales/invoices?${params}`);
}

/**
 * Update a sales invoice (status, payment, etc.).
 * PUT /api/v1/sales/invoices/:id
 */
export async function updateSalesInvoice(
  id: string,
  data: Partial<CreateInvoicePayload>,
): Promise<InvoiceResponse> {
  return apiRequest<InvoiceResponse>(`/sales/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete (soft-delete) a sales invoice.
 * DELETE /api/v1/sales/invoices/:id
 */
export async function deleteSalesInvoice(id: string): Promise<void> {
  return apiRequest<void>(`/sales/invoices/${id}`, { method: 'DELETE' });
}

/**
 * Build the full invoice payload from the frontend 6-step flow data.
 */
export function buildInvoicePayload(params: {
  invoiceNumber: string;
  invoiceDate: string;
  financialYear: string;
  customerId: string;
  placeOfSupply: string;
  billingAddress: string;
  salesPerson: string;
  notes: string;
  paymentTerms: string;
  dueDate: string;
  items: InvoiceLineItem[];
  grossTotal: number;
  itemDiscountTotal: number;
  taxableAfterDiscount: number;
  gstCategory: string;
  cessType: string;
  cessValue: number;
  customerGstin: string;
  paymentSplits: { method: string; amount: number; refNo: string; bankName: string }[];
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  grandTotal: number;
  isInterState: boolean;
}): CreateInvoicePayload {
  const totalPaid = params.paymentSplits.reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, params.grandTotal - totalPaid);

  let paymentStatus = 'unpaid';
  if (totalPaid >= params.grandTotal) {
    paymentStatus = 'paid';
  } else if (totalPaid > 0) {
    paymentStatus = 'partial';
  }

  return {
    invoiceNumber: params.invoiceNumber,
    customerId: params.customerId,
    invoiceDate: params.invoiceDate,
    dueDate: params.dueDate || undefined,
    status: 'draft',
    subTotal: params.grossTotal,
    discountPercent: 0,
    discountAmount: params.itemDiscountTotal,
    taxAmount: params.cgstTotal + params.sgstTotal + params.igstTotal + params.cessTotal,
    roundOff: params.roundOff,
    grandTotal: params.grandTotal,
    paidAmount: totalPaid,
    balanceAmount: balance,
    paymentStatus,
    placeOfSupply: params.placeOfSupply,
    billingAddress: params.billingAddress,
    salesPerson: params.salesPerson,
    gstCategory: params.gstCategory,
    customerGstin: params.customerGstin,
    financialYear: params.financialYear,
    notes: params.notes,
    cgstTotal: params.cgstTotal,
    sgstTotal: params.sgstTotal,
    igstTotal: params.igstTotal,
    cessTotal: params.cessTotal,
    items: params.items.map(mapLineItemToPayload),
  };
}
