import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

const dbRequire = createRequire(join(process.cwd(), '..', 'database', 'package.json'));
const { createClient } = dbRequire('@libsql/client');
const { drizzle } = dbRequire('drizzle-orm/libsql');
const { migrate } = dbRequire('drizzle-orm/libsql/migrator');

import { GlPostingEngine } from '../automation/gl-posting.engine';
import { TransactionManager } from '../automation/transaction.manager';
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

import { AssetsService } from './services/assets.service';
import { AssetCategoriesService } from './services/categories.service';
import { AssetMaintenanceService } from './services/maintenance.service';

/**
 * ASSETS MODULE AUDIT REGRESSION TESTS (2026-08-26)
 *
 * Bugs covered:
 *  1. Depreciation GL used hardcoded account IDs ('DEPRECIATION_EXPENSE')
 *     that are not valid UUIDs → GL always failed, but isPosted=true (WRONG)
 *  2. Disposal GL used hardcoded account IDs ('CASH', 'FIXED_ASSETS')
 *     → disposal always threw in production with GL configured
 *  3. Depreciation isPosted was set true regardless of GL result
 */
describe('Assets Audit Regression Tests (real DB)', () => {
  let dbDir: string;
  let database: DatabaseService;
  let assets: AssetsService;
  let _categories: AssetCategoriesService;
  let _maintenance: AssetMaintenanceService;
  let txn: TransactionManager;
  let glPosting: GlPostingEngine;
  const userId = 'test-user-1';

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'asset-audit-'));
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
    txn = new TransactionManager(database);
    glPosting = new GlPostingEngine(database, txn);
    _categories = new AssetCategoriesService(database, audit);
    assets = new AssetsService(database, audit, glPosting);
    _maintenance = new AssetMaintenanceService(database, audit);

    // Seed Chart of Accounts for GL posting tests
    const now = new Date().toISOString();
    const seedAccounts = [
      { accountCode: 'DEP-EXP', accountName: 'Depreciation Expense', accountType: 'expenses' },
      { accountCode: 'ACC-DEP', accountName: 'Accumulated Depreciation', accountType: 'assets' },
      { accountCode: 'FIXED-AST', accountName: 'Fixed Assets', accountType: 'assets' },
      { accountCode: 'CASH', accountName: 'Cash Account', accountType: 'assets' },
      { accountCode: 'GAIN-DISP', accountName: 'Gain on Disposal', accountType: 'income' },
      { accountCode: 'LOSS-DISP', accountName: 'Loss on Disposal', accountType: 'expenses' },
    ];

    for (const acct of seedAccounts) {
      await database.chartOfAccounts.create({
        ...acct,
        groupId: 'g1',
        openingBalance: 0,
        openingBalanceType: 'debit',
        currency: 'INR',
        isActive: true,
        costCenterRequired: false,
        gstApplicable: false,
        bankReconciliation: false,
        isCashAccount: acct.accountCode === 'CASH',
        isControlAccount: false,
        allowManualPosting: true,
        createdAt: now,
        updatedAt: now,
      } as any);
    }
  });

  afterAll(async () => {
    try {
      await (database as any).close?.();
    } catch {
      /* ignore */
    }
  });

  // ═════════════════════════════════════════════════════════
  // BUG 1 & 3 REGRESSION: Depreciation GL posting + isPosted accuracy
  // ═════════════════════════════════════════════════════════
  describe('Bug 1 & 3: Depreciation GL posting uses real account IDs', () => {
    it('posts depreciation GL entries with real account IDs and sets isPosted correctly', async () => {
      const asset = await assets.create(
        {
          assetName: 'Test Laptop',
          purchaseCost: 120000,
          usefulLifeYears: 5,
          depreciationMethod: 'straight_line',
          salvageValue: 20000,
        },
        userId,
      );

      const dep = await assets.calculateDepreciation(asset.id, '2026-08', userId);
      expect(dep.amount).toBe(1666.67);
      expect(dep.bookValueAfter).toBeCloseTo(120000 - 1666.67, 0);

      // Verify GL entry was actually posted (isPosted should be true only when GL succeeded)
      const depRecord = await database.assetDepreciation.findAll({
        page: 1,
        pageSize: 1,
        filters: [
          { field: 'assetId', operator: 'eq', value: asset.id },
          { field: 'period', operator: 'eq', value: '2026-08' },
        ],
      } as any);
      expect(depRecord.data.length).toBe(1);
      expect(depRecord.data[0].isPosted).toBe(true);
      expect(depRecord.data[0].glEntryId).toBeTruthy();

      // Verify GL entries exist in the GL table
      const glEntries = await database.glEntries.findAll({
        page: 1,
        pageSize: 10,
        filters: [{ field: 'voucherType', operator: 'eq', value: 'DEPRECIATION' }],
      } as any);
      expect(glEntries.data.length).toBe(2); // Dr Depreciation Expense + Cr Accumulated Depreciation

      // Verify the account IDs are valid UUIDs (not hardcoded strings)
      for (const entry of glEntries.data) {
        expect(entry.accountId).toBeTruthy();
        // Should be a UUID format, not 'DEPRECIATION_EXPENSE'
        expect(entry.accountId).not.toBe('DEPRECIATION_EXPENSE');
        expect(entry.accountId).not.toBe('ACCUMULATED_DEPRECIATION');
      }
    });

    it('does not set isPosted=true when GL accounts are missing', async () => {
      // Create an asset WITHOUT any chart of accounts
      const emptyDbDir = mkdtempSync(join(tmpdir(), 'asset-empty-'));
      const emptyClient = createClient({ url: `file:${join(emptyDbDir, 'test.db')}` });
      const emptyDrizzle = drizzle(emptyClient as any);
      await migrate(
        emptyDrizzle as any,
        {
          migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
        } as any,
      );
      const emptyDatabase = new DatabaseService(emptyDrizzle as any);
      const emptyAudit = new AuditService(emptyDatabase, {
        getIp: () => null,
        getUserAgent: () => null,
      } as any);
      const emptyTxn = new TransactionManager(emptyDatabase);
      const emptyGl = new GlPostingEngine(emptyDatabase, emptyTxn);
      const emptyAssets = new AssetsService(emptyDatabase, emptyAudit, emptyGl);

      const asset = await emptyAssets.create(
        {
          assetName: 'No GL Laptop',
          purchaseCost: 50000,
          usefulLifeYears: 5,
          depreciationMethod: 'straight_line',
          salvageValue: 0,
        },
        userId,
      );

      const dep = await emptyAssets.calculateDepreciation(asset.id, '2026-08', userId);
      expect(dep.amount).toBeGreaterThan(0);

      // isPosted should be FALSE when GL accounts don't exist
      const depRecord = await emptyDatabase.assetDepreciation.findAll({
        page: 1,
        pageSize: 1,
        filters: [
          { field: 'assetId', operator: 'eq', value: asset.id },
          { field: 'period', operator: 'eq', value: '2026-08' },
        ],
      } as any);
      expect(depRecord.data[0].isPosted).toBe(false);
      expect(depRecord.data[0].glEntryId).toBeNull();
    });

    it('prevents duplicate depreciation posting for same asset+period', async () => {
      const asset = await assets.create(
        {
          assetName: 'Dup Dep Asset',
          purchaseCost: 60000,
          usefulLifeYears: 3,
          depreciationMethod: 'straight_line',
        },
        userId,
      );
      await assets.calculateDepreciation(asset.id, '2026-09', userId);
      await expect(assets.calculateDepreciation(asset.id, '2026-09', userId)).rejects.toThrow(
        /already posted/i,
      );
    });
  });

  // ═════════════════════════════════════════════════════════
  // BUG 2 REGRESSION: Disposal GL posting uses real account IDs
  // ═════════════════════════════════════════════════════════
  describe('Bug 2: Disposal GL posting uses real account IDs', () => {
    it('disposes an asset and posts balanced GL entries with real account IDs', async () => {
      const asset = await assets.create(
        {
          assetName: 'Disposal Test Asset',
          purchaseCost: 100000,
          usefulLifeYears: 5,
          depreciationMethod: 'straight_line',
          salvageValue: 10000,
        },
        userId,
      );

      // Depreciate one period first
      await assets.calculateDepreciation(asset.id, '2026-01', userId);

      const disp = await assets.dispose(
        asset.id,
        { disposalType: 'sale', saleValue: 60000, reason: 'Test disposal' },
        userId,
      );

      expect(disp.gainLoss).toBeDefined();
      expect(disp.bookValue).toBeLessThan(100000);

      // Verify GL entries exist and use real account IDs
      const glEntries = await database.glEntries.findAll({
        page: 1,
        pageSize: 10,
        filters: [{ field: 'voucherType', operator: 'eq', value: 'ASSET_DISPOSAL' }],
      } as any);
      expect(glEntries.data.length).toBeGreaterThanOrEqual(3);

      for (const entry of glEntries.data) {
        expect(entry.accountId).toBeTruthy();
        // Should NOT be hardcoded strings
        expect(entry.accountId).not.toBe('CASH');
        expect(entry.accountId).not.toBe('ACCUMULATED_DEPRECIATION');
        expect(entry.accountId).not.toBe('FIXED_ASSETS');
        expect(entry.accountId).not.toBe('GAIN_ON_DISPOSAL');
        expect(entry.accountId).not.toBe('LOSS_ON_DISPOSAL');
      }

      // Verify balanced: total debit = total credit
      const totalDr = glEntries.data.reduce((s: number, e: any) => s + Number(e.debit || 0), 0);
      const totalCr = glEntries.data.reduce((s: number, e: any) => s + Number(e.credit || 0), 0);
      expect(totalDr).toBeCloseTo(totalCr, 2);
    });

    it('prevents double disposal', async () => {
      const asset = await assets.create(
        { assetName: 'Double Dispose', purchaseCost: 30000, usefulLifeYears: 3 },
        userId,
      );
      await assets.dispose(asset.id, { saleValue: 10000 }, userId);
      await expect(assets.dispose(asset.id, { saleValue: 5000 }, userId)).rejects.toThrow(
        /already disposed/i,
      );
    });

    it('prevents depreciation after disposal', async () => {
      const asset = await assets.create(
        { assetName: 'Dep After Dispose', purchaseCost: 40000, usefulLifeYears: 4 },
        userId,
      );
      await assets.dispose(asset.id, { saleValue: 20000 }, userId);
      await expect(assets.calculateDepreciation(asset.id, '2026-03', userId)).rejects.toThrow(
        /disposed/i,
      );
    });
  });

  // ═════════════════════════════════════════════════════════
  // DEPRECIATION CALCULATION ACCURACY
  // ═════════════════════════════════════════════════════════
  describe('Depreciation calculation accuracy', () => {
    it('straight-line: (cost - salvage) / (years × 12)', async () => {
      const asset = await assets.create(
        {
          assetName: 'SL Asset',
          purchaseCost: 120000,
          usefulLifeYears: 5,
          depreciationMethod: 'straight_line',
          salvageValue: 20000,
        },
        userId,
      );
      // (120000 - 20000) / (5 * 12) = 1666.67
      const dep = await assets.calculateDepreciation(asset.id, '2026-01', userId);
      expect(dep.amount).toBe(1666.67);
    });

    it('never depreciates below salvage value', async () => {
      const asset = await assets.create(
        {
          assetName: 'Salvage Test',
          purchaseCost: 12000,
          usefulLifeYears: 1,
          depreciationMethod: 'straight_line',
          salvageValue: 10000,
        },
        userId,
      );
      // Monthly: (12000 - 10000) / 12 = 166.67
      const dep = await assets.calculateDepreciation(asset.id, '2026-01', userId);
      expect(dep.amount).toBe(166.67);

      // After 12 months, book value should be at salvage (10000)
      // But if we try to depreciate more, it should stop
      for (let m = 2; m <= 12; m++) {
        const period = `2026-${String(m).padStart(2, '0')}`;
        await assets.calculateDepreciation(asset.id, period, userId);
      }
      const detail = await assets.findById(asset.id);
      expect(Number(detail.currentBookValue)).toBeGreaterThanOrEqual(10000);
    });
  });

  // ═════════════════════════════════════════════════════════
  // ASSET LIFECYCLE
  // ═════════════════════════════════════════════════════════
  describe('Asset lifecycle', () => {
    it('create → assign → return → available', async () => {
      const asset = await assets.create({ assetName: 'Lifecycle', purchaseCost: 5000 }, userId);
      expect(asset.status).toBe('available');

      const alloc = await assets.assign(
        asset.id,
        { assignedToType: 'employee', assignedToId: 'emp-1' },
        userId,
      );
      const assigned = await assets.findById(asset.id);
      expect(assigned.status).toBe('assigned');
      expect(assigned.assignedEmployeeId).toBe('emp-1');

      await assets.returnAsset(asset.id, alloc.id, userId);
      const returned = await assets.findById(asset.id);
      expect(returned.status).toBe('available');
      expect(returned.assignedEmployeeId).toBeNull();
    });

    it('prevents assigning disposed assets', async () => {
      const asset = await assets.create(
        { assetName: 'Disposed Assign', purchaseCost: 5000 },
        userId,
      );
      await assets.dispose(asset.id, { saleValue: 1000 }, userId);

      await expect(
        assets.assign(asset.id, { assignedToType: 'employee', assignedToId: 'emp-1' }, userId),
      ).rejects.toThrow(/disposed/i);
    });

    it('prevents reactivating disposed assets', async () => {
      const asset = await assets.create({ assetName: 'Reactiv8', purchaseCost: 5000 }, userId);
      await assets.dispose(asset.id, { saleValue: 1000 }, userId);

      await expect(assets.update(asset.id, { status: 'available' }, userId)).rejects.toThrow(
        /cannot be reactivated/i,
      );
    });
  });
});
