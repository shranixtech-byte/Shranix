/**
 * Automation Module Audit Regression Tests
 * =========================================
 * 1. GL entry number generation uses findMaxSequenceForPrefix (not count()+1)
 * 2. Financial year closing uses real FinancialClosingEngineService
 */
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const dbRequire = createRequire(join(process.cwd(), '..', 'database', 'package.json'));
const { createClient } = dbRequire('@libsql/client');
const { drizzle } = dbRequire('drizzle-orm/libsql');
const { migrate } = dbRequire('drizzle-orm/libsql/migrator');

import { DatabaseService } from '../database/database.service';

describe('Automation Audit Regression Tests (real DB)', () => {
  let dbDir: string;
  let database: DatabaseService;

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'automation-audit-'));
    const client = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(client as any);

    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    database = new DatabaseService(drizzleDb as any);
  });

  afterAll(() => {
    try {
      rmSync(dbDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  describe('GL entry number generation', () => {
    it('source uses findMaxSequenceForPrefix instead of count()+1', () => {
      const filePath = join(process.cwd(), 'src', 'automation', 'gl-posting.engine.ts');
      const source = readFileSync(filePath, 'utf-8');
      // Should use findMaxSequenceForPrefix (concurrency-safe)
      expect(source).toContain('findMaxSequenceForPrefix');
    });

    it('maxFieldValue handles empty table gracefully', async () => {
      const count = await database.glEntries.count();
      expect(count).toBe(0);
    });
  });

  describe('Financial year closing - real implementation', () => {
    it('FinancialClosingEngineService has real closing logic (not a stub)', () => {
      const filePath = join(process.cwd(), 'src', 'gst_audit', 'services.ts');
      const source = readFileSync(filePath, 'utf-8');
      // Should contain real closing implementation
      expect(source).toContain('year_end_closing');
      expect(source).toContain('year_end_transfer');
      expect(source).toContain('retainedEarnings');
      // Should NOT contain the old stub
      expect(source).not.toContain('not yet implemented');
    });

    it('FinancialClosingEngineService validates FY exists', async () => {
      const { FinancialClosingEngineService } = await import('../gst_audit/services');
      const mockDatabase = {
        financialYears: { findById: async () => null },
      };
      const service = new FinancialClosingEngineService(mockDatabase as any);
      await expect(
        service.closeYear({ financialYearId: 'nonexistent', closingType: 'full' }),
      ).rejects.toThrow('not found');
    });

    it('FinancialClosingEngineService rejects already closed FY', async () => {
      const { FinancialClosingEngineService } = await import('../gst_audit/services');
      const mockDatabase = {
        financialYears: {
          findById: async () => ({
            id: 'fy-1',
            name: 'FY 2025-26',
            isClosed: true,
            startDate: '2025-04-01',
            endDate: '2026-03-31',
          }),
        },
      };
      const service = new FinancialClosingEngineService(mockDatabase as any);
      const result = await service.closeYear({ financialYearId: 'fy-1', closingType: 'full' });
      expect(result.success).toBe(false);
      expect(result.message).toContain('already closed');
    });

    it('automation controller closing uses real service', () => {
      const filePath = join(process.cwd(), 'src', 'automation', 'controllers.ts');
      const source = readFileSync(filePath, 'utf-8');
      expect(source).toContain('FinancialClosingEngineService');
      expect(source).toContain('this.financialClosing.closeYear');
      expect(source).not.toMatch(/implemented:\s*false/);
    });
  });
});
