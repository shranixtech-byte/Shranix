const API_PREFIX = '/sales/returns/engine';
import { apiRequest } from './api-client';

export interface ReturnItem {
  invoiceItemId: string;
  itemId: string;
  variantId?: string;
  description?: string;
  quantity: number;
  rate: number;
  taxableValue: number;
  gstRate: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalAmount: number;
  reason: string;
  batchNo?: string;
  warehouseId?: string;
  itemStatus: 'good' | 'damaged' | 'scrap' | 'quarantine';
}

export async function getReturnReasons(): Promise<{ value: string; label: string }[]> {
  return apiRequest(`${API_PREFIX}/reasons`);
}

export async function validateReturn(invoiceId: string, items: any[]): Promise<any> {
  return apiRequest(`${API_PREFIX}/validate`, {
    method: 'POST',
    body: JSON.stringify({ invoiceId, items }),
  });
}

export async function createReturn(dto: any): Promise<any> {
  return apiRequest(`${API_PREFIX}`, { method: 'POST', body: JSON.stringify(dto) });
}

export async function postReturn(id: string): Promise<any> {
  return apiRequest(`${API_PREFIX}/${id}/post`, { method: 'POST' });
}

export async function getReturnRegister(
  params: { page?: number; pageSize?: number; search?: string; status?: string } = {},
): Promise<any> {
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
  if (params.status) {
    qs.set('status', params.status);
  }
  const query = qs.toString();
  return apiRequest(`${API_PREFIX}/reports/register${query ? `?${query}` : ''}`);
}

export async function getReturnSummary(): Promise<any> {
  return apiRequest(`${API_PREFIX}/reports/summary`);
}

export async function getReasonAnalysis(): Promise<any> {
  return apiRequest(`${API_PREFIX}/reports/reason-analysis`);
}

export async function getCreditNoteRegister(): Promise<any> {
  return apiRequest(`${API_PREFIX}/reports/credit-note-register`);
}

export async function getDebitNoteRegister(): Promise<any> {
  return apiRequest(`${API_PREFIX}/reports/debit-note-register`);
}

export async function createCreditNote(dto: any): Promise<any> {
  return apiRequest(`${API_PREFIX}/credit-notes`, { method: 'POST', body: JSON.stringify(dto) });
}

export async function getAllCreditNotes(): Promise<any[]> {
  return apiRequest(`${API_PREFIX}/credit-notes`);
}

export async function postCreditNote(id: string): Promise<any> {
  return apiRequest(`${API_PREFIX}/credit-notes/${id}/post`, { method: 'POST' });
}

export async function createDebitNote(dto: any): Promise<any> {
  return apiRequest(`${API_PREFIX}/debit-notes`, { method: 'POST', body: JSON.stringify(dto) });
}

export async function getAllDebitNotes(): Promise<any[]> {
  return apiRequest(`${API_PREFIX}/debit-notes`);
}

export async function postDebitNote(id: string): Promise<any> {
  return apiRequest(`${API_PREFIX}/debit-notes/${id}/post`, { method: 'POST' });
}

// Invoice lookup for returns
export async function getPostedInvoices(
  params: { page?: number; pageSize?: number; search?: string } = {},
): Promise<any> {
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
  return apiRequest(`/sales/invoices${query ? `?${query}` : ''}`);
}

export async function getInvoiceItems(invoiceId: string): Promise<any[]> {
  return apiRequest(`/sales/invoices/${invoiceId}`);
}
