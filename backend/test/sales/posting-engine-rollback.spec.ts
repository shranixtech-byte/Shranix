/**
 * SHRANIX KRUSHI ERP
 * Phase A - Task 2: Rollback Verification Test
 *
 * Tests that the posting engine's transaction rollback works correctly.
 *
 * Architecture:
 *   TransactionManager.executeInTransaction() wraps operations in
 *   drizzleDb.transaction(). The __currentTx is stored on the drizzle db
 *   object so repositories can pick it up via the activeDb getter.
 *   If a CRITICAL step throws, drizzle auto-rollbacks EVERYTHING.
 *
 * Posting engine design (v2):
 *   - FATAL (throw → rollback): invoice header update, stock ledger movement
 *   - BEST-EFFORT (catch → warn → posting continues): warehouse stock deduction,
 *     GL entry, GST ledger, payment/cash book, audit log, loyalty, notifications
 *     (fresh install par chart-of-accounts/accounts na hone par bhi invoice post
 *     ho sake — isliye financial sub-ledgers graceful degrade karte hain)
 *
 * Test scenarios:
 *   Test 1: Force Inventory (stock ledger) Failure → expect full rollback (fatal)
 *   Test 2: Force GL/Journal Failure → best-effort, posting still succeeds
 *   Test 3: Force GST Failure → best-effort, posting still succeeds
 *   Test 4: Force Customer Ledger Failure → non-fatal, posting still succeeds
 *   Test 5: Success path → all steps committed
 *   Test 6: Force Payment/Cash Book Failure → best-effort, posting still succeeds
 *   Test 7: Force Audit Failure → best-effort, posting still succeeds
 */

import { ConflictException } from '@nestjs/common';
import { describe, it, expect, beforeEach } from 'vitest';

import { TransactionManager } from '../../src/automation/transaction.manager';
import { InventoryPostingEngine } from '../../src/inventory/services';
import {
  PostingEngineService,
  type PostingPayload,
  type InvoicePostingInput,
} from '../../src/sales/posting-engine.service';

// ═════════════════════════════════════════════════════════
// TEST DATA HELPERS
// ═════════════════════════════════════════════════════════

function createMockInvoicePostingInput(): InvoicePostingInput {
  return {
    id: 'inv-001',
    invoiceNumber: 'INV-2026-00001',
    invoiceDate: '2026-07-30T00:00:00.000Z',
    dueDate: '2026-08-29T00:00:00.000Z',
    customerId: 'cust-001',
    customerName: 'Test Customer',
    placeOfSupply: 'Maharashtra',
    billingAddress: 'Mumbai',
    salesPerson: 'SP-001',
    notes: 'Test invoice',
    paymentTerms: '30 days',
    status: 'draft',
    grossTotal: 118000,
    itemDiscountTotal: 0,
    taxableAfterDiscount: 100000,
    cgstTotal: 9000,
    sgstTotal: 9000,
    igstTotal: 0,
    cessTotal: 0,
    roundOff: 0,
    grandTotal: 118000,
    totalPaid: 0,
    balance: 118000,
    customerGstin: '27AAAAA0000A1Z5',
    gstCategory: 'intra_state',
    isInterState: false,
    items: [
      {
        id: 'item-001',
        productId: 'prod-001',
        productName: 'Test Product',
        sku: 'TP-001',
        hsn: '8471',
        batchNo: 'B-2026-001',
        expiryDate: '2027-07-30',
        warehouse: 'Main',
        uom: 'PCS',
        quantity: 10,
        rate: 10000,
        discountPercent: 0,
        gstPercent: 18,
        taxableAmount: 100000,
        cgstAmount: 9000,
        sgstAmount: 9000,
        igstAmount: 0,
        cessAmount: 0,
        amount: 118000,
        availableStock: 100,
      },
    ],
    paymentSplits: [{ method: 'credit', amount: 118000, refNo: '', bankName: '' }],
    userId: 'user-001',
    userEmail: 'user@example.com',
  };
}

function createMockPostingPayload(input: InvoicePostingInput): PostingPayload {
  return {
    invoiceId: input.id,
    invoiceNumber: input.invoiceNumber,
    customerId: input.customerId,
    customerName: input.customerName,
    invoiceDate: input.invoiceDate,
    grandTotal: input.grandTotal,
    status: input.status,
    validations: [],
    accounting: {
      entryNumber: 'SINV-TEST-001',
      entryDate: input.invoiceDate,
      voucherNumber: input.invoiceNumber,
      voucherType: 'sales_invoice',
      narration: 'Test entry',
      entries: [
        {
          accountName: 'Test Customer - Sundry Debtor',
          accountType: 'debit' as const,
          amount: input.grandTotal,
          narration: 'Test',
        },
        {
          accountName: 'Sales Account',
          accountType: 'credit' as const,
          amount: input.taxableAfterDiscount,
          narration: 'Test',
        },
        {
          accountName: 'CGST Output Account',
          accountType: 'credit' as const,
          amount: input.cgstTotal,
          narration: 'Test',
        },
        {
          accountName: 'SGST Output Account',
          accountType: 'credit' as const,
          amount: input.sgstTotal,
          narration: 'Test',
        },
      ],
      totalDebit: input.grandTotal,
      totalCredit: input.taxableAfterDiscount + input.cgstTotal + input.sgstTotal,
      balanced: true,
    },
    customerLedger: {
      customerId: input.customerId,
      customerName: input.customerName,
      openingBalance: 0,
      invoiceAmount: input.grandTotal,
      paymentAmount: 0,
      outstanding: input.grandTotal,
      closingBalance: input.grandTotal,
      runningBalance: input.grandTotal,
    },
    stockPostings: [
      {
        itemId: 'prod-001',
        productName: 'Test Product',
        sku: 'TP-001',
        warehouse: 'Main',
        quantity: 10,
        batchNo: 'B-2026-001',
        expiryDate: '2027-07-30',
        costMethod: 'average',
        unitCost: 7000,
        totalCost: 70000,
        closingQty: 90,
      },
    ],
    batchManagement: [
      {
        batchNo: 'B-2026-001',
        expiryDate: '2027-07-30',
        mfgDate: '2026-01-01',
        openingQty: 100,
        soldQty: 10,
        closingQty: 90,
        status: 'healthy',
      },
    ],
    costing: [
      {
        method: 'average',
        itemId: 'prod-001',
        productName: 'Test Product',
        sellingRate: 10000,
        unitCost: 7000,
        quantity: 10,
        totalRevenue: 118000,
        totalCost: 70000,
        grossMargin: 48000,
        grossMarginPercent: 40.68,
      },
    ],
    auditLog: {
      event: 'invoice_posted',
      userId: input.userId,
      userName: input.userEmail || 'System',
      oldValue: 'draft',
      newValue: 'posted',
      ip: '127.0.0.1',
      device: 'Web Browser',
      timestamp: new Date().toISOString(),
    },
    approval: {
      documentType: 'sales_invoice',
      documentId: input.id,
      status: 'posted',
      requestedBy: input.userId,
      approvedBy: '',
      comments: 'Auto-approved',
      approvalLevel: 1,
    },
    events: [
      {
        event: 'created' as const,
        invoiceNumber: input.invoiceNumber,
        customerId: input.customerId,
        grandTotal: input.grandTotal,
        timestamp: input.invoiceDate,
        triggeredBy: input.userId,
      },
      {
        event: 'posted' as const,
        invoiceNumber: input.invoiceNumber,
        customerId: input.customerId,
        grandTotal: input.grandTotal,
        timestamp: new Date().toISOString(),
        triggeredBy: input.userId,
      },
    ],
    timestamp: new Date().toISOString(),
    canPost: true,
  };
}

// ═════════════════════════════════════════════════════════
// MOCK REPOSITORY FACTORY
// ═════════════════════════════════════════════════════════

interface CallRecord {
  repository: string;
  method: string;
  timestamp: number;
}

type FailureMode = 'none' | 'inventory' | 'journal' | 'gst' | 'ledger' | 'payment' | 'audit';

/**
 * Creates a complete mock DatabaseService with repositories that can be
 * configured to fail at specific steps for rollback verification.
 *
 * The drizzle db object has a `transaction()` function that sets `__currentTx`
 * — the same mechanism the real TransactionManager uses. This allows us to
 * verify that repositories use `activeDb` (which checks `__currentTx`) correctly.
 */
function createMockDatabase(failureMode: FailureMode = 'none'): {
  db: any;
  calls: CallRecord[];
  seed: (name: string, id: string, data: any) => void;
} {
  const calls: CallRecord[] = [];
  let _stepCounter = 0; // step counter (rollback ordering diagnostics)

  const record = (repo: string, method: string) => {
    calls.push({ repository: repo, method, timestamp: Date.now() });
  };

  // In-memory store per repository. drizzleDb.transaction snapshots the stores
  // and RESTORES them on failure — a real simulation of database rollback, so
  // tests can assert that no partial state survives a failed transaction.
  const stores = new Map<string, Map<string, any>>();
  const getStore = (name: string) => {
    let rows = stores.get(name);
    if (!rows) {
      rows = new Map<string, any>();
      stores.set(name, rows);
    }
    return rows;
  };
  const snapshotStores = () => {
    const snap = new Map<string, Map<string, any>>();
    for (const [name, rows] of stores) {
      snap.set(name, new Map([...rows].map(([id, row]) => [id, { ...row }])));
    }
    return snap;
  };
  const restoreStores = (snap: Map<string, Map<string, any>>) => {
    for (const [name, rows] of stores) {
      rows.clear();
      const saved = snap.get(name);
      if (saved) {
        for (const [id, row] of saved) {
          rows.set(id, { ...row });
        }
      }
    }
  };

  const createRepo = (name: string) => {
    const rows = getStore(name);
    let seq = 0;
    const forcedFailure = () => {
      if (failureMode === 'inventory' && name === 'invStockLedger') {
        throw new ConflictException(`Forced rollback: ${name}.create failed`);
      }
      if (failureMode === 'journal' && name === 'glEntries') {
        throw new ConflictException(`Forced rollback: ${name}.create failed`);
      }
      if (failureMode === 'gst' && name === 'gstLedger') {
        throw new ConflictException(`Forced rollback: ${name}.create failed`);
      }
      if (failureMode === 'ledger' && name === 'ledgerMaster') {
        throw new ConflictException(`Forced rollback: ${name}.create failed`);
      }
      if (failureMode === 'payment' && name === 'cashBook') {
        throw new ConflictException(`Forced rollback: ${name}.create failed`);
      }
      if (failureMode === 'audit' && name === 'auditLogs') {
        throw new ConflictException(`Forced rollback: ${name}.create failed`);
      }
    };
    return {
      create: async (data: any) => {
        record(name, 'create');
        _stepCounter++;
        const id = data?.id || `${name}-${Date.now()}-${++seq}`;
        const row = { id, ...data };
        rows.set(id, row);
        // Fail AFTER the write so the rollback must actually undo it.
        forcedFailure();
        return row;
      },
      update: async (id: string, data: any) => {
        record(name, 'update');
        const existing = rows.get(id) || { id };
        const row = { ...existing, ...data };
        rows.set(id, row);
        return row;
      },
      findById: async (id: string) => {
        record(name, 'findById');
        return rows.get(id) || null;
      },
      findAll: async (_params?: any) => {
        record(name, 'findAll');
        return { data: [...rows.values()], total: rows.size };
      },
    };
  };

  // Drizzle-like db object with transaction support + rollback simulation
  const drizzleDb: any = {};
  drizzleDb.db = drizzleDb;
  drizzleDb.transaction = async (fn: (tx: any) => Promise<any>) => {
    drizzleDb.__currentTx = drizzleDb;
    const snap = snapshotStores();
    try {
      return await fn(drizzleDb);
    } catch (e) {
      // Simulate real database rollback: undo every write performed in the tx.
      restoreStores(snap);
      throw e;
    } finally {
      drizzleDb.__currentTx = null;
    }
  };

  const repos = {
    salesInvoices: createRepo('salesInvoices'),
    invoiceItems: createRepo('invoiceItems'),
    // H1 canonical inventory ledger + balance projection (postMovementCore boundary)
    invStockLedger: createRepo('invStockLedger'),
    invStockBalance: createRepo('invStockBalance'),
    warehouses: createRepo('warehouses'),
    warehouseStock: {
      ...createRepo('warehouseStock'),
      findAll: async (_params?: any) => {
        record('warehouseStock', 'findAll');
        return { data: [{ id: 'stock-001', quantity: 100 }], total: 1 };
      },
    },
    stockLedger: createRepo('stockLedger'),
    ledgerMaster: createRepo('ledgerMaster'),
    glEntries: createRepo('glEntries'),
    gstLedger: createRepo('gstLedger'),
    cashBook: createRepo('cashBook'),
    auditLogs: createRepo('auditLogs'),
    notifications: createRepo('notifications'),
    // GL/GST/Payment steps pehle chart of accounts lookup karte hain —
    // receivable + cash account available ho to hi entry banati hain.
    chartOfAccounts: {
      ...createRepo('chartOfAccounts'),
      findAll: async (_params?: any) => {
        record('chartOfAccounts', 'findAll');
        return {
          data: [
            { id: 'acct-receivable', accountName: 'Sundry Debtors', isControlAccount: true },
            { id: 'acct-cash', accountName: 'Cash in Hand', isCashAccount: true },
          ],
          total: 2,
        };
      },
    },
  };

  return {
    db: { ...repos, db: drizzleDb },
    calls,
    /** Seed a pre-existing record into a repo's in-memory store. */
    seed: (name: string, id: string, data: any) => {
      getStore(name).set(id, data);
    },
  };
}

// ═════════════════════════════════════════════════════════
// TESTS: PostingEngineService - Transaction Rollback
// ═════════════════════════════════════════════════════════

/**
 * Builds a PostingEngineService wired with the REAL InventoryPostingEngine and
 * a stocked balance row, so every test exercises the canonical postMovementCore
 * boundary used in production (shranix_inv_stock_ledger + inv_stock_balance).
 */
function createPostingEngineWithMock(failureMode: FailureMode = 'none') {
  const mock = createMockDatabase(failureMode);
  mock.seed('invStockBalance', 'bal-001', {
    id: 'bal-001',
    warehouseId: 'Main',
    itemId: 'prod-001',
    onHand: 100,
    available: 100,
    reserved: 0,
  });
  const txManager = new TransactionManager(mock.db);
  const postingEngine = new InventoryPostingEngine(mock.db, txManager, {
    log: async () => {},
  } as any);
  const engine = new PostingEngineService(mock.db, txManager, postingEngine);
  return { mock, engine };
}

describe('PostingEngineService - Transaction Rollback', () => {
  let input: InvoicePostingInput;
  let payload: PostingPayload;

  beforeEach(() => {
    input = createMockInvoicePostingInput();
    payload = createMockPostingPayload(input);
  });

  it('Test 1: Force canonical inventory ledger write failure → expect full transactional rollback', async () => {
    const { mock, engine } = createPostingEngineWithMock('inventory');
    // Pre-existing state: a draft invoice for this posting.
    mock.seed('salesInvoices', payload.invoiceId, { id: payload.invoiceId, status: 'draft' });

    await expect(engine.triggerPosting(payload, 'user-001')).rejects.toThrow(ConflictException);

    // The canonical ledger write was attempted (the failing step).
    const ledgerCalls = mock.calls.filter(
      (c) => c.repository === 'invStockLedger' && c.method === 'create',
    );
    expect(ledgerCalls.length).toBeGreaterThan(0);

    // ── REAL rollback verification — no partial state remains ──
    // 1. The invoice header was flipped to 'posted' inside the tx and must be back to draft.
    const invoice = await mock.db.salesInvoices.findById(payload.invoiceId);
    expect(invoice?.status).toBe('draft');
    // 2. No canonical ledger rows survive the rollback.
    const ledgerRows = (await mock.db.invStockLedger.findAll({})) as any;
    expect(ledgerRows.data.length).toBe(0);
    // 3. The balance projection mutation (OUT 10 of 100) was rolled back too —
    //    stock mutation and ledger write are atomic (H1.8).
    const balanceRows = (await mock.db.invStockBalance.findAll({})) as any;
    expect(balanceRows.data.length).toBe(1);
    expect(balanceRows.data[0].onHand).toBe(100);
  });

  it('Test 2: Force Journal Failure → GL step is best-effort, posting still succeeds', async () => {
    const { mock, engine } = createPostingEngineWithMock('journal');

    // GL entry is non-fatal — a failure must NOT roll back / fail the whole posting
    const result = await engine.triggerPosting(payload, 'user-001');
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);

    // glEntries.create should still have been attempted (and gracefully contained)
    const glCalls = mock.calls.filter((c) => c.repository === 'glEntries' && c.method === 'create');
    expect(glCalls.length).toBeGreaterThan(0);
  });

  it('Test 3: Force GST Failure → GST step is best-effort, posting still succeeds', async () => {
    const { mock, engine } = createPostingEngineWithMock('gst');

    const result = await engine.triggerPosting(payload, 'user-001');
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);

    // gstLedger.create should still have been attempted
    const gstCalls = mock.calls.filter(
      (c) => c.repository === 'gstLedger' && c.method === 'create',
    );
    expect(gstCalls.length).toBeGreaterThan(0);
  });

  it('Test 4: Customer ledger is derived (not posted directly) → failure mode is non-fatal', async () => {
    // NOTE: the posting engine no longer writes ledgerMaster directly (customer
    // ledger is derived from GL + sales invoice). This test documents that a
    // ledgerMaster failure mode can never fire — posting simply succeeds.
    const { mock, engine } = createPostingEngineWithMock('ledger');

    const result = await engine.triggerPosting(payload, 'user-001');
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
    // The failing repo must never have been touched
    const ledgerCalls = mock.calls.filter(
      (c) => c.repository === 'ledgerMaster' && c.method === 'create',
    );
    expect(ledgerCalls.length).toBe(0);
  });

  it('Test 5: Success path → all 10 operations succeed', async () => {
    const { mock, engine } = createPostingEngineWithMock('none');

    const result = await engine.triggerPosting(payload, 'user-001');

    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);

    // Verify multiple repository operations were executed
    const totalOps = mock.calls.filter((c) => c.method === 'create' || c.method === 'update');
    expect(totalOps.length).toBeGreaterThan(5);
  });

  it('Test 6: Force Payment Failure → payment step is best-effort, posting still succeeds', async () => {
    const { mock, engine } = createPostingEngineWithMock('payment');

    // Cash book path tabhi chalta hai jab payment amount > 0 ho
    payload.customerLedger.paymentAmount = 50000;

    const result = await engine.triggerPosting(payload, 'user-001');
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);

    // cashBook.create should still have been attempted (and gracefully contained)
    const cashCalls = mock.calls.filter(
      (c) => c.repository === 'cashBook' && c.method === 'create',
    );
    expect(cashCalls.length).toBeGreaterThan(0);
  });

  it('Test 7: Force Audit Failure → audit step is best-effort, posting still succeeds', async () => {
    const { mock, engine } = createPostingEngineWithMock('audit');

    const result = await engine.triggerPosting(payload, 'user-001');
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);

    // auditLogs.create should still have been attempted
    const auditCalls = mock.calls.filter(
      (c) => c.repository === 'auditLogs' && c.method === 'create',
    );
    expect(auditCalls.length).toBeGreaterThan(0);
  });

  it('Test 8: Already-posted invoice → posting is skipped (idempotency guard)', async () => {
    const { mock, engine } = createPostingEngineWithMock('none');
    // Simulate a retry / double-click / lost response: invoice is already posted
    mock.db.salesInvoices.findById = async () => ({ id: payload.invoiceId, status: 'posted' });

    const result = await engine.triggerPosting(payload, 'user-001');
    expect(result.success).toBe(true);
    expect(result.message).toContain('already posted');

    // Stock must NOT be deducted a second time — no canonical ledger writes at all
    const ledgerCalls = mock.calls.filter(
      (c) => c.repository === 'invStockLedger' && c.method === 'create',
    );
    expect(ledgerCalls.length).toBe(0);
    const balanceCalls = mock.calls.filter(
      (c) => c.repository === 'invStockBalance' && c.method === 'update',
    );
    expect(balanceCalls.length).toBe(0);
    const glCalls = mock.calls.filter((c) => c.repository === 'glEntries' && c.method === 'create');
    expect(glCalls.length).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════
// TESTS: TransactionManager - activeDb propagation
// ═════════════════════════════════════════════════════════

describe('TransactionManager - activeDb propagation', () => {
  it('should propagate __currentTx to repositories via activeDb getter', async () => {
    const mock = createMockDatabase('none');
    const txManager = new TransactionManager(mock.db);

    const result = await txManager.executeInTransaction(async (ctx) => {
      expect(ctx.tx).not.toBeNull();
      return 'tx-success';
    });

    expect(result).toBe('tx-success');
  });

  it('should auto-rollback on error', async () => {
    const mock = createMockDatabase('none');
    const txManager = new TransactionManager(mock.db);

    await expect(
      txManager.executeInTransaction(async (_ctx) => {
        throw new Error('Forced rollback error');
      }),
    ).rejects.toThrow('Forced rollback error');
  });

  it('should clean up __currentTx after transaction completes', async () => {
    const mock = createMockDatabase('none');
    const txManager = new TransactionManager(mock.db);

    // Before transaction: __currentTx should be null
    expect(mock.db.db.__currentTx).toBeUndefined();

    await txManager.executeInTransaction(async (_ctx) => {
      // During transaction: __currentTx should be set
      expect(mock.db.db.__currentTx).not.toBeNull();
      return 'done';
    });

    // After transaction: __currentTx should be cleaned up
    expect(mock.db.db.__currentTx).toBeNull();
  });

  it('should clean up __currentTx even when transaction fails', async () => {
    const mock = createMockDatabase('none');
    const txManager = new TransactionManager(mock.db);

    try {
      await txManager.executeInTransaction(async (_ctx) => {
        throw new Error('Abort!');
      });
    } catch {
      // Expected
    }

    // Cleanup should still happen in the finally block
    expect(mock.db.db.__currentTx).toBeNull();
  });
});
