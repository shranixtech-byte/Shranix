import offlineDb from './offline-db';
class SyncEngine {
    isSyncing = false;
    listeners = new Set();
    retryDelay = 5000; // 5 seconds
    maxRetries = 5;
    async syncAll() {
        if (this.isSyncing) {
            return 'syncing';
        }
        this.isSyncing = true;
        this.notify({ state: 'syncing', progress: 0, total: 0 });
        try {
            const queueItems = await offlineDb.getQueueItems('pending');
            const total = queueItems.length;
            let completed = 0;
            let hasErrors = false;
            for (const item of queueItems) {
                try {
                    await offlineDb.updateQueueItem(item.id, { status: 'syncing' });
                    const response = await fetch(item.url, {
                        method: item.method,
                        headers: {
                            'Content-Type': 'application/json',
                            ...item.headers,
                        },
                        body: item.body ? JSON.stringify(item.body) : undefined,
                    });
                    if (response.ok) {
                        await offlineDb.removeFromQueue(item.id);
                        completed++;
                    }
                    else {
                        const retries = (item.retries || 0) + 1;
                        if (retries >= this.maxRetries) {
                            await offlineDb.updateQueueItem(item.id, { status: 'failed', retries });
                        }
                        else {
                            await offlineDb.updateQueueItem(item.id, { status: 'pending', retries });
                        }
                        hasErrors = true;
                    }
                }
                catch {
                    const retries = (item.retries || 0) + 1;
                    if (retries >= this.maxRetries) {
                        await offlineDb.updateQueueItem(item.id, { status: 'failed', retries });
                    }
                    else {
                        await offlineDb.updateQueueItem(item.id, { status: 'pending', retries });
                    }
                    hasErrors = true;
                }
                this.notify({ state: 'syncing', progress: completed, total });
            }
            // Sync pending uploads
            try {
                const uploads = await offlineDb.getPendingUploads();
                for (const upload of uploads) {
                    try {
                        const formData = new FormData();
                        const blob = dataURLToBlob(upload.data);
                        formData.append('file', blob, upload.fileName);
                        if (upload.metadata) {
                            formData.append('metadata', JSON.stringify(upload.metadata));
                        }
                        const response = await fetch(upload.endpoint, {
                            method: 'POST',
                            body: formData,
                        });
                        if (response.ok) {
                            await offlineDb.removePendingUpload(upload.id);
                        }
                    }
                    catch {
                        // Will retry next sync
                    }
                }
            }
            catch {
                // Upload sync best-effort
            }
            // Clear expired cache
            try {
                await offlineDb.clearExpiredCache();
            }
            catch {
                // Best-effort
            }
            const state = hasErrors ? 'error' : 'completed';
            this.notify({ state, progress: completed, total });
            return state;
        }
        catch (error) {
            this.notify({ state: 'error', progress: 0, total: 0, error: error.message });
            return 'error';
        }
        finally {
            this.isSyncing = false;
        }
    }
    async syncWithRetry() {
        const status = await this.syncAll();
        if (status === 'error') {
            // Retry with exponential backoff
            let delay = this.retryDelay;
            for (let i = 0; i < this.maxRetries; i++) {
                await this.sleep(delay);
                const retryStatus = await this.syncAll();
                if (retryStatus === 'completed') {
                    return;
                }
                delay *= 2;
            }
        }
    }
    async getQueueStats() {
        const all = await offlineDb.getQueueItems();
        return {
            pending: all.filter((i) => i.status === 'pending').length,
            syncing: all.filter((i) => i.status === 'syncing').length,
            failed: all.filter((i) => i.status === 'failed').length,
            total: all.length,
        };
    }
    async retryFailed() {
        const failedItems = await offlineDb.getQueueItems('failed');
        let retried = 0;
        for (const item of failedItems) {
            await offlineDb.updateQueueItem(item.id, { status: 'pending', retries: 0 });
            retried++;
        }
        return retried;
    }
    async clearAll() {
        await offlineDb.clearQueue();
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    get isActive() {
        return this.isSyncing;
    }
    notify(status) {
        this.listeners.forEach((listener) => listener(status));
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
function dataURLToBlob(dataURL) {
    const parts = dataURL.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const bytes = atob(parts[1]);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        arr[i] = bytes.charCodeAt(i);
    }
    return new Blob([arr], { type: mime });
}
export const syncEngine = new SyncEngine();
export default syncEngine;
//# sourceMappingURL=sync-engine.js.map