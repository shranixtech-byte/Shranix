// ── Common API Types ────────────────────────────────────
export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  timestamp: string;
  path: string;
  method: string;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  code: string;
  timestamp: string;
  path: string;
  method: string;
  errors?: Record<string, string[]>;
  stack?: string;
}

// ── Pagination Types ────────────────────────────────────
export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ── ID Types ────────────────────────────────────────────
export type UUID = string;
export type EntityId = UUID;

// ── Date Range Type ─────────────────────────────────────
export interface DateRange {
  start: string;
  end: string;
}
