import { randomUUID } from 'node:crypto';
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

import { sanitizePage, sanitizePageSize } from '../common/utils/pagination.util';
import { DatabaseService } from '../database/database.service';

import { KpiEngineService } from './kpi-engine.service';

/**
 * H4 — SQL aggregation + bounded queries (real DB).
 *
 * The KPI engine used to load up to 10000 rows and aggregate in memory — totals
 * were silently WRONG once a table grew past 10000 rows. After the fix, KPIs
 * aggregate in SQL (sumField/countWhere) and never truncate.
 */
describe('H4 KPI SQL aggregation (real DB)', () => {
  let dbDir: string;
  let rawClient: any;
  let database: DatabaseService;
  let kpi: KpiEngineService;

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'h4-kpi-'));
    rawClient = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(rawClient as any);
    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );
    database = new DatabaseService(drizzleDb as any);
    kpi = new KpiEngineService(database as any);
  });

  afterAll(async () => {
    try {
      await (database as any).close?.();
    } catch {
      /* ignore */
    }
  });

  function insertGlEntry(overrides: Record<string, any> = {}) {
    return rawClient.execute({
      sql: `INSERT INTO shranix_gl_entries
        (id, created_at, updated_at, deleted_at, is_deleted, entry_number, entry_date,
         account_id, voucher_id, voucher_type, voucher_number, debit, credit, balance,
         is_reversal, currency, exchange_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        overrides.createdAt || new Date().toISOString(),
        new Date().toISOString(),
        null,
        0,
        overrides.entryNumber || `GL-${randomUUID().slice(0, 8)}`,
        overrides.entryDate || '2026-01-15T00:00:00.000Z',
        overrides.accountId || 'acc-1',
        randomUUID(),
        overrides.voucherType || 'sales_invoice',
        overrides.voucherNumber || 'INV-001',
        overrides.debit ?? 0,
        overrides.credit ?? 0,
        0,
        0,
        'INR',
        1,
      ],
    });
  }

  it('sumField returns the exact SQL sum (matches in-memory aggregation)', async () => {
    insertGlEntry({ voucherType: 'sales_invoice', credit: 100 });
    insertGlEntry({ voucherType: 'sales_invoice', credit: 250 });
    insertGlEntry({ voucherType: 'goods_issue', credit: 0, debit: 75 });
    const revenue = await database.glEntries.sumField('credit', {
      filters: [
        { field: 'voucherType', operator: 'in', value: ['sales_invoice', 'sales'] },
        { field: 'credit', operator: 'gt', value: 0 },
      ],
    } as any);
    expect(revenue).toBe(350);
    const cogs = await database.glEntries.sumField('debit', {
      filters: [{ field: 'voucherType', operator: 'eq', value: 'goods_issue' }],
    } as any);
    expect(cogs).toBe(75);
    const count = await database.glEntries.countWhere({} as any);
    expect(count).toBe(3);
  }, 60000);

  it('revenue KPI is correct far beyond the old 10000-row page cap (no truncation)', async () => {
    // Seed 10050 more rows via batched inserts — well past the old pageSize cap.
    // (Test 1 above already seeded 2 revenue rows: 100 + 250 = 350.)
    const TOTAL = 10050;
    const batch = 500;
    let expected = 350;
    for (let i = 0; i < TOTAL; i += batch) {
      const values: unknown[][] = [];
      for (let j = i; j < Math.min(i + batch, TOTAL); j++) {
        const credit = (j % 7) + 1; // 1..7
        expected += credit;
        values.push([
          randomUUID(),
          '2026-06-01T00:00:00.000Z',
          '2026-06-01T00:00:00.000Z',
          null,
          0,
          `GL-BULK-${j}`,
          '2026-06-01T00:00:00.000Z',
          'acc-1',
          randomUUID(),
          'sales_invoice',
          `INV-${j}`,
          0,
          credit,
          0,
          0,
          'INR',
          1,
        ]);
      }
      const placeholders = values
        .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .join(',');
      const flat = values.flat();
      await rawClient.execute({
        sql: `INSERT INTO shranix_gl_entries
          (id, created_at, updated_at, deleted_at, is_deleted, entry_number, entry_date,
           account_id, voucher_id, voucher_type, voucher_number, debit, credit, balance,
           is_reversal, currency, exchange_rate)
          VALUES ${placeholders}`,
        args: flat,
      });
    }

    const res = await kpi.calculateKpi('revenue');
    expect(res).not.toBeNull();
    // Old code would have stopped at 10000 rows; SQL aggregation sees all rows.
    expect((res as any).value).toBe(expected);
  }, 120000);

  it('date-bounded KPI only sums entries inside the range', async () => {
    insertGlEntry({
      voucherType: 'sales_invoice',
      credit: 500,
      entryDate: '2026-02-01T00:00:00.000Z',
    });
    insertGlEntry({
      voucherType: 'sales_invoice',
      credit: 900,
      entryDate: '2026-03-01T00:00:00.000Z',
    });
    const res = await kpi.calculateKpi(
      'revenue',
      undefined,
      '2026-02-01T00:00:00.000Z',
      '2026-02-28T00:00:00.000Z',
    );
    expect((res as any).value).toBe(500);
  }, 60000);

  it('GST payable uses the real gst_ledger columns (inputOutput/gstAmount)', async () => {
    // The old code filtered on non-existent columns and always returned 0.
    await rawClient.execute({
      sql: `INSERT INTO shranix_gst_ledger
        (id, created_at, updated_at, deleted_at, is_deleted, voucher_type, voucher_id,
         voucher_number, voucher_date, gstin, gst_type, gst_rate, taxable_value, gst_amount,
         cess_amount, input_output, reverse_charge, financial_year_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
        null,
        0,
        'sales_invoice',
        randomUUID(),
        'INV-GST-1',
        '2026-01-01T00:00:00.000Z',
        'GSTIN-A',
        'output',
        18,
        1000,
        180,
        0,
        'output',
        'no',
        null,
      ],
    });
    const res = await kpi.calculateKpi('gst_payable');
    expect((res as any).value).toBe(180);
  }, 60000);

  it('repository caps client pageSize at the hard ceiling (10000)', async () => {
    // Exercise extractPagination through the real repository (master-data repo):
    // a client asking for a million rows gets the hard ceiling, and invalid
    // pages normalize to 1.
    const res = await database.glEntries.findAll({ page: 1, pageSize: 1000000 } as any);
    expect((res as any).pageSize).toBe(10000);
    const res2 = await database.glEntries.findAll({ page: 0, pageSize: -5 } as any);
    expect((res2 as any).page).toBe(1);
    const res3 = await database.glEntries.findAll({ page: 2, pageSize: 25 } as any);
    expect((res3 as any).pageSize).toBe(25);
  });

  it('pagination is deterministic (createdAt DESC default) with safe empty pages', async () => {
    // Self-contained: scope to our own rows so the test is order-independent.
    const scope = [{ field: 'entryNumber', operator: 'startsWith', value: 'H4-DET-' }];
    insertGlEntry({ credit: 1, entryNumber: 'H4-DET-1', createdAt: '2026-01-01T00:00:00.000Z' });
    insertGlEntry({ credit: 2, entryNumber: 'H4-DET-2', createdAt: '2026-01-02T00:00:00.000Z' });
    insertGlEntry({ credit: 3, entryNumber: 'H4-DET-3', createdAt: '2026-01-03T00:00:00.000Z' });
    const first = await database.glEntries.findAll({ page: 1, pageSize: 2, filters: scope } as any);
    // Newest first — deterministic order across calls
    expect((first as any).data[0].credit).toBe(3);
    expect((first as any).data[1].credit).toBe(2);
    expect((first as any).total).toBe(3);
    const second = await database.glEntries.findAll({
      page: 2,
      pageSize: 2,
      filters: scope,
    } as any);
    expect((second as any).data[0].credit).toBe(1);
    const empty = await database.glEntries.findAll({
      page: 999999,
      pageSize: 2,
      filters: scope,
    } as any);
    expect((empty as any).data.length).toBe(0);
  });

  it('sanitizePageSize bounds UI pages and rejects bad input', () => {
    expect(sanitizePageSize(1000000, 50)).toBe(200);
    expect(sanitizePageSize(75, 50)).toBe(75);
    expect(sanitizePageSize(0, 50)).toBe(50);
    expect(sanitizePageSize(undefined, 50)).toBe(50);
    expect(sanitizePageSize(NaN, 50)).toBe(50);
    expect(sanitizePage(0)).toBe(1);
    expect(sanitizePage(-3)).toBe(1);
    expect(sanitizePage(4)).toBe(4);
  });
});
