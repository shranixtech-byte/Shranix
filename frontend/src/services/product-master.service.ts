import { apiRequest, apiUrl } from '@/services/api-client';
import { authService } from '@/services/auth.service';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export type ProductStatus = 'active' | 'inactive' | 'blocked' | 'discontinued';

export interface Paginated<T> {
  data: T[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface ProductRecord {
  id: string;
  name: string;
  shortName?: string | null;
  sku: string;
  productCode?: string | null;
  barcode?: string | null;
  qrCode?: string | null;
  description?: string | null;
  type?: string;
  categoryId?: string | null;
  subCategoryId?: string | null;
  brandId?: string | null;
  manufacturer?: string | null;
  manufacturerCode?: string | null;
  hsnCode?: string | null;
  sacCode?: string | null;
  gstRateId?: string | null;
  gstRate?: number | null;
  isTaxable?: boolean;
  taxPreference?: string;
  unitId?: string | null;
  purchaseUnitId?: string | null;
  salesUnitId?: string | null;
  stockUnitId?: string | null;
  unitName?: string | null;
  purchaseUnitName?: string | null;
  salesUnitName?: string | null;
  conversionFactor?: number;
  packSize?: string | null;
  mrp: number;
  purchaseRate: number;
  salesRate: number;
  wholesalePrice: number;
  dealerPrice: number;
  minSellingPrice: number;
  maxDiscountPercent: number;
  openingStock: number;
  openingRate?: number;
  openingValue?: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  hasBatch?: boolean;
  hasExpiry?: boolean;
  hasSerial?: boolean;
  trackInventory?: boolean;
  allowNegativeStock?: boolean;
  preferredSupplierId?: string | null;
  preferredSupplierName?: string | null;
  notes?: string | null;
  status: ProductStatus;
  isActive?: boolean;
  cropSeason?: string | null;
  variety?: string | null;
  organic?: boolean;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  categoryName?: string | null;
  subCategoryName?: string | null;
  brandName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  documents?: ProductDocument[];
  priceHistory?: PriceHistoryRow[];
  batches?: BatchRow[];
  stock?: { onHand: number; lowStock: boolean };
}

export interface ProductDocument {
  id: string;
  productId: string;
  docType: string;
  fileName: string;
  fileUrl?: string | null;
  fileSize?: number;
  mimeType?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface PriceHistoryRow {
  id: string;
  productId: string;
  priceType: string;
  oldValue: number;
  newValue: number;
  changedBy?: string | null;
  changedAt?: string;
  remarks?: string | null;
}

export interface BatchRow {
  id: string;
  batchNo: string;
  lotNo?: string | null;
  itemId: string;
  warehouseId?: string | null;
  status?: string;
  mfgDate?: string | null;
  expDate?: string | null;
  quantity: number;
  availableQuantity?: number;
  purchaseRate?: number;
  mrp?: number;
  sellingPrice?: number | null;
}

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  subCategoryId?: string;
  brandId?: string;
  type?: string;
  status?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface ProductDashboardData {
  summary: {
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    blockedProducts: number;
    discontinuedProducts: number;
    lowStockProducts: number;
    outOfStock: number;
    batchProducts: number;
    expiryNearProducts: number;
    expiredProducts: number;
    todayNewProducts: number;
  };
  topSelling: ProductRecord[];
  recentlyAdded: ProductRecord[];
  recentlyUpdated: ProductRecord[];
}

export interface FormMasters {
  categories: { id: string; name: string }[];
  subCategories: { id: string; name: string; categoryId?: string }[];
  brands: { id: string; name: string }[];
  units: { id: string; name: string; shortName?: string }[];
  gstRates: { id: string; rate: number }[];
  productTypes: { value: string; label: string }[];
  suppliers: { id: string; name: string }[];
}

// ═════════════════════════════════════════════════════════
// PRODUCTS
// ═════════════════════════════════════════════════════════

export async function listProducts(
  params: ProductListParams = {},
): Promise<Paginated<ProductRecord>> {
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
  if (params.categoryId) {
    query.set('categoryId', params.categoryId);
  }
  if (params.subCategoryId) {
    query.set('subCategoryId', params.subCategoryId);
  }
  if (params.brandId) {
    query.set('brandId', params.brandId);
  }
  if (params.type) {
    query.set('type', params.type);
  }
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.sortBy) {
    query.set('sortBy', params.sortBy);
  }
  if (params.sortDir) {
    query.set('sortDir', params.sortDir);
  }
  const qs = query.toString();
  return apiRequest<Paginated<ProductRecord>>(`/products${qs ? `?${qs}` : ''}`);
}

export async function getProduct(id: string): Promise<ProductRecord> {
  return apiRequest<ProductRecord>(`/products/${id}`);
}

export async function createProduct(data: Record<string, unknown>): Promise<ProductRecord> {
  return apiRequest<ProductRecord>('/products', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateProduct(
  id: string,
  data: Record<string, unknown>,
): Promise<ProductRecord> {
  return apiRequest<ProductRecord>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id: string): Promise<{ id: string; message: string }> {
  return apiRequest<{ id: string; message: string }>(`/products/${id}`, { method: 'DELETE' });
}

export async function setProductStatus(
  id: string,
  status: ProductStatus,
): Promise<{ id: string; status: string; message: string }> {
  return apiRequest(`/products/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function bulkProductStatus(ids: string[], status: ProductStatus) {
  return apiRequest<{
    updated: number;
    failed: number;
    results: { id: string; ok: boolean; error?: string }[];
  }>('/products/bulk-status', { method: 'POST', body: JSON.stringify({ ids, status }) });
}

export async function bulkDeleteProducts(ids: string[]) {
  return apiRequest<{
    deleted: number;
    failed: number;
    results: { id: string; ok: boolean; error?: string }[];
  }>('/products/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });
}

export async function getProductDashboard(): Promise<ProductDashboardData> {
  return apiRequest<ProductDashboardData>('/products/dashboard');
}

export async function searchProducts(
  q: string,
  status?: string,
): Promise<Paginated<ProductRecord>> {
  const query = new URLSearchParams({ q });
  if (status) {
    query.set('status', status);
  }
  return apiRequest<Paginated<ProductRecord>>(`/products/search?${query.toString()}`);
}

export async function getProductStock(id: string) {
  return apiRequest(`/products/${id}/stock`);
}

export async function getProductPrices(id: string) {
  return apiRequest(`/products/${id}/prices`);
}

export async function getProductBatches(id: string) {
  return apiRequest(`/products/${id}/batches`);
}

export async function getProductHistory(id: string) {
  return apiRequest(`/products/${id}/history`);
}

export async function getProductDeleteGuard(id: string) {
  return apiRequest<{
    canDelete: boolean;
    blocking: { label: string; rows: number }[];
    checks: { label: string; rows: number }[];
  }>(`/products/${id}/delete-guard`);
}

export async function getFormMasters(): Promise<FormMasters> {
  return apiRequest<FormMasters>('/products/masters');
}

export async function getProductReport(
  report: 'master' | 'price' | 'low-stock' | 'out-of-stock' | 'expiry',
) {
  return apiRequest(`/products/reports/${report}`);
}

export async function addProductDocument(data: {
  productId: string;
  docType: string;
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  notes?: string;
}) {
  return apiRequest('/products/documents', { method: 'POST', body: JSON.stringify(data) });
}

export async function removeProductDocument(docId: string) {
  return apiRequest(`/products/documents/${docId}`, { method: 'DELETE' });
}

// ═════════════════════════════════════════════════════════
// IMPORT / EXPORT (file download / upload helpers)
// ═════════════════════════════════════════════════════════

/** Download products as CSV / Excel / JSON. */
export async function downloadProducts(format: 'csv' | 'xlsx' | 'json'): Promise<void> {
  const url = apiUrl(`/products/export?format=${format}`);
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
  link.download = `products-export.${format === 'xlsx' ? 'xlsx' : format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

export async function importProducts(
  file: File,
  mode: 'insert' | 'upsert' = 'insert',
): Promise<{
  entity: string;
  mode: string;
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}> {
  const form = new FormData();
  form.append('file', file);
  return apiRequest(`/products/import?mode=${mode}`, { method: 'POST', body: form });
}

// ═════════════════════════════════════════════════════════
// SHARED UI HELPERS
// ═════════════════════════════════════════════════════════

export const PRODUCT_TYPE_OPTIONS = [
  { value: 'goods', label: 'Goods' },
  { value: 'service', label: 'Service' },
  { value: 'fertilizer', label: 'Fertilizer' },
  { value: 'seed', label: 'Seed' },
  { value: 'pesticide', label: 'Pesticide' },
  { value: 'insecticide', label: 'Insecticide' },
  { value: 'herbicide', label: 'Herbicide' },
  { value: 'fungicide', label: 'Fungicide' },
  { value: 'bio_product', label: 'Bio Product' },
  { value: 'agricultural_equipment', label: 'Agricultural Equipment' },
  { value: 'tools', label: 'Tools' },
  { value: 'other', label: 'Other' },
];

export const PRODUCT_STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'discontinued', label: 'Discontinued' },
];

export function productStatusBadge(status?: string): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700';
    case 'inactive':
      return 'bg-gray-100 text-gray-600';
    case 'blocked':
      return 'bg-rose-100 text-rose-700';
    case 'discontinued':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-emerald-100 text-emerald-700';
  }
}

export function formatMoney(v: number | string | null | undefined): string {
  const n = Number(v || 0);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(v: number | string | null | undefined): string {
  const n = Number(v || 0);
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
