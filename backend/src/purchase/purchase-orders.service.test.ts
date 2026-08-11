import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PurchaseNumberingService } from './purchase-numbering.service';
import { PurchaseOrdersService } from './services';

// ── In-memory repository mock (mirrors MasterDataRepository surface) ──────
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
        if (f.operator === 'like' || f.operator === 'contains') {
          list = list.filter((r) => String(r[f.field] || '').includes(String(f.value || '')));
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
    purchaseOrders: makeRepo(),
    poItems: makeRepo(),
    purchaseSettings: makeRepo([
      {
        id: 's1',
        poPrefix: 'PO-',
        poNextNumber: 1,
        defaultWarehouseId: 'wh-1',
        defaultPaymentTerms: '30 days',
        autoGrn: false,
      },
    ]),
    grn: makeRepo(),
    suppliers: makeRepo([
      { id: 'sup-1', name: 'Sharma Traders', status: 'active' },
      { id: 'sup-blocked', name: 'Bad Vendor', status: 'blocked' },
    ]),
  };
  const audit = { log: vi.fn(async () => undefined) };
  const numbering = new PurchaseNumberingService(database as any);
  const service = new PurchaseOrdersService(
    database as any,
    audit as any,
    database as any,
    numbering,
  );
  return { database, audit, service };
}

const basePayload = {
  supplierId: 'sup-1',
  orderDate: '2026-08-10',
  items: [
    {
      itemId: 'item-1',
      quantity: 10,
      rate: 100,
      gstRate: 18,
      unitId: 'u1',
    },
    { itemId: 'item-2', quantity: 2, rate: 500, gstRate: 5 },
  ],
};

describe('PurchaseOrdersService (Phase 3.3 — G1 items + G4 numbering)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('auto-numbers the PO and persists line items with computed tax split', async () => {
    const { database, service } = makeFixture();
    const po = await service.create(basePayload, 'user-1');

    expect(po.poNumber).toBe('PO-0001');
    expect(database.poItems._rows.size).toBe(2);

    const first = [...database.poItems._rows.values()][0];
    expect(first.poId).toBe(po.id);
    expect(first.itemId).toBe('item-1');
    expect(first.quantity).toBe(10);
    expect(first.taxableValue).toBe(1000);
    // 18% GST on 1000 → 180, split 50/50 CGST/SGST
    expect(first.cgst).toBe(90);
    expect(first.sgst).toBe(90);
    expect(first.totalAmount).toBe(1180);
    // Counter advanced
    expect(database.purchaseSettings._rows.get('s1').poNextNumber).toBe(2);
  });

  it('keeps a manual PO number and applies settings defaults', async () => {
    const { service } = makeFixture();
    const po = await service.create({ ...basePayload, poNumber: 'PO-MANUAL-1' }, 'user-1');
    expect(po.poNumber).toBe('PO-MANUAL-1');
    expect(po.warehouseId).toBe('wh-1');
    expect(po.paymentTerms).toBe('30 days');
  });

  it('retries with a fresh number on a UNIQUE collision (race-safe)', async () => {
    const { database, service } = makeFixture();
    let createCalls = 0;
    const origCreate = database.purchaseOrders.create;
    database.purchaseOrders.create = vi.fn(async (data: any) => {
      createCalls += 1;
      if (createCalls === 1) {
        throw new ConflictException('UNIQUE constraint failed: po_number');
      }
      return origCreate(data);
    });

    const po = await service.create(basePayload, 'user-1');
    expect(createCalls).toBe(2);
    expect(po.poNumber).toBe('PO-0002');
  });

  it('blocks creation when the supplier is blocked', async () => {
    const { service } = makeFixture();
    await expect(
      service.create({ ...basePayload, supplierId: 'sup-blocked' }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('getNextNumber returns the padded preview format', async () => {
    const { service } = makeFixture();
    const res = await service.getNextNumber();
    expect(res.nextNumber).toMatch(/^PO-\d{4}$/);
    expect(res.nextNumber).toBe('PO-0001');
  });

  it('replaces line items on update when no GRN exists', async () => {
    const { database, service } = makeFixture();
    const po = await service.create(basePayload, 'user-1');

    await service.update(
      po.id,
      {
        notes: 'updated',
        items: [{ itemId: 'item-3', quantity: 5, rate: 50, gstRate: 12 }],
      },
      'user-1',
    );

    const rows = [...database.poItems._rows.values()].filter((r) => !r.isDeleted);
    expect(rows).toHaveLength(1);
    expect(rows[0].itemId).toBe('item-3');
    expect(rows[0].taxableValue).toBe(250);
  });

  it('blocks line-item edits once a GRN exists for the PO', async () => {
    const { database, service } = makeFixture();
    const po = await service.create(basePayload, 'user-1');
    database.grn._rows.set('grn-1', {
      id: 'grn-1',
      poId: po.id,
      grnNumber: 'GRN-0001',
      isDeleted: false,
    });

    await expect(
      service.update(po.id, { items: [{ itemId: 'x', quantity: 1, rate: 1 }] }, 'user-1'),
    ).rejects.toThrow(/GRN/);
  });
});
