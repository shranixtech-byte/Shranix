interface OfflineQueueItem {
    id?: number;
    url: string;
    method: string;
    headers: Record<string, string>;
    body: unknown;
    timestamp: number;
    retries: number;
    maxRetries: number;
    status: 'pending' | 'syncing' | 'failed';
}
declare class OfflineDatabaseService {
    private db;
    private initPromise;
    init(): Promise<IDBDatabase>;
    addToQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<number>;
    getQueueItems(status?: 'pending' | 'syncing' | 'failed'): Promise<OfflineQueueItem[]>;
    updateQueueItem(id: number, updates: Partial<OfflineQueueItem>): Promise<void>;
    removeFromQueue(id: number): Promise<void>;
    clearQueue(): Promise<void>;
    getQueueCount(): Promise<number>;
    cacheQuery(key: string, data: unknown, ttlMs?: number): Promise<void>;
    getCachedQuery<T = unknown>(key: string): Promise<T | null>;
    clearExpiredCache(): Promise<number>;
    private getCachedQueries;
    private deleteCachedQuery;
    cacheAuthData(key: string, data: unknown): Promise<void>;
    getCachedAuthData<T = unknown>(key: string): Promise<T | null>;
    clearAuthCache(): Promise<void>;
    addPendingUpload(upload: {
        fileName: string;
        fileType: string;
        data: string;
        endpoint: string;
        metadata?: Record<string, unknown>;
    }): Promise<number>;
    getPendingUploads(): Promise<Array<{
        id: number;
        fileName: string;
        fileType: string;
        data: string;
        endpoint: string;
        metadata?: Record<string, unknown>;
        timestamp: number;
        status: string;
        retries: number;
    }>>;
    removePendingUpload(id: number): Promise<void>;
}
export declare const offlineDb: OfflineDatabaseService;
export default offlineDb;
//# sourceMappingURL=offline-db.d.ts.map