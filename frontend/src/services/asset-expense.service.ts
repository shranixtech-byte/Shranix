import { apiRequest } from './api-client';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export interface Asset {
  id: string;
  assetCode: string;
  assetName: string;
  categoryId?: string | null;
  categoryName?: string | null;
  assetType?: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  barcode?: string | null;
  purchaseDate?: string | null;
  purchaseInvoiceId?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  purchaseCost?: number;
  additionalCost?: number;
  capitalizedCost?: number;
  warrantyStart?: string | null;
  warrantyEnd?: string | null;
  warrantyProvider?: string | null;
  usefulLifeYears?: number | null;
  depreciationMethod?: string;
  depreciationRate?: number | null;
  salvageValue?: number;
  currentBookValue?: number;
  accumulatedDepreciation?: number;
  location?: string | null;
  departmentId?: string | null;
  assignedEmployeeId?: string | null;
  assignedEmployeeName?: string | null;
  vehicleNumber?: string | null;
  registrationNumber?: string | null;
  insuranceExpiry?: string | null;
  pucExpiry?: string | null;
  status?: string;
  condition?: string;
  notes?: string | null;
  createdAt?: string;
  history?: AssetConditionEvent[];
  allocations?: AssetAllocation[];
  maintenance?: AssetMaintenance[];
  depreciation?: AssetDepreciation[];
  transfers?: AssetTransfer[];
  disposals?: AssetDisposal[];
}

export interface AssetConditionEvent {
  id: string;
  condition: string;
  changedAt?: string | null;
  remarks?: string | null;
}

export interface AssetAllocation {
  id: string;
  assetId: string;
  assignedToType: string;
  assignedToId: string;
  assignmentDate?: string | null;
  expectedReturnDate?: string | null;
  remarks?: string | null;
  status?: string;
  returnedAt?: string | null;
}

export interface AssetMaintenance {
  id: string;
  maintenanceNumber: string;
  assetId: string;
  assetCode?: string | null;
  assetName?: string | null;
  maintenanceType?: string;
  serviceDate?: string | null;
  nextServiceDate?: string | null;
  vendor?: string | null;
  description?: string | null;
  partsCost?: number;
  laborCost?: number;
  otherCost?: number;
  totalCost?: number;
  warrantyCovered?: boolean;
  status?: string;
}

export interface AssetDepreciation {
  id: string;
  period: string;
  amount: number;
  bookValueBefore: number;
  bookValueAfter: number;
  postedAt?: string | null;
}

export interface AssetTransfer {
  id: string;
  transferNumber: string;
  transferDate?: string | null;
  toType?: string;
  toId?: string;
  reason?: string | null;
  status?: string;
}

export interface AssetDisposal {
  id: string;
  disposalNumber: string;
  disposalDate?: string | null;
  reason?: string | null;
  disposalType?: string;
  saleValue: number;
  bookValue: number;
  gainLoss: number;
  status?: string;
}

export interface AssetCategory {
  id: string;
  categoryName: string;
  assetType?: string;
  status?: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  expenseDate?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  vendorId?: string | null;
  employeeId?: string | null;
  employeeName?: string | null;
  departmentId?: string | null;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMode?: string | null;
  paymentReference?: string | null;
  reference?: string | null;
  description?: string | null;
  status?: string;
  glEntryId?: string | null;
  createdAt?: string;
}

export interface ExpenseCategory {
  id: string;
  categoryName: string;
  status?: string;
}

export interface RecurringExpense {
  id: string;
  recurringNumber: string;
  categoryId?: string | null;
  amount: number;
  taxAmount: number;
  frequency: string;
  intervalDays?: number | null;
  nextDueDate?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ═════════════════════════════════════════════════════════
// ASSETS
// ═════════════════════════════════════════════════════════

export const assetApi = {
  dashboard: () => apiRequest<any>('/assets/dashboard'),
  reports: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params || {}).toString();
    return apiRequest<any>(`/assets/reports${q ? `?${q}` : ''}`);
  },
  nextCode: () => apiRequest<{ nextCode: string }>('/assets/next-code'),
  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '') {
        q.set(k, String(v));
      }
    });
    const qs = q.toString();
    return apiRequest<Paginated<Asset>>(`/assets${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => apiRequest<Asset>(`/assets/${id}`),
  create: (data: Partial<Asset>) =>
    apiRequest<Asset>('/assets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Asset>) =>
    apiRequest<Asset>(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => apiRequest<{ deleted: boolean }>(`/assets/${id}`, { method: 'DELETE' }),
  assign: (
    id: string,
    data: {
      assignedToType: string;
      assignedToId: string;
      assignmentDate?: string;
      expectedReturnDate?: string;
      remarks?: string;
    },
  ) =>
    apiRequest<AssetAllocation>(`/assets/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  returnAsset: (id: string, allocationId: string) =>
    apiRequest<{ returned: boolean }>(`/assets/${id}/return`, {
      method: 'POST',
      body: JSON.stringify({ allocationId }),
    }),
  transfer: (
    id: string,
    data: { toType: string; toId: string; transferDate?: string; reason?: string },
  ) =>
    apiRequest<AssetTransfer>(`/assets/${id}/transfer`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  approveTransfer: (transferId: string) =>
    apiRequest<{ transferred: boolean }>(`/assets/transfers/${transferId}/approve`, {
      method: 'POST',
    }),
  cancelTransfer: (transferId: string) =>
    apiRequest<{ cancelled: boolean }>(`/assets/transfers/${transferId}/cancel`, {
      method: 'POST',
    }),
  depreciate: (id: string, period: string) =>
    apiRequest<any>(`/assets/${id}/depreciate`, {
      method: 'POST',
      body: JSON.stringify({ period }),
    }),
  dispose: (
    id: string,
    data: {
      disposalType?: string;
      disposalDate?: string;
      reason?: string;
      saleValue?: number;
      disposalCost?: number;
    },
  ) =>
    apiRequest<AssetDisposal>(`/assets/${id}/dispose`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const assetMaintenanceApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '') {
        q.set(k, String(v));
      }
    });
    const qs = q.toString();
    return apiRequest<Paginated<AssetMaintenance>>(`/asset-maintenance${qs ? `?${qs}` : ''}`);
  },
  serviceSchedule: (horizonDays?: number, status?: string) =>
    apiRequest<{ data: any[]; total: number }>(
      `/asset-maintenance/service-schedule${horizonDays ? `?horizonDays=${horizonDays}` : ''}${status ? `${horizonDays ? '&' : '?'}status=${status}` : ''}`,
    ),
  create: (data: Partial<AssetMaintenance>) =>
    apiRequest<AssetMaintenance>('/asset-maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<AssetMaintenance>) =>
    apiRequest<AssetMaintenance>(`/asset-maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const assetCategoryApi = {
  list: () => apiRequest<AssetCategory[]>('/asset-categories'),
  create: (data: Partial<AssetCategory>) =>
    apiRequest<AssetCategory>('/asset-categories', { method: 'POST', body: JSON.stringify(data) }),
};

// ═════════════════════════════════════════════════════════
// EXPENSES
// ═════════════════════════════════════════════════════════

export const expenseApi = {
  dashboard: () => apiRequest<any>('/expenses/dashboard'),
  reports: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params || {}).toString();
    return apiRequest<any>(`/expenses/reports${q ? `?${q}` : ''}`);
  },
  nextNumber: () => apiRequest<{ nextNumber: string }>('/expenses/next-number'),
  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '') {
        q.set(k, String(v));
      }
    });
    const qs = q.toString();
    return apiRequest<Paginated<Expense>>(`/expenses${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => apiRequest<Expense>(`/expenses/${id}`),
  create: (data: Partial<Expense>) =>
    apiRequest<Expense>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Expense>) =>
    apiRequest<Expense>(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => apiRequest<{ deleted: boolean }>(`/expenses/${id}`, { method: 'DELETE' }),
  submit: (id: string) =>
    apiRequest<{ submitted: boolean }>(`/expenses/${id}/submit`, { method: 'POST' }),
  approve: (id: string, remarks?: string) =>
    apiRequest<{ approved: boolean }>(`/expenses/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    }),
  reject: (id: string, remarks?: string) =>
    apiRequest<{ rejected: boolean }>(`/expenses/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    }),
  pay: (id: string, data: { paymentMode?: string; paymentReference?: string; paidAt?: string }) =>
    apiRequest<{ paid: boolean; glEntryId?: string | null }>(`/expenses/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  categories: () => apiRequest<ExpenseCategory[]>('/expenses/categories'),
  createCategory: (data: Partial<ExpenseCategory>) =>
    apiRequest<ExpenseCategory>('/expenses/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  recurring: () => apiRequest<RecurringExpense[]>('/expenses/recurring'),
  createRecurring: (data: Partial<RecurringExpense>) =>
    apiRequest<RecurringExpense>('/expenses/recurring', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  generateRecurring: () =>
    apiRequest<{ generated: number; skipped: string[]; checked: number }>(
      '/expenses/recurring/generate',
      { method: 'POST' },
    ),
};
