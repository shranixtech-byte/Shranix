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

interface CachedQuery {
  id?: number;
  key: string;
  data: unknown;
  timestamp: number;
  ttl: number;
}

const DB_NAME = 'ShranixOfflineDB';
const DB_VERSION = 1;

class OfflineDatabaseService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) {return this.db;}
    if (this.initPromise) {return this.initPromise;}

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

  async addToQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<number> {
    const connection = await this.init();
    return new Promise((resolve, _reject) => {
      const tx = connection.transaction('offlineQueue', 'readwrite');
      const store = tx.objectStore('offlineQueue');
      const request = store.add({
        ...item,
        timestamp: Date.now(),
        retries: 0,
        status: 'pending' as const,
      });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => _reject(request.error);
    });
  }

  async getQueueItems(status?: 'pending' | 'syncing' | 'failed'): Promise<OfflineQueueItem[]> {
    const connection = await this.init();
    return new Promise((resolve, _reject) => {
      const tx = connection.transaction('offlineQueue', 'readonly');
      const store = tx.objectStore('offlineQueue');
      let request: IDBRequest<OfflineQueueItem[]>;

      if (status) {
        const index = store.index('status');
        request = index.getAll(status) as IDBRequest<OfflineQueueItem[]>;
      } else {
        request = store.getAll() as IDBRequest<OfflineQueueItem[]>;
      }

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => _reject(request.error);
    });
  }

  async updateQueueItem(id: number, updates: Partial<OfflineQueueItem>): Promise<void> {
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

  async removeFromQueue(id: number): Promise<void> {
    const connection = await this.init();
    return new Promise((resolve, _reject) => {
      const tx = connection.transaction('offlineQueue', 'readwrite');
      const store = tx.objectStore('offlineQueue');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => _reject(request.error);
    });
  }

  async clearQueue(): Promise<void> {
    const connection = await this.init();
    return new Promise((resolve, _reject) => {
      const tx = connection.transaction('offlineQueue', 'readwrite');
      const store = tx.objectStore('offlineQueue');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => _reject(request.error);
    });
  }

  async getQueueCount(): Promise<number> {
    const items = await this.getQueueItems();
    return items.length;
  }

  // ─── Query Cache Operations ─────────────

  async cacheQuery(key: string, data: unknown, ttlMs = 300000): Promise<void> {
    const connection = await this.init();
    return new Promise((resolve, _reject) => {
      const tx = connection.transaction('queryCache', 'readwrite');
      const store = tx.objectStore('queryCache');
      const index = store.index('key');
      const getRequest = index.get(key);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        const entry: CachedQuery = {
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

  async getCachedQuery<T = unknown>(key: string): Promise<T | null> {
    const connection = await this.init();
    return new Promise((resolve, _reject) => {
      const tx = connection.transaction('queryCache', 'readonly');
      const store = tx.objectStore('queryCache');
      const index = store.index('key');
      const request = index.get(key);

      request.onsuccess = () => {
        const entry = request.result as CachedQuery | undefined;
        if (entry && Date.now() - entry.timestamp < entry.ttl) {
          resolve(entry.data as T);
        } else {
          if (entry) {
            // Expired - delete it
            const deleteTx = connection.transaction('queryCache', 'readwrite');
            deleteTx.objectStore('queryCache').delete(entry.id!);
          }
          resolve(null);
        }
      };

      request.onerror = () => _reject(request.error);
    });
  }

  async clearExpiredCache(): Promise<number> {
    await this.init();
    const items = await this.getCachedQueries();
    let cleared = 0;

    for (const item of items) {
      if (Date.now() - item.timestamp > item.ttl) {
        await this.deleteCachedQuery(item.id!);
        cleared++;
      }
    }

    return cleared;
  }

  private async getCachedQueries(): Promise<CachedQuery[]> {
    const connection = await this.init();
    return new Promise((resolve, _reject) => {
      const tx = connection.transaction('queryCache', 'readonly');
      const store = tx.objectStore('queryCache');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => _reject(request.error);
    });
  }

  private async deleteCachedQuery(id: number): Promise<void> {
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

  async cacheAuthData(key: string, data: unknown): Promise<void> {
    const connection = await this.init();
    return new Promise((resolve, _reject) => {
      const tx = connection.transaction('offlineAuth', 'readwrite');
      const store = tx.objectStore('offlineAuth');
      store.put({ id: key, data, timestamp: Date.now() });
      resolve();
    });
  }

  async getCachedAuthData<T = unknown>(key: string): Promise<T | null> {
    const connection = await this.init();
    return new Promise((resolve, _reject) => {
      const tx = connection.transaction('offlineAuth', 'readonly');
      const store = tx.objectStore('offlineAuth');
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as { data: T } | undefined;
        resolve(entry?.data || null);
      };

      request.onerror = () => _reject(request.error);
    });
  }

  async clearAuthCache(): Promise<void> {
    const connection = await this.init();
    return new Promise((resolve, _reject) => {
      const tx = connection.transaction('offlineAuth', 'readwrite');
      const store = tx.objectStore('offlineAuth');
      store.clear();
      resolve();
    });
  }

  // ─── Pending Uploads ────────────────────

  async addPendingUpload(upload: {
    fileName: string;
    fileType: string;
    data: string;
    endpoint: string;
    metadata?: Record<string, unknown>;
  }): Promise<number> {
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
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => _reject(request.error);
    });
  }

  async getPendingUploads(): Promise<Array<{ id: number; fileName: string; fileType: string; data: string; endpoint: string; metadata?: Record<string, unknown>; timestamp: number; status: string; retries: number }>> {
    const connection = await this.init();
    return new Promise((resolve, _reject) => {
      const tx = connection.transaction('pendingUploads', 'readonly');
      const store = tx.objectStore('pendingUploads');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => _reject(request.error);
    });
  }

  async removePendingUpload(id: number): Promise<void> {
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
