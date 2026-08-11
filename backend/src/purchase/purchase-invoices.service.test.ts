import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PurchaseNumberingService } from './purchase-numbering.service';
import { PurchaseInvoicesService } from './services';

// ── In-memory repository mock (same surface as purchase-orders test) ──────
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
    findAll: vi.fn(async ({ filters = [], page = 1, pageSize = 50 }: any = {}) => {
      let list = [...rows.values()].filter((r) => !r.isDeleted);
      for (const f of filters || []) {
        if (f.operator === 'eq') {
          list = list.filter((r) => String(r[f.field]) === String(f.value));
        }
      }
      const start = (page - 1) * pageSize;
      return { data: list.slice(start, start + pageSize), total: list.length };
    }),
    findMaxSequenceForPrefix: vi.fn(async (field: string, prefix: string) => {
      let max = 0;
      for (const r of rows.values()) {
        const val = String(r[field] || '');
        if (val.startsWith(prefix)) {
          const m = val.slice(prefix.length).match(/^(\d+)/);
          if (m) {
            max = Math.max(max, parseInt(m[1], 10));
          }
        }
      }
      return max;
    }),
    _rows: rows,
  };
}

function makeFixture() {
  const database = {
    purchaseInvoices: makeRepo(),
    purchaseInvoiceItems: makeRepo(),
    purchaseSettings: makeRepo([
      { id: 's1', invoicePrefix: 'PI-', invoiceNextNumber: 1, defaultPaymentMode: 'credit' },
    ]),
    suppliers: makeRepo([
      { id: 'sup-1', name: 'Sharma Traders', status: 'active' },
      { id: 'sup-inactive', name: 'Old Vendor', status: 'inactive' },
    ]),
    items: makeRepo([
      { id: 'item-1', name: 'Wheat', status: 'active' },
      { id: 'item-blocked', name: 'Banned', status: 'blocked' },
    ]),
  };
  const audit = { log: vi.fn(async () => undefined) };
  const numbering = new PurchaseNumberingService(database as any);
  const service = new PurchaseInvoicesService(
    database as any,
    audit as any,
    database as any,
    numbering,
  );
  return { database, audit, service };
}

const basePayload = {
  supplierId: 'sup-1',
  invoiceDate: '2026-08-10',
  dueDate: '2026-09-09',
  items: [
    {
      itemId: 'item-1',
      quantity: 10,
      rate: 100,
      gstRate: 18,
      batchNo: 'B-2026-01',
      expDate: '2027-01-01',
    },
    { itemId: 'item-1', quantity: 2, rate: 500, gstRate: 5 },
  ],
};

describe('PurchaseInvoicesService (Phase 3.3 — G2 invoice items + numbering)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('auto-numbers, persists line items and computes header totals from items', async () => {
    const { database, service } = makeFixture();
    const inv = await service.create(basePayload, 'user-1');

    expect(inv.invoiceNumber).toBe('PI-0001');
    expect(database.purchaseInvoiceItems._rows.size).toBe(2);

    const rows = [...database.purchaseInvoiceItems._rows.values()];
    expect(rows[0].invoiceId).toBe(inv.id);
    expect(rows[0].batchNo).toBe('B-2026-01');
    expect(rows[0].expDate).toBe('2027-01-01');
    // Line 1: 10×100=1000 taxable, 18% GST → 180 (90+90), total 1180
    expect(rows[0].taxableValue).toBe(1000);
    expect(rows[0].cgst).toBe(90);
    expect(rows[0].sgst).toBe(90);
    expect(rows[0].totalAmount).toBe(1180);
    // Line 2: 2×500=1000 taxable, 5% GST → 50 (25+25), total 1050
    expect(rows[1].taxableValue).toBe(1000);
    expect(rows[1].totalAmount).toBe(1050);

    // Header totals derived from items
    expect(inv.subTotal).toBe(2000);
    expect(inv.taxAmount).toBe(230);
    expect(inv.grandTotal).toBe(2230);
    // Outstanding init
    expect(inv.balanceAmount).toBe(2230);
    expect(inv.paidAmount).toBe(0);
    expect(inv.paymentStatus).toBe('unpaid');
    // Counter advanced
    expect(database.purchaseSettings._rows.get('s1').invoiceNextNumber).toBe(2);
  });

  it('keeps explicit header totals when provided', async () => {
    const { service } = makeFixture();
    const inv = await service.create(
      { ...basePayload, grandTotal: 9999, subTotal: 8000, taxAmount: 1999 },
      'user-1',
    );
    expect(inv.grandTotal).toBe(9999);
    expect(inv.balanceAmount).toBe(9999);
  });

  it('honours explicit CGST/SGST split when provided', async () => {
    const { database, service } = makeFixture();
    const inv = await service.create(
      {
        supplierId: 'sup-1',
        invoiceDate: '2026-08-10',
        items: [
          {
            itemId: 'item-1',
            quantity: 1,
            rate: 1000,
            gstRate: 18,
            cgst: 90,
            sgst: 90,
            totalAmount: 1180,
          },
        ],
      },
      'user-1',
    );
    expect(inv.subTotal).toBe(1000);
    expect(inv.taxAmount).toBe(180);
    expect(inv.grandTotal).toBe(1180);
    const row = [...database.purchaseInvoiceItems._rows.values()][0];
    expect(row.cgst).toBe(90);
    expect(row.sgst).toBe(90);
  });

  it('blocks creation for an inactive supplier', async () => {
    const { service } = makeFixture();
    await expect(
      service.create({ ...basePayload, supplierId: 'sup-inactive' }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks creation for a blocked product', async () => {
    const { service } = makeFixture();
    await expect(
      service.create(
        { ...basePayload, items: [{ itemId: 'item-blocked', quantity: 1, rate: 10 }] },
        'user-1',
      ),
    ).rejects.toThrow(/blocked/);
  });

  it('getNextNumber returns the padded preview format', async () => {
    const { service } = makeFixture();
    const res = await service.getNextNumber();
    expect(res.nextNumber).toBe('PI-0001');
  });

  it('replaces line items on a draft invoice and recomputes totals', async () => {
    const { database, service } = makeFixture();
    const inv = await service.create(basePayload, 'user-1');

    await service.update(
      inv.id,
      {
        items: [{ itemId: 'item-1', quantity: 5, rate: 50, gstRate: 12 }],
      },
      'user-1',
    );

    const rows = [...database.purchaseInvoiceItems._rows.values()].filter((r) => !r.isDeleted);
    expect(rows).toHaveLength(1);
    expect(rows[0].taxableValue).toBe(250);
    // totals recomputed on the header row
    expect(database.purchaseInvoices._rows.get(inv.id).subTotal).toBe(250);
    expect(database.purchaseInvoices._rows.get(inv.id).taxAmount).toBe(30);
    expect(database.purchaseInvoices._rows.get(inv.id).grandTotal).toBe(280);
  });

  it('blocks line-item edits on a posted invoice', async () => {
    const { database, service } = makeFixture();
    const inv = await service.create(basePayload, 'user-1');
    database.purchaseInvoices._rows.set(inv.id, { ...inv, status: 'posted' });

    await expect(
      service.update(inv.id, { items: [{ itemId: 'x', quantity: 1, rate: 1 }] }, 'user-1'),
    ).rejects.toThrow(/posted/);
  });
});
