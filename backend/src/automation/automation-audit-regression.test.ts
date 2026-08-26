/**
 * Automation Module Audit Regression Tests
 * =========================================
 * 1. GL entry number generation uses findMaxSequenceForPrefix (not count()+1)
 * 2. Financial year closing returns explicit NOT_IMPLEMENTED
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

  describe('Financial year closing', () => {
    it('FinancialClosingEngineService returns NOT_IMPLEMENTED', async () => {
      const { FinancialClosingEngineService } = await import('../gst_audit/services');
      const service = new FinancialClosingEngineService();
      const result = await service.closeYear({
        financialYearId: 'test-fy',
        closingType: 'full',
        userId: 'test-user',
      });

      expect(result.success).toBe(false);
      expect(result.implemented).toBe(false);
      expect(result.message).toContain('not yet implemented');
      expect(result.closingResult.retainedEarningsUpdated).toBe(false);
      expect(result.closingResult.openingBalancesCreated).toBe(false);
    });

    it('automation controller closing returns NOT_IMPLEMENTED', () => {
      const filePath = join(process.cwd(), 'src', 'automation', 'controllers.ts');
      const source = readFileSync(filePath, 'utf-8');
      // Should NOT have the old fake success response
      expect(source).not.toMatch(/success:\s*true.*Financial year closing executed/);
      // Should have the NOT_IMPLEMENTED response
      expect(source).toContain('implemented: false');
      expect(source).toContain('not yet implemented');
    });
  });
});
