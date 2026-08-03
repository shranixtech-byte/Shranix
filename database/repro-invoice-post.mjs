// Reproduction: SalesInvoice create (items) + NEW posting-engine write shapes against real dev.db
// Run from database/ dir: DATABASE_URL=file:../data/dev.db node repro-invoice-post.mjs
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import {
  loadDatabaseConfig,
  InvoiceItemsRepository,
  SalesInvoicesRepository,
  StockLedgerRepository,
  GlEntriesRepository,
  GstLedgerRepository,
  CashBookRepository,
  AuditLogsRepository,
  NotificationsRepository,
  WarehouseStockRepository,
  ChartOfAccountsRepository,
} from './dist/index.js';

async function main() {
  const config = loadDatabaseConfig();
  console.log('DB config provider:', config.provider, '| url:', config.url || '(default file:./data/dev.db)');
  const rawClient = createClient({ url: config.url || 'file:./data/dev.db' });
  const db = drizzle(rawClient);
  const isPostgres = config.provider === 'postgresql';
  if (isPostgres) {
    console.log('SKIP: running postgres, this repro targets sqlite');
    return;
  }

  const invoiceItems = new InvoiceItemsRepository(db, false);
  const salesInvoices = new SalesInvoicesRepository(db, false);
  const stockLedger = new StockLedgerRepository(db, false);
  const glEntries = new GlEntriesRepository(db, false);
  const gstLedger = new GstLedgerRepository(db, false);
  const cashBook = new CashBookRepository(db, false);
  const auditLogs = new AuditLogsRepository(db, false);
  const notifications = new NotificationsRepository(db, false);
  const warehouseStock = new WarehouseStockRepository(db, false);
  const chartOfAccounts = new ChartOfAccountsRepository(db, false);

  const invoiceNumber = `REPRO-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();
  console.log('Invoice number:', invoiceNumber);

  // ── 1. Invoice header create (draft) ─────────────────────────
  const inv = await salesInvoices.create({
    invoiceNumber,
    customerId: 'repro-customer',
    invoiceDate: '2026-08-01',
    status: 'draft',
    subTotal: 100,
    grandTotal: 118,
  });
  console.log('✓ Invoice header created:', inv.id);

  // ── 2. Invoice items create (as SalesInvoicesService.create does) ──
  const item = await invoiceItems.create({
    invoiceId: inv.id,
    itemId: 'repro-item',
    variantId: null,
    description: 'Test Product',
    quantity: 1,
    unitId: null,
    rate: 100,
    discountPercent: 0,
    discountAmount: 0,
    batchNo: null,
    warehouse: null,
    expiryDate: null,
    taxableValue: 100,
    gstRate: 18,
    igst: 0,
    cgst: 9,
    sgst: 9,
    cess: 0,
    totalAmount: 118,
  });
  console.log('✓ Invoice item created:', item.id);

  // ── 3. NEW triggerPosting write shapes ────────────────────────

  // 3a. stockLedger.create — step 4 (schema-correct columns)
  try {
    await stockLedger.create({
      itemId: 'repro-item',
      warehouseId: null,
      batchNo: null,
      transactionType: 'sales_invoice',
      documentRef: invoiceNumber,
      documentType: 'sales_invoice',
      quantity: 1,
      beforeQty: 100,
      afterQty: 99,
      rate: 70,
      amount: 70,
      createdBy: 'system',
      remarks: `Sales invoice ${invoiceNumber}`,
    });
    console.log('✓ stockLedger.create (new columns) OK');
  } catch (e) {
    console.log('✗ STOCK LEDGER CREATE FAILED:', e.message);
  }

  // 3b. warehouseStock findAll by filters — step 3
  try {
    const stock = await warehouseStock.findAll({ filters: [{ field: 'itemId', operator: 'eq', value: 'repro-item' }], page: 1, pageSize: 50 }).catch(() => ({ data: [] }));
    console.log('✓ warehouseStock.findAll (filters) OK (rows:', (stock.data || []).length + ')');
  } catch (e) {
    console.log('✗ WAREHOUSE STOCK FIND FAILED:', e.message);
  }

  // 3c. glEntries.create — step 5 (skipped when no receivable account; try anyway)
  try {
    const accounts = await chartOfAccounts.findAll({ page: 1, pageSize: 200 }).catch(() => ({ data: [] }));
    const receivable = (accounts.data || []).find((a) => String(a.accountName || '').toLowerCase().includes('debtor'));
    if (receivable) {
      await glEntries.create({
        entryNumber: `SINV-${invoiceNumber}-001`,
        entryDate: '2026-08-01',
        accountId: receivable.id,
        voucherId: inv.id,
        voucherType: 'sales_invoice',
        voucherNumber: invoiceNumber,
        debit: 118,
        credit: 118,
        balance: 0,
        narration: 'GL summary',
        partyId: 'repro-customer',
        createdBy: 'system',
      });
      console.log('✓ glEntries.create (summary row) OK');
    } else {
      console.log('— glEntries SKIPPED (no receivable account in chart of accounts — expected on fresh install)');
    }
  } catch (e) {
    console.log('✗ GL ENTRIES CREATE FAILED:', e.message);
  }

  // 3d. gstLedger.create — step 6 (schema-correct columns)
  try {
    await gstLedger.create({
      voucherType: 'sales_invoice',
      voucherId: inv.id,
      voucherNumber: invoiceNumber,
      voucherDate: '2026-08-01',
      gstType: 'output',
      gstRate: 18,
      taxableValue: 100,
      gstAmount: 18,
      cessAmount: 0,
      inputOutput: 'output',
      reverseCharge: 'no',
      createdBy: 'system',
    });
    console.log('✓ gstLedger.create (new columns) OK');
  } catch (e) {
    console.log('✗ GST LEDGER CREATE FAILED:', e.message);
  }

  // 3e. cashBook.create — step 7 (skipped when no cash account; try anyway)
  try {
    const accounts = await chartOfAccounts.findAll({ page: 1, pageSize: 200 }).catch(() => ({ data: [] }));
    const cashAccount = (accounts.data || []).find((a) => a.isCashAccount === true || String(a.accountName || '').toLowerCase().includes('cash'));
    if (cashAccount) {
      await cashBook.create({
        cashAccountId: cashAccount.id,
        entryDate: '2026-08-01',
        voucherType: 'receipt',
        voucherId: inv.id,
        voucherNumber: invoiceNumber,
        partyId: 'repro-customer',
        debit: 118,
        credit: 0,
        runningBalance: 118,
        narration: `Payment received for ${invoiceNumber}`,
        createdBy: 'system',
      });
      console.log('✓ cashBook.create OK');
    } else {
      console.log('— cashBook SKIPPED (no cash account configured — expected on fresh install)');
    }
  } catch (e) {
    console.log('✗ CASH BOOK CREATE FAILED:', e.message);
  }

  // 3f. auditLogs.create — step 8 (schema-correct columns)
  try {
    await auditLogs.create({
      userId: 'system',
      event: 'invoice_posted',
      resource: 'sales_invoice',
      action: 'post',
      details: JSON.stringify({ invoiceNumber, oldStatus: 'draft', newStatus: 'posted' }),
      ipAddress: '127.0.0.1',
      userAgent: 'Web Browser',
    });
    console.log('✓ auditLogs.create (new columns) OK');
  } catch (e) {
    console.log('✗ AUDIT LOGS CREATE FAILED:', e.message);
  }

  // 3g. notifications.create — step 9 (schema-correct columns)
  try {
    await notifications.create({
      userId: 'system',
      title: `Invoice posted: ${invoiceNumber}`,
      message: `Invoice ${invoiceNumber} has been posted.`,
      type: 'invoice_posted',
      module: 'sales',
      documentId: inv.id,
      documentType: 'sales_invoice',
      isRead: false,
    });
    console.log('✓ notifications.create (new columns) OK');
  } catch (e) {
    console.log('✗ NOTIFICATIONS CREATE FAILED:', e.message);
  }

  console.log('\nDONE — invoice ' + invoiceNumber + ' (cleanup: delete rows with invoiceNumber/ref ' + invoiceNumber + ')');
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
