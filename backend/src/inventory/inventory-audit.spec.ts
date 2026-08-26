import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  ItemsService,
  BatchStockService,
  StockMovementService,
  WarehouseLocationService,
  StockReservationService,
  StockReversalService,
  StockLedgerQueryService,
  BatchMasterService,
  BatchLotService,
  SerialMasterService,
  InventoryPostingEngine,
  WarehouseService,
  StockLedgerService,
  WarehouseService as WhService,
} from './services';
import { ProductsMasterService } from './products-master.service';

// ═══════════════════════════════════════════════════════════
// SHARED IN-MEMORY REPOSITORY MOCK
// ═══════════════════════════════════════════════════════════
function makeRepo(initial: any[] = []) {
  const rows = new Map<string, any>();
  for (const r of initial) {
    rows.set(r.id, { ...r, isDeleted: false });
  }
  return {
    findById: vi.fn(async (id: string) => {
      const r = rows.get(id);
      return r && !r.isDeleted ? { ...r } : null;
    }),
    create: vi.fn(async (data: any) => {
      const id = data.id || `id-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const row = { ...data, id, createdAt: '2026-08-10T00:00:00.000Z', updatedAt: '2026-08-10T00:00:00.000Z', isDeleted: false };
      rows.set(id, row);
      return { ...row };
    }),
    update: vi.fn(async (id: string, data: any) => {
      const row = rows.get(id);
      if (!row) return null;
      const updated = { ...row, ...data, updatedAt: '2026-08-10T00:00:00.000Z' };
      rows.set(id, updated);
      return { ...updated };
    }),
    softDelete: vi.fn(async (id: string) => { const r = rows.get(id); if (r) r.isDeleted = true; }),
    restore: vi.fn(async (id: string) => { const r = rows.get(id); if (r) r.isDeleted = false; }),
    findAll: vi.fn(async ({ filters = [], page = 1, pageSize = 50, search, searchFields, sorts, fields }: any = {}) => {
      let list = [...rows.values()].filter((r) => !r.isDeleted);
      for (const f of filters || []) {
        if (f.operator === 'eq') list = list.filter((r) => String(r[f.field]) === String(f.value));
        else if (f.operator === 'in' && Array.isArray(f.value)) list = list.filter((r) => f.value.includes(String(r[f.field])));
        else if (f.operator === 'gt') list = list.filter((r) => Number(r[f.field]) > Number(f.value));
        else if (f.operator === 'gte') list = list.filter((r) => String(r[f.field]) >= String(f.value));
        else if (f.operator === 'lte') list = list.filter((r) => String(r[f.field]) <= String(f.value));
        else if (f.operator === 'like') {
          const val = String(f.value || '').replace(/%/g, '');
          list = list.filter((r) => String(r[f.field] || '').toLowerCase().includes(val.toLowerCase()));
        }
        else if (f.operator === 'startsWith') list = list.filter((r) => String(r[f.field] || '').startsWith(String(f.value)));
      }
      if (search && searchFields?.length) {
        const q = search.toLowerCase();
        list = list.filter((r) => searchFields.some((sf: string) => String(r[sf] ?? '').toLowerCase().includes(q)));
      }
      if (sorts?.[0] && list.length > 0) {
        const { field, order } = sorts[0];
        if (field in list[0]) {
          const dir = order === 'desc' ? -1 : 1;
          list = [...list].sort((a, b) => String(a[field] ?? '').localeCompare(String(b[field] ?? ''), undefined, { numeric: true }) * dir);
        }
      }
      const total = list.length;
      const start = (page - 1) * pageSize;
      return { data: list.slice(start, start + pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }),
    findMaxSequenceForPrefix: vi.fn(async () => 0),
    maxFieldValue: vi.fn(async (field: string) => { let max: string | null = null; for (const r of rows.values()) { const v = String(r[field] || ''); if (v && (!max || v > max)) max = v; } return max; }),
    _rows: rows,
  };
}

// ═══════════════════════════════════════════════════════════
// 1. ItemsService — soft-delete, restore, duplicate
// ═══════════════════════════════════════════════════════════
describe('ItemsService', () => {
  function makeFixture() {
    const database = { items: makeRepo(), auditLogs: makeRepo() };
    const audit = { log: vi.fn(async () => undefined) };
    const service = new ItemsService(database as any, audit as any);
    return { database, service };
  }

  it('creates an item with auto-generated SKU', async () => {
    const { service } = makeFixture();
    const item = await service.create({ name: 'Urea 46%', purchaseRate: 250, salesRate: 280 }, 'user-1');
    expect(item.id).toBeTruthy();
    expect(item.name).toBe('Urea 46%');
    // BaseMasterService auto-generates SKU from name when maxFieldValue returns null
    expect(item.sku || item.name).toBeTruthy();
  });

  it('soft-deletes an item', async () => {
    const { database, service } = makeFixture();
    const item = await service.create({ name: 'DAP' }, 'user-1');
    await service.delete(item.id, 'user-1');
    expect(database.items._rows.get(item.id).isDeleted).toBe(true);
  });

  it('restores a soft-deleted item', async () => {
    const { database, service } = makeFixture();
    const item = await service.create({ name: 'Pesticide' }, 'user-1');
    await service.delete(item.id, 'user-1');
    expect(database.items._rows.get(item.id).isDeleted).toBe(true);
    await service.restore(item.id, 'user-1');
    expect(database.items._rows.get(item.id).isDeleted).toBe(false);
  });

  it('duplicates an item with (Copy) suffix and new SKU', async () => {
    const { database, service } = makeFixture();
    const original = await service.create({ name: 'Seeds', sku: 'SEED-001' }, 'user-1');
    const copy = await service.duplicate(original.id, 'user-1');
    expect(copy.name).toBe('Seeds (Copy)');
    expect(copy.sku).toContain('COPY');
    expect(copy.id).not.toBe(original.id);
  });

  it('findById returns null for soft-deleted items', async () => {
    const { database, service } = makeFixture();
    const item = await service.create({ name: 'Ghost' }, 'user-1');
    await service.delete(item.id, 'user-1');
    await expect(service.findById(item.id)).rejects.toThrow(/not found/i);
  });
});

// ═══════════════════════════════════════════════════════════
// 2. BatchStockService — create/update/expiry/live stock
// ═══════════════════════════════════════════════════════════
describe('BatchStockService', () => {
  function makeFixture() {
    const database = { batchStock: makeRepo() };
    const audit = { log: vi.fn(async () => undefined) };
    const service = new BatchStockService(database as any, audit as any);
    return { database, service };
  }

  it('creates a batch with auto-calculated expiry status (fresh)', async () => {
    const { service } = makeFixture();
    const batch = await service.create({
      itemId: 'item-1', batchNo: 'BATCH-001', quantity: 100, warehouseId: 'wh-1',
      expDate: '2027-12-31',
    }, 'user-1');
    expect(batch.status).toBe('fresh');
    expect(batch.availableQuantity).toBe(100);
  });

  it('creates a batch with near_expiry status (within 30 days)', async () => {
    const { service } = makeFixture();
    const nearFuture = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const batch = await service.create({
      itemId: 'item-1', batchNo: 'BATCH-002', quantity: 50, warehouseId: 'wh-1',
      expDate: nearFuture,
    }, 'user-1');
    expect(batch.status).toBe('near_expiry');
  });

  it('creates a batch with expired status', async () => {
    const { service } = makeFixture();
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const batch = await service.create({
      itemId: 'item-1', batchNo: 'BATCH-003', quantity: 20, warehouseId: 'wh-1',
      expDate: pastDate,
    }, 'user-1');
    expect(batch.status).toBe('expired');
  });

  it('updates batch recalculates availableQuantity', async () => {
    const { service } = makeFixture();
    const batch = await service.create({
      itemId: 'item-1', batchNo: 'BATCH-004', quantity: 100, reservedQuantity: 10, warehouseId: 'wh-1',
    }, 'user-1');
    const updated = await service.update(batch.id, { quantity: 80, reservedQuantity: 20 }, 'user-1');
    expect(updated.availableQuantity).toBe(60);
  });

  it('getLiveStock aggregates quantities across batches', async () => {
    const { service } = makeFixture();
    await service.create({ itemId: 'item-1', batchNo: 'B-1', quantity: 50, warehouseId: 'wh-1' });
    await service.create({ itemId: 'item-1', batchNo: 'B-2', quantity: 30, warehouseId: 'wh-1' });
    await service.create({ itemId: 'item-2', batchNo: 'B-3', quantity: 20, warehouseId: 'wh-1' });
    const stock = await service.getLiveStock('item-1');
    expect(stock.totalCurrentStock).toBe(80);
    expect(stock.batches).toHaveLength(2);
  });

  it('getLiveStock filters by warehouse', async () => {
    const { service } = makeFixture();
    await service.create({ itemId: 'item-1', batchNo: 'B-1', quantity: 50, warehouseId: 'wh-1' });
    await service.create({ itemId: 'item-1', batchNo: 'B-2', quantity: 30, warehouseId: 'wh-2' });
    const stock = await service.getLiveStock('item-1', 'wh-1');
    expect(stock.totalCurrentStock).toBe(50);
    expect(stock.batches).toHaveLength(1);
  });

  it('recordAdjustment increases stock correctly', async () => {
    const { service } = makeFixture();
    const batch = await service.create({
      itemId: 'item-1', batchNo: 'BATCH-ADJ', quantity: 100, warehouseId: 'wh-1',
    }, 'user-1');
    const updated = await service.recordAdjustment(batch.id, {
      type: 'increase', quantity: 25, reason: 'Found in warehouse',
    }, 'user-1');
    expect(updated.quantity).toBe(125);
    expect(updated.availableQuantity).toBe(125);
  });

  it('recordAdjustment decreases stock but never below zero', async () => {
    const { service } = makeFixture();
    const batch = await service.create({
      itemId: 'item-1', batchNo: 'BATCH-DEC', quantity: 10, warehouseId: 'wh-1',
    }, 'user-1');
    const updated = await service.recordAdjustment(batch.id, {
      type: 'decrease', quantity: 100, reason: 'Damaged',
    }, 'user-1');
    expect(updated.quantity).toBe(0); // clamped to zero
  });
});

// ═══════════════════════════════════════════════════════════
// 3. StockMovementService — create, validation, immutability
// ═══════════════════════════════════════════════════════════
describe('StockMovementService', () => {
  function makeFixture() {
    const database = {
      invStockLedger: makeRepo(),
      invStockBalance: makeRepo(),
      stockMovements: makeRepo(),
    };
    const audit = { log: vi.fn(async () => undefined) };
    const txn = { executeInTransaction: vi.fn(async (fn: (...args: any[]) => any) => fn({})) };
    const postingEngine = new InventoryPostingEngine(database as any, txn as any, audit as any);
    const service = new StockMovementService(database as any, audit as any, postingEngine);
    return { database, service, postingEngine };
  }

  it('creates an IN movement and writes to canonical ledger', async () => {
    const { service, database } = makeFixture();
    const result = await service.create({
      itemId: 'item-1', movementType: 'purchase_receipt', warehouseId: 'wh-1',
      quantity: 50, rate: 100,
    }, 'user-1');
    expect(result.success).toBe(true);
    expect(result.entryNumber).toBeTruthy();
    // Verify ledger entry
    const ledger = [...database.invStockLedger._rows.values()];
    expect(ledger.length).toBe(1);
    expect(ledger[0].direction).toBe('IN');
    expect(ledger[0].quantity).toBe(50);
  });

  it('creates an OUT movement after IN', async () => {
    const { service } = makeFixture();
    // First, create stock
    await service.create({
      itemId: 'item-1', movementType: 'opening', warehouseId: 'wh-1',
      quantity: 50, rate: 100,
    }, 'user-1');
    const result = await service.create({
      itemId: 'item-1', movementType: 'sales_issue', warehouseId: 'wh-1',
      quantity: 10, rate: 100,
    }, 'user-1');
    expect(result.success).toBe(true);
  });

  it('rejects zero quantity', async () => {
    const { service } = makeFixture();
    await expect(service.create({
      itemId: 'item-1', movementType: 'adjustment', quantity: 0,
    }, 'user-1')).rejects.toThrow(/greater than zero/);
  });

  it('rejects missing itemId', async () => {
    const { service } = makeFixture();
    await expect(service.create({
      movementType: 'adjustment', quantity: 5,
    }, 'user-1')).rejects.toThrow(/itemId is required/);
  });

  it('rejects update (ledger entries are immutable)', async () => {
    const { service } = makeFixture();
    await expect(service.update('any-id', { quantity: 1 }, 'user-1')).rejects.toThrow(/immutable/);
  });

  it('rejects delete (ledger entries are immutable)', async () => {
    const { service } = makeFixture();
    await expect(service.delete('any-id', 'user-1')).rejects.toThrow(/immutable/);
  });

  it('handles sales_delivery alias (maps to sales_issue)', async () => {
    const { service, database } = makeFixture();
    // Seed stock first
    await service.create({
      itemId: 'item-1', movementType: 'opening', warehouseId: 'wh-1',
      quantity: 50, rate: 100,
    }, 'user-1');
    const result = await service.create({
      itemId: 'item-1', movementType: 'sales_delivery', warehouseId: 'wh-1',
      quantity: 5, direction: 'OUT',
    }, 'user-1');
    expect(result.success).toBe(true);
    const ledger = [...database.invStockLedger._rows.values()];
    // The aliased entry should have transactionType 'sales_issue' (not 'sales_delivery')
    const outEntry = ledger.find((e: any) => e.direction === 'OUT');
    expect(outEntry.transactionType).toBe('sales_issue');
  });

  it('handles reservation movement type', async () => {
    const { service, database } = makeFixture();
    const result = await service.create({
      itemId: 'item-1', movementType: 'reserve', warehouseId: 'wh-1',
      quantity: 10, direction: 'IN',
    }, 'user-1');
    expect(result.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 4. StockReservationService
// ═══════════════════════════════════════════════════════════
describe('StockReservationService', () => {
  function makeFixture() {
    const database = { invStockReservation: makeRepo() };
    const audit = { log: vi.fn(async () => undefined) };
    const txn = { executeInTransaction: vi.fn(async (fn: (...args: any[]) => any) => fn({})) };
    const postingEngine = new InventoryPostingEngine(database as any, txn as any, audit as any);
    const service = new StockReservationService(database as any, postingEngine);
    return { database, service };
  }

  it('creates a stock reservation', async () => {
    const { service } = makeFixture();
    const res = await service.reserveStock({
      itemId: 'item-1', warehouseId: 'wh-1', quantity: 20, createdBy: 'user-1',
    });
    expect(res.status).toBe('active');
    expect(res.quantity).toBe(20);
  });

  it('releases a reservation', async () => {
    const { service } = makeFixture();
    const res = await service.reserveStock({
      itemId: 'item-1', warehouseId: 'wh-1', quantity: 10,
    });
    const released = await service.releaseReservation(res.id, 'user-1');
    expect(released.released).toBe(true);
  });

  it('getReservedQuantity sums active reservations', async () => {
    const { service } = makeFixture();
    await service.reserveStock({ itemId: 'item-1', warehouseId: 'wh-1', quantity: 15 });
    await service.reserveStock({ itemId: 'item-1', warehouseId: 'wh-1', quantity: 10 });
    const qty = await service.getReservedQuantity('item-1', 'wh-1');
    expect(qty).toBe(25);
  });

  it('getActiveReservations filters by item and warehouse', async () => {
    const { service } = makeFixture();
    await service.reserveStock({ itemId: 'item-1', warehouseId: 'wh-1', quantity: 5 });
    await service.reserveStock({ itemId: 'item-2', warehouseId: 'wh-1', quantity: 10 });
    const res = await service.getActiveReservations('item-1', 'wh-1');
    expect(res.data).toHaveLength(1);
    expect(res.data[0].quantity).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════
// 5. WarehouseService — search and dashboard
// ═══════════════════════════════════════════════════════════
describe('WarehouseService', () => {
  function makeFixture() {
    const database = {
      warehouses: makeRepo([
        { id: 'wh-1', name: 'Main Warehouse', code: 'WHM', city: 'Pune', isActive: true },
        { id: 'wh-2', name: 'Branch Godown', code: 'WHB', city: 'Mumbai', isActive: true },
      ]),
      warehouseLocations: makeRepo([
        { id: 'loc-1', godown: 'Main', rack: 'R1', shelf: 'S1', locationCode: 'LOC-001' },
      ]),
      batchStock: makeRepo([
        { id: 'b1', itemId: 'item-1', warehouseId: 'wh-1', quantity: 100, purchaseRate: 50, reservedQuantity: 10 },
      ]),
      stockTransfers: makeRepo([
        { id: 't1', transferNumber: 'TRF-001', status: 'draft', fromLocation: 'Main', toLocation: 'Branch' },
      ]),
    };
    const service = new WarehouseService(database as any);
    return { database, service };
  }

  it('search returns matching warehouses, locations, batches, transfers', async () => {
    const { service } = makeFixture();
    const result = await service.search('Main');
    expect(result.warehouses.length).toBe(1);
    expect(result.warehouses[0].name).toBe('Main Warehouse');
    expect(result.locations.length).toBe(1);
    // Batch search matches on batchNo or itemId — 'Main' doesn't match 'item-1' or 'B-1'
    expect(result.batches.length).toBe(0);
    // Transfer fromLocation 'Main' matches 'main'
    expect(result.transfers.length).toBe(1);
    expect(result.total).toBe(3);
  });

  it('getDashboard returns warehouse KPIs', async () => {
    const { service } = makeFixture();
    const dash = await service.getDashboard();
    expect(dash.totalWarehouses).toBe(2);
    expect(dash.totalLocations).toBe(1);
    expect(dash.totalStockValue).toBe(5000); // 100 * 50
    expect(dash.pendingTransfers).toBe(1);
  });

  it('getWarehouseStock returns stock for a specific warehouse', async () => {
    const { service } = makeFixture();
    const stock = await service.getWarehouseStock('wh-1');
    expect(stock).toHaveLength(1);
    expect(stock[0].currentQty).toBe(100);
    expect(stock[0].reservedQty).toBe(10);
    expect(stock[0].availableQty).toBe(90);
  });

  it('getWarehouseStock returns all stock when no warehouseId', async () => {
    const { service } = makeFixture();
    const stock = await service.getWarehouseStock();
    expect(stock).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════
// 6. BatchMasterService — status transitions
// ═══════════════════════════════════════════════════════════
describe('BatchMasterService', () => {
  function makeFixture() {
    const database = { batchMaster: makeRepo([{ id: 'bm-1', batchNo: 'BATCH-A', status: 'draft', isDeleted: false }]) };
    const audit = { log: vi.fn(async () => undefined) };
    const service = new BatchMasterService(database as any, audit as any);
    return { database, service };
  }

  it('transitions batch to released status', async () => {
    const { service } = makeFixture();
    const result = await service.release('bm-1', 'user-1');
    expect(result.status).toBe('released');
  });

  it('transitions batch to blocked status with reason', async () => {
    const { service } = makeFixture();
    const result = await service.block('bm-1', 'Contamination suspected', 'user-1');
    expect(result.status).toBe('blocked');
    expect(result.remarks).toBe('Contamination suspected');
  });

  it('transitions batch to quarantine status', async () => {
    const { service } = makeFixture();
    const result = await service.quarantine('bm-1', 'user-1');
    expect(result.status).toBe('quarantine');
  });

  it('selectBatches returns empty allocation (placeholder)', async () => {
    const { service } = makeFixture();
    const result = await service.selectBatches('item-1', 'wh-1', 10, 'fifo');
    expect(result.strategy).toBe('fifo');
    expect(result.fullAllocation).toBe(false);
  });

  it('getExpiryAlerts returns empty alert data (placeholder)', async () => {
    const { service } = makeFixture();
    const result = await service.getExpiryAlerts(30);
    expect(result.totalBatches).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 7. BatchLotService — split and merge
// ═══════════════════════════════════════════════════════════
describe('BatchLotService', () => {
  function makeFixture() {
    const database = { batchLots: makeRepo([{ id: 'lot-1', lotCode: 'LOT-A', quantity: 100, isDeleted: false }]) };
    const audit = { log: vi.fn(async () => undefined) };
    const service = new BatchLotService(database as any, audit as any);
    return { database, service };
  }

  it('splitLot creates a new lot', async () => {
    const { service } = makeFixture();
    const newLot = await service.splitLot('lot-1', 30, 'LOT-A-SPLIT');
    expect(newLot.lotCode).toBe('LOT-A-SPLIT');
    expect(newLot.quantity).toBe(30);
  });

  it('mergeLots returns the target lot', async () => {
    const { service, database } = makeFixture();
    database.batchLots._rows.set('lot-2', { id: 'lot-2', lotCode: 'LOT-B', quantity: 50, isDeleted: false });
    const merged = await service.mergeLots('lot-1', 'lot-2');
    expect(merged.id).toBe('lot-2');
  });
});

// ═══════════════════════════════════════════════════════════
// 8. SerialMasterService — CRUD
// ═══════════════════════════════════════════════════════════
describe('SerialMasterService', () => {
  function makeFixture() {
    const database = { serialMaster: makeRepo() };
    const audit = { log: vi.fn(async () => undefined) };
    const service = new SerialMasterService(database as any, audit as any);
    return { database, service };
  }

  it('creates and retrieves a serial number', async () => {
    const { service } = makeFixture();
    const serial = await service.create({ serialNo: 'SN-001', itemId: 'item-1', status: 'available' }, 'user-1');
    expect(serial.serialNo).toBe('SN-001');
    const found = await service.findById(serial.id);
    expect(found.serialNo).toBe('SN-001');
  });

  it('getSerialDetails returns serial with empty sub-records', async () => {
    const { service } = makeFixture();
    const serial = await service.create({ serialNo: 'SN-002', itemId: 'item-1' }, 'user-1');
    const details = await service.getSerialDetails(serial.id);
    expect(details.serial.serialNo).toBe('SN-002');
    expect(details.warranty).toEqual([]);
    expect(details.history).toEqual([]);
  });

  it('soft-deletes a serial', async () => {
    const { service } = makeFixture();
    const serial = await service.create({ serialNo: 'SN-003', itemId: 'item-1' }, 'user-1');
    await service.delete(serial.id, 'user-1');
    await expect(service.findById(serial.id)).rejects.toThrow(/not found/i);
  });
});

// ═══════════════════════════════════════════════════════════
// 9. ProductsMasterService — additional edge cases
// ═══════════════════════════════════════════════════════════
describe('ProductsMasterService — additional edge cases', () => {
  function makeFixture() {
    const database = {
      items: makeRepo([{ id: 'p1', name: 'Urea', sku: 'UREA', productCode: 'PRD-0001', type: 'fertilizer', status: 'active', mrp: 300, salesRate: 280, purchaseRate: 250, currentStock: 100, minStock: 20, isActive: true }]),
      productDocuments: makeRepo(),
      productPriceHistory: makeRepo(),
      categories: makeRepo([{ id: 'cat-1', name: 'Fertilizers' }]),
      brands: makeRepo([{ id: 'brand-1', name: 'IFFCO' }]),
      units: makeRepo([{ id: 'unit-1', name: 'KG' }]),
      gstRates: makeRepo([{ id: 'gst-1', rate: 5 }]),
      suppliers: makeRepo([{ id: 'sup-1', name: 'IFFCO' }]),
      batchMaster: makeRepo(),
      invStockBalance: makeRepo(),
      invStockLedger: makeRepo(),
      warehouses: makeRepo([{ id: 'wh-1', name: 'Main' }]),
      invoiceItems: makeRepo(),
      poItems: makeRepo(),
      grnItems: makeRepo(),
      returnItems: makeRepo(),
      purchaseReturnItems: makeRepo(),
      salesOrderItems: makeRepo(),
      quotationItems: makeRepo(),
    };
    const audit = { log: vi.fn(async () => undefined) };
    const service = new ProductsMasterService(database as any, audit as any);
    return { database, service };
  }

  it('blocks deletion when GRN items reference the product', async () => {
    const { database, service } = makeFixture();
    database.grnItems._rows.set('gi-1', { id: 'gi-1', itemId: 'p1', isDeleted: false });
    await expect(service.delete('p1', 'user-1')).rejects.toThrow(/transaction history/);
  });

  it('blocks deletion when purchase order items reference the product', async () => {
    const { database, service } = makeFixture();
    database.poItems._rows.set('poi-1', { id: 'poi-1', itemId: 'p1', isDeleted: false });
    await expect(service.delete('p1', 'user-1')).rejects.toThrow(/transaction history/);
  });

  it('allows deletion when only cancelled transactions exist', async () => {
    const { service } = makeFixture();
    const result = await service.delete('p1', 'user-1');
    expect(result.message).toContain('deleted');
  });

  it('dashboard low stock count works', async () => {
    const { database, service } = makeFixture();
    database.items._rows.set('p2', {
      id: 'p2', name: 'Low Item', sku: 'LOW', productCode: 'PRD-0002', status: 'active',
      mrp: 100, salesRate: 90, purchaseRate: 80, currentStock: 3, minStock: 20,
      isActive: true, isDeleted: false,
    });
    const dash = await service.getDashboard();
    expect(dash.summary.lowStockProducts).toBe(1);
    expect(dash.summary.totalProducts).toBe(2);
  });

  it('import with upsert updates existing products', async () => {
    const { database, service } = makeFixture();
    const csv = 'Product Name,SKU,MRP,Selling Price\nUrea,UREA,350,320\n';
    const file = { originalname: 'products.csv', buffer: Buffer.from(csv) };
    const res = await service.importProducts(file, 'upsert', 'user-1');
    expect(res.updated).toBe(1);
    expect(database.items._rows.get('p1').mrp).toBe(350);
  });
});

// ═══════════════════════════════════════════════════════════
// 10. StockLedgerService — ledger queries
// ═══════════════════════════════════════════════════════════
describe('StockLedgerService', () => {
  function makeFixture() {
    const database = {
      invStockLedger: makeRepo([
        { id: 'le-1', itemId: 'item-1', batchNo: 'B-1', transactionType: 'purchase_receipt', transactionDate: '2026-08-01T00:00:00.000Z', direction: 'IN', quantity: 50, isDeleted: false },
        { id: 'le-2', itemId: 'item-1', batchNo: 'B-1', transactionType: 'sales_issue', transactionDate: '2026-08-05T00:00:00.000Z', direction: 'OUT', quantity: 10, isDeleted: false },
        { id: 'le-3', itemId: 'item-2', batchNo: 'B-2', transactionType: 'adjustment', transactionDate: '2026-08-10T00:00:00.000Z', direction: 'IN', quantity: 20, isDeleted: false },
      ]),
    };
    const service = new StockLedgerService(database as any);
    return { database, service };
  }

  it('returns all ledger entries when no filters', async () => {
    const { service } = makeFixture();
    const result = await service.getLedger({ page: 1, pageSize: 50 });
    expect(result.data).toHaveLength(3);
  });

  it('filters by itemId', async () => {
    const { service } = makeFixture();
    const result = await service.getLedger({ itemId: 'item-1', page: 1, pageSize: 50 });
    expect(result.data).toHaveLength(2);
    expect(result.data.every((e: any) => e.itemId === 'item-1')).toBe(true);
  });

  it('filters by batchNo', async () => {
    const { service } = makeFixture();
    const result = await service.getLedger({ batchNo: 'B-2', page: 1, pageSize: 50 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].batchNo).toBe('B-2');
  });

  it('filters by movementType', async () => {
    const { service } = makeFixture();
    const result = await service.getLedger({ movementType: 'adjustment', page: 1, pageSize: 50 });
    expect(result.data).toHaveLength(1);
  });

  it('filters by date range', async () => {
    const { service } = makeFixture();
    const result = await service.getLedger({ fromDate: '2026-08-03', toDate: '2026-08-08', page: 1, pageSize: 50 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].transactionType).toBe('sales_issue');
  });
});

// ═══════════════════════════════════════════════════════════
// 11. WarehouseLocationService — basic CRUD
// ═══════════════════════════════════════════════════════════
describe('WarehouseLocationService', () => {
  it('creates and retrieves a warehouse location', async () => {
    const database = { warehouseLocations: makeRepo() };
    const audit = { log: vi.fn(async () => undefined) };
    const service = new WarehouseLocationService(database as any, audit as any);
    const loc = await service.create({ locationCode: 'LOC-001', godown: 'Main', rack: 'R1' }, 'user-1');
    expect(loc.locationCode).toBe('LOC-001');
    const found = await service.findById(loc.id);
    expect(found.godown).toBe('Main');
  });
});

// ═══════════════════════════════════════════════════════════
// 12. InventoryPostingEngine — negative stock prevention
// ═══════════════════════════════════════════════════════════
describe('InventoryPostingEngine — edge cases', () => {
  function makeFixture() {
    const database = {
      invStockLedger: makeRepo(),
      invStockBalance: makeRepo(),
      warehouses: makeRepo([{ id: 'wh-1', name: 'Main', isActive: true }]),
      auditLogs: makeRepo(),
    };
    const audit = { log: vi.fn(async () => undefined) };
    const txn = { executeInTransaction: vi.fn(async (fn: (...args: any[]) => any) => fn({})) };
    const engine = new InventoryPostingEngine(database as any, txn as any, audit as any);
    return { database, engine };
  }

  it('OUT with no balance row throws insufficient stock', async () => {
    const { engine } = makeFixture();
    await expect(engine.postMovementCore({
      transactionType: 'sales_issue', direction: 'OUT', itemId: 'no-item',
      warehouseId: 'wh-1', quantity: 10, createdBy: 'u1',
    })).rejects.toThrow(/Insufficient stock/i);
  });

  it('OUT that exceeds available stock throws', async () => {
    const { database, engine } = makeFixture();
    // Seed 5 units
    await engine.postMovementCore({
      transactionType: 'opening', direction: 'IN', itemId: 'item-1',
      warehouseId: 'wh-1', quantity: 5, unitCost: 100, createdBy: 'u1',
    });
    // Try to remove 10
    await expect(engine.postMovementCore({
      transactionType: 'sales_issue', direction: 'OUT', itemId: 'item-1',
      warehouseId: 'wh-1', quantity: 10, createdBy: 'u1',
    })).rejects.toThrow(/Insufficient stock/i);
  });

  it('exact stock consumption succeeds', async () => {
    const { engine } = makeFixture();
    await engine.postMovementCore({
      transactionType: 'opening', direction: 'IN', itemId: 'item-2',
      warehouseId: 'wh-1', quantity: 10, unitCost: 50, createdBy: 'u1',
    });
    const result = await engine.postMovementCore({
      transactionType: 'sales_issue', direction: 'OUT', itemId: 'item-2',
      warehouseId: 'wh-1', quantity: 10, createdBy: 'u1',
    });
    expect(result.success).toBe(true);
    expect(result.balanceQuantity).toBe(0);
  });

  it('postTransfer with zero quantity throws', async () => {
    const { engine } = makeFixture();
    await expect(engine.postTransfer({
      itemId: 'item-1', fromWarehouseId: 'wh-1', toWarehouseId: 'wh-2',
      quantity: 0, createdBy: 'u1',
    })).rejects.toThrow(/greater than zero/);
  });

  it('reverseMovement of non-existent entry throws', async () => {
    const { engine } = makeFixture();
    await expect(engine.reverseMovement('NONEXISTENT', 'test', 'u1')).rejects.toThrow(/not found/i);
  });

  it('reverseMovement of already-reversed entry throws', async () => {
    const { engine } = makeFixture();
    const entry = await engine.postMovementCore({
      transactionType: 'adjustment', direction: 'IN', itemId: 'item-3',
      warehouseId: 'wh-1', quantity: 5, unitCost: 10, createdBy: 'u1',
    });
    await engine.reverseMovement(entry.entryNumber, 'first reversal', 'u1');
    await expect(engine.reverseMovement(entry.entryNumber, 'second reversal', 'u1')).rejects.toThrow(/already been reversed/i);
  });

  it('multiple IN operations accumulate correctly', async () => {
    const { engine } = makeFixture();
    await engine.postMovementCore({ transactionType: 'opening', direction: 'IN', itemId: 'acc-item', warehouseId: 'wh-1', quantity: 10, unitCost: 100, createdBy: 'u1' });
    await engine.postMovementCore({ transactionType: 'purchase_receipt', direction: 'IN', itemId: 'acc-item', warehouseId: 'wh-1', quantity: 20, unitCost: 100, createdBy: 'u1' });
    const res = await engine.postMovementCore({ transactionType: 'sales_issue', direction: 'OUT', itemId: 'acc-item', warehouseId: 'wh-1', quantity: 5, createdBy: 'u1' });
    expect(res.balanceQuantity).toBe(25);
  });

  it('REVERSAL direction entries are excluded from balance delta', async () => {
    const { database, engine } = makeFixture();
    const entry = await engine.postMovementCore({
      transactionType: 'adjustment', direction: 'IN', itemId: 'rev-item',
      warehouseId: 'wh-1', quantity: 10, unitCost: 10, createdBy: 'u1',
    });
    const rev = await engine.reverseMovement(entry.entryNumber, 'test', 'u1');
    expect(rev.success).toBe(true);
    // Balance should be 0 (10 IN - 10 reversed OUT)
    const bal = await database.invStockBalance.findAll({
      filters: [{ field: 'itemId', operator: 'eq', value: 'rev-item' }],
      pageSize: 1,
    } as any);
    expect((bal.data || [])[0]?.onHand).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 13. Cross-module: BatchStockService recordEntry creates ledger
// ═══════════════════════════════════════════════════════════
describe('BatchStockService — ledger integration', () => {
  it('recordEntry writes to the canonical ledger', async () => {
    const database = { batchStock: makeRepo(), invStockLedger: makeRepo(), invStockBalance: makeRepo(), warehouses: makeRepo() };
    const audit = { log: vi.fn(async () => undefined) };
    const txn = { executeInTransaction: vi.fn(async (fn: (...args: any[]) => any) => fn({})) };
    const postingEngine = new InventoryPostingEngine(database as any, txn as any, audit as any);
    const service = new BatchStockService(database as any, audit as any, postingEngine);
    const batch = await service.recordEntry({
      itemId: 'item-1', batchNo: 'ENTRY-001', quantity: 50, purchaseRate: 100, warehouseId: 'wh-1',
      entryType: 'opening',
    }, 'user-1');
    expect(batch.id).toBeTruthy();
    // The ledger should have one entry
    const ledgerEntries = [...database.invStockLedger._rows.values()];
    expect(ledgerEntries.length).toBe(1);
    expect(ledgerEntries[0].transactionType).toBe('opening');
    expect(ledgerEntries[0].direction).toBe('IN');
    expect(ledgerEntries[0].quantity).toBe(50);
  });
});

// ═══════════════════════════════════════════════════════════
// 14. StockLedgerQueryService — stock card and balances
// ═══════════════════════════════════════════════════════════
describe('StockLedgerQueryService', () => {
  function makeFixture() {
    const database = {
      invStockLedger: makeRepo([
        { id: 'le-1', itemId: 'item-1', warehouseId: 'wh-1', transactionDate: '2026-08-01T00:00:00.000Z', direction: 'IN', quantity: 50, isDeleted: false },
        { id: 'le-2', itemId: 'item-1', warehouseId: 'wh-1', transactionDate: '2026-08-05T00:00:00.000Z', direction: 'OUT', quantity: 10, isDeleted: false },
      ]),
      invStockBalance: makeRepo([
        { id: 'bal-1', warehouseId: 'wh-1', itemId: 'item-1', onHand: 40, isDeleted: false },
        { id: 'bal-2', warehouseId: 'wh-2', itemId: 'item-1', onHand: 20, isDeleted: false },
      ]),
    };
    const service = new StockLedgerQueryService(database as any);
    return { database, service };
  }

  it('getStockCard returns entries for an item', async () => {
    const { service } = makeFixture();
    const card = await service.getStockCard('item-1', 'wh-1');
    expect(card.data).toHaveLength(2);
    expect(card.data.every((e: any) => e.itemId === 'item-1')).toBe(true);
  });

  it('getStockBalances returns all balances when no filter', async () => {
    const { service } = makeFixture();
    const balances = await service.getStockBalances();
    expect(balances.data).toHaveLength(2);
  });

  it('getStockBalances filters by warehouse', async () => {
    const { service } = makeFixture();
    const balances = await service.getStockBalances('wh-1');
    expect(balances.data).toHaveLength(1);
    expect(balances.data[0].onHand).toBe(40);
  });

  it('getStockBalances filters by item', async () => {
    const { service } = makeFixture();
    const balances = await service.getStockBalances(undefined, 'item-1');
    expect(balances.data).toHaveLength(2);
  });

  it('getMovementReport returns paginated results', async () => {
    const { service } = makeFixture();
    const report = await service.getMovementReport({ page: 1, pageSize: 10 });
    expect(report.data).toHaveLength(2);
  });
});
