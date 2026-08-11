import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PurchasePaymentsService } from './purchase-payments.service';

// ── In-memory repository mock (same surface as other purchase tests) ──────
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
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
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
      const updated = { ...row, ...data, updatedAt: '2026-08-10T00:00:00.000Z' };
      rows.set(id, updated);
      return updated;
    }),
    softDelete: vi.fn(async (id: string) => {
      const row = rows.get(id);
      if (row) {
        row.isDeleted = true;
        rows.set(id, row);
      }
    }),
    findAll: vi.fn(async ({ filters = [], page = 1, pageSize = 50, sortBy, sortDir }: any = {}) => {
      let list = [...rows.values()].filter((r) => !r.isDeleted);
      for (const f of filters || []) {
        if (f.operator === 'eq') {
          list = list.filter((r) => String(r[f.field]) === String(f.value));
        } else if (f.operator === 'like') {
          list = list.filter((r) =>
            String(r[f.field] || '').includes(String(f.value).replace(/%/g, '')),
          );
        } else if (f.operator === 'gt') {
          list = list.filter((r) => Number(r[f.field]) > Number(f.value));
        } else if (f.operator === 'gte') {
          list = list.filter((r) => String(r[f.field]) >= String(f.value));
        } else if (f.operator === 'lte') {
          list = list.filter((r) => String(r[f.field]) <= String(f.value));
        }
      }
      if (sortBy && sortDir) {
        list.sort((a, b) =>
          sortDir === 'desc'
            ? String(a[sortBy] || '').localeCompare(String(b[sortBy] || '')) * -1
            : String(a[sortBy] || '').localeCompare(String(b[sortBy] || '')),
        );
      }
      const start = (page - 1) * pageSize;
      return { data: list.slice(start, start + pageSize), total: list.length };
    }),
    _rows: rows,
  };
}

function makeFixture() {
  const database = {
    purchasePayments: makeRepo(),
    purchaseInvoices: makeRepo([
      {
        id: 'inv-1',
        invoiceNumber: 'PI-0001',
        supplierId: 'sup-1',
        invoiceDate: '2026-08-01',
        dueDate: '2026-08-31',
        grandTotal: 2230,
        paidAmount: 0,
        balanceAmount: 2230,
        paymentStatus: 'unpaid',
        status: 'posted',
      },
      {
        id: 'inv-2',
        invoiceNumber: 'PI-0002',
        supplierId: 'sup-1',
        invoiceDate: '2026-08-05',
        dueDate: '2026-09-04',
        grandTotal: 1000,
        paidAmount: 0,
        balanceAmount: 1000,
        paymentStatus: 'unpaid',
        status: 'posted',
      },
      {
        id: 'inv-draft',
        invoiceNumber: 'PI-0003',
        supplierId: 'sup-1',
        invoiceDate: '2026-08-07',
        grandTotal: 500,
        paidAmount: 0,
        balanceAmount: 500,
        paymentStatus: 'unpaid',
        status: 'draft',
      },
    ]),
    suppliers: makeRepo([
      { id: 'sup-1', name: 'Sharma Traders', code: 'SUP-0001', currentBalance: 3230 },
    ]),
    ledgerMaster: makeRepo([{ id: 'sup-1', partyId: 'Sharma Traders', currentBalance: 3230 }]),
    accountingSettings: makeRepo([
      { id: 'as-1', defaultCashAccountId: 'cash-1', defaultBankAccountId: 'bank-1' },
    ]),
    cashBook: makeRepo(),
    bankBook: makeRepo(),
  };
  const audit = { log: vi.fn(async () => undefined) };
  const service = new PurchasePaymentsService(database as any, audit as any);
  return { database, audit, service };
}

describe('PurchasePaymentsService (Phase 3.3 — G3 supplier payment collection)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('collects payment, allocates oldest-first and updates invoice balances', async () => {
    const { database, service } = makeFixture();

    const res = await service.collect(
      {
        supplierId: 'sup-1',
        paymentDate: '2026-08-10',
        mode: 'cash',
        amount: 1500,
        invoiceIds: ['inv-1', 'inv-2'],
      },
      'user-1',
    );

    expect(res.success).toBe(true);
    expect(res.settledTotal).toBe(1500);
    expect(res.advanceAmount).toBe(0);
    // Oldest first: inv-1 (2230) gets 1500
    expect(database.purchaseInvoices._rows.get('inv-1').paidAmount).toBe(1500);
    expect(database.purchaseInvoices._rows.get('inv-1').balanceAmount).toBe(730);
    expect(database.purchaseInvoices._rows.get('inv-1').paymentStatus).toBe('partial');
    // Payment records created
    expect(database.purchasePayments._rows.size).toBe(1);
    const p = [...database.purchasePayments._rows.values()][0];
    expect(p.paymentNumber).toBe('PAY-2026-0001');
    expect(p.mode).toBe('cash');
    expect(p.invoiceId).toBe('inv-1');
    // Supplier + ledger balance reduced
    expect(database.suppliers._rows.get('sup-1').currentBalance).toBe(1730);
    expect(database.ledgerMaster._rows.get('sup-1').currentBalance).toBe(1730);
    // Cash book entry written
    expect(database.cashBook._rows.size).toBe(1);
    expect([...database.cashBook._rows.values()][0].credit).toBe(1500);
  });

  it('excess payment becomes supplier advance', async () => {
    const { database, service } = makeFixture();

    const res = await service.collect(
      {
        supplierId: 'sup-1',
        paymentDate: '2026-08-10',
        mode: 'upi',
        amount: 4000,
        invoiceIds: ['inv-1', 'inv-2'],
      },
      'user-1',
    );

    expect(res.settledTotal).toBe(3230);
    expect(res.advanceAmount).toBe(770);
    expect(database.purchasePayments._rows.size).toBe(3); // 2 allocations + 1 advance
    expect(database.purchaseInvoices._rows.get('inv-1').paymentStatus).toBe('paid');
    expect(database.purchaseInvoices._rows.get('inv-2').paymentStatus).toBe('paid');
    // Advance record flagged
    const advance = [...database.purchasePayments._rows.values()].find((r) => r.isAdvance === true);
    expect(advance).toBeTruthy();
    expect(advance.amount).toBe(770);
  });

  it('applies supplier advance to invoices', async () => {
    const { database, service } = makeFixture();
    // First create an advance
    await service.collect(
      { supplierId: 'sup-1', paymentDate: '2026-08-10', mode: 'bank', amount: 2000 },
      'user-1',
    );
    expect(database.purchasePayments._rows.size).toBe(1); // pure advance

    const res = await service.applyAdvance(
      { supplierId: 'sup-1', invoiceIds: ['inv-2'], amount: 1000, paymentDate: '2026-08-11' },
      'user-1',
    );

    expect(res.success).toBe(true);
    expect(res.applied).toBe(1000);
    expect(database.purchaseInvoices._rows.get('inv-2').balanceAmount).toBe(0);
    expect(database.purchaseInvoices._rows.get('inv-2').paymentStatus).toBe('paid');
    const applied = [...database.purchasePayments._rows.values()].find(
      (r) => r.mode === 'advance' && r.invoiceId === 'inv-2',
    );
    expect(applied).toBeTruthy();
  });

  it('rejects apply-advance beyond the available advance balance', async () => {
    const { service } = makeFixture();
    await service.collect(
      { supplierId: 'sup-1', paymentDate: '2026-08-10', mode: 'bank', amount: 500 },
      'user-1',
    );
    await expect(
      service.applyAdvance({ supplierId: 'sup-1', invoiceIds: ['inv-1'], amount: 1000 }, 'user-1'),
    ).rejects.toThrow(/Insufficient advance balance/);
  });

  it('blocks payment to an unknown supplier', async () => {
    const { service } = makeFixture();
    await expect(
      service.collect({
        supplierId: 'ghost',
        paymentDate: '2026-08-10',
        mode: 'cash',
        amount: 100,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('lists payments with filters and returns supplier name enrichment', async () => {
    const { service } = makeFixture();
    await service.collect(
      { supplierId: 'sup-1', paymentDate: '2026-08-10', mode: 'cash', amount: 500 },
      'user-1',
    );
    const res = await service.listPayments({ supplierId: 'sup-1', mode: 'cash' });
    expect(res.data).toHaveLength(1);
    expect(res.data[0].supplierName).toBe('Sharma Traders');
    expect(res.data[0].amount).toBe(500);
  });

  it('blocks non-positive amounts and invalid modes', async () => {
    const { service } = makeFixture();
    await expect(
      service.collect({ supplierId: 'sup-1', paymentDate: '2026-08-10', mode: 'cash', amount: 0 }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.collect({
        supplierId: 'sup-1',
        paymentDate: '2026-08-10',
        mode: 'crypto',
        amount: 100,
      }),
    ).rejects.toThrow(/Invalid payment mode/);
  });

  it('excludes draft/cancelled invoices from due totals and dashboard', async () => {
    const { service } = makeFixture();
    const dash = await service.getDashboard();
    // inv-draft excluded
    expect(dash.summary.totalPayable).toBe(3230);
    expect(dash.summary.suppliersWithDue).toBe(1);

    const summary = await service.getSupplierSummary('sup-1');
    expect(summary.dueInvoices).toHaveLength(2);
    expect(summary.totalDue).toBe(3230);
  });

  it('skips draft invoices during allocation', async () => {
    const { database, service } = makeFixture();
    const res = await service.collect(
      {
        supplierId: 'sup-1',
        paymentDate: '2026-08-10',
        mode: 'cash',
        amount: 5000,
        invoiceIds: ['inv-1', 'inv-draft'],
      },
      'user-1',
    );
    // Draft invoice never allocated
    expect(database.purchaseInvoices._rows.get('inv-draft').paidAmount).toBe(0);
    // Only requested non-draft invoices allocated: inv-1 (2230) → rest is advance
    expect(res.settledTotal).toBe(2230);
    expect(res.advanceAmount).toBe(2770);
  });
});
