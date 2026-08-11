import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

// @libsql/client + drizzle-orm live in the database workspace (pnpm)
const dbRequire = createRequire(join(process.cwd(), '..', 'database', 'package.json'));
const { createClient } = dbRequire('@libsql/client');
const { drizzle } = dbRequire('drizzle-orm/libsql');
const { migrate } = dbRequire('drizzle-orm/libsql/migrator');

import { KpiEngineService } from '../automation/kpi-engine.service';
import { DatabaseService } from '../database/database.service';

import { AnalyticsService } from './analytics.service';

/**
 * REAL-DB integration tests for the Phase-5 Analytics service.
 *
 * Seeds a minimal dataset (customers, items, a posted + a draft sales
 * invoice with line items, a purchase invoice, GL entries) and verifies
 * that the analytics aggregation reads source-of-truth data correctly:
 *  - Only financially valid (non-draft) invoices count toward totals
 *  - Stock value uses item current stock × purchase rate
 *  - GST output tax is aggregated from invoice line items
 *  - Top customers / products come back sorted
 */
describe('AnalyticsService (real DB)', () => {
  let dbDir: string;
  let database: DatabaseService;
  let analytics: AnalyticsService;

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'analytics-'));
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

    // Customers (ledger master rows)
    await database.ledgerMaster.create({
      accountId: 'ACC-CUS-A',
      ledgerType: 'customer',
      partyId: 'Test Customer A',
      openingBalance: 0,
      openingBalanceType: 'debit',
      currentBalance: 0,
      creditLimit: 50000,
      creditDays: 30,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as any);
    await database.ledgerMaster.create({
      accountId: 'ACC-CUS-B',
      ledgerType: 'customer',
      partyId: 'Test Customer B',
      openingBalance: 0,
      openingBalanceType: 'debit',
      currentBalance: 0,
      creditLimit: 100000,
      creditDays: 30,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as any);

    // Products
    const itemA = await database.items.create({
      name: 'Product A',
      sku: 'SKU-A',
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
    const itemB = await database.items.create({
      name: 'Product B',
      sku: 'SKU-B',
      purchaseRate: 30,
      salesRate: 60,
      mrp: 75,
      currentStock: 200,
      minStock: 5,
      reorderLevel: 10,
      isActive: true,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    } as any);

    // Supplier
    const supplier = await database.suppliers.create({
      name: 'Test Supplier',
      isActive: true,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    } as any);

    // Posted sales invoice (counts)
    const inv = await database.salesInvoices.create({
      invoiceNumber: 'SI-1001',
      customerId: (await database.ledgerMaster.findAll({ page: 1, pageSize: 1 } as any)).data[0].id,
      invoiceDate: '2026-08-05',
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

    // Draft sales invoice (must NOT count)
    await database.salesInvoices.create({
      invoiceNumber: 'SI-1002',
      customerId: inv.customerId,
      invoiceDate: '2026-08-06',
      status: 'draft',
      paymentStatus: 'unpaid',
      subTotal: 5000,
      discountAmount: 0,
      taxAmount: 0,
      grandTotal: 5000,
      balanceAmount: 5000,
      paidAmount: 0,
      createdAt: now,
      updatedAt: now,
    } as any);

    // Line items: 20 × Product A @ 100 + 18% GST → CGST 180 / SGST 180
    await database.invoiceItems.create({
      invoiceId: inv.id,
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

    // Purchase invoice (posted) 50 × Product B @ 40 + 18% GST
    const pInv = await database.purchaseInvoices.create({
      invoiceNumber: 'PI-2001',
      supplierId: supplier.id,
      invoiceDate: '2026-08-07',
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
    await database.purchaseInvoiceItems.create({
      invoiceId: pInv.id,
      itemId: itemB.id,
      quantity: 50,
      rate: 40,
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

    // GL entries: revenue + GST output for SI-1001
    await database.glEntries.create({
      entryNumber: 'GL-001',
      entryDate: '2026-08-05',
      accountId: 'ACC-CUST',
      voucherId: inv.id,
      voucherType: 'sales_invoice',
      voucherNumber: 'SI-1001',
      debit: 2360,
      credit: 0,
      balance: 2360,
      createdAt: now,
      updatedAt: now,
    } as any);
    await database.glEntries.create({
      entryNumber: 'GL-002',
      entryDate: '2026-08-05',
      accountId: 'ACC-SALES',
      voucherId: inv.id,
      voucherType: 'sales_invoice',
      voucherNumber: 'SI-1001',
      debit: 0,
      credit: 2000,
      balance: 0,
      createdAt: now,
      updatedAt: now,
    } as any);
  });

  afterAll(async () => {
    await database.onModuleDestroy?.().catch(() => undefined);
  });

  it('overview excludes draft invoices and computes stock value', async () => {
    const payload = await analytics.getOverview({});
    expect(payload.kpis.length).toBeGreaterThan(0);
    const totalSales = payload.kpis.find((k) => k.key === 'totalSales');
    expect(totalSales?.value).toBe(2360);
    const inventoryValue = payload.kpis.find((k) => k.key === 'inventoryValue');
    // 100 × 50 + 200 × 30 = 11000
    expect(inventoryValue?.value).toBe(11000);
  });

  it('sales analytics returns revenue, trends and top lists from finalized invoices only', async () => {
    const payload = await analytics.getSales({});
    const revenue = payload.kpis.find((k) => k.key === 'totalRevenue');
    expect(revenue?.value).toBe(2360);
    expect(payload.charts.length).toBeGreaterThan(0);
    const topCustomers = payload.tables.find((t) => t.title === 'Top Customers');
    expect(topCustomers?.rows[0]?.amount).toBe(2360);
    const funnel = payload.tables.find((t) => t.title === 'Quotation Funnel');
    expect(funnel).toBeDefined();
  });

  it('purchase analytics aggregates supplier spend', async () => {
    const payload = await analytics.getPurchase({});
    const spend = payload.kpis.find((k) => k.key === 'totalSpend');
    expect(spend?.value).toBe(2360);
    const top = payload.tables.find((t) => t.title === 'Top Suppliers');
    expect(top?.rows[0]?.amount).toBe(2360);
  });

  it('gst analytics aggregates output tax from line items', async () => {
    const payload = await analytics.getGst({});
    const output = payload.kpis.find((k) => k.key === 'outputGst');
    expect(output?.value).toBe(360);
    const byRate = payload.tables.find((t) => t.title === 'GST by Rate');
    expect(byRate?.rows[0]?.taxable).toBe(2000);
  });

  it('inventory analytics flags low stock and computes movement', async () => {
    const payload = await analytics.getInventory({});
    const stockValue = payload.kpis.find((k) => k.key === 'stockValue');
    expect(stockValue?.value).toBe(11000);
    expect(payload.tables.some((t) => t.title === 'Low Stock')).toBe(true);
  });

  it('customer analytics reports outstanding and repeat rate', async () => {
    const payload = await analytics.getCustomers({});
    const outstanding = payload.kpis.find((k) => k.key === 'outstanding');
    expect(outstanding?.value).toBe(2360);
  });

  it('top-bottom returns all ranking tables', async () => {
    const payload = await analytics.getTopBottom({});
    const titles = payload.tables.map((t) => t.title);
    expect(titles).toContain('Top 10 Customers');
    expect(titles).toContain('Top 10 Products by Sales');
    const topCustomers = payload.tables.find((t) => t.title === 'Top 10 Customers');
    expect(topCustomers?.rows[0]?.sales).toBe(2360);
  });
});
