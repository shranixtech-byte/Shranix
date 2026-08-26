/**
 * Asset Reports Regression Tests
 * ===============================
 * Tests for the new asset report endpoints:
 * - Category Summary
 * - Status Summary
 * - Depreciation Report
 * - Disposal Report
 * - Assignment Report
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

import { DatabaseService } from '../database/database.service';

describe('Asset Reports Regression Tests (real DB)', () => {
  let dbDir: string;
  let database: DatabaseService;

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'asset-reports-'));
    const client = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(client as any);

    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    database = new DatabaseService(drizzleDb as any);

    // Seed test data: categories
    const cat1 = await database.assetCategories.create({
      categoryName: 'Electronics',
      categoryCode: 'ELEC-001',
      depreciationMethod: 'straight_line',
      usefulLifeYears: 5,
      salvageRate: 0.1,
    } as any);

    const cat2 = await database.assetCategories.create({
      categoryName: 'Furniture',
      categoryCode: 'FURN-001',
      depreciationMethod: 'straight_line',
      usefulLifeYears: 10,
      salvageRate: 0.05,
    } as any);

    // Seed test data: assets
    await database.assets.create({
      assetCode: 'AST-001',
      assetName: 'Laptop Dell XPS',
      categoryId: cat1.id,
      purchaseDate: '2025-04-01',
      purchaseCost: 80000,
      capitalizedCost: 80000,
      accumulatedDepreciation: 12000,
      currentBookValue: 68000,
      status: 'assigned',
      condition: 'good',
    } as any);

    await database.assets.create({
      assetCode: 'AST-002',
      assetName: 'Office Desk',
      categoryId: cat2.id,
      purchaseDate: '2024-01-15',
      purchaseCost: 15000,
      capitalizedCost: 15000,
      accumulatedDepreciation: 2000,
      currentBookValue: 13000,
      status: 'available',
      condition: 'good',
    } as any);

    await database.assets.create({
      assetCode: 'AST-003',
      assetName: 'Printer HP',
      categoryId: cat1.id,
      purchaseDate: '2023-06-01',
      purchaseCost: 25000,
      capitalizedCost: 25000,
      accumulatedDepreciation: 25000,
      currentBookValue: 0,
      status: 'disposed',
      condition: 'disposed',
    } as any);
  });

  afterAll(() => {
    try {
      rmSync(dbDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  describe('Asset Register Report (existing)', () => {
    it('returns all assets with category names', async () => {
      const { AssetsService } = await import('./services/assets.service');
      const service = new AssetsService(database as any, undefined as any, undefined as any);

      const result = await service.reports({});

      expect(result.data.length).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeGreaterThanOrEqual(3);
    });

    it('filters by status', async () => {
      const { AssetsService } = await import('./services/assets.service');
      const service = new AssetsService(database as any, undefined as any, undefined as any);

      const result = await service.reports({ status: 'assigned' });

      expect(result.data.length).toBe(1);
      expect(result.data[0].assetCode).toBe('AST-001');
    });
  });

  describe('Category Summary Report (new)', () => {
    it('groups assets by category with correct counts', async () => {
      const { AssetsService } = await import('./services/assets.service');
      const service = new AssetsService(database as any, undefined as any, undefined as any);

      const result = await service.categorySummaryReport();

      expect(result.categories.length).toBe(2);
      expect(result.totalAssets).toBeGreaterThanOrEqual(3);

      const electronics = result.categories.find((c: any) => c.name === 'Electronics');
      expect(electronics).toBeDefined();
      expect(electronics.count).toBe(2);
      expect(electronics.totalCost).toBe(105000); // 80000 + 25000

      const furniture = result.categories.find((c: any) => c.name === 'Furniture');
      expect(furniture).toBeDefined();
      expect(furniture.count).toBe(1);
      expect(furniture.totalCost).toBe(15000);
    });

    it('calculates grand totals correctly', async () => {
      const { AssetsService } = await import('./services/assets.service');
      const service = new AssetsService(database as any, undefined as any, undefined as any);

      const result = await service.categorySummaryReport();

      expect(result.grandTotalCost).toBe(120000); // 80000 + 15000 + 25000
      expect(result.grandTotalDepreciation).toBe(39000); // 12000 + 2000 + 25000
    });
  });

  describe('Status Summary Report (new)', () => {
    it('groups assets by status with correct counts', async () => {
      const { AssetsService } = await import('./services/assets.service');
      const service = new AssetsService(database as any, undefined as any, undefined as any);

      const result = await service.statusSummaryReport();

      expect(result.statuses.length).toBe(3); // assigned, available, disposed
      expect(result.totalAssets).toBeGreaterThanOrEqual(3);

      const assigned = result.statuses.find((s: any) => s.status === 'assigned');
      expect(assigned).toBeDefined();
      expect(assigned.count).toBe(1);

      const available = result.statuses.find((s: any) => s.status === 'available');
      expect(available).toBeDefined();
      expect(available.count).toBe(1);

      const disposed = result.statuses.find((s: any) => s.status === 'disposed');
      expect(disposed).toBeDefined();
      expect(disposed.count).toBe(1);
    });

    it('calculates total cost correctly', async () => {
      const { AssetsService } = await import('./services/assets.service');
      const service = new AssetsService(database as any, undefined as any, undefined as any);

      const result = await service.statusSummaryReport();

      expect(result.grandTotalCost).toBe(120000);
    });
  });

  describe('Depreciation Report (new)', () => {
    it('returns empty records when no depreciation entries exist', async () => {
      const { AssetsService } = await import('./services/assets.service');
      const service = new AssetsService(database as any, undefined as any, undefined as any);

      const result = await service.depreciationReport({});

      expect(result.records.length).toBe(0);
      expect(result.totalDepreciation).toBe(0);
    });
  });

  describe('Disposal Report (new)', () => {
    it('returns empty records when no disposals exist', async () => {
      const { AssetsService } = await import('./services/assets.service');
      const service = new AssetsService(database as any, undefined as any, undefined as any);

      const result = await service.disposalReport({});

      expect(result.records.length).toBe(0);
      expect(result.totalDisposals).toBe(0);
    });
  });

  describe('Assignment Report (new)', () => {
    it('returns correct assignment counts', async () => {
      const { AssetsService } = await import('./services/assets.service');
      const service = new AssetsService(database as any, undefined as any, undefined as any);

      const result = await service.assignmentReport();

      expect(result.assignedAssets).toBe(1);
      expect(result.availableAssets).toBe(1);
    });
  });
});
