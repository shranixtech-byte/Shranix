import type { EntityId, DateRange } from '../types';

// ── Base Entity ─────────────────────────────────────────
export interface BaseEntity {
  id: EntityId;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  isDeleted?: boolean;
  createdBy?: EntityId | null;
  updatedBy?: EntityId | null;
}

// ── Address ─────────────────────────────────────────────
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

// ── Contact ─────────────────────────────────────────────
export interface ContactInfo {
  email: string;
  phone: string;
  mobile?: string;
  alternatePhone?: string;
}

// ── Select Option ───────────────────────────────────────
export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

// ── Breadcrumb ──────────────────────────────────────────
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// ── Menu Item ───────────────────────────────────────────
export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  href?: string;
  children?: MenuItem[];
  divider?: boolean;
  permission?: string;
}

// ── Table Column ────────────────────────────────────────
export interface TableColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
}

// ── Filter Config ───────────────────────────────────────
export interface FilterConfig {
  field: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'boolean';
  options?: SelectOption[];
  defaultValue?: unknown;
}

// ── Form Field ──────────────────────────────────────────
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'date' | 'textarea' | 'checkbox' | 'radio';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: SelectOption[];
  validation?: Record<string, unknown>;
}

// ── Report Config ───────────────────────────────────────
export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: 'summary' | 'detailed' | 'analytics' | 'financial';
  filters?: FilterConfig[];
  dateRange?: DateRange;
  format?: 'pdf' | 'excel' | 'csv';
}
