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

import { GlPostingEngine } from '../automation/gl-posting.engine';
import { TransactionManager } from '../automation/transaction.manager';
import { DatabaseService } from '../database/database.service';

/**
 * REAL-DB integration tests for the double-entry GL posting engine.
 *
 * Regression for critical runtime bugs found in the Phase-4 finance audit:
 *  - `gl_voucher_idx` was UNIQUE(voucher_id) — GlPostingEngine.postEntries
 *    writes one row PER LINE (Dr Customer / Cr Sales / Cr GST) so any
 *    multi-line journal crashed on line 2 with SQLITE_CONSTRAINT_UNIQUE.
 *  - `gl_account_date_idx` was UNIQUE(account_id, entry_date) — a second
 *    voucher posting to the same account on the same day crashed.
 *
 * The fix (migration 0016) changed gl_voucher_idx → UNIQUE(voucher_id,
 * account_id) and gl_account_date_idx → plain index. These tests prove the
 * engine now works against the real schema and still rejects genuine
 * duplicates (same account twice within one voucher).
 */
describe('GlPostingEngine (real DB)', () => {
  let dbDir: string;
  let database: DatabaseService;
  let txn: TransactionManager;
  let engine: GlPostingEngine;

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'gl-post-'));
    const dbFile = join(dbDir, 'test.db');
    const client = createClient({ url: `file:${dbFile}` });
    const drizzleDb = drizzle(client as any);

    // Apply the real migrations (0000 → 0016 — includes the index fix)
    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    database = new DatabaseService(drizzleDb as any);
    txn = new TransactionManager(database);
    engine = new GlPostingEngine(database, txn);

    // Seed minimal chart-of-accounts for the tests
    const now = new Date().toISOString();
    await database.chartOfAccounts.create({
      accountCode: 'ACC-CUST',
      accountName: 'Sundry Debtors',
      accountType: 'assets',
      groupId: 'g1',
      openingBalance: 0,
      openingBalanceType: 'debit',
      currency: 'INR',
      isActive: true,
      costCenterRequired: false,
      gstApplicable: false,
      bankReconciliation: false,
      isCashAccount: false,
      isControlAccount: true,
      allowManualPosting: true,
      createdAt: now,
      updatedAt: now,
    } as any);
    await database.chartOfAccounts.create({
      accountCode: 'ACC-SALES',
      accountName: 'Sales Account',
      accountType: 'income',
      groupId: 'g2',
      openingBalance: 0,
      openingBalanceType: 'credit',
      currency: 'INR',
      isActive: true,
      costCenterRequired: false,
      gstApplicable: false,
      bankReconciliation: false,
      isCashAccount: false,
      isControlAccount: false,
      allowManualPosting: true,
      createdAt: now,
      updatedAt: now,
    } as any);
    await database.chartOfAccounts.create({
      accountCode: 'ACC-GST',
      accountName: 'GST Output',
      accountType: 'liabilities',
      groupId: 'g3',
      openingBalance: 0,
      openingBalanceType: 'credit',
      currency: 'INR',
      isActive: true,
      costCenterRequired: false,
      gstApplicable: true,
      bankReconciliation: false,
      isCashAccount: false,
      isControlAccount: false,
      allowManualPosting: true,
      createdAt: now,
      updatedAt: now,
    } as any);
  });

  afterAll(async () => {
    try {
      await (database as any).close?.();
    } catch {
      /* ignore */
    }
  });

  async function accounts() {
    const res = await database.chartOfAccounts.findAll({ page: 1, pageSize: 50 } as any);
    const byCode = new Map<string, string>();
    for (const a of res.data) {
      byCode.set(a.accountCode, a.id);
    }
    return byCode;
  }

  it('posts a 3-line journal (Dr Customer / Cr Sales / Cr GST) without unique violations', async () => {
    const acct = await accounts();
    const result = await engine.postEntries(
      [
        {
          entryDate: '2026-08-11',
          accountId: acct.get('ACC-CUST')!,
          voucherId: 'JV-100',
          voucherType: 'journal',
          voucherNumber: 'JV-100',
          debit: 1000,
          credit: 0,
          narration: 'Sale of goods',
        },
        {
          entryDate: '2026-08-11',
          accountId: acct.get('ACC-SALES')!,
          voucherId: 'JV-100',
          voucherType: 'journal',
          voucherNumber: 'JV-100',
          debit: 0,
          credit: 900,
          narration: 'Sale of goods',
        },
        {
          entryDate: '2026-08-11',
          accountId: acct.get('ACC-GST')!,
          voucherId: 'JV-100',
          voucherType: 'journal',
          voucherNumber: 'JV-100',
          debit: 0,
          credit: 100,
          narration: 'GST on sale',
        },
      ],
      { userId: 'u1' },
    );
    expect(result.success).toBe(true);
    expect(result.entriesCreated).toBe(3);
  }, 60000);

  it('allows a second voucher to the same account on the same day', async () => {
    const acct = await accounts();
    const result = await engine.postEntries(
      [
        {
          entryDate: '2026-08-11',
          accountId: acct.get('ACC-CUST')!,
          voucherId: 'JV-200',
          voucherType: 'journal',
          voucherNumber: 'JV-200',
          debit: 500,
          credit: 0,
          narration: 'Second sale same day',
        },
        {
          entryDate: '2026-08-11',
          accountId: acct.get('ACC-SALES')!,
          voucherId: 'JV-200',
          voucherType: 'journal',
          voucherNumber: 'JV-200',
          debit: 0,
          credit: 500,
          narration: 'Second sale same day',
        },
      ],
      { userId: 'u1' },
    );
    expect(result.success).toBe(true);
    expect(result.entriesCreated).toBe(2);
  }, 60000);

  it('rejects an unbalanced journal (debit ≠ credit)', async () => {
    const acct = await accounts();
    const result = await engine.postEntries(
      [
        {
          entryDate: '2026-08-12',
          accountId: acct.get('ACC-CUST')!,
          voucherId: 'JV-300',
          voucherType: 'journal',
          voucherNumber: 'JV-300',
          debit: 1000,
          credit: 0,
          narration: 'Unbalanced',
        },
        {
          entryDate: '2026-08-12',
          accountId: acct.get('ACC-SALES')!,
          voucherId: 'JV-300',
          voucherType: 'journal',
          voucherNumber: 'JV-300',
          debit: 0,
          credit: 800,
          narration: 'Unbalanced',
        },
      ],
      { userId: 'u1' },
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/debit.*credit/i);
  }, 60000);

  it('rejects a genuine duplicate — same account twice in one voucher', async () => {
    const acct = await accounts();
    // Balanced journal where ACC-CUST is used TWICE (a real double-post).
    // The (voucher_id, account_id) unique index must reject the 3rd line.
    const result = await engine.postEntries(
      [
        {
          entryDate: '2026-08-13',
          accountId: acct.get('ACC-CUST')!,
          voucherId: 'JV-400',
          voucherType: 'journal',
          voucherNumber: 'JV-400',
          debit: 600,
          credit: 0,
          narration: 'Line 1',
        },
        {
          entryDate: '2026-08-13',
          accountId: acct.get('ACC-SALES')!,
          voucherId: 'JV-400',
          voucherType: 'journal',
          voucherNumber: 'JV-400',
          debit: 0,
          credit: 600,
          narration: 'Line 2',
        },
        {
          entryDate: '2026-08-13',
          accountId: acct.get('ACC-CUST')!,
          voucherId: 'JV-400',
          voucherType: 'journal',
          voucherNumber: 'JV-400',
          debit: 100,
          credit: 0,
          narration: 'Duplicate line (same account again)',
        },
        {
          entryDate: '2026-08-13',
          accountId: acct.get('ACC-GST')!,
          voucherId: 'JV-400',
          voucherType: 'journal',
          voucherNumber: 'JV-400',
          debit: 0,
          credit: 100,
          narration: 'Balance the duplicate',
        },
      ],
      { userId: 'u1' },
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/duplicate/i);
  }, 60000);

  it('reversal creates balanced reversing entries', async () => {
    const acct = await accounts();
    await engine.postEntries(
      [
        {
          entryDate: '2026-08-14',
          accountId: acct.get('ACC-CUST')!,
          voucherId: 'JV-500',
          voucherType: 'journal',
          voucherNumber: 'JV-500',
          debit: 300,
          credit: 0,
          narration: 'To reverse',
        },
        {
          entryDate: '2026-08-14',
          accountId: acct.get('ACC-SALES')!,
          voucherId: 'JV-500',
          voucherType: 'journal',
          voucherNumber: 'JV-500',
          debit: 0,
          credit: 300,
          narration: 'To reverse',
        },
      ],
      { userId: 'u1' },
    );
    const rev = await engine.reverseEntries('JV-500', { userId: 'u1', reason: 'correction' });
    expect(rev.success).toBe(true);
    expect(rev.entriesCreated).toBe(2);
    // Reversal swaps debit↔credit
    for (const entry of rev.entries) {
      expect(entry.voucherType).toBe('reversal');
    }
  }, 60000);
});
