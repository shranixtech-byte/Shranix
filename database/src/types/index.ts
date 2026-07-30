export interface PaginationParams {
  page: number;
  pageSize: number;
  /** @deprecated Use EnterpriseQuery.search instead */
  search?: string;
  /** @deprecated Use EnterpriseQuery.sortBy instead */
  sortBy?: string;
  /** @deprecated Use EnterpriseQuery.sortOrder instead */
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

export interface FilterParams {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}

export type TransactionCallback<T> = (tx: unknown) => Promise<T>;

// ═════════════════════════════════════════════════════════
// ENTERPRISE REPOSITORY FOUNDATION
// ═════════════════════════════════════════════════════════
export type {
  FilterOperator,
  FilterCondition,
  SortConfig,
  EnterpriseQuery,
  getPageSize,
  getPage,
} from './enterprise';

