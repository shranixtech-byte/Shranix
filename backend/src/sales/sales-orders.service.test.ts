import { describe, expect, it, vi, beforeEach } from 'vitest';

import { SalesOrdersService } from './services';

// ── In-memory repository mock (same shape as other sales tests) ──
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
          if (f.operator === 'ne') {
            return String(v) !== String(f.value);
          }
          if (f.operator === 'like') {
            return String(v).includes(String(f.value).replace(/%/g, ''));
          }
          return true;
        });
      }
      const start = (page - 1) * pageSize;
      return { data: list.slice(start, start + pageSize), total: list.length };
    }),
    softDelete: vi.fn(async (id: string) => {
      const row = rows.get(id);
      if (row) {
        rows.set(id, { ...row, isDeleted: true });
      }
      return row;
    }),
    findMaxSequenceForPrefix: vi.fn(async (field: string, prefix: string) => {
      let maxSeq = 0;
      for (const r of rows.values()) {
        const num = String(r[field] || '');
        const rest = num.startsWith(prefix) ? num.slice(prefix.length) : num;
        const match = rest.match(/^(\d+)/);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
      return maxSeq;
    }),
    _rows: rows,
  };
}

function seedOrder(db: any, overrides: Record<string, unknown> = {}) {
  const order = {
    id: 'o1',
    orderNumber: 'SO-0001',
    customerId: 'c1',
    quotationId: 'q-9',
    orderDate: '2026-08-01',
    status: 'confirmed',
    grandTotal: 1180,
    isDeleted: false,
    ...overrides,
  };
  db.salesOrders._rows.set(order.id, order);
  return order;
}

function makeFixture() {
  const database = {
    salesSettings: makeRepo([
      {
        id: 'settings-1',
        autoOrderNumber: true,
        orderPrefix: 'SO-',
        orderNextNumber: 1,
      },
    ]),
    salesOrders: makeRepo(),
    salesOrderItems: makeRepo(),
    deliveryChallans: makeRepo(),
  };

  const numbering = {
    nextOrderNumber: vi.fn(async () => 'SO-0001'),
  };

  const audit = { log: vi.fn(async () => undefined) };
  const service = new SalesOrdersService(
    database as any,
    audit as any,
    database as any,
    numbering as any,
  );
  return { database, numbering, audit, service };
}

describe('SalesOrdersService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('previews the next order number in 4-digit SO-0001 format', async () => {
    const { database, service } = makeFixture();

    // No orders yet → SO-0001
    expect((await service.getNextNumber()).orderNumber).toBe('SO-0001');

    // Existing orders up to SO-0006 → preview must be SO-0007 (4-digit, not SO-007)
    for (let i = 1; i <= 6; i++) {
      database.salesOrders._rows.set(`o${i}`, {
        id: `o${i}`,
        orderNumber: `SO-${String(i).padStart(4, '0')}`,
        isDeleted: false,
      });
    }
    expect((await service.getNextNumber()).orderNumber).toBe('SO-0007');
  });

  it('creates an order with auto number, default draft status, and persists items', async () => {
    const { database, numbering, service } = makeFixture();

    const result = await service.create(
      {
        customerId: 'c1',
        orderDate: '2026-08-06',
        deliveryDate: '2026-08-20',
        paymentTerms: 'credit',
        items: [
          {
            itemId: 'i1',
            description: 'Fertilizer',
            quantity: 2,
            rate: 500,
            taxableValue: 1000,
            gstRate: 18,
            cgst: 90,
            sgst: 90,
            totalAmount: 1180,
          },
        ],
      },
      'user-1',
    );

    expect(numbering.nextOrderNumber).toHaveBeenCalled();
    expect(result.orderNumber).toBe('SO-0001');
    expect(result.status).toBe('draft');
    expect(result.items).toHaveLength(1);
    const item = [...database.salesOrderItems._rows.values()][0];
    expect(item.orderId).toBe(result.id);
    expect(item.itemId).toBe('i1');
    expect(item.totalAmount).toBe(1180);
  });

  it('attaches line items when an order is fetched', async () => {
    const { database, service } = makeFixture();
    seedOrder(database);
    database.salesOrderItems._rows.set('oi1', {
      id: 'oi1',
      orderId: 'o1',
      itemId: 'i1',
      quantity: 2,
      isDeleted: false,
    });

    const record = await service.findById('o1');
    expect(record.items).toHaveLength(1);
  });

  it('updates header fields without touching items (quotationId preserved)', async () => {
    const { database, service } = makeFixture();
    seedOrder(database);

    const result = await service.update(
      'o1',
      { notes: 'Call before delivery', paymentTerms: 'cash' },
      'user-1',
    );

    expect(result.notes).toBe('Call before delivery');
    expect(result.paymentTerms).toBe('cash');
    expect(result.quotationId).toBe('q-9'); // preserved (not sent → not cleared)
    // Items untouched — no replacement happened
    expect(database.salesOrderItems.softDelete).not.toHaveBeenCalled();
  });

  it('rejects item replacement on an order that already has challans', async () => {
    const { database, service } = makeFixture();
    seedOrder(database, { status: 'confirmed' });
    database.deliveryChallans._rows.set('dc1', {
      id: 'dc1',
      challanNumber: 'DC-0001',
      orderId: 'o1',
      dispatchType: 'full',
      isDeleted: false,
    });

    await expect(
      service.update('o1', { items: [{ itemId: 'i2', quantity: 1 }] }, 'user-1'),
    ).rejects.toThrow(/already has deliveries/i);
  });

  it('rejects item replacement on a dispatched order (even without challan lookup)', async () => {
    const { database, service } = makeFixture();
    seedOrder(database, { status: 'dispatched' });

    await expect(
      service.update('o1', { items: [{ itemId: 'i2', quantity: 1 }] }, 'user-1'),
    ).rejects.toThrow(/already has deliveries/i);
  });

  it('replaces line items on a draft order (old soft-deleted, new created)', async () => {
    const { database, service } = makeFixture();
    seedOrder(database, { status: 'draft' });
    database.salesOrderItems._rows.set('oi-old', {
      id: 'oi-old',
      orderId: 'o1',
      itemId: 'i1',
      quantity: 2,
      isDeleted: false,
    });

    const result = await service.update(
      'o1',
      {
        items: [
          { itemId: 'i3', description: 'New item', quantity: 3, rate: 100, totalAmount: 300 },
        ],
      },
      'user-1',
    );

    expect(database.salesOrderItems.softDelete).toHaveBeenCalledWith('oi-old');
    expect(result.items).toHaveLength(1);
    const rows = [...database.salesOrderItems._rows.values()];
    expect(rows.filter((r) => !r.isDeleted)).toHaveLength(1);
    expect(rows.filter((r) => !r.isDeleted)[0].itemId).toBe('i3');
  });
});
