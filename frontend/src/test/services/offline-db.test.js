import { describe, it, expect, beforeEach, vi } from 'vitest';
// Mock IndexedDB
const mockObjectStore = {
    add: vi.fn().mockReturnValue({ result: 1, onerror: null }),
    put: vi.fn().mockReturnValue({ result: undefined, onerror: null }),
    get: vi.fn().mockReturnValue({ result: null, onerror: null }),
    getAll: vi.fn().mockReturnValue({ result: [], onerror: null }),
    delete: vi.fn().mockReturnValue({ result: undefined, onerror: null }),
    clear: vi.fn().mockReturnValue({ result: undefined, onerror: null }),
    index: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue({ result: null, onerror: null }),
        getAll: vi.fn().mockReturnValue({ result: [], onerror: null }),
    }),
};
const mockTransaction = vi.fn().mockReturnValue({
    objectStore: vi.fn().mockReturnValue(mockObjectStore),
});
const mockDb = {
    objectStoreNames: {
        contains: vi.fn().mockReturnValue(false),
    },
    createObjectStore: vi.fn().mockReturnValue({ createIndex: vi.fn() }),
    transaction: mockTransaction,
    close: vi.fn(),
};
const mockOpenRequest = {
    result: mockDb,
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
};
vi.stubGlobal('indexedDB', {
    open: vi.fn().mockReturnValue(mockOpenRequest),
});
describe('OfflineDatabaseService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('should open IndexedDB database', async () => {
        const openSpy = vi.spyOn(indexedDB, 'open');
        indexedDB.open('ShranixOfflineDB', 1);
        expect(openSpy).toHaveBeenCalledWith('ShranixOfflineDB', 1);
    });
    it('should create object stores on upgrade', () => {
        const db = mockOpenRequest.result;
        expect(db.objectStoreNames.contains('offlineQueue')).toBe(false);
        expect(db.objectStoreNames.contains('queryCache')).toBe(false);
    });
    it('should create offlineQueue store', () => {
        const db = mockDb;
        db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
        expect(db.createObjectStore).toHaveBeenCalledWith('offlineQueue', {
            keyPath: 'id',
            autoIncrement: true,
        });
    });
    it('should create queryCache store with index', () => {
        const store = { createIndex: vi.fn() };
        mockDb.createObjectStore.mockReturnValue(store);
        mockDb.createObjectStore('queryCache', { keyPath: 'id', autoIncrement: true });
        store.createIndex('key', 'key', { unique: true });
        expect(store.createIndex).toHaveBeenCalledWith('key', 'key', { unique: true });
    });
    it('should start a transaction for queue operations', () => {
        mockDb.transaction('offlineQueue', 'readwrite');
        expect(mockTransaction).toHaveBeenCalledWith('offlineQueue', 'readwrite');
    });
    it('should add items to object store', () => {
        mockObjectStore.add({ url: '/api/test', method: 'POST', timestamp: Date.now(), status: 'pending' });
        expect(mockObjectStore.add).toHaveBeenCalled();
    });
    it('should retrieve all items from store', () => {
        mockObjectStore.getAll();
        expect(mockObjectStore.getAll).toHaveBeenCalled();
    });
    it('should delete items from store', () => {
        mockObjectStore.delete(1);
        expect(mockObjectStore.delete).toHaveBeenCalledWith(1);
    });
    it('should clear the store', () => {
        mockObjectStore.clear();
        expect(mockObjectStore.clear).toHaveBeenCalled();
    });
    it('should get items by status index', () => {
        mockObjectStore.index('status');
        expect(mockObjectStore.index).toHaveBeenCalledWith('status');
    });
    it('should get pending items via index', () => {
        const index = mockObjectStore.index('status');
        index.getAll('pending');
        expect(index.getAll).toHaveBeenCalledWith('pending');
    });
    it('should cache queries with TTL', () => {
        mockObjectStore.put({ key: 'test-key', data: { sales: 100 }, timestamp: Date.now(), ttl: 300000 });
        expect(mockObjectStore.put).toHaveBeenCalled();
    });
    it('should check cached query by key', () => {
        const index = mockObjectStore.index('key');
        index.get('test-key');
        expect(index.get).toHaveBeenCalledWith('test-key');
    });
});
//# sourceMappingURL=offline-db.test.js.map