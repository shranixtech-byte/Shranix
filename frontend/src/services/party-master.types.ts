// ═════════════════════════════════════════════════════════
// SHARED PARTY MASTER TYPES — reused by Customer & Supplier
// ═════════════════════════════════════════════════════════

export type PartyStatus = 'active' | 'inactive' | 'blocked';

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PartyWarnings {
  mobileDuplicates?: { id: string; name: string; code: string }[];
}

export interface PartyGroup {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface PartyCategory {
  id: string;
  name: string;
  description?: string | null;
  priority: number;
  isActive: boolean;
}

export interface PartyAddress {
  id: string;
  addressType: 'billing' | 'shipping' | 'head_office' | 'branch';
  address?: string | null;
  village?: string | null;
  taluka?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string;
  pincode?: string | null;
  isDefault: boolean;
}

export interface PartyContact {
  id: string;
  contactType: 'owner' | 'accounts' | 'purchase' | 'sales' | 'dispatch' | 'purchase_manager';
  name: string;
  mobile?: string | null;
  email?: string | null;
  designation?: string | null;
  isPrimary: boolean;
}

export interface PartyDocument {
  id: string;
  docType: string;
  fileName: string;
  fileUrl?: string | null;
  fileSize?: number;
  mimeType?: string | null;
  notes?: string | null;
  createdAt?: string;
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
