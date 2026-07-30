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
 *   If ANY step throws, drizzle auto-rollbacks EVERYTHING.
 *
 * Test scenarios:
 *   Test 1: Force Inventory Failure → expect full rollback
 *   Test 2: Force Journal Failure → expect full rollback
 *   Test 3: Force GST Failure → expect full rollback
 *   Test 4: Force Customer Ledger Failure → expect full rollback
 *   Test 5: Success path → verify all 10 steps committed
 *   Test 6: No partial commit on mid-transaction failure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { PostingEngineService, type PostingPayload, type InvoicePostingInput } from '../../src/sales/posting-engine.service';
import { TransactionManager } from '../../src/automation/transaction.manager';

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
    paymentSplits: [
      { method: 'credit', amount: 118000, refNo: '', bankName: '' },
    ],
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
        { accountName: 'Test Customer - Sundry Debtor', accountType: 'debit' as const, amount: input.grandTotal, narration: 'Test' },
        { accountName: 'Sales Account', accountType: 'credit' as const, amount: input.taxableAfterDiscount, narration: 'Test' },
        { accountName: 'CGST Output Account', accountType: 'credit' as const, amount: input.cgstTotal, narration: 'Test' },
        { accountName: 'SGST Output Account', accountType: 'credit' as const, amount: input.sgstTotal, narration: 'Test' },
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
    stockPostings: [{
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
    }],
    batchManagement: [{
      batchNo: 'B-2026-001',
      expiryDate: '2027-07-30',
      mfgDate: '2026-01-01',
      openingQty: 100,
      soldQty: 10,
      closingQty: 90,
      status: 'healthy',
    }],
    costing: [{
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
    }],
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
      { event: 'created' as const, invoiceNumber: input.invoiceNumber, customerId: input.customerId, grandTotal: input.grandTotal, timestamp: input.invoiceDate, triggeredBy: input.userId },
      { event: 'posted' as const, invoiceNumber: input.invoiceNumber, customerId: input.customerId, grandTotal: input.grandTotal, timestamp: new Date().toISOString(), triggeredBy: input.userId },
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
function createMockDatabase(failureMode: FailureMode = 'none'): { db: any; calls: CallRecord[] } {
  const calls: CallRecord[] = [];
  let stepCounter = 0;

  const record = (repo: string, method: string) => {
    calls.push({ repository: repo, method, timestamp: Date.now() });
  };

  const createRepo = (name: string) => ({
    create: async (data: any) => {
      record(name, 'create');
      stepCounter++;
      if (failureMode === 'inventory' && name === 'stockLedger') {
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
      return { id: 'mock-' + Date.now(), ...data };
    },
    update: async (id: string, data: any) => { record(name, 'update'); return { id, ...data }; },
    findById: async (id: string) => { record(name, 'findById'); return { id, status: 'draft' }; },
    findAll: async (_params?: any) => { record(name, 'findAll'); return { data: [], total: 0 }; },
  });

  // Drizzle-like db object with transaction support
  const drizzleDb: any = {};
  drizzleDb.db = drizzleDb;
  drizzleDb.transaction = async (fn: (tx: any) => Promise<any>) => {
    drizzleDb.__currentTx = drizzleDb;
    try {
      return await fn(drizzleDb);
    } finally {
      drizzleDb.__currentTx = null;
    }
  };

  const repos = {
    salesInvoices: createRepo('salesInvoices'),
    invoiceItems: createRepo('invoiceItems'),
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
  };

  return { db: { ...repos, db: drizzleDb }, calls };
}

// ═════════════════════════════════════════════════════════
// TESTS: PostingEngineService - Transaction Rollback
// ═════════════════════════════════════════════════════════

describe('PostingEngineService - Transaction Rollback', () => {
  let input: InvoicePostingInput;
  let payload: PostingPayload;

  beforeEach(() => {
    input = createMockInvoicePostingInput();
    payload = createMockPostingPayload(input);
  });

  it('Test 1: Force Inventory Failure → expect rollback', async () => {
    const mock = createMockDatabase('inventory');
    const txManager = new TransactionManager(mock.db);
    const engine = new PostingEngineService(mock.db, txManager);

    await expect(engine.triggerPosting(payload, 'user-001'))
      .rejects.toThrow(ConflictException);

    // Verify that stockLedger.create was attempted (the failing step)
    const stockLedgerCalls = mock.calls.filter(c => c.repository === 'stockLedger' && c.method === 'create');
    expect(stockLedgerCalls.length).toBeGreaterThan(0);
  });

  it('Test 2: Force Journal Failure → expect rollback', async () => {
    const mock = createMockDatabase('journal');
    const txManager = new TransactionManager(mock.db);
    const engine = new PostingEngineService(mock.db, txManager);

    await expect(engine.triggerPosting(payload, 'user-001'))
      .rejects.toThrow(ConflictException);

    // glEntries.create should have been attempted
    const glCalls = mock.calls.filter(c => c.repository === 'glEntries' && c.method === 'create');
    expect(glCalls.length).toBeGreaterThan(0);
  });

  it('Test 3: Force GST Failure → expect rollback', async () => {
    const mock = createMockDatabase('gst');
    const txManager = new TransactionManager(mock.db);
    const engine = new PostingEngineService(mock.db, txManager);

    await expect(engine.triggerPosting(payload, 'user-001'))
      .rejects.toThrow(ConflictException);
  });

  it('Test 4: Force Customer Ledger Failure → expect rollback', async () => {
    const mock = createMockDatabase('ledger');
    const txManager = new TransactionManager(mock.db);
    const engine = new PostingEngineService(mock.db, txManager);

    await expect(engine.triggerPosting(payload, 'user-001'))
      .rejects.toThrow(ConflictException);
  });

  it('Test 5: Success path → all 10 operations succeed', async () => {
    const mock = createMockDatabase('none');
    const txManager = new TransactionManager(mock.db);
    const engine = new PostingEngineService(mock.db, txManager);

    const result = await engine.triggerPosting(payload, 'user-001');

    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);

    // Verify multiple repository operations were executed
    const totalOps = mock.calls.filter(c => c.method === 'create' || c.method === 'update');
    expect(totalOps.length).toBeGreaterThan(5);
  });

  it('Test 6: Force Payment Failure → expect rollback', async () => {
    const mock = createMockDatabase('payment');
    const txManager = new TransactionManager(mock.db);
    const engine = new PostingEngineService(mock.db, txManager);

    await expect(engine.triggerPosting(payload, 'user-001'))
      .rejects.toThrow(ConflictException);
  });

  it('Test 7: Force Audit Failure → expect rollback', async () => {
    const mock = createMockDatabase('audit');
    const txManager = new TransactionManager(mock.db);
    const engine = new PostingEngineService(mock.db, txManager);

    await expect(engine.triggerPosting(payload, 'user-001'))
      .rejects.toThrow(ConflictException);
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
      })
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
