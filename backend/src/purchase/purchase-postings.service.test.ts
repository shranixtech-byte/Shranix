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

import { PurchasePostingEngineService } from './purchase-postings.service';

/**
 * REAL-DB integration test for the purchase posting engine.
 *
 * Regression for a critical runtime bug: postInvoice wrote GL/GST/cash-book
 * rows using columns that do not exist in shranix_gl_entries /
 * shranix_gst_ledger / shranix_cash_book (e.g. `accountName`, `customerId`,
 * `taxableAmount`) — every post failed with NOT NULL / no-such-column errors.
 * This test applies the actual migrations and verifies the full posting flow
 * writes valid rows.
 */
describe('PurchasePostingEngineService (real DB)', () => {
  let dbDir: string;
  let database: DatabaseService;

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'purchase-post-'));
    const dbFile = join(dbDir, 'test.db');
    const client = createClient({ url: `file:${dbFile}` });
    const drizzleDb = drizzle(client as any);

    // Apply the real migrations (0000 → 0031)
    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    // Patch: some migrations (0028-0031) were added manually without drizzle snapshots.
    // Apply them directly if not already present.
    try {
      await client.execute(`ALTER TABLE shranix_sales_invoices ADD COLUMN branch_id TEXT`);
    } catch {
      /* column already exists */
    }
    try {
      await client.execute(`ALTER TABLE shranix_purchase_invoices ADD COLUMN branch_id TEXT`);
    } catch {
      /* column already exists */
    }

    database = new DatabaseService(drizzleDb as any);
  });

  afterAll(async () => {
    try {
      await (database as any).close?.();
    } catch {
      /* ignore */
    }
  });

  let seedSeq = 0;
  async function seedSupplierAndInvoice() {
    seedSeq += 1;
    // Chart-of-accounts control account (Sundry Creditor) so the GL summary row is written
    const accountsRes = await database.chartOfAccounts.findAll({ page: 1, pageSize: 5 } as any);
    if ((accountsRes?.data || []).length === 0) {
      await database.chartOfAccounts.create({
        accountName: 'Sundry Creditor',
        accountCode: 'SC-0001',
        accountType: 'liability',
        groupId: 'coa-root',
        openingBalance: 0,
        openingBalanceType: 'credit',
        currency: 'INR',
        isActive: true,
        costCenterRequired: false,
        gstApplicable: false,
        bankReconciliation: false,
        isCashAccount: false,
        isControlAccount: true,
        allowManualPosting: true,
      });
    }
    const supplier = await database.suppliers.create({
      name: `Test Supplier ${seedSeq}`,
      code: `SUP-TEST-${seedSeq}`,
      gstin: '27AAAAA0000A1Z5',
      status: 'active',
    });
    const ledger = await database.ledgerMaster.findById(supplier.id).catch(() => null);
    if (!ledger) {
      // Supplier creation may not mirror a ledger row in this test env
      await database.ledgerMaster.create({
        id: supplier.id,
        accountId: supplier.code || supplier.id,
        ledgerType: 'supplier',
        partyId: supplier.name,
        currentBalance: 0,
        openingBalance: 0,
        openingBalanceType: 'credit',
        creditLimit: 0,
        creditDays: 0,
        isActive: true,
      });
    }

    const invoice = await database.purchaseInvoices.create({
      invoiceNumber: `PI-TEST-${1000 + seedSeq}`,
      supplierId: supplier.id,
      invoiceDate: '2026-08-01',
      dueDate: '2026-08-15',
      subTotal: 1000,
      taxAmount: 180,
      grandTotal: 1180,
      roundOff: 0,
      paymentStatus: 'unpaid',
      paidAmount: 0,
      balanceAmount: 1180,
      status: 'draft',
    });
    return { supplier, invoice };
  }

  it('posts an invoice end-to-end with valid ledger/GL/GST/cash-book/audit rows', async () => {
    const { supplier, invoice } = await seedSupplierAndInvoice();

    const txn = new TransactionManager(database);
    const engine = new PurchasePostingEngineService(database, txn);

    const result = await engine.postInvoice(invoice.id, 'user-test-1');
    expect(result.success).toBe(true);

    // 1. Invoice status → posted
    const posted = await database.purchaseInvoices.findById(invoice.id);
    expect(posted?.status).toBe('posted');

    // 2. Supplier ledger currentBalance increased by grandTotal (₹1180)
    const ledger = await database.ledgerMaster.findById(supplier.id);
    expect(Number(ledger?.currentBalance || 0)).toBeCloseTo(1180, 2);

    // 3. GL entry row exists with the real column shape (account_id, voucher_id)
    const glRes = await database.glEntries.findAll({
      filters: [{ field: 'voucherId', operator: 'eq', value: invoice.id }],
      page: 1,
      pageSize: 10,
    } as any);
    expect(glRes.data.length).toBe(1);
    expect(glRes.data[0].accountId).toBeTruthy();
    expect(glRes.data[0].voucherType).toBe('purchase_invoice');
    expect(Number(glRes.data[0].debit)).toBeCloseTo(1180, 2);
    expect(Number(glRes.data[0].credit)).toBeCloseTo(1180, 2);

    // 4. GST ledger row exists with real columns (gst_type, input_output)
    const gstRes = await database.gstLedger.findAll({
      filters: [{ field: 'voucherId', operator: 'eq', value: invoice.id }],
      page: 1,
      pageSize: 10,
    } as any);
    expect(gstRes.data.length).toBe(1);
    expect(gstRes.data[0].gstType).toBe('input');
    expect(gstRes.data[0].inputOutput).toBe('input');
    expect(Number(gstRes.data[0].gstAmount)).toBeCloseTo(180, 2);

    // 5. Cash book rows (when present) must carry cash_account_id
    const cashRes = await database.cashBook.findAll({ page: 1, pageSize: 50 } as any);
    for (const row of cashRes.data) {
      expect(row.cashAccountId).toBeTruthy();
    }

    // 6. Audit log row created
    const auditRes = await database.auditLogs.findByEvent('purchase_invoice_posted', {
      page: 1,
      pageSize: 10,
    });
    expect(auditRes.data.some((a: any) => a.event === 'purchase_invoice_posted')).toBe(true);

    // 7. Notification row (user_id, not recipient_id)
    const notifRes = await database.notifications.findAll({
      filters: [{ field: 'type', operator: 'eq', value: 'purchase_invoice_posted' }],
      page: 1,
      pageSize: 10,
    } as any);
    expect(notifRes.data.some((n: any) => n.type === 'purchase_invoice_posted')).toBe(true);
  }, 60000);

  it('rejects double posting (invoice already posted)', async () => {
    const { invoice } = await seedSupplierAndInvoice();
    const txn = new TransactionManager(database);
    const engine = new PurchasePostingEngineService(database, txn);

    await engine.postInvoice(invoice.id, 'user-test-1');
    await expect(engine.postInvoice(invoice.id, 'user-test-1')).rejects.toThrow();
  }, 60000);
});
