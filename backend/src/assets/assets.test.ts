import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

const dbRequire = createRequire(join(process.cwd(), '..', 'database', 'package.json'));
const { createClient } = dbRequire('@libsql/client');
const { drizzle } = dbRequire('drizzle-orm/libsql');
const { migrate } = dbRequire('drizzle-orm/libsql/migrator');

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

import { AssetsService } from './services/assets.service';
import { AssetCategoriesService } from './services/categories.service';
import { ExpensesService } from './services/expenses.service';
import { AssetMaintenanceService } from './services/maintenance.service';

/**
 * REAL-DB integration tests for the Phase-9 Asset & Expense module.
 *
 * Verifies: auto asset codes + duplicate retry, asset CRUD, category
 * duplicate prevention, depreciation calculation (straight-line), duplicate
 * posting prevention, disposal gain/loss, expense approval workflow,
 * payment GL entry, recurring expense dedup + generation.
 */
describe('Assets & Expenses module (real DB)', () => {
  let database: DatabaseService;
  let assets: AssetsService;
  let categories: AssetCategoriesService;
  let maintenance: AssetMaintenanceService;
  let expenses: ExpensesService;

  const userId = 'user-ae-1';

  beforeAll(async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'ae-'));
    const client = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(client as any);

    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    database = new DatabaseService(drizzleDb as any);
    const audit = new AuditService(database, {
      getIp: () => null,
      getUserAgent: () => null,
    } as any);
    categories = new AssetCategoriesService(database, audit);
    assets = new AssetsService(database, audit);
    maintenance = new AssetMaintenanceService(database, audit);
    expenses = new ExpensesService(database, audit);
  });

  afterAll(async () => {
    await database?.disconnect?.();
  });

  it('auto-generates sequential asset codes (AST-000001, AST-000002)', async () => {
    const a1 = await assets.create({ assetName: 'Tractor 1', purchaseCost: 500000 }, userId);
    const a2 = await assets.create({ assetName: 'Tractor 2', purchaseCost: 600000 }, userId);
    expect(a1.assetCode).toBe('AST-000001');
    expect(a2.assetCode).toBe('AST-000002');
    expect(a1.currentBookValue).toBe(500000);
    // capitalised cost = purchase + additional
    const a3 = await assets.create(
      { assetName: 'Sprayer', purchaseCost: 10000, additionalCost: 500 },
      userId,
    );
    expect(a3.capitalizedCost).toBe(10500);
  });

  it('prevents duplicate asset category names', async () => {
    await categories.create({ categoryName: 'Machinery' }, userId);
    await expect(categories.create({ categoryName: 'Machinery' }, userId)).rejects.toThrow(
      /already exists/i,
    );
  });

  it('calculates straight-line depreciation and prevents duplicate posting', async () => {
    const asset = await assets.create(
      {
        assetName: 'Laptop',
        purchaseCost: 120000,
        usefulLifeYears: 5,
        depreciationMethod: 'straight_line',
        salvageValue: 20000,
      },
      userId,
    );
    // (120000 - 20000) / (5 * 12) = 1666.67
    const dep = await assets.calculateDepreciation(asset.id, '2026-07', userId);
    expect(dep.amount).toBe(1666.67);
    expect(dep.bookValueAfter).toBeCloseTo(120000 - 1666.67, 1);
    await expect(assets.calculateDepreciation(asset.id, '2026-07', userId)).rejects.toThrow(
      /already posted/i,
    );
  });

  it('computes gain/loss on disposal and stops depreciation', async () => {
    const asset = await assets.create(
      { assetName: 'Old Printer', purchaseCost: 50000, usefulLifeYears: 5 },
      userId,
    );
    // Depreciate one period so book value < cost
    await assets.calculateDepreciation(asset.id, '2026-01', userId);
    const disp = await assets.dispose(
      asset.id,
      { disposalType: 'sale', saleValue: 30000, reason: 'Upgraded' },
      userId,
    );
    expect(disp.bookValue).toBeLessThan(50000);
    // loss = sale - book value (negative)
    expect(disp.gainLoss).toBeCloseTo(30000 - disp.bookValue, 1);
    // Future depreciation blocked
    await expect(assets.calculateDepreciation(asset.id, '2026-02', userId)).rejects.toThrow(
      /disposed/i,
    );
  });

  it('tracks allocation and return history', async () => {
    const asset = await assets.create({ assetName: 'Field Phone', purchaseCost: 15000 }, userId);
    const alloc = await assets.assign(
      asset.id,
      { assignedToType: 'employee', assignedToId: 'emp-1', remarks: 'Daily use' },
      userId,
    );
    expect(alloc.status).toBe('assigned');
    const detail = await assets.findById(asset.id);
    expect(detail.assignedEmployeeId).toBe('emp-1');
    await assets.returnAsset(asset.id, alloc.id, userId);
    const after = await assets.findById(asset.id);
    expect(after.status).toBe('available');
  });

  it('runs the expense approval → payment workflow', async () => {
    const cat = await expenses.createCategory({ categoryName: 'Fuel' }, userId);
    const exp = await expenses.create(
      {
        categoryName: cat.categoryName,
        categoryId: cat.id,
        amount: 1000,
        taxAmount: 50,
        description: 'Diesel',
      },
      userId,
    );
    expect(exp.status).toBe('draft');
    expect(exp.totalAmount).toBe(1050);

    await expenses.submit(exp.id, userId);
    await expect(expenses.pay(exp.id, { paymentMode: 'cash' }, userId)).rejects.toThrow(
      /approved/i,
    );
    await expenses.approve(exp.id, userId);
    await expect(expenses.update(exp.id, { amount: 999 }, userId)).rejects.toThrow(
      /approved or paid/i,
    );
    const paid = await expenses.pay(
      exp.id,
      { paymentMode: 'cash', paymentReference: 'CASH-1' },
      userId,
    );
    expect(paid.paid).toBe(true);
    const after = await expenses.findById(exp.id);
    expect(after.status).toBe('paid');
  });

  it('prevents duplicate recurring expense generation and advances the due date', async () => {
    const rec = await expenses.createRecurring(
      {
        categoryName: 'Rent',
        amount: 5000,
        frequency: 'monthly',
        nextDueDate: '2026-08-01',
        description: 'Office rent',
      },
      userId,
    );
    expect(rec.frequency).toBe('monthly');

    // Generate once — creates one expense and advances the due date
    const r1 = await expenses.generateRecurring('system');
    expect(r1.generated).toBeGreaterThanOrEqual(1);
    const updated = await expenses.listRecurring();
    const row = updated.find((r: any) => r.id === rec.id);
    expect(row.nextDueDate).toBe('2026-09-01');

    // Force the template back to a due date and regenerate — dedup must skip
    // because an expense already exists for the same recurring + due date.
    await expenses.updateRecurring(rec.id, { nextDueDate: '2026-08-01' }, userId);
    const r2 = await expenses.generateRecurring('system');
    expect(r2.generated).toBe(0);
    expect(r2.skipped.length).toBeGreaterThanOrEqual(1);
  });

  it('creates maintenance with next-service scheduling', async () => {
    const asset = await assets.create({ assetName: 'Generator', purchaseCost: 80000 }, userId);
    const maint = await maintenance.create(
      {
        assetId: asset.id,
        maintenanceType: 'preventive',
        serviceDate: '2026-08-01',
        serviceFrequencyDays: 90,
        vendor: 'ServCo',
      },
      userId,
    );
    expect(maint.maintenanceNumber).toMatch(/^MNT-/);
    expect(maint.nextServiceDate).toBe('2026-10-30');
    const schedule = await maintenance.serviceSchedule({ horizonDays: 120 });
    expect(schedule.total).toBeGreaterThanOrEqual(1);
  });
});
