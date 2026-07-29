type SyncStatus = 'idle' | 'syncing' | 'completed' | 'error';
type SyncListener = (status: {
    state: SyncStatus;
    progress: number;
    total: number;
    error?: string;
}) => void;
declare class SyncEngine {
    private isSyncing;
    private listeners;
    private retryDelay;
    private maxRetries;
    syncAll(): Promise<SyncStatus>;
    syncWithRetry(): Promise<void>;
    getQueueStats(): Promise<{
        pending: number;
        syncing: number;
        failed: number;
        total: number;
    }>;
    retryFailed(): Promise<number>;
    clearAll(): Promise<void>;
    subscribe(listener: SyncListener): () => void;
    get isActive(): boolean;
    private notify;
    private sleep;
}
export declare const syncEngine: SyncEngine;
export default syncEngine;
//# sourceMappingURL=sync-engine.d.ts.map