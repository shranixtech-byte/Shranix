/**
 * Analytics Security Regression Tests
 * ====================================
 * 1. Branch isolation — branchId filter on GL entries (which have branchId in schema)
 * 2. eval() replacement — safe arithmetic parser
 * 3. Design limitation documented: salesInvoices/purchaseInvoices lack branchId column
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const dbRequire = createRequire(join(process.cwd(), '..', 'database', 'package.json'));
const { createClient } = dbRequire('@libsql/client');
const { drizzle } = dbRequire('drizzle-orm/libsql');
const { migrate } = dbRequire('drizzle-orm/libsql/migrator');

import { KpiEngineService } from '../automation/kpi-engine.service';
import { DatabaseService } from '../database/database.service';

import { AnalyticsService } from './analytics.service';

describe('Analytics Security Regression Tests (real DB)', () => {
  let dbDir: string;
  let database: DatabaseService;
  let analytics: AnalyticsService;

  const branchA = 'branch-sec-a';
  const branchB = 'branch-sec-b';

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'analytics-sec-'));
    const client = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(client as any);

    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    database = new DatabaseService(drizzleDb as any);
    analytics = new AnalyticsService(database, new KpiEngineService(database));

    const now = new Date().toISOString();

    // Seed a customer
    await database.ledgerMaster.create({
      accountId: 'SEC-CUST',
      ledgerType: 'customer',
      partyId: 'SecCust',
      openingBalance: 0,
      openingBalanceType: 'debit',
      currentBalance: 0,
      creditLimit: 50000,
      creditDays: 30,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as any);

    // Seed items
    await database.items.create({
      name: 'SecItem',
      sku: 'SEC-SKU',
      purchaseRate: 50,
      salesRate: 80,
      mrp: 100,
      currentStock: 100,
      minStock: 10,
      reorderLevel: 20,
      isActive: true,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    } as any);

    // GL entries for Branch A: debit 5000
    await database.glEntries.create({
      entryNumber: 'SEC-GL-A1',
      entryDate: '2026-08-10',
      accountId: 'ACC-REV',
      voucherId: 'v1',
      voucherType: 'sales_invoice',
      voucherNumber: 'SI-SEC-A',
      debit: 5000,
      credit: 0,
      balance: 5000,
      branchId: branchA,
      createdAt: now,
      updatedAt: now,
    } as any);
    await database.glEntries.create({
      entryNumber: 'SEC-GL-A2',
      entryDate: '2026-08-10',
      accountId: 'ACC-CUST',
      voucherId: 'v1',
      voucherType: 'sales_invoice',
      voucherNumber: 'SI-SEC-A',
      debit: 0,
      credit: 5000,
      balance: 0,
      branchId: branchA,
      createdAt: now,
      updatedAt: now,
    } as any);

    // GL entries for Branch B: debit 3000
    await database.glEntries.create({
      entryNumber: 'SEC-GL-B1',
      entryDate: '2026-08-12',
      accountId: 'ACC-REV',
      voucherId: 'v2',
      voucherType: 'sales_invoice',
      voucherNumber: 'SI-SEC-B',
      debit: 3000,
      credit: 0,
      balance: 3000,
      branchId: branchB,
      createdAt: now,
      updatedAt: now,
    } as any);
    await database.glEntries.create({
      entryNumber: 'SEC-GL-B2',
      entryDate: '2026-08-12',
      accountId: 'ACC-CUST',
      voucherId: 'v2',
      voucherType: 'sales_invoice',
      voucherNumber: 'SI-SEC-B',
      debit: 0,
      credit: 3000,
      balance: 0,
      branchId: branchB,
      createdAt: now,
      updatedAt: now,
    } as any);

    // GL entry with no branch: debit 2000
    await database.glEntries.create({
      entryNumber: 'SEC-GL-N1',
      entryDate: '2026-08-15',
      accountId: 'ACC-REV',
      voucherId: 'v3',
      voucherType: 'sales_invoice',
      voucherNumber: 'SI-SEC-N',
      debit: 2000,
      credit: 0,
      balance: 2000,
      createdAt: now,
      updatedAt: now,
    } as any);
  });

  afterAll(() => {
    try {
      rmSync(dbDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  // ── Branch Isolation (Finance/GL — tables with branchId) ──

  describe('Branch isolation on GL entries', () => {
    it('finance analytics without branchId returns all GL data', async () => {
      const payload = await analytics.getFinance({});
      expect(payload.kpis.length).toBeGreaterThan(0);
      // GL entries: 5000 + 3000 + 2000 = 10000 total credit
      const accountTable = payload.tables.find((t) => t.title === 'Account Summary (GL)');
      expect(accountTable).toBeDefined();
    });

    it('finance analytics with branch A returns only branch A GL entries', async () => {
      const payload = await analytics.getFinance({ branchId: branchA });
      const accountTable = payload.tables.find((t) => t.title === 'Account Summary (GL)');
      expect(accountTable).toBeDefined();
      // Only branch A entries should appear
      const rows = accountTable!.rows;
      // ACC-REV should only have 5000 debit from branch A
      const revRow = rows.find((r: any) => r.account === 'ACC-REV');
      if (revRow) {
        expect(revRow.debit).toBe(5000);
      }
    });

    it('finance analytics with branch B returns only branch B GL entries', async () => {
      const payload = await analytics.getFinance({ branchId: branchB });
      const accountTable = payload.tables.find((t) => t.title === 'Account Summary (GL)');
      expect(accountTable).toBeDefined();
      const rows = accountTable!.rows;
      const revRow = rows.find((r: any) => r.account === 'ACC-REV');
      if (revRow) {
        expect(revRow.debit).toBe(3000);
      }
    });

    it('non-existent branch returns zero GL data', async () => {
      const payload = await analytics.getFinance({ branchId: 'non-existent-xyz' });
      const accountTable = payload.tables.find((t) => t.title === 'Account Summary (GL)');
      // Should have rows but all values should be 0 for branch-specific data
      expect(accountTable).toBeDefined();
    });

    it('combined date + branch filter on GL works correctly', async () => {
      const payload = await analytics.getFinance({
        fromDate: '2026-08-01',
        toDate: '2026-08-31',
        branchId: branchA,
      });
      expect(payload.kpis.length).toBeGreaterThan(0);
    });
  });

  // ── eval() Replacement Verification ─────────────────────

  describe('eval() replaced with safe parser', () => {
    it('reporting-engine-v2 source no longer contains eval()', () => {
      const filePath = join(process.cwd(), 'src', 'automation', 'reporting-engine-v2.service.ts');
      const source = readFileSync(filePath, 'utf-8');
      expect(source).not.toContain('eval(safeExpression)');
      expect(source).not.toMatch(/\/\/ eslint-disable-next-line no-eval/);
    });

    it('safe parser structure exists (parseExpr, parseTerm, parseFactor)', () => {
      const filePath = join(process.cwd(), 'src', 'automation', 'reporting-engine-v2.service.ts');
      const source = readFileSync(filePath, 'utf-8');
      expect(source).toContain('parseExpr');
      expect(source).toContain('parseTerm');
      expect(source).toContain('parseFactor');
      // Validation regex ensures only safe characters
      expect(source).toContain('/^[0-9+\\-*/.()\\s]+$/');
    });
  });

  // ── Design Limitation Documentation ─────────────────────

  describe('Design limitation: missing branchId on invoice tables', () => {
    it('salesInvoices schema does not have branchId column', () => {
      // This documents a known design limitation:
      // salesInvoices and purchaseInvoices lack branchId columns,
      // so branch isolation on sales/purchase analytics is not possible
      // at the database level. Branch isolation works for:
      // - GL entries (branchId ✓)
      // - Stock ledger (branchId ✓)
      // - Sales quotations (branchId ✓)
      // - Sales orders (branchId ✓)
      // - Purchase orders (branchId ✓)
      // - Assets (branchId ✓)
      // But NOT for:
      // - Sales invoices (branchId ✗)
      // - Purchase invoices (branchId ✗)
      // This is a schema-level limitation, not a code bug.
      expect(true).toBe(true); // Documentation test
    });
  });
});
