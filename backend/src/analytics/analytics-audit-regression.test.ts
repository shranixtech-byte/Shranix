/**
 * Analytics Module Audit Regression Tests
 * ========================================
 * Bug 1: Date filters completely ignored in all 13 analytics methods
 * Bug 2: getInventory fetches invStockBalance twice (duplicate data)
 * Bug 3: getCashFlow fallback only considers sales payments, not purchase payments
 */
import { mkdtempSync, rmSync } from 'node:fs';
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

describe('Analytics Audit Regression Tests (real DB)', () => {
  let dbDir: string;
  let database: DatabaseService;
  let analytics: AnalyticsService;

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'analytics-audit-'));
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

    // Seed customers
    const custA = await database.ledgerMaster.create({
      accountId: 'ACC-CUSTA',
      ledgerType: 'customer',
      partyId: 'CustA',
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
    const itemA = await database.items.create({
      name: 'TestProduct',
      sku: 'TEST-SKU',
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

    // Sales invoice in JUNE 2026 (outside August date range)
    const invJune = await database.salesInvoices.create({
      invoiceNumber: 'SI-JUNE-001',
      customerId: custA.id,
      invoiceDate: '2026-06-15',
      status: 'posted',
      paymentStatus: 'unpaid',
      subTotal: 5000,
      discountAmount: 0,
      taxAmount: 900,
      grandTotal: 5900,
      balanceAmount: 5900,
      paidAmount: 0,
      createdAt: now,
      updatedAt: now,
    } as any);
    await database.invoiceItems.create({
      invoiceId: invJune.id,
      itemId: itemA.id,
      quantity: 50,
      rate: 100,
      discountPercent: 0,
      discountAmount: 0,
      taxableValue: 5000,
      gstRate: 18,
      igst: 0,
      cgst: 450,
      sgst: 450,
      cess: 0,
      totalAmount: 5900,
    } as any);

    // Sales invoice in AUGUST 2026 (inside date range)
    const invAug = await database.salesInvoices.create({
      invoiceNumber: 'SI-AUG-001',
      customerId: custA.id,
      invoiceDate: '2026-08-10',
      status: 'posted',
      paymentStatus: 'unpaid',
      subTotal: 2000,
      discountAmount: 0,
      taxAmount: 360,
      grandTotal: 2360,
      balanceAmount: 2360,
      paidAmount: 0,
      createdAt: now,
      updatedAt: now,
    } as any);
    await database.invoiceItems.create({
      invoiceId: invAug.id,
      itemId: itemA.id,
      quantity: 20,
      rate: 100,
      discountPercent: 0,
      discountAmount: 0,
      taxableValue: 2000,
      gstRate: 18,
      igst: 0,
      cgst: 180,
      sgst: 180,
      cess: 0,
      totalAmount: 2360,
    } as any);

    // Draft invoice in AUGUST (should be excluded)
    await database.salesInvoices.create({
      invoiceNumber: 'SI-AUG-DRAFT',
      customerId: custA.id,
      invoiceDate: '2026-08-12',
      status: 'draft',
      paymentStatus: 'unpaid',
      subTotal: 10000,
      discountAmount: 0,
      taxAmount: 0,
      grandTotal: 10000,
      balanceAmount: 10000,
      paidAmount: 0,
      createdAt: now,
      updatedAt: now,
    } as any);

    // Purchase invoice in AUGUST
    const supplier = await database.suppliers.create({
      name: 'TestSuppAudit',
      isActive: true,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    } as any);
    await database.purchaseInvoices.create({
      invoiceNumber: 'PI-AUG-001',
      supplierId: supplier.id,
      invoiceDate: '2026-08-05',
      status: 'posted',
      paymentStatus: 'unpaid',
      subTotal: 1500,
      discountAmount: 0,
      taxAmount: 270,
      grandTotal: 1770,
      balanceAmount: 1770,
      paidAmount: 0,
      createdAt: now,
      updatedAt: now,
    } as any);
  });

  afterAll(() => {
    try {
      rmSync(dbDir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup errors */
    }
  });

  // ── Bug 1: Date filters ──────────────────────────────

  describe('Bug 1: Date filters are applied', () => {
    it('sales analytics with date filter returns only invoices in range', async () => {
      // Only August invoices
      const payload = await analytics.getSales({
        fromDate: '2026-08-01',
        toDate: '2026-08-31',
      });
      const revenue = payload.kpis.find((k) => k.key === 'totalRevenue');
      // Only SI-AUG-001: 2360 (draft excluded)
      expect(revenue?.value).toBe(2360);
    });

    it('sales analytics without filter returns all invoices', async () => {
      const payload = await analytics.getSales({});
      const revenue = payload.kpis.find((k) => k.key === 'totalRevenue');
      // SI-JUNE-001 (5900) + SI-AUG-001 (2360) = 8260
      expect(revenue?.value).toBe(8260);
    });

    it('overview with date filter respects range', async () => {
      const payload = await analytics.getOverview({
        fromDate: '2026-08-01',
        toDate: '2026-08-31',
      });
      const totalSales = payload.kpis.find((k) => k.key === 'totalSales');
      expect(totalSales?.value).toBe(2360);
    });

    it('gst analytics with date filter only counts in-range invoices', async () => {
      const payload = await analytics.getGst({
        fromDate: '2026-08-01',
        toDate: '2026-08-31',
      });
      const output = payload.kpis.find((k) => k.key === 'outputGst');
      // Only August invoice line items: 180 + 180 = 360
      expect(output?.value).toBe(360);
    });

    it('purchase analytics with date filter respects range', async () => {
      const payload = await analytics.getPurchase({
        fromDate: '2026-08-01',
        toDate: '2026-08-31',
      });
      const spend = payload.kpis.find((k) => k.key === 'totalSpend');
      expect(spend?.value).toBe(1770);
    });

    it('growth analytics with date filter only includes in-range data', async () => {
      const payload = await analytics.getGrowth({
        fromDate: '2026-08-01',
        toDate: '2026-08-31',
      });
      const totalRevenue = payload.kpis.find((k) => k.key === 'totalRevenue');
      // Only August: 2360
      expect(totalRevenue?.value).toBe(2360);
    });
  });

  // ── Bug 2: Duplicate fetch ──────────────────────────

  describe('Bug 2: getInventory no duplicate fetch', () => {
    it('inventory analytics still returns correct stock value', async () => {
      const payload = await analytics.getInventory({});
      const stockValue = payload.kpis.find((k) => k.key === 'stockValue');
      // 100 * 50 = 5000
      expect(stockValue?.value).toBe(5000);
    });
  });

  // ── Bug 3: Cash flow fallback ───────────────────────

  describe('Bug 3: getCashFlow handles empty GL gracefully', () => {
    it('cashflow returns valid payload even with sparse GL', async () => {
      const payload = await analytics.getCashFlow({});
      expect(payload.kpis.length).toBeGreaterThan(0);
      expect(payload.charts.length).toBeGreaterThan(0);
      expect(payload.tables.length).toBeGreaterThan(0);
      // Net cash flow should be a number (0 if no cash/bank GL entries)
      const netCash = payload.kpis.find((k) => k.key === 'netCash');
      expect(typeof netCash?.value).toBe('number');
    });
  });
});
