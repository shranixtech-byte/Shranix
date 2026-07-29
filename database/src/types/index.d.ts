export interface PaginationParams {
    page: number;
    pageSize: number;
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
//# sourceMappingURL=index.d.ts.map