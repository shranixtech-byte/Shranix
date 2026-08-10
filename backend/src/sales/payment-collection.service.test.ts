import { describe, expect, it, vi, beforeEach } from 'vitest';

import { SalesPaymentCollectionService } from './payment-collection.service';

// ── In-memory repository mock ─────────────────────────────
function makeRepo(initial: any[] = []) {
  const rows = new Map<string, any>();
  for (const r of initial) {
    rows.set(r.id, { ...r, isDeleted: false });
  }
  return {
    findById: vi.fn(async (id: string) => rows.get(id) || null),
    create: vi.fn(async (data: any) => {
      const id = `id-${rows.size + 1}`;
      const row = {
        ...data,
        id,
        createdAt: '2026-08-06T00:00:00.000Z',
        updatedAt: '2026-08-06T00:00:00.000Z',
        isDeleted: false,
      };
      rows.set(id, row);
      return row;
    }),
    update: vi.fn(async (id: string, data: any) => {
      const row = rows.get(id);
      if (!row) {
        return null;
      }
      const updated = { ...row, ...data, updatedAt: '2026-08-06T00:00:00.000Z' };
      rows.set(id, updated);
      return updated;
    }),
    findAll: vi.fn(async ({ filters = [], page = 1, pageSize = 50 }: any = {}) => {
      let list = [...rows.values()].filter((r) => !r.isDeleted);
      for (const f of filters || []) {
        list = list.filter((r) => {
          const v = r[f.field];
          if (f.operator === 'eq') {
            return String(v) === String(f.value);
          }
          if (f.operator === 'like') {
            return String(v).includes(String(f.value).replace(/%/g, ''));
          }
          if (f.operator === 'gt') {
            return Number(v) > Number(f.value);
          }
          if (f.operator === 'gte') {
            return Number(v) >= Number(f.value);
          }
          if (f.operator === 'lte') {
            return Number(v) <= Number(f.value);
          }
          return true;
        });
      }
      const start = (page - 1) * pageSize;
      return { data: list.slice(start, start + pageSize), total: list.length };
    }),
    _rows: rows,
  };
}

function seedInvoice(db: any, overrides: Record<string, unknown> = {}) {
  const inv = {
    id: 'inv-1',
    invoiceNumber: 'SI-0001',
    customerId: 'c1',
    invoiceDate: '2026-07-01',
    dueDate: '2026-07-31',
    grandTotal: 1000,
    paidAmount: 0,
    balanceAmount: 1000,
    paymentStatus: 'unpaid',
    status: 'posted',
    isDeleted: false,
    ...overrides,
  };
  db.salesInvoices._rows.set(inv.id, inv);
  return inv;
}

function makeFixture() {
  const database = {
    ledgerMaster: makeRepo([{ id: 'c1', partyId: 'Sharma Traders' }]),
    creditProfiles: makeRepo([
      {
        id: 'cp1',
        customerId: 'c1',
        creditLimit: 50000,
        outstanding: 1000,
        advanceBalance: 0,
        availableCredit: 49000,
        lastPaymentDate: null,
      },
    ]),
    salesInvoices: makeRepo(),
    salesPayments: makeRepo(),
    accountingSettings: makeRepo([]),
    cashBook: makeRepo(),
    bankBook: makeRepo(),
  };

  const audit = { log: vi.fn(async () => undefined) };
  const service = new SalesPaymentCollectionService(database as any, audit as any);
  return { database, audit, service };
}

describe('SalesPaymentCollectionService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('collects a partial cash payment and updates invoice + credit profile', async () => {
    const { database, service } = makeFixture();
    seedInvoice(database, { grandTotal: 1000, balanceAmount: 1000 });

    const result = await service.collect(
      {
        customerId: 'c1',
        paymentDate: '2026-08-06',
        mode: 'cash',
        amount: 400,
        invoiceIds: ['inv-1'],
      },
      'user-1',
    );

    expect(result.success).toBe(true);
    expect(result.settledTotal).toBe(400);
    expect(result.advanceAmount).toBe(0);
    expect(result.payments).toHaveLength(1);
    expect(result.payments[0].paymentNumber).toMatch(/^RCP-2026-/);
    expect(result.payments[0].mode).toBe('cash');

    // Invoice updated: paid 400, balance 600, partial
    const inv = database.salesInvoices._rows.get('inv-1');
    expect(inv.paidAmount).toBe(400);
    expect(inv.balanceAmount).toBe(600);
    expect(inv.paymentStatus).toBe('partial');

    // Credit profile: outstanding 1000 → 600
    const cp = database.creditProfiles._rows.get('cp1');
    expect(cp.outstanding).toBe(600);
    expect(cp.lastPaymentDate).toBe('2026-08-06');

    // Cash book entry written (accountingSettings empty → no default account → skipped)
    expect(database.cashBook.create).not.toHaveBeenCalled();
  });

  it('fully pays an invoice and marks it paid', async () => {
    const { database, service } = makeFixture();
    seedInvoice(database, { grandTotal: 1000, balanceAmount: 1000 });

    await service.collect(
      {
        customerId: 'c1',
        paymentDate: '2026-08-06',
        mode: 'cash',
        amount: 1000,
        invoiceIds: ['inv-1'],
      },
      'user-1',
    );

    const inv = database.salesInvoices._rows.get('inv-1');
    expect(inv.paidAmount).toBe(1000);
    expect(inv.balanceAmount).toBe(0);
    expect(inv.paymentStatus).toBe('paid');
    expect(database.creditProfiles._rows.get('cp1').outstanding).toBe(0);
  });

  it('creates an advance record for the excess on overpayment', async () => {
    const { database, service } = makeFixture();
    seedInvoice(database, { grandTotal: 1000, balanceAmount: 1000 });

    const result = await service.collect(
      {
        customerId: 'c1',
        paymentDate: '2026-08-06',
        mode: 'upi',
        amount: 1200,
        invoiceIds: ['inv-1'],
        referenceNo: 'UTR123',
      },
      'user-1',
    );

    expect(result.settledTotal).toBe(1000);
    expect(result.advanceAmount).toBe(200);
    expect(result.payments).toHaveLength(2); // invoice payment + advance
    expect(result.payments[1].isAdvance).toBe(true);
    expect(result.payments[1].invoiceId).toBeNull();

    // Advance balance credited
    expect(database.creditProfiles._rows.get('cp1').advanceBalance).toBe(200);
    // Invoice fully paid
    expect(database.salesInvoices._rows.get('inv-1').paymentStatus).toBe('paid');
  });

  it('records an invoice-free advance when no invoices are selected', async () => {
    const { service } = makeFixture();

    const result = await service.collect(
      {
        customerId: 'c1',
        paymentDate: '2026-08-06',
        mode: 'cheque',
        amount: 500,
        invoiceIds: [],
        chequeNo: 'CHQ-001',
      },
      'user-1',
    );

    expect(result.payments).toHaveLength(1);
    expect(result.payments[0].isAdvance).toBe(true);
    expect(result.advanceAmount).toBe(500);
  });

  it('allocates across multiple invoices oldest-first', async () => {
    const { database, service } = makeFixture();
    seedInvoice(database, {
      id: 'inv-1',
      invoiceNumber: 'SI-0001',
      invoiceDate: '2026-06-01',
      grandTotal: 300,
      balanceAmount: 300,
    });
    seedInvoice(database, {
      id: 'inv-2',
      invoiceNumber: 'SI-0002',
      invoiceDate: '2026-07-01',
      grandTotal: 700,
      balanceAmount: 700,
    });

    const result = await service.collect(
      {
        customerId: 'c1',
        paymentDate: '2026-08-06',
        mode: 'cash',
        amount: 500,
        invoiceIds: ['inv-2', 'inv-1'],
      },
      'user-1',
    );

    // Even though inv-2 listed first, oldest (inv-1) is settled first
    expect(result.settledTotal).toBe(500);
    expect(database.salesInvoices._rows.get('inv-1').balanceAmount).toBe(0);
    expect(database.salesInvoices._rows.get('inv-2').balanceAmount).toBe(500);
  });

  it('applies advance balance to invoices and reduces advance', async () => {
    const { database, service } = makeFixture();
    seedInvoice(database, {
      id: 'inv-2',
      invoiceNumber: 'SI-0002',
      invoiceDate: '2026-07-01',
      grandTotal: 700,
      balanceAmount: 700,
    });
    database.creditProfiles._rows.set('cp1', {
      ...database.creditProfiles._rows.get('cp1'),
      advanceBalance: 200,
      outstanding: 1700,
    });

    const result = await service.applyAdvance(
      { customerId: 'c1', invoiceIds: ['inv-2'], amount: 200, paymentDate: '2026-08-06' },
      'user-1',
    );

    expect(result.applied).toBe(200);
    expect(database.salesInvoices._rows.get('inv-2').balanceAmount).toBe(500);
    expect(database.creditProfiles._rows.get('cp1').advanceBalance).toBe(0);
    expect(database.creditProfiles._rows.get('cp1').outstanding).toBe(1500);
    // Advance application: no cash movement → no book entry
    expect(database.cashBook.create).not.toHaveBeenCalled();
    expect(database.bankBook.create).not.toHaveBeenCalled();
  });

  it('rejects advance application beyond available balance', async () => {
    const { service } = makeFixture();
    await expect(
      service.applyAdvance(
        { customerId: 'c1', invoiceIds: ['inv-1'], amount: 500, paymentDate: '2026-08-06' },
        'user-1',
      ),
    ).rejects.toThrow(/Insufficient advance balance/);
  });

  it('rejects invalid amount and unknown customer', async () => {
    const { service } = makeFixture();
    await expect(
      service.collect({
        customerId: 'c1',
        paymentDate: '2026-08-06',
        mode: 'cash',
        amount: 0,
        invoiceIds: [],
      }),
    ).rejects.toThrow(/greater than zero/);
    await expect(
      service.collect({
        customerId: 'missing',
        paymentDate: '2026-08-06',
        mode: 'cash',
        amount: 100,
        invoiceIds: [],
      }),
    ).rejects.toThrow(/Customer not found/);
  });

  it('writes cash book entries when a default cash account is configured', async () => {
    const { database, service } = makeFixture();
    database.accountingSettings._rows.set('s1', {
      id: 's1',
      defaultCashAccountId: 'acc-cash',
      defaultBankAccountId: 'acc-bank',
      isDeleted: false,
    });
    seedInvoice(database, { grandTotal: 1000, balanceAmount: 1000 });

    await service.collect(
      {
        customerId: 'c1',
        paymentDate: '2026-08-06',
        mode: 'cash',
        amount: 500,
        invoiceIds: ['inv-1'],
      },
      'user-1',
    );

    expect(database.cashBook.create).toHaveBeenCalledWith(
      expect.objectContaining({
        cashAccountId: 'acc-cash',
        entryDate: '2026-08-06',
        voucherType: 'receipt',
        debit: 500,
        credit: 0,
      }),
    );
  });

  it('accumulates same-day cash book entries instead of violating the unique index', async () => {
    const { database, service } = makeFixture();
    database.accountingSettings._rows.set('s1', {
      id: 's1',
      defaultCashAccountId: 'acc-cash',
      isDeleted: false,
    });
    seedInvoice(database, { id: 'inv-1', grandTotal: 1000, balanceAmount: 1000 });
    seedInvoice(database, {
      id: 'inv-2',
      invoiceNumber: 'SI-0002',
      grandTotal: 600,
      balanceAmount: 600,
    });

    // First payment creates the entry
    await service.collect(
      {
        customerId: 'c1',
        paymentDate: '2026-08-06',
        mode: 'cash',
        amount: 400,
        invoiceIds: ['inv-1'],
      },
      'user-1',
    );
    expect(database.cashBook.create).toHaveBeenCalledTimes(1);

    // Second same-day payment updates (not creates) the entry
    await service.collect(
      {
        customerId: 'c1',
        paymentDate: '2026-08-06',
        mode: 'cash',
        amount: 300,
        invoiceIds: ['inv-2'],
      },
      'user-1',
    );
    expect(database.cashBook.create).toHaveBeenCalledTimes(1);
    const row = [...database.cashBook._rows.values()][0];
    expect(row.debit).toBe(700);
    expect(row.narration).toContain('SI-0001');
    expect(row.narration).toContain('SI-0002');
  });
});
