import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

// @libsql/client + drizzle-orm live in the database workspace (pnpm) — anchor
// resolution there instead of adding duplicate deps to the backend.
const dbRequire = createRequire(join(process.cwd(), '..', 'database', 'package.json'));
const { createClient } = dbRequire('@libsql/client');
const { drizzle } = dbRequire('drizzle-orm/libsql');
const { migrate } = dbRequire('drizzle-orm/libsql/migrator');

import { TransactionManager } from '../automation/transaction.manager';
import { DatabaseService } from '../database/database.service';

import { ProductsService } from './products.service';
import {
  InventoryPostingEngine,
  StockLedgerService,
  StockMovementService,
  StockLedgerQueryService,
  StockReconciliationService,
} from './services';

/**
 * H1 — Canonical Inventory Ledger tests (real DB + real migrations).
 *
 * Validates that shranix_inv_stock_ledger (+ shranix_inv_stock_balance) is the
 * single writable source of truth for every inventory movement, that the stock
 * projection always matches the ledger, that oversell is a controlled error
 * (never a silent clamp), that transactions roll back atomically, and that all
 * readers (product master, ledger pages, movement reports) consume canonical data.
 */
describe('H1 Canonical Inventory Ledger (real DB)', () => {
  let dbDir: string;
  let rawClient: any;
  let database: DatabaseService;
  let txn: TransactionManager;
  let engine: InventoryPostingEngine;
  let ledgerService: StockLedgerService;
  let movementService: StockMovementService;
  let queryService: StockLedgerQueryService;
  let productsService: ProductsService;

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'h1-ledger-'));
    const dbFile = join(dbDir, 'test.db');
    rawClient = createClient({ url: `file:${dbFile}` });
    const drizzleDb = drizzle(rawClient as any);

    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    database = new DatabaseService(drizzleDb as any);
    txn = new TransactionManager(database);
    const auditStub = { log: async () => undefined };
    engine = new InventoryPostingEngine(database, txn, auditStub as any);
    ledgerService = new StockLedgerService(database);
    movementService = new StockMovementService(database, auditStub as any, engine);
    queryService = new StockLedgerQueryService(database);
    productsService = new ProductsService(database);
  });

  afterAll(async () => {
    try {
      await (database as any).close?.();
    } catch {
      /* ignore */
    }
  });

  async function balanceOf(warehouseId: string, itemId: string): Promise<any> {
    const res = await database.invStockBalance.findAll({
      filters: [
        { field: 'warehouseId', operator: 'eq', value: warehouseId },
        { field: 'itemId', operator: 'eq', value: itemId },
      ],
      pageSize: 1,
    } as any);
    return (res.data || [])[0] || null;
  }

  /** Net movement from the canonical ledger for a (warehouse, item). */
  async function ledgerNet(warehouseId: string, itemId: string): Promise<number> {
    const res = (await database.invStockLedger.findAll({
      page: 1,
      pageSize: 10000,
    } as any)) as any;
    return (res.data || [])
      .filter((e: any) => e.warehouseId === warehouseId && e.itemId === itemId)
      .reduce((sum: number, e: any) => {
        if (e.direction === 'IN') {
          return sum + Number(e.quantity);
        }
        if (e.direction === 'OUT') {
          return sum - Number(e.quantity);
        }
        return sum;
      }, 0);
  }

  async function ledgerCount(): Promise<number> {
    const res = (await database.invStockLedger.findAll({ page: 1, pageSize: 10000 } as any)) as any;
    return (res.data || []).length;
  }

  it('1. Purchase (GRN) increases stock on the canonical ledger', async () => {
    await engine.postMovement({
      transactionType: 'purchase_receipt',
      direction: 'IN',
      itemId: 'PUR-ITEM',
      warehouseId: 'WH-MAIN',
      quantity: 50,
      unitCost: 20,
      referenceNumber: 'GRN-001',
      documentRef: 'GRN-001',
      documentType: 'purchase_receipt',
      createdBy: 'u1',
    });
    expect(Number((await balanceOf('WH-MAIN', 'PUR-ITEM'))?.onHand)).toBeCloseTo(50, 2);
    expect(await ledgerNet('WH-MAIN', 'PUR-ITEM')).toBeCloseTo(50, 2);
  }, 60000);

  it('2. Sale decreases stock on the canonical ledger', async () => {
    await engine.postMovement({
      transactionType: 'sales_issue',
      direction: 'OUT',
      itemId: 'PUR-ITEM',
      warehouseId: 'WH-MAIN',
      quantity: 10,
      unitCost: 20,
      referenceNumber: 'INV-001',
      documentRef: 'INV-001',
      documentType: 'sales_invoice',
      createdBy: 'u1',
    });
    expect(Number((await balanceOf('WH-MAIN', 'PUR-ITEM'))?.onHand)).toBeCloseTo(40, 2);
    expect(await ledgerNet('WH-MAIN', 'PUR-ITEM')).toBeCloseTo(40, 2);
  }, 60000);

  it('3. Sales return increases stock back', async () => {
    await engine.postMovement({
      transactionType: 'sales_return',
      direction: 'IN',
      itemId: 'PUR-ITEM',
      warehouseId: 'WH-MAIN',
      quantity: 4,
      unitCost: 20,
      referenceNumber: 'SRTN-001',
      documentRef: 'SRTN-001',
      documentType: 'sales_return',
      createdBy: 'u1',
    });
    expect(Number((await balanceOf('WH-MAIN', 'PUR-ITEM'))?.onHand)).toBeCloseTo(44, 2);
  }, 60000);

  it('4. Purchase return decreases stock', async () => {
    await engine.postMovement({
      transactionType: 'purchase_return',
      direction: 'OUT',
      itemId: 'PUR-ITEM',
      warehouseId: 'WH-MAIN',
      quantity: 6,
      unitCost: 20,
      referenceNumber: 'PRTN-001',
      documentRef: 'PRTN-001',
      documentType: 'purchase_return',
      createdBy: 'u1',
    });
    expect(Number((await balanceOf('WH-MAIN', 'PUR-ITEM'))?.onHand)).toBeCloseTo(38, 2);
  }, 60000);

  it('5. Transfer moves stock OUT of source and IN to destination (two canonical rows)', async () => {
    await engine.postTransfer({
      itemId: 'PUR-ITEM',
      fromWarehouseId: 'WH-MAIN',
      toWarehouseId: 'WH-2',
      quantity: 8,
      unitCost: 20,
      referenceNumber: 'TRF-H1-1',
      createdBy: 'u1',
    });
    expect(Number((await balanceOf('WH-MAIN', 'PUR-ITEM'))?.onHand)).toBeCloseTo(30, 2);
    expect(Number((await balanceOf('WH-2', 'PUR-ITEM'))?.onHand)).toBeCloseTo(8, 2);
    const out = await database.invStockLedger.findAll({
      filters: [{ field: 'transactionType', operator: 'eq', value: 'transfer_out' }],
      pageSize: 10,
    } as any);
    const inn = await database.invStockLedger.findAll({
      filters: [{ field: 'transactionType', operator: 'eq', value: 'transfer_in' }],
      pageSize: 10,
    } as any);
    expect(out.data.some((e: any) => e.warehouseId === 'WH-MAIN' && e.itemId === 'PUR-ITEM')).toBe(
      true,
    );
    expect(inn.data.some((e: any) => e.warehouseId === 'WH-2' && e.itemId === 'PUR-ITEM')).toBe(
      true,
    );
  }, 60000);

  it('6. Stock adjustment (increase + decrease) records both directions', async () => {
    await engine.postMovement({
      transactionType: 'adjustment',
      direction: 'IN',
      itemId: 'ADJ-ITEM',
      warehouseId: 'WH-MAIN',
      quantity: 15,
      unitCost: 5,
      referenceNumber: 'ADJ-IN-1',
      createdBy: 'u1',
    });
    expect(Number((await balanceOf('WH-MAIN', 'ADJ-ITEM'))?.onHand)).toBeCloseTo(15, 2);
    await engine.postMovement({
      transactionType: 'adjustment',
      direction: 'OUT',
      itemId: 'ADJ-ITEM',
      warehouseId: 'WH-MAIN',
      quantity: 3,
      unitCost: 5,
      referenceNumber: 'ADJ-OUT-1',
      createdBy: 'u1',
    });
    expect(Number((await balanceOf('WH-MAIN', 'ADJ-ITEM'))?.onHand)).toBeCloseTo(12, 2);
  }, 60000);

  it('7. Physical count (cycle_count) reconciles stock to the counted quantity', async () => {
    // Stock is 12; the physical count found 10 → a -2 cycle_count adjustment
    await engine.postMovement({
      transactionType: 'cycle_count',
      direction: 'OUT',
      itemId: 'ADJ-ITEM',
      warehouseId: 'WH-MAIN',
      quantity: 2,
      unitCost: 5,
      referenceNumber: 'CYCLE-1',
      documentRef: 'COUNT-001',
      documentType: 'physical_count',
      remarks: 'Physical count adjustment: counted 10, ledger had 12',
      createdBy: 'u1',
    });
    expect(Number((await balanceOf('WH-MAIN', 'ADJ-ITEM'))?.onHand)).toBeCloseTo(10, 2);
    expect(await ledgerNet('WH-MAIN', 'ADJ-ITEM')).toBeCloseTo(10, 2);
  }, 60000);

  it('8. Stock history (ledger rows) matches the actual movements', async () => {
    const res = (await database.invStockLedger.findAll({
      filters: [{ field: 'itemId', operator: 'eq', value: 'PUR-ITEM' }],
      pageSize: 100,
    } as any)) as any;
    const types = (res.data || []).map((e: any) => e.transactionType);
    expect(types).toContain('purchase_receipt');
    expect(types).toContain('sales_issue');
    expect(types).toContain('sales_return');
    expect(types).toContain('purchase_return');
    expect(types).toContain('transfer_out');
    expect(types).toContain('transfer_in');
    // Every row carries direction + running balance + reference
    for (const e of res.data) {
      expect(e.direction).toBeTruthy();
      expect(e.balanceQuantity).toBeGreaterThanOrEqual(0);
      expect(e.referenceNumber).toBeTruthy();
    }
  }, 60000);

  it('9. Current stock (balance projection) always equals the ledger net', async () => {
    const bal = await balanceOf('WH-MAIN', 'PUR-ITEM');
    const net = await ledgerNet('WH-MAIN', 'PUR-ITEM');
    expect(Number(bal?.onHand)).toBeCloseTo(net, 2);
    expect(Number(bal?.onHand)).toBeCloseTo(30, 2);
  }, 60000);

  it('10. Duplicate posting with the same reference does not violate the unique index', async () => {
    // Regression guard: reference_number is UNIQUE — repeated/multi-line postings
    // must never hit SQLITE_CONSTRAINT_UNIQUE.
    await engine.postMovement({
      transactionType: 'adjustment',
      direction: 'IN',
      itemId: 'DUP-ITEM',
      warehouseId: 'WH-MAIN',
      quantity: 10,
      unitCost: 2,
      referenceNumber: 'DUP-REF-1',
      documentRef: 'DUP-DOC-1',
      createdBy: 'u1',
    });
    await engine.postMovement({
      transactionType: 'adjustment',
      direction: 'IN',
      itemId: 'DUP-ITEM-2',
      warehouseId: 'WH-MAIN',
      quantity: 7,
      unitCost: 3,
      referenceNumber: 'DUP-REF-1',
      documentRef: 'DUP-DOC-1',
      createdBy: 'u1',
    });
    const res = (await database.invStockLedger.findAll({
      filters: [{ field: 'documentRef', operator: 'eq', value: 'DUP-DOC-1' }],
      pageSize: 10,
    } as any)) as any;
    expect(res.data.length).toBe(2);
    const refs = res.data.map((e: any) => e.referenceNumber);
    expect(new Set(refs).size).toBe(2); // unique references despite shared document ref
  }, 60000);

  it('11. Failed OUT rolls back both the balance mutation and the ledger row', async () => {
    const before = await ledgerCount();
    // No balance row exists for this item → OUT must fail (insufficient stock)
    await expect(
      engine.postMovement({
        transactionType: 'sales_issue',
        direction: 'OUT',
        itemId: 'ROLLBACK-ITEM',
        warehouseId: 'WH-MAIN',
        quantity: 5,
        unitCost: 1,
        referenceNumber: 'RB-1',
        createdBy: 'u1',
      }),
    ).rejects.toThrow(/insufficient stock/i);
    // No balance row and no ledger row survive the failed transaction
    expect(await balanceOf('WH-MAIN', 'ROLLBACK-ITEM')).toBeNull();
    expect(await ledgerCount()).toBe(before);
  }, 60000);

  it('12. Oversell is a controlled error — never a silent Math.max(0,...) clamp', async () => {
    // Balance is exactly 30 for PUR-ITEM/WH-MAIN; selling 999 must throw,
    // and the balance must remain 30 (not clamped to 0).
    await expect(
      engine.postMovement({
        transactionType: 'sales_issue',
        direction: 'OUT',
        itemId: 'PUR-ITEM',
        warehouseId: 'WH-MAIN',
        quantity: 999,
        unitCost: 20,
        referenceNumber: 'OVR-1',
        createdBy: 'u1',
      }),
    ).rejects.toThrow(/insufficient stock/i);
    expect(Number((await balanceOf('WH-MAIN', 'PUR-ITEM'))?.onHand)).toBeCloseTo(30, 2);
  }, 60000);

  it('13. Sequential oversell race — the second concurrent-style OUT fails, no negative stock', async () => {
    // Stock = 30. Simulate two near-simultaneous sales: 20 then 20.
    await engine.postMovement({
      transactionType: 'sales_issue',
      direction: 'OUT',
      itemId: 'PUR-ITEM',
      warehouseId: 'WH-MAIN',
      quantity: 20,
      unitCost: 20,
      referenceNumber: 'RACE-1',
      createdBy: 'u1',
    });
    expect(Number((await balanceOf('WH-MAIN', 'PUR-ITEM'))?.onHand)).toBeCloseTo(10, 2);
    await expect(
      engine.postMovement({
        transactionType: 'sales_issue',
        direction: 'OUT',
        itemId: 'PUR-ITEM',
        warehouseId: 'WH-MAIN',
        quantity: 20,
        unitCost: 20,
        referenceNumber: 'RACE-2',
        createdBy: 'u1',
      }),
    ).rejects.toThrow(/insufficient stock/i);
    // No negative stock is possible: balance stayed at 10
    expect(Number((await balanceOf('WH-MAIN', 'PUR-ITEM'))?.onHand)).toBeCloseTo(10, 2);
  }, 60000);

  it('14. Multiple warehouses keep independent balances', async () => {
    await engine.postMovement({
      transactionType: 'purchase_receipt',
      direction: 'IN',
      itemId: 'MW-ITEM',
      warehouseId: 'WH-A',
      quantity: 100,
      unitCost: 4,
      referenceNumber: 'MW-A-1',
      createdBy: 'u1',
    });
    await engine.postMovement({
      transactionType: 'purchase_receipt',
      direction: 'IN',
      itemId: 'MW-ITEM',
      warehouseId: 'WH-B',
      quantity: 30,
      unitCost: 4,
      referenceNumber: 'MW-B-1',
      createdBy: 'u1',
    });
    await engine.postMovement({
      transactionType: 'sales_issue',
      direction: 'OUT',
      itemId: 'MW-ITEM',
      warehouseId: 'WH-A',
      quantity: 40,
      unitCost: 4,
      referenceNumber: 'MW-A-2',
      createdBy: 'u1',
    });
    expect(Number((await balanceOf('WH-A', 'MW-ITEM'))?.onHand)).toBeCloseTo(60, 2);
    expect(Number((await balanceOf('WH-B', 'MW-ITEM'))?.onHand)).toBeCloseTo(30, 2);
  }, 60000);

  it('15. Batch/lot metadata is carried on the canonical ledger row', async () => {
    await engine.postMovement({
      transactionType: 'purchase_receipt',
      direction: 'IN',
      itemId: 'BATCH-ITEM',
      warehouseId: 'WH-MAIN',
      batchId: 'batch-1',
      batchNo: 'B-2026-001',
      lotNo: 'LOT-77',
      serialNo: 'SN-001',
      quantity: 25,
      unitCost: 8,
      referenceNumber: 'BATCH-1',
      createdBy: 'u1',
    });
    const res = (await database.invStockLedger.findAll({
      filters: [{ field: 'documentRef', operator: 'eq', value: 'BATCH-1' }],
      pageSize: 1,
    } as any)) as any;
    expect(res.data.length).toBe(1);
    expect(res.data[0].batchNo).toBe('B-2026-001');
    expect(res.data[0].lotNo).toBe('LOT-77');
    expect(res.data[0].serialNo).toBe('SN-001');
  }, 60000);

  it('16. Historical data compatibility — legacy ledger tables remain (non-destructive migration)', async () => {
    const res = (await database.invStockLedger.findAll({ page: 1, pageSize: 1 } as any)) as any;
    expect(res.total).toBeGreaterThan(0);
    // The legacy tables still exist as read-only/historical tables (migration 0027
    // backfilled them into the canonical ledger without dropping anything).
    const tables = (
      await rawClient.execute(
        `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('shranix_stock_ledger','shranix_warehouse_stock','shranix_inv_stock_ledger','shranix_inv_stock_balance')`,
      )
    ).rows as any[];
    const names = tables.map((t: any) => t.name);
    expect(names).toContain('shranix_inv_stock_ledger');
    expect(names).toContain('shranix_inv_stock_balance');
    expect(names).toContain('shranix_stock_ledger');
    expect(names).toContain('shranix_warehouse_stock');
  }, 60000);

  it('17. Movement report + stock card read the canonical ledger', async () => {
    const report = await queryService.getMovementReport({
      transactionType: 'sales_issue',
      itemId: 'PUR-ITEM',
      page: 1,
      pageSize: 10,
    });
    expect((report as any).data.length).toBeGreaterThan(0);
    expect((report as any).data.every((e: any) => e.transactionType === 'sales_issue')).toBe(true);

    const card = await queryService.getStockCard('PUR-ITEM', 'WH-MAIN');
    expect((card as any).data.length).toBeGreaterThan(0);
    expect((card as any).data.every((e: any) => e.itemId === 'PUR-ITEM')).toBe(true);
  }, 60000);

  it('18. Product master currentStock comes from the canonical balance projection', async () => {
    await database.items.create({
      id: 'prod-h1',
      name: 'H1 Product',
      sku: 'H1-SKU-1',
      unitId: null,
      gstRateId: null,
      purchaseRate: 20,
      salesRate: 40,
      mrp: 45,
      currentStock: 0,
      isActive: true,
    } as any);
    await engine.postMovement({
      transactionType: 'purchase_receipt',
      direction: 'IN',
      itemId: 'prod-h1',
      warehouseId: 'WH-MAIN',
      quantity: 12,
      unitCost: 20,
      referenceNumber: 'PM-1',
      createdBy: 'u1',
    });
    const products = await productsService.search({
      search: 'H1-SKU-1',
      searchField: 'sku',
      pageSize: 5,
    });
    const found = products.find((p) => p.id === 'prod-h1');
    expect(found).toBeTruthy();
    // currentStock reflects the canonical balance (12), not a stale item field
    expect(Number(found?.currentStock)).toBeCloseTo(12, 2);
    expect((found?.warehouseStocks || []).length).toBeGreaterThan(0);
  }, 60000);

  it('StockLedgerService.getLedger + StockMovementService read canonical rows', async () => {
    const ledgerPage = await ledgerService.getLedger({ page: 1, pageSize: 50 });
    expect((ledgerPage as any).data.length).toBeGreaterThan(0);
    expect((ledgerPage as any).data[0].transactionType).toBeTruthy();

    const movements = await movementService.findAll(1, 50);
    expect((movements as any).data.length).toBeGreaterThan(0);
    expect((movements as any).data[0].direction).toBeTruthy();
  }, 60000);

  it('Manual movement creation (StockMovementService.create) writes the canonical ledger', async () => {
    const created = await movementService.create(
      {
        itemId: 'MANUAL-ITEM',
        movementType: 'adjustment',
        warehouseId: 'WH-MAIN',
        quantity: 9,
        reason: 'Manual adjustment test',
      },
      'u1',
    );
    expect(created.success).toBe(true);
    expect(created.entryNumber).toBeTruthy();
    expect(Number((await balanceOf('WH-MAIN', 'MANUAL-ITEM'))?.onHand)).toBeCloseTo(9, 2);
  }, 60000);

  it('Manual movement validation: zero quantity and missing item are rejected', async () => {
    await expect(
      movementService.create({ itemId: 'X', movementType: 'adjustment', quantity: 0 }, 'u1'),
    ).rejects.toThrow(/greater than zero/i);
    await expect(
      movementService.create({ movementType: 'adjustment', quantity: 5 }, 'u1'),
    ).rejects.toThrow(/itemId is required/i);
  }, 60000);

  it('Ledger entries are immutable — update/delete are rejected with a controlled error', async () => {
    await expect(movementService.update('any-id', { quantity: 1 }, 'u1')).rejects.toThrow(
      /immutable/i,
    );
    await expect(movementService.delete('any-id', 'u1')).rejects.toThrow(/immutable/i);
  }, 60000);

  it('Reconciliation service reports a healthy ledger (report-only, never mutates)', async () => {
    const svc = new StockReconciliationService();
    const report: any = await svc.run(rawClient);
    expect(report.generatedAt).toBeTruthy();
    expect(report.checks).toBeTruthy();
    expect(Array.isArray(report.findings)).toBe(true);
    // All postings so far are consistent → no balance-vs-ledger mismatches
    expect(report.checks.balanceVsLedger).toBe(0);
    expect(report.checks.duplicateEntryNumbers).toBe(0);
    expect(report.checks.missingEntryNumbers).toBe(0);
    // Report-only: running it must not change the ledger row count
    const before = await ledgerCount();
    await svc.run(rawClient);
    expect(await ledgerCount()).toBe(before);
  }, 60000);

  it('Reconciliation detects a deliberately broken balance row', async () => {
    const svc = new StockReconciliationService();
    // Corrupt one balance row so the projection no longer matches the ledger
    const bal = await balanceOf('WH-MAIN', 'PUR-ITEM');
    await database.invStockBalance.update(bal.id, { onHand: 999 } as any);
    const report: any = await svc.run(rawClient);
    const mismatch = report.findings.find((f: any) => f.check === 'balance_vs_ledger');
    expect(mismatch).toBeTruthy();
    expect(mismatch.count).toBeGreaterThan(0);
    expect(report.healthy).toBe(false);
    // Restore so the rest of the suite stays consistent
    await database.invStockBalance.update(bal.id, { onHand: Number(bal.onHand) } as any);
  }, 60000);
});
