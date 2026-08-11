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

import { InventoryPostingEngine, EnterpriseTransferService } from './services';

/**
 * REAL-DB integration tests for the enterprise inventory posting engine.
 *
 * Regression for critical runtime bugs found in the audit:
 *  - postMovement returned `{ entryNumber: '' }` (never the real entry),
 *    wrote balanceQuantity/balanceCost = 0, and ignored RESERVE/RELEASE
 *    in the balance update.
 *  - postTransfer was a no-op stub — transfers never moved stock.
 *  - reverseMovement was a no-op stub — cancellations/reversals never
 *    restored stock.
 *  - receiveTransfer only flipped status — received stock never appeared
 *    in the destination warehouse.
 *
 * These tests apply the real migrations and verify behaviour against the
 * actual tables + unique constraints.
 */
describe('InventoryPostingEngine (real DB)', () => {
  let dbDir: string;
  let database: DatabaseService;
  let txn: TransactionManager;
  let engine: InventoryPostingEngine;

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'inv-post-'));
    const dbFile = join(dbDir, 'test.db');
    const client = createClient({ url: `file:${dbFile}` });
    const drizzleDb = drizzle(client as any);

    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    database = new DatabaseService(drizzleDb as any);
    txn = new TransactionManager(database);
    engine = new InventoryPostingEngine(
      database,
      txn,
      (database as any).auditService ||
        ({
          log: async () => undefined,
        } as any),
    );
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

  it('postMovement returns the real entryNumber and stamps running balance', async () => {
    const r1 = await engine.postMovement({
      transactionType: 'opening',
      direction: 'IN',
      itemId: 'ITEM-A',
      warehouseId: 'WH-1',
      quantity: 10,
      unitCost: 50,
      referenceNumber: 'OPEN-1',
      createdBy: 'u1',
    });
    expect(r1.success).toBe(true);
    expect(r1.entryNumber).toBeTruthy();
    expect(r1.entryNumber).not.toBe('');

    const entry = await database.invStockLedger.findAll({
      filters: [{ field: 'entryNumber', operator: 'eq', value: r1.entryNumber }],
      pageSize: 1,
    } as any);
    expect(entry.data.length).toBe(1);
    expect(Number(entry.data[0].balanceQuantity)).toBeCloseTo(10, 2);
    expect(Number(entry.data[0].balanceCost)).toBeCloseTo(500, 2);
    expect(entry.data[0].documentRef).toBe('OPEN-1');

    const bal = await balanceOf('WH-1', 'ITEM-A');
    expect(Number(bal?.onHand)).toBeCloseTo(10, 2);
    expect(Number(bal?.available)).toBeCloseTo(10, 2);
  }, 60000);

  it('postMovement OUT decrements the balance', async () => {
    await engine.postMovement({
      transactionType: 'sales_issue',
      direction: 'OUT',
      itemId: 'ITEM-A',
      warehouseId: 'WH-1',
      quantity: 4,
      unitCost: 50,
      referenceNumber: 'SO-1',
      createdBy: 'u1',
    });
    const bal = await balanceOf('WH-1', 'ITEM-A');
    expect(Number(bal?.onHand)).toBeCloseTo(6, 2);
    expect(Number(bal?.available)).toBeCloseTo(6, 2);
  }, 60000);

  it('multiple lines sharing one referenceNumber do not violate the unique index', async () => {
    // Regression: reference_number is UNIQUE — a 2-line adjustment used to throw
    // SQLITE_CONSTRAINT_UNIQUE on the second line.
    await engine.postMovement({
      transactionType: 'adjustment',
      direction: 'IN',
      itemId: 'ITEM-B',
      warehouseId: 'WH-1',
      quantity: 5,
      unitCost: 10,
      referenceNumber: 'ADJ-MULTI-1',
      createdBy: 'u1',
    });
    await engine.postMovement({
      transactionType: 'adjustment',
      direction: 'IN',
      itemId: 'ITEM-C',
      warehouseId: 'WH-1',
      quantity: 3,
      unitCost: 20,
      referenceNumber: 'ADJ-MULTI-1',
      createdBy: 'u1',
    });
    const res = await database.invStockLedger.findAll({
      filters: [{ field: 'documentRef', operator: 'eq', value: 'ADJ-MULTI-1' }],
      pageSize: 10,
    } as any);
    expect(res.data.length).toBe(2);
  }, 60000);

  it('postTransfer moves stock OUT of source and IN to destination', async () => {
    await engine.postTransfer({
      itemId: 'ITEM-A',
      fromWarehouseId: 'WH-1',
      toWarehouseId: 'WH-2',
      quantity: 6,
      unitCost: 50,
      referenceNumber: 'TRF-TEST-1',
      createdBy: 'u1',
    });
    const src = await balanceOf('WH-1', 'ITEM-A');
    const dst = await balanceOf('WH-2', 'ITEM-A');
    expect(Number(src?.onHand)).toBeCloseTo(0, 2);
    expect(Number(dst?.onHand)).toBeCloseTo(6, 2);
    expect(Number(dst?.available)).toBeCloseTo(6, 2);

    const outRes = await database.invStockLedger.findAll({
      filters: [{ field: 'transactionType', operator: 'eq', value: 'transfer_out' }],
      pageSize: 10,
    } as any);
    const inRes = await database.invStockLedger.findAll({
      filters: [{ field: 'transactionType', operator: 'eq', value: 'transfer_in' }],
      pageSize: 10,
    } as any);
    const out = outRes.data.find((e: any) => e.warehouseId === 'WH-1');
    const inn = inRes.data.find((e: any) => e.warehouseId === 'WH-2');
    expect(out).toBeTruthy();
    expect(inn).toBeTruthy();
    expect(Number(out.quantity)).toBeCloseTo(6, 2);
    expect(Number(inn.quantity)).toBeCloseTo(6, 2);
    expect(out.fromWarehouseId).toBe('WH-1');
    expect(inn.toWarehouseId).toBe('WH-2');
  }, 60000);

  it('reverseMovement restores the balance and refuses double reversal', async () => {
    const moved = await engine.postMovement({
      transactionType: 'adjustment',
      direction: 'IN',
      itemId: 'ITEM-D',
      warehouseId: 'WH-1',
      quantity: 7,
      unitCost: 25,
      referenceNumber: 'ADJ-REV-1',
      createdBy: 'u1',
    });
    expect(Number((await balanceOf('WH-1', 'ITEM-D'))?.onHand)).toBeCloseTo(7, 2);

    const rev = await engine.reverseMovement(moved.entryNumber, 'wrong count', 'u1');
    expect(rev.success).toBe(true);
    expect(rev.reversalEntryNumber).toBeTruthy();
    // Balance restored to 0
    expect(Number((await balanceOf('WH-1', 'ITEM-D'))?.onHand)).toBeCloseTo(0, 2);

    // Reversal row linked to the original row by id, flagged isReversal
    const origRes = await database.invStockLedger.findAll({
      filters: [{ field: 'entryNumber', operator: 'eq', value: moved.entryNumber }],
      pageSize: 1,
    } as any);
    const linkedRes = await database.invStockLedger.findAll({
      filters: [{ field: 'reversalRefId', operator: 'eq', value: origRes.data[0].id }],
      pageSize: 1,
    } as any);
    expect(linkedRes.data.length).toBe(1);
    expect(linkedRes.data[0].isReversal).toBe(true);
    expect(linkedRes.data[0].direction).toBe('REVERSAL');

    // Double reversal must be rejected
    await expect(engine.reverseMovement(moved.entryNumber, 'again', 'u1')).rejects.toThrow(
      /already been reversed/i,
    );
  }, 60000);

  it('receiveTransfer posts stock movements and sets status', async () => {
    const transferSvc = new EnterpriseTransferService(
      database,
      engine,
      (database as any).auditService || ({ log: async () => undefined } as any),
    );
    const created = await transferSvc.createTransfer({
      sourceWarehouseId: 'WH-1',
      destinationWarehouseId: 'WH-2',
      items: [
        { itemId: 'ITEM-E', requestedQty: 8, unitCost: 30 },
        { itemId: 'ITEM-F', requestedQty: 5, unitCost: 40 },
      ],
      createdBy: 'u1',
    });
    const transferId = (created as any).id;
    await transferSvc.submitTransfer(transferId, 'u1');
    await transferSvc.approveTransfer(transferId, 'ok', 'u1');

    // Pre-seed source stock so the OUT has something to remove
    await engine.postMovement({
      transactionType: 'opening',
      direction: 'IN',
      itemId: 'ITEM-E',
      warehouseId: 'WH-1',
      quantity: 20,
      unitCost: 30,
      referenceNumber: 'OPEN-E',
      createdBy: 'u1',
    });
    await engine.postMovement({
      transactionType: 'opening',
      direction: 'IN',
      itemId: 'ITEM-F',
      warehouseId: 'WH-1',
      quantity: 10,
      unitCost: 40,
      referenceNumber: 'OPEN-F',
      createdBy: 'u1',
    });

    const received = await transferSvc.receiveTransfer({ id: transferId, userId: 'u1' });
    expect(received?.status).toBe('received');

    // Source reduced, destination increased
    expect(Number((await balanceOf('WH-1', 'ITEM-E'))?.onHand)).toBeCloseTo(12, 2);
    expect(Number((await balanceOf('WH-2', 'ITEM-E'))?.onHand)).toBeCloseTo(8, 2);
    expect(Number((await balanceOf('WH-1', 'ITEM-F'))?.onHand)).toBeCloseTo(5, 2);
    expect(Number((await balanceOf('WH-2', 'ITEM-F'))?.onHand)).toBeCloseTo(5, 2);

    // Transfer items carry received qty
    const items = (received as any).items || [];
    expect(items.find((i: any) => i.itemId === 'ITEM-E')?.receivedQty).toBe(8);
    expect(items.find((i: any) => i.itemId === 'ITEM-F')?.receivedQty).toBe(5);
  }, 60000);

  it('partial receive never double-posts previously received stock', async () => {
    const transferSvc = new EnterpriseTransferService(
      database,
      engine,
      (database as any).auditService || ({ log: async () => undefined } as any),
    );
    const created = await transferSvc.createTransfer({
      sourceWarehouseId: 'WH-1',
      destinationWarehouseId: 'WH-2',
      items: [{ itemId: 'ITEM-G', requestedQty: 10, unitCost: 12 }],
      createdBy: 'u1',
    });
    const transferId = (created as any).id;
    await transferSvc.submitTransfer(transferId, 'u1');
    await transferSvc.approveTransfer(transferId, 'ok', 'u1');
    await engine.postMovement({
      transactionType: 'opening',
      direction: 'IN',
      itemId: 'ITEM-G',
      warehouseId: 'WH-1',
      quantity: 10,
      unitCost: 12,
      referenceNumber: 'OPEN-G',
      createdBy: 'u1',
    });

    // First receive: only 4 of 10 → partially_received
    const partial = await transferSvc.receiveTransfer({
      id: transferId,
      items: [{ itemId: 'ITEM-G', receivedQty: 4 }],
      userId: 'u1',
    });
    expect(partial?.status).toBe('partially_received');
    expect(Number((await balanceOf('WH-2', 'ITEM-G'))?.onHand)).toBeCloseTo(4, 2);
    expect(Number((await balanceOf('WH-1', 'ITEM-G'))?.onHand)).toBeCloseTo(6, 2);

    // Second receive: remaining 6 — must NOT re-post the earlier 4
    const full = await transferSvc.receiveTransfer({
      id: transferId,
      items: [{ itemId: 'ITEM-G', receivedQty: 6 }],
      userId: 'u1',
    });
    expect(full?.status).toBe('received');
    expect(Number((await balanceOf('WH-2', 'ITEM-G'))?.onHand)).toBeCloseTo(10, 2);
    expect(Number((await balanceOf('WH-1', 'ITEM-G'))?.onHand)).toBeCloseTo(0, 2);

    // Over-receipt is clamped to the remaining approved quantity
    const created2 = await transferSvc.createTransfer({
      sourceWarehouseId: 'WH-1',
      destinationWarehouseId: 'WH-2',
      items: [{ itemId: 'ITEM-H', requestedQty: 5, unitCost: 9 }],
      createdBy: 'u1',
    });
    const t2 = (created2 as any).id;
    await transferSvc.submitTransfer(t2, 'u1');
    await transferSvc.approveTransfer(t2, 'ok', 'u1');
    await engine.postMovement({
      transactionType: 'opening',
      direction: 'IN',
      itemId: 'ITEM-H',
      warehouseId: 'WH-1',
      quantity: 5,
      unitCost: 9,
      referenceNumber: 'OPEN-H',
      createdBy: 'u1',
    });
    await transferSvc.receiveTransfer({
      id: t2,
      items: [{ itemId: 'ITEM-H', receivedQty: 999 }],
      userId: 'u1',
    });
    expect(Number((await balanceOf('WH-2', 'ITEM-H'))?.onHand)).toBeCloseTo(5, 2);
  }, 60000);
});
