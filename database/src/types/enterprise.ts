// ═════════════════════════════════════════════════════════
// ENTERPRISE REPOSITORY FOUNDATION — Query Types
// ═════════════════════════════════════════════════════════

/**
 * Filter operator for database-level WHERE clause construction.
 */
export type FilterOperator =
  | 'eq'        // equals
  | 'neq'       // not equals
  | 'gt'        // greater than
  | 'gte'       // greater than or equal
  | 'lt'        // less than
  | 'lte'       // less than or equal
  | 'between'   // between two values
  | 'like'      // contains (SQL LIKE %value%)
  | 'startsWith' // starts with (SQL LIKE value%)
  | 'endsWith'  // ends with (SQL LIKE %value)
  | 'in'        // in a list of values
  | 'notIn';    // not in a list of values

/**
 * A single filter condition pushed to database level.
 */
export interface FilterCondition {
  /** The field/column name to filter on */
  field: string;
  /** The comparison operator */
  operator: FilterOperator;
  /** The value(s) to compare against. Use [min, max] for 'between'. */
  value: unknown;
}

/**
 * Sort configuration for ORDER BY clause.
 */
export interface SortConfig {
  /** The field/column name to sort by */
  field: string;
  /** Sort direction */
  order: 'asc' | 'desc';
}

/**
 * Enterprise-grade query parameters for findAll operations.
 *
 * All fields are optional — existing callers that only pass
 * `{ page, pageSize }` continue to work unchanged.
 *
 * Examples:
 *
 * ```ts
 * // Basic pagination
 * repo.findAll({ page: 1, pageSize: 50 })
 *
 * // Search on specific fields
 * repo.findAll({ search: 'INV-001', searchFields: ['invoiceNumber'] })
 *
 * // Date range + status filter
 * repo.findAll({
 *   filters: [
 *     { field: 'invoiceDate', operator: 'gte', value: '2024-04-01' },
 *     { field: 'invoiceDate', operator: 'lte', value: '2024-04-30' },
 *     { field: 'status', operator: 'eq', value: 'posted' },
 *   ],
 * })
 *
 * // Customer filter + sort
 * repo.findAll({
 *   filters: [{ field: 'customerId', operator: 'eq', value: 'cust_123' }],
 *   sortBy: 'invoiceDate',
 *   sortOrder: 'desc',
 * })
 * ```
 */
export interface EnterpriseQuery {
  /** Page number (1-indexed) */
  page?: number;
  /** Number of records per page */
  pageSize?: number;
  /** Full-text search string */
  search?: string;
  /** Fields to apply the search against (LIKE on each, OR'd) */
  searchFields?: string[];
  /** Primary sort field */
  sortBy?: string;
  /** Primary sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Multiple sort configs (used alongside or instead of sortBy) */
  sorts?: SortConfig[];
  /** Database-level filter conditions (AND'd together) */
  filters?: FilterCondition[];
  /** Active status filter (common across masters) */
  isActive?: boolean;
  /**
   * Column projection — only fetch these fields.
   * When specified, the database only returns the listed columns.
   * Useful for dashboards and lists where full row objects are unnecessary.
   * Example: ['id', 'invoiceNumber', 'grandTotal', 'invoiceDate']
   */
  fields?: string[];
}

/**
 * Returns the effective page size from an EnterpriseQuery.
 */
export function getPageSize(query?: EnterpriseQuery): number {
  return query?.pageSize ?? 50;
}

/**
 * Returns the effective page number from an EnterpriseQuery.
 */
export function getPage(query?: EnterpriseQuery): number {
  return query?.page ?? 1;
}
