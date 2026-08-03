// Verify unique-index behavior for posting engine writes
// Run from database/ dir with DATABASE_URL=file:../data/dev.db
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import {
  loadDatabaseConfig,
  GlEntriesRepository,
  GstLedgerRepository,
  CashBookRepository,
} from './dist/index.js';

async function main() {
  const config = loadDatabaseConfig();
  const rawClient = createClient({ url: config.url || 'file:./data/dev.db' });
  const db = drizzle(rawClient);
  const gl = new GlEntriesRepository(db, false);
  const gst = new GstLedgerRepository(db, false);
  const cash = new CashBookRepository(db, false);

  const voucherId = `REPRO-UNIQUE-${Date.now()}`;

  // GL: two entries, same voucherId, different account + entry numbers
  try {
    await gl.create({
      entryNumber: `${voucherId}-001`,
      entryDate: '2026-08-01',
      accountId: 'REPRO-ACCT-A',
      voucherId,
      voucherType: 'sales_invoice',
      voucherNumber: 'REPRO-001',
      debit: 0,
      credit: 100,
      balance: 0,
      narration: 'test 1',
      createdBy: 'repro',
    });
    console.log('✓ gl #1 created');
  } catch (e) { console.log('✗ gl #1 FAILED:', e.message); }

  try {
    await gl.create({
      entryNumber: `${voucherId}-002`,
      entryDate: '2026-08-01',
      accountId: 'REPRO-ACCT-B',
      voucherId, // same voucher!
      voucherType: 'sales_invoice',
      voucherNumber: 'REPRO-001',
      debit: 100,
      credit: 0,
      balance: 0,
      narration: 'test 2',
      createdBy: 'repro',
    });
    console.log('✓ gl #2 created (same voucherId OK)');
  } catch (e) { console.log('✗ gl #2 FAILED:', e.message); }

  // GST: two entries same (voucher_type, voucher_id)
  try {
    await gst.create({
      voucherId,
      voucherType: 'sales_invoice',
      voucherNumber: 'REPRO-001',
      voucherDate: '2026-08-01',
      gstType: 'CGST',
      gstRate: 9,
      taxableValue: 100,
      gstAmount: 9,
      cessAmount: 0,
      inputOutput: 'OUTPUT',
      reverseCharge: 'no',
    });
    console.log('✓ gst #1 created');
  } catch (e) { console.log('✗ gst #1 FAILED:', e.message); }

  try {
    await gst.create({
      voucherId,
      voucherType: 'sales_invoice',
      voucherNumber: 'REPRO-001',
      voucherDate: '2026-08-01',
      gstType: 'SGST',
      gstRate: 9,
      taxableValue: 100,
      gstAmount: 9,
      cessAmount: 0,
      inputOutput: 'OUTPUT',
      reverseCharge: 'no',
    });
    console.log('✓ gst #2 created (same voucher OK)');
  } catch (e) { console.log('✗ gst #2 FAILED:', e.message); }

  // Cash book: two entries same cash_account_id + entry_date
  try {
    await cash.create({
      cashAccountId: 'REPRO-CASH',
      entryDate: '2026-08-01',
      voucherType: 'sales_invoice',
      voucherId,
      voucherNumber: 'REPRO-001',
      debit: 118,
      credit: 0,
      runningBalance: 118,
    });
    console.log('✓ cash #1 created');
  } catch (e) { console.log('✗ cash #1 FAILED:', e.message); }

  try {
    await cash.create({
      cashAccountId: 'REPRO-CASH',
      entryDate: '2026-08-01',
      voucherType: 'sales_invoice',
      voucherId: `${voucherId}-2`,
      voucherNumber: 'REPRO-002',
      debit: 50,
      credit: 0,
      runningBalance: 168,
    });
    console.log('✓ cash #2 created (same account+date OK)');
  } catch (e) { console.log('✗ cash #2 FAILED:', e.message); }
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
