import { apiRequest, apiUrl } from '@/services/api-client';
import { authService } from '@/services/auth.service';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export type CustomerStatus = 'active' | 'inactive' | 'blocked';

export interface CustomerRecord {
  id: string;
  code: string;
  name: string;
  firmName?: string | null;
  customerType?: string;
  groupId?: string | null;
  groupName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  mobile?: string | null;
  altMobile?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  contactPerson?: string;
  address?: string;
  village?: string | null;
  taluka?: string | null;
  district?: string | null;
  city?: string;
  state?: string;
  pin?: string;
  country?: string | null;
  creditLimit: number;
  creditDays: number;
  openingBalance: number;
  currentBalance: number;
  status: CustomerStatus;
  remarks?: string;
  customerGroup?: string;
  customerCategory?: string;
  priceList?: string;
  paymentTerms?: string;
  loyaltyPoints?: number;
  // profile enrichment
  outstanding?: number;
  advanceBalance?: number;
  overdueAmount?: number;
  availableCredit?: number;
  isBlocked?: boolean;
  blockReason?: string | null;
  addressCount?: number;
  contactCount?: number;
  documentCount?: number;
  createdAt?: string;
  warnings?: { mobileDuplicates?: { id: string; name: string; code: string }[] };
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CustomerListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  groupId?: string;
  categoryId?: string;
  customerType?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  withProfile?: boolean;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  addressType: 'billing' | 'shipping' | 'branch';
  address?: string | null;
  village?: string | null;
  taluka?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string;
  pincode?: string | null;
  isDefault: boolean;
}

export interface CustomerContact {
  id: string;
  customerId: string;
  contactType: 'owner' | 'accounts' | 'purchase' | 'sales';
  name: string;
  mobile?: string | null;
  email?: string | null;
  designation?: string | null;
  isPrimary: boolean;
}

export interface CustomerDocument {
  id: string;
  customerId: string;
  docType: 'gst_certificate' | 'pan' | 'agreement' | 'shop_license' | 'other';
  fileName: string;
  fileUrl?: string | null;
  fileSize?: number;
  mimeType?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface CustomerGroup {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface CustomerCategory {
  id: string;
  name: string;
  description?: string | null;
  priority: number;
  isActive: boolean;
}

export interface CustomerDashboardData {
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    blockedCustomers: number;
    newThisMonth: number;
    totalOutstanding: number;
    totalOverdue: number;
    totalAdvance: number;
    customersWithDue: number;
  };
  byStatus: Record<string, number>;
  groupDistribution: { name: string; count: number }[];
  categoryDistribution: { name: string; count: number }[];
  topCustomers: {
    id: string;
    name: string;
    code: string | null;
    amount: number;
    outstanding: number;
  }[];
  recent: CustomerRecord[];
}

export interface OutstandingRow {
  id: string;
  name: string;
  code: string | null;
  mobile: string | null;
  gstin: string | null;
  status: CustomerStatus;
  creditLimit: number;
  outstanding: number;
  overdueAmount: number;
  advanceBalance: number;
  availableCredit: number;
  isBlocked: boolean;
  lastPaymentDate: string | null;
}

export interface ImportResult {
  entity?: string;
  mode?: string;
  imported?: number;
  updated?: number;
  skipped?: number;
  errors?: { row: number; message: string }[];
  success?: boolean;
  message?: string;
}

// ═════════════════════════════════════════════════════════
// CUSTOMERS
// ═════════════════════════════════════════════════════════

export async function listCustomers(
  params: CustomerListParams = {},
): Promise<Paginated<CustomerRecord>> {
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
  if (params.groupId) {
    query.set('groupId', params.groupId);
  }
  if (params.categoryId) {
    query.set('categoryId', params.categoryId);
  }
  if (params.customerType) {
    query.set('customerType', params.customerType);
  }
  if (params.sortBy) {
    query.set('sortBy', params.sortBy);
  }
  if (params.sortDir) {
    query.set('sortDir', params.sortDir);
  }
  if (params.withProfile) {
    query.set('withProfile', 'true');
  }
  const qs = query.toString();
  return apiRequest<Paginated<CustomerRecord>>(`/customers${qs ? `?${qs}` : ''}`);
}

export async function searchCustomers(q: string, page = 1): Promise<Paginated<CustomerRecord>> {
  return apiRequest<Paginated<CustomerRecord>>(
    `/customers/search?q=${encodeURIComponent(q)}&page=${page}`,
  );
}

export async function getCustomer(id: string): Promise<CustomerRecord> {
  return apiRequest<CustomerRecord>(`/customers/${id}`);
}

export async function createCustomer(data: Partial<CustomerRecord>): Promise<CustomerRecord> {
  return apiRequest<CustomerRecord>('/customers', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCustomer(
  id: string,
  data: Partial<CustomerRecord>,
): Promise<CustomerRecord> {
  return apiRequest<CustomerRecord>(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function setCustomerStatus(
  id: string,
  status: CustomerStatus,
): Promise<{ message: string }> {
  return apiRequest(`/customers/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function bulkCustomerStatus(ids: string[], status: CustomerStatus): Promise<any> {
  return apiRequest('/customers/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ ids, status }),
  });
}

export async function bulkDeleteCustomers(ids: string[]): Promise<any> {
  return apiRequest('/customers/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });
}

export async function getCustomerDashboard(): Promise<CustomerDashboardData> {
  return apiRequest<CustomerDashboardData>('/customers/dashboard');
}

export async function getOutstanding(
  params: { page?: number; pageSize?: number; search?: string; status?: string } = {},
): Promise<
  Paginated<OutstandingRow> & {
    summary: {
      totalOutstanding: number;
      totalOverdue: number;
      totalAdvance: number;
      customers: number;
    };
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
  return apiRequest(`/customers/outstanding${qs ? `?${qs}` : ''}`);
}

export async function getCustomerLedger(id: string): Promise<any> {
  return apiRequest(`/customers/ledger/${id}`);
}

/** Download customers as CSV / Excel / JSON. */
export async function downloadCustomers(format: 'csv' | 'xlsx' | 'json'): Promise<void> {
  const url = apiUrl(`/customers/export?format=${format}`);
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
  link.download = `customers-export.${format === 'xlsx' ? 'xlsx' : format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

/** Upload an Excel / CSV / JSON file (multipart). mode: insert skips duplicates, upsert updates. */
export async function importCustomersFile(
  file: File,
  mode: 'insert' | 'upsert',
): Promise<ImportResult> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('mode', mode);
  return apiRequest<ImportResult>('/customers/import', { method: 'POST', body: fd });
}

// ═════════════════════════════════════════════════════════
// ADDRESSES
// ═════════════════════════════════════════════════════════

export async function listAddresses(customerId: string): Promise<CustomerAddress[]> {
  return apiRequest<CustomerAddress[]>(`/customers/${customerId}/addresses`);
}

export async function createAddress(
  customerId: string,
  data: Partial<CustomerAddress>,
): Promise<CustomerAddress> {
  return apiRequest<CustomerAddress>(`/customers/${customerId}/addresses`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAddress(
  customerId: string,
  addressId: string,
  data: Partial<CustomerAddress>,
): Promise<CustomerAddress> {
  return apiRequest<CustomerAddress>(`/customers/${customerId}/addresses/${addressId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAddress(
  customerId: string,
  addressId: string,
): Promise<{ message: string }> {
  return apiRequest(`/customers/${customerId}/addresses/${addressId}`, { method: 'DELETE' });
}

// ═════════════════════════════════════════════════════════
// CONTACTS
// ═════════════════════════════════════════════════════════

export async function listContacts(customerId: string): Promise<CustomerContact[]> {
  return apiRequest<CustomerContact[]>(`/customers/${customerId}/contacts`);
}

export async function createContact(
  customerId: string,
  data: Partial<CustomerContact>,
): Promise<CustomerContact> {
  return apiRequest<CustomerContact>(`/customers/${customerId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateContact(
  customerId: string,
  contactId: string,
  data: Partial<CustomerContact>,
): Promise<CustomerContact> {
  return apiRequest<CustomerContact>(`/customers/${customerId}/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteContact(
  customerId: string,
  contactId: string,
): Promise<{ message: string }> {
  return apiRequest(`/customers/${customerId}/contacts/${contactId}`, { method: 'DELETE' });
}

// ═════════════════════════════════════════════════════════
// DOCUMENTS
// ═════════════════════════════════════════════════════════

export async function listDocuments(customerId: string): Promise<CustomerDocument[]> {
  return apiRequest<CustomerDocument[]>(`/customers/${customerId}/documents`);
}

export async function createDocument(
  customerId: string,
  data: Partial<CustomerDocument>,
): Promise<CustomerDocument> {
  return apiRequest<CustomerDocument>(`/customers/${customerId}/documents`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteDocument(
  customerId: string,
  documentId: string,
): Promise<{ message: string }> {
  return apiRequest(`/customers/${customerId}/documents/${documentId}`, { method: 'DELETE' });
}

// ═════════════════════════════════════════════════════════
// GROUPS / CATEGORIES (reference data)
// ═════════════════════════════════════════════════════════

export async function listGroups(): Promise<CustomerGroup[]> {
  return apiRequest<CustomerGroup[]>('/customer-groups');
}

export async function createGroup(data: {
  name: string;
  description?: string;
  sortOrder?: number;
}): Promise<CustomerGroup> {
  return apiRequest<CustomerGroup>('/customer-groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listCategories(): Promise<CustomerCategory[]> {
  return apiRequest<CustomerCategory[]>('/customer-categories');
}

export async function createCategory(data: {
  name: string;
  description?: string;
  priority?: number;
}): Promise<CustomerCategory> {
  return apiRequest<CustomerCategory>('/customer-categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Shared option lists ─────────────────────────────────────
export const CUSTOMER_TYPES = [
  { label: 'Retail', value: 'retail' },
  { label: 'Wholesale', value: 'wholesale' },
  { label: 'Farmer', value: 'farmer' },
  { label: 'Dealer', value: 'dealer' },
  { label: 'Corporate', value: 'corporate' },
  { label: 'Government', value: 'government' },
];

export const CUSTOMER_STATUS_OPTIONS: { label: string; value: CustomerStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Blocked', value: 'blocked' },
];

export const ADDRESS_TYPES: { label: string; value: string }[] = [
  { label: 'Billing', value: 'billing' },
  { label: 'Shipping', value: 'shipping' },
  { label: 'Branch', value: 'branch' },
];

export const CONTACT_TYPES: { label: string; value: string }[] = [
  { label: 'Owner', value: 'owner' },
  { label: 'Accounts', value: 'accounts' },
  { label: 'Purchase', value: 'purchase' },
  { label: 'Sales', value: 'sales' },
];

export const DOC_TYPES: { label: string; value: string }[] = [
  { label: 'GST Certificate', value: 'gst_certificate' },
  { label: 'PAN', value: 'pan' },
  { label: 'Agreement', value: 'agreement' },
  { label: 'Shop License', value: 'shop_license' },
  { label: 'Other', value: 'other' },
];

export const CUSTOMER_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CUSTOMER_TYPES.map((t) => [t.value, t.label]),
);
