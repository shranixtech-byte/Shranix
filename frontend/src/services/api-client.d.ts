declare function resolveUrl(path: string): string;
/** Shared authenticated API client with CSRF protection and a one-time refresh retry. */
export declare function apiRequest<T>(path: string, options?: RequestInit, retried?: boolean): Promise<T>;
export declare const apiUrl: typeof resolveUrl;
export {};
//# sourceMappingURL=api-client.d.ts.map