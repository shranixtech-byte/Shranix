const DB_NAME = 'ShranixOfflineDB';
const DB_VERSION = 1;
class OfflineDatabaseService {
    db = null;
    initPromise = null;
    async init() {
        if (this.db) {
            return this.db;
        }
        if (this.initPromise) {
            return this.initPromise;
        }
        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('offlineQueue')) {
                    const queueStore = db.createObjectStore('offlineQueue', {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                    queueStore.createIndex('status', 'status', { unique: false });
                    queueStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                if (!db.objectStoreNames.contains('queryCache')) {
                    const cacheStore = db.createObjectStore('queryCache', {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                    cacheStore.createIndex('key', 'key', { unique: true });
                    cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                if (!db.objectStoreNames.contains('offlineAuth')) {
                    db.createObjectStore('offlineAuth', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('pendingUploads')) {
                    const uploadStore = db.createObjectStore('pendingUploads', {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                    uploadStore.createIndex('status', 'status', { unique: false });
                }
            };
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            request.onerror = () => {
                reject(request.error);
            };
        });
        return this.initPromise;
    }
    // ─── Queue Operations ───────────────────
    async addToQueue(item) {
        const connection = await this.init();
        return new Promise((resolve, _reject) => {
            const tx = connection.transaction('offlineQueue', 'readwrite');
            const store = tx.objectStore('offlineQueue');
            const request = store.add({
                ...item,
                timestamp: Date.now(),
                retries: 0,
                status: 'pending',
            });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => _reject(request.error);
        });
    }
    async getQueueItems(status) {
        const connection = await this.init();
        return new Promise((resolve, _reject) => {
            const tx = connection.transaction('offlineQueue', 'readonly');
            const store = tx.objectStore('offlineQueue');
            let request;
            if (status) {
                const index = store.index('status');
                request = index.getAll(status);
            }
            else {
                request = store.getAll();
            }
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => _reject(request.error);
        });
    }
    async updateQueueItem(id, updates) {
        const connection = await this.init();
        return new Promise((resolve, _reject) => {
            const tx = connection.transaction('offlineQueue', 'readwrite');
            const store = tx.objectStore('offlineQueue');
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const item = getRequest.result;
                if (item) {
                    Object.assign(item, updates);
                    store.put(item);
                }
                resolve();
            };
            getRequest.onerror = () => _reject(getRequest.error);
        });
    }
    async removeFromQueue(id) {
        const connection = await this.init();
        return new Promise((resolve, _reject) => {
            const tx = connection.transaction('offlineQueue', 'readwrite');
            const store = tx.objectStore('offlineQueue');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => _reject(request.error);
        });
    }
    async clearQueue() {
        const connection = await this.init();
        return new Promise((resolve, _reject) => {
            const tx = connection.transaction('offlineQueue', 'readwrite');
            const store = tx.objectStore('offlineQueue');
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => _reject(request.error);
        });
    }
    async getQueueCount() {
        const items = await this.getQueueItems();
        return items.length;
    }
    // ─── Query Cache Operations ─────────────
    async cacheQuery(key, data, ttlMs = 300000) {
        const connection = await this.init();
        return new Promise((resolve, _reject) => {
            const tx = connection.transaction('queryCache', 'readwrite');
            const store = tx.objectStore('queryCache');
            const index = store.index('key');
            const getRequest = index.get(key);
            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                const entry = {
                    ...(existing || {}),
                    key,
                    data,
                    timestamp: Date.now(),
                    ttl: ttlMs,
                };
                store.put(entry);
                resolve();
            };
            getRequest.onerror = () => _reject(getRequest.error);
        });
    }
    async getCachedQuery(key) {
        const connection = await this.init();
        return new Promise((resolve, _reject) => {
            const tx = connection.transaction('queryCache', 'readonly');
            const store = tx.objectStore('queryCache');
            const index = store.index('key');
            const request = index.get(key);
            request.onsuccess = () => {
                const entry = request.result;
                if (entry && Date.now() - entry.timestamp < entry.ttl) {
                    resolve(entry.data);
                }
                else {
                    if (entry) {
                        // Expired - delete it
                        const deleteTx = connection.transaction('queryCache', 'readwrite');
                        deleteTx.objectStore('queryCache').delete(entry.id);
                    }
                    resolve(null);
                }
            };
            request.onerror = () => _reject(request.error);
        });
    }
    async clearExpiredCache() {
        await this.init();
        const items = await this.getCachedQueries();
        let cleared = 0;
        for (const item of items) {
            if (Date.now() - item.timestamp > item.ttl) {
                await this.deleteCachedQuery(item.id);
                cleared++;
            }
        }
        return cleared;
    }
    async getCachedQueries() {
        const connection = await this.init();
        return new Promise((resolve, _reject) => {
            const tx = connection.transaction('queryCache', 'readonly');
            const store = tx.objectStore('queryCache');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => _reject(request.error);
        });
    }
    async deleteCachedQuery(id) {
        const connection = await this.init();
        return new Promise((resolve, _reject) => {
            const tx = connection.transaction('queryCache', 'readwrite');
            const store = tx.objectStore('queryCache');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => _reject(request.error);
        });
    }
    // ─── Auth Cache ─────────────────────────
    async cacheAuthData(key, data) {
        const connection = await this.init();
        return new Promise((resolve, _reject) => {
            const tx = connection.transaction('offlineAuth', 'readwrite');
            const store = tx.objectStore('offlineAuth');
            store.put({ id: key, data, timestamp: Date.now() });
            resolve();
        });
    }
    async getCachedAuthData(key) {
        const connection = await this.init();
        return new Promise((resolve, _reject) => {
            const tx = connection.transaction('offlineAuth', 'readonly');
            const store = tx.objectStore('offlineAuth');
            const request = store.get(key);
            request.onsuccess = () => {
                const entry = request.result;
                resolve(entry?.data || null);
            };
            request.onerror = () => _reject(request.error);
        });
    }
    async clearAuthCache() {
        const connection = await this.init();
        return new Promise((resolve, _reject) => {
            const tx = connection.transaction('offlineAuth', 'readwrite');
            const store = tx.objectStore('offlineAuth');
            store.clear();
            resolve();
        });
    }
    // ─── Pending Uploads ────────────────────
    async addPendingUpload(upload) {
        const connection = await this.init();
        return new Promise((resolve, _reject) => {
            const tx = connection.transaction('pendingUploads', 'readwrite');
            const store = tx.objectStore('pendingUploads');
            const request = store.add({
                ...upload,
                timestamp: Date.now(),
                status: 'pending',
                retries: 0,
            });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => _reject(request.error);
        });
    }
    async getPendingUploads() {
        const connection = await this.init();
        return new Promise((resolve, _reject) => {
            const tx = connection.transaction('pendingUploads', 'readonly');
            const store = tx.objectStore('pendingUploads');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => _reject(request.error);
        });
    }
    async removePendingUpload(id) {
        const connection = await this.init();
        return new Promise((resolve, _reject) => {
            const tx = connection.transaction('pendingUploads', 'readwrite');
            const store = tx.objectStore('pendingUploads');
            store.delete(id);
            resolve();
        });
    }
}
export const offlineDb = new OfflineDatabaseService();
export default offlineDb;
//# sourceMappingURL=offline-db.js.map