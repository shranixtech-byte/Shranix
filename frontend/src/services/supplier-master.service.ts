import { apiRequest, apiUrl } from '@/services/api-client';
import { authService } from '@/services/auth.service';
import type {
  ImportResult,
  Paginated,
  PartyAddress,
  PartyCategory,
  PartyContact,
  PartyDocument,
  PartyGroup,
  PartyStatus,
  PartyWarnings,
} from '@/services/party-master.types';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export type SupplierStatus = PartyStatus;

export interface SupplierRecord {
  id: string;
  code: string;
  name: string;
  firmName?: string | null;
  supplierType?: string;
  groupId?: string | null;
  groupName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  aadhaar?: string | null;
  contactPerson?: string;
  mobile?: string | null;
  altMobile?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string;
  village?: string | null;
  taluka?: string | null;
  district?: string | null;
  city?: string;
  state?: string;
  pin?: string;
  country?: string | null;
  openingBalance: number;
  currentBalance: number;
  outstanding?: number;
  creditLimit: number;
  creditDays: number;
  paymentTerms?: string;
  upiId?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankBranch?: string;
  status: SupplierStatus;
  remarks?: string;
  addressCount?: number;
  contactCount?: number;
  documentCount?: number;
  createdAt?: string;
  warnings?: PartyWarnings;
}

export interface SupplierListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  supplierType?: string;
  groupId?: string;
  categoryId?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface SupplierDashboardData {
  summary: {
    totalSuppliers: number;
    activeSuppliers: number;
    inactiveSuppliers: number;
    blockedSuppliers: number;
    newThisMonth: number;
    newToday: number;
    pendingPayments: number;
    totalPayable: number;
    totalPurchaseValue: number;
    openOrders: number;
  };
  byStatus: Record<string, number>;
  topSuppliers: { id: string; name: string; code: string | null; amount: number }[];
  recent: SupplierRecord[];
}

export interface SupplierOutstandingRow {
  id: string;
  name: string;
  code: string | null;
  mobile: string | null;
  gstin: string | null;
  status: SupplierStatus;
  creditLimit: number;
  creditDays: number;
  outstanding: number;
  overdueAmount: number;
  openInvoices: number;
}

// ═════════════════════════════════════════════════════════
// SUPPLIERS
// ═════════════════════════════════════════════════════════

export async function listSuppliers(
  params: SupplierListParams = {},
): Promise<Paginated<SupplierRecord>> {
  const query = new URLSearchParams();
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.pageSize) {
    query.set('ps', String(params.pageSize));
  }
  if (params.search) {
    query.set('search', params.search);
  }
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.supplierType) {
    query.set('supplierType', params.supplierType);
  }
  if (params.groupId) {
    query.set('groupId', params.groupId);
  }
  if (params.categoryId) {
    query.set('categoryId', params.categoryId);
  }
  if (params.sortBy) {
    query.set('sortBy', params.sortBy);
  }
  if (params.sortDir) {
    query.set('sortDir', params.sortDir);
  }
  const qs = query.toString();
  return apiRequest<Paginated<SupplierRecord>>(`/suppliers${qs ? `?${qs}` : ''}`);
}

export async function searchSuppliers(q: string, page = 1): Promise<Paginated<SupplierRecord>> {
  return apiRequest<Paginated<SupplierRecord>>(
    `/suppliers/search?q=${encodeURIComponent(q)}&page=${page}`,
  );
}

export async function getSupplier(id: string): Promise<SupplierRecord> {
  return apiRequest<SupplierRecord>(`/suppliers/${id}`);
}

export async function createSupplier(data: Partial<SupplierRecord>): Promise<SupplierRecord> {
  return apiRequest<SupplierRecord>('/suppliers', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateSupplier(
  id: string,
  data: Partial<SupplierRecord>,
): Promise<SupplierRecord> {
  return apiRequest<SupplierRecord>(`/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function setSupplierStatus(
  id: string,
  status: SupplierStatus,
): Promise<{ message: string }> {
  return apiRequest(`/suppliers/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function bulkSupplierStatus(ids: string[], status: SupplierStatus): Promise<any> {
  return apiRequest('/suppliers/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ ids, status }),
  });
}

export async function bulkDeleteSuppliers(ids: string[]): Promise<any> {
  return apiRequest('/suppliers/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });
}

export async function getSupplierDashboard(): Promise<SupplierDashboardData> {
  return apiRequest<SupplierDashboardData>('/suppliers/dashboard');
}

export async function getSupplierOutstanding(
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
  } = {},
): Promise<
  Paginated<SupplierOutstandingRow> & {
    summary: { totalPayable: number; totalOverdue: number; suppliers: number };
  }
> {
  const query = new URLSearchParams();
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }
  if (params.search) {
    query.set('search', params.search);
  }
  if (params.status) {
    query.set('status', params.status);
  }
  const qs = query.toString();
  return apiRequest(`/suppliers/outstanding${qs ? `?${qs}` : ''}`);
}

export async function getSupplierLedger(id: string): Promise<any> {
  return apiRequest(`/suppliers/ledger/${id}`);
}

/** Download suppliers as CSV / Excel / JSON. */
export async function downloadSuppliers(format: 'csv' | 'xlsx' | 'json'): Promise<void> {
  const url = apiUrl(`/suppliers/export?format=${format}`);
  const token = authService.getAccessToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `suppliers-export.${format === 'xlsx' ? 'xlsx' : format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

/** Upload an Excel / CSV / JSON file (multipart). mode: insert skips duplicates, upsert updates. */
export async function importSuppliersFile(
  file: File,
  mode: 'insert' | 'upsert',
): Promise<ImportResult> {
  const fd = new FormData();
  fd.append('file', file);
  return apiRequest<ImportResult>(`/suppliers/import?mode=${mode}`, { method: 'POST', body: fd });
}

// ═════════════════════════════════════════════════════════
// ADDRESSES
// ═════════════════════════════════════════════════════════

export async function listSupplierAddresses(supplierId: string): Promise<PartyAddress[]> {
  return apiRequest<PartyAddress[]>(`/suppliers/${supplierId}/addresses`);
}

export async function createSupplierAddress(
  supplierId: string,
  data: Partial<PartyAddress>,
): Promise<PartyAddress> {
  return apiRequest<PartyAddress>(`/suppliers/${supplierId}/addresses`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSupplierAddress(
  supplierId: string,
  addressId: string,
  data: Partial<PartyAddress>,
): Promise<PartyAddress> {
  return apiRequest<PartyAddress>(`/suppliers/${supplierId}/addresses/${addressId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSupplierAddress(
  supplierId: string,
  addressId: string,
): Promise<{ message: string }> {
  return apiRequest(`/suppliers/${supplierId}/addresses/${addressId}`, { method: 'DELETE' });
}

// ═════════════════════════════════════════════════════════
// CONTACTS
// ═════════════════════════════════════════════════════════

export async function listSupplierContacts(supplierId: string): Promise<PartyContact[]> {
  return apiRequest<PartyContact[]>(`/suppliers/${supplierId}/contacts`);
}

export async function createSupplierContact(
  supplierId: string,
  data: Partial<PartyContact>,
): Promise<PartyContact> {
  return apiRequest<PartyContact>(`/suppliers/${supplierId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSupplierContact(
  supplierId: string,
  contactId: string,
  data: Partial<PartyContact>,
): Promise<PartyContact> {
  return apiRequest<PartyContact>(`/suppliers/${supplierId}/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSupplierContact(
  supplierId: string,
  contactId: string,
): Promise<{ message: string }> {
  return apiRequest(`/suppliers/${supplierId}/contacts/${contactId}`, { method: 'DELETE' });
}

// ═════════════════════════════════════════════════════════
// DOCUMENTS
// ═════════════════════════════════════════════════════════

export async function listSupplierDocuments(supplierId: string): Promise<PartyDocument[]> {
  return apiRequest<PartyDocument[]>(`/suppliers/${supplierId}/documents`);
}

export async function createSupplierDocument(
  supplierId: string,
  data: Partial<PartyDocument>,
): Promise<PartyDocument> {
  return apiRequest<PartyDocument>(`/suppliers/${supplierId}/documents`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteSupplierDocument(
  supplierId: string,
  documentId: string,
): Promise<{ message: string }> {
  return apiRequest(`/suppliers/${supplierId}/documents/${documentId}`, { method: 'DELETE' });
}

// ═════════════════════════════════════════════════════════
// GROUPS / CATEGORIES (reference data)
// ═════════════════════════════════════════════════════════

export async function listSupplierGroups(): Promise<PartyGroup[]> {
  return apiRequest<PartyGroup[]>('/supplier-groups');
}

export async function createSupplierGroup(data: {
  name: string;
  description?: string;
  sortOrder?: number;
}): Promise<PartyGroup> {
  return apiRequest<PartyGroup>('/supplier-groups', { method: 'POST', body: JSON.stringify(data) });
}

export async function listSupplierCategories(): Promise<PartyCategory[]> {
  return apiRequest<PartyCategory[]>('/supplier-categories');
}

export async function createSupplierCategory(data: {
  name: string;
  description?: string;
  priority?: number;
}): Promise<PartyCategory> {
  return apiRequest<PartyCategory>('/supplier-categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Shared option lists ─────────────────────────────────────
export const SUPPLIER_TYPES = [
  { label: 'Regular', value: 'regular' },
  { label: 'Trader', value: 'trader' },
  { label: 'Manufacturer', value: 'manufacturer' },
  { label: 'Distributor', value: 'distributor' },
  { label: 'Importer', value: 'importer' },
  { label: 'Service', value: 'service' },
  { label: 'Other', value: 'other' },
];

export const SUPPLIER_STATUS_OPTIONS: { label: string; value: SupplierStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Blocked', value: 'blocked' },
];

export const SUPPLIER_ADDRESS_TYPES: { label: string; value: string }[] = [
  { label: 'Billing', value: 'billing' },
  { label: 'Shipping', value: 'shipping' },
  { label: 'Head Office', value: 'head_office' },
  { label: 'Branch', value: 'branch' },
];

export const SUPPLIER_CONTACT_TYPES: { label: string; value: string }[] = [
  { label: 'Owner', value: 'owner' },
  { label: 'Accounts', value: 'accounts' },
  { label: 'Sales', value: 'sales' },
  { label: 'Dispatch', value: 'dispatch' },
  { label: 'Purchase Manager', value: 'purchase_manager' },
];

export const SUPPLIER_DOC_TYPES: { label: string; value: string }[] = [
  { label: 'GST Certificate', value: 'gst_certificate' },
  { label: 'PAN', value: 'pan' },
  { label: 'Cancelled Cheque', value: 'cancelled_cheque' },
  { label: 'Agreement', value: 'agreement' },
  { label: 'Fertilizer License', value: 'fertilizer_license' },
  { label: 'Seed License', value: 'seed_license' },
  { label: 'Pesticide License', value: 'pesticide_license' },
  { label: 'Other', value: 'other' },
];

export const SUPPLIER_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  SUPPLIER_TYPES.map((t) => [t.value, t.label]),
);
