import { describe, expect, it, vi, beforeEach } from 'vitest';

import { DeliveryChallansService } from './services';

// ── In-memory repository mock (same shape as conversion.service.test.ts) ──
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

function makeFixture() {
  const database = {
    salesSettings: makeRepo([
      {
        id: 'settings-1',
        autoOrderNumber: true,
        orderPrefix: 'SO-',
        orderNextNumber: 1,
        challanPrefix: 'DC-',
        challanNextNumber: 1,
        autoChallanNumber: true,
      },
    ]),
    deliveryChallans: makeRepo(),
    challanItems: makeRepo(),
    salesOrders: makeRepo(),
    salesOrderItems: makeRepo(),
  };

  let dcSeq = 0;
  const numbering = {
    nextChallanNumber: vi.fn(async () => {
      dcSeq += 1;
      return `DC-${String(dcSeq).padStart(4, '0')}`;
    }),
  };

  const audit = { log: vi.fn(async () => undefined) };

  const service = new DeliveryChallansService(
    database as any,
    audit as any,
    database as any,
    numbering as any,
  );

  return { database, numbering, audit, service };
}

function seedOrder(db: any, overrides: Record<string, unknown> = {}) {
  const order = {
    id: 'o1',
    orderNumber: 'SO-0001',
    customerId: 'c1',
    orderDate: '2026-08-06',
    status: 'confirmed',
    isPartial: true,
    warehouseId: 'wh1',
    financialYearId: 'fy1',
    ...overrides,
  };
  db.salesOrders._rows.set(order.id, order);
  db.salesOrderItems._rows.set('oi1', {
    id: 'oi1',
    orderId: 'o1',
    itemId: 'i1',
    description: 'Fertilizer 50kg',
    quantity: 10,
    deliveredQuantity: 0,
    reservedQuantity: 0,
    rate: 500,
  });
  db.salesOrderItems._rows.set('oi2', {
    id: 'oi2',
    orderId: 'o1',
    itemId: 'i2',
    description: 'Pesticide 1L',
    quantity: 5,
    deliveredQuantity: 0,
    reservedQuantity: 0,
    rate: 300,
  });
  return order;
}

describe('DeliveryChallansService (Phase 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a challan with auto numbering + transport + e-way bill + items', async () => {
    const { database, service, numbering } = makeFixture();
    seedOrder(database);

    const challan = await service.create(
      {
        orderId: 'o1',
        customerId: 'c1',
        dispatchDate: '2026-08-06',
        dispatchType: 'partial',
        status: 'dispatched',
        vehicleNo: 'MH-12-AB-1234',
        driverName: 'Ramesh',
        driverMobile: '9876543210',
        transporterName: 'XYZ Transport',
        lrNo: 'LR-7788',
        ewayBillNo: '551234567891',
        notes: 'First partial dispatch',
        items: [
          {
            itemId: 'i1',
            orderItemId: 'oi1',
            description: 'Fertilizer 50kg',
            quantity: 4,
            rate: 500,
          },
        ],
      },
      'user-1',
    );

    expect(numbering.nextChallanNumber).toHaveBeenCalled();
    expect(challan.challanNumber).toBe('DC-0001');
    expect(challan.vehicleNo).toBe('MH-12-AB-1234');
    expect(challan.driverName).toBe('Ramesh');
    expect(challan.ewayBillNo).toBe('551234567891');
    expect(challan.status).toBe('dispatched');

    // Items persisted with challanId link
    const items = [...database.challanItems._rows.values()];
    expect(items).toHaveLength(1);
    expect(items[0].challanId).toBe(challan.id);
    expect(items[0].orderItemId).toBe('oi1');
    expect(items[0].quantity).toBe(4);
    expect(items[0].deliveredQuantity).toBe(4);
  });

  it('blocks a full-dispatch challan when one already exists (multiple DC rule)', async () => {
    const { database, service } = makeFixture();
    seedOrder(database);
    database.deliveryChallans._rows.set('dc-full', {
      id: 'dc-full',
      challanNumber: 'DC-0099',
      orderId: 'o1',
      customerId: 'c1',
      dispatchDate: '2026-08-05',
      dispatchType: 'full',
      status: 'dispatched',
      isDeleted: false,
    });

    await expect(
      service.create(
        {
          orderId: 'o1',
          customerId: 'c1',
          dispatchDate: '2026-08-06',
          dispatchType: 'full',
          items: [{ itemId: 'i1', orderItemId: 'oi1', quantity: 10, rate: 500 }],
        },
        'user-1',
      ),
    ).rejects.toThrow('full-dispatch challan');
  });

  it('allows MULTIPLE partial challans for the same order', async () => {
    const { database, service } = makeFixture();
    seedOrder(database);

    await service.create(
      {
        orderId: 'o1',
        customerId: 'c1',
        dispatchDate: '2026-08-06',
        dispatchType: 'partial',
        items: [{ itemId: 'i1', orderItemId: 'oi1', quantity: 3, rate: 500 }],
      },
      'user-1',
    );
    // second partial challan — same order, remaining qty 7 → ok
    await expect(
      service.create(
        {
          orderId: 'o1',
          customerId: 'c1',
          dispatchDate: '2026-08-07',
          dispatchType: 'partial',
          items: [{ itemId: 'i1', orderItemId: 'oi1', quantity: 5, rate: 500 }],
        },
        'user-1',
      ),
    ).resolves.toBeDefined();
    expect(database.deliveryChallans._rows.size).toBeGreaterThanOrEqual(2);
  });

  it('blocks partial delivery exceeding the order remaining quantity', async () => {
    const { database, service } = makeFixture();
    seedOrder(database);
    // first challan delivered 8 of item oi1 (qty 10)
    await service.create(
      {
        orderId: 'o1',
        customerId: 'c1',
        dispatchDate: '2026-08-06',
        dispatchType: 'partial',
        items: [{ itemId: 'i1', orderItemId: 'oi1', quantity: 8, rate: 500 }],
      },
      'user-1',
    );

    // second challan tries 5 more → remaining 2 → must fail
    await expect(
      service.create(
        {
          orderId: 'o1',
          customerId: 'c1',
          dispatchDate: '2026-08-07',
          dispatchType: 'partial',
          items: [{ itemId: 'i1', orderItemId: 'oi1', quantity: 5, rate: 500 }],
        },
        'user-1',
      ),
    ).rejects.toThrow('exceeds order quantity');
  });

  it('returns line items when a single challan is fetched', async () => {
    const { database, service } = makeFixture();
    seedOrder(database);
    const challan = await service.create(
      {
        orderId: 'o1',
        customerId: 'c1',
        dispatchDate: '2026-08-06',
        dispatchType: 'full',
        items: [{ itemId: 'i1', orderItemId: 'oi1', quantity: 10, rate: 500 }],
      },
      'user-1',
    );

    const got = await service.findById(challan.id);
    expect(got.items).toHaveLength(1);
    expect(got.items[0].itemId).toBe('i1');
  });

  it('replaces the whole item set on update', async () => {
    const { database, service } = makeFixture();
    seedOrder(database);
    const challan = await service.create(
      {
        orderId: 'o1',
        customerId: 'c1',
        dispatchDate: '2026-08-06',
        dispatchType: 'partial',
        items: [{ itemId: 'i1', orderItemId: 'oi1', quantity: 3, rate: 500 }],
      },
      'user-1',
    );

    const updated = await service.update(
      challan.id,
      {
        vehicleNo: 'GJ-01-CD-9999',
        ewayBillNo: '778899001122',
        items: [
          { itemId: 'i1', orderItemId: 'oi1', quantity: 4, rate: 500 },
          { itemId: 'i2', orderItemId: 'oi2', quantity: 2, rate: 300 },
        ],
      },
      'user-1',
    );

    expect(updated.vehicleNo).toBe('GJ-01-CD-9999');
    const items = [...database.challanItems._rows.values()];
    // old item soft-deleted + 2 new created
    expect(items.filter((i) => i.challanId === challan.id && !i.isDeleted)).toHaveLength(2);
  });

  it('locks an invoiced challan from updates', async () => {
    const { database, service } = makeFixture();
    seedOrder(database);
    const challan = await service.create(
      {
        orderId: 'o1',
        customerId: 'c1',
        dispatchDate: '2026-08-06',
        dispatchType: 'full',
        items: [{ itemId: 'i1', orderItemId: 'oi1', quantity: 10, rate: 500 }],
      },
      'user-1',
    );
    database.deliveryChallans._rows.set(challan.id, { ...challan, status: 'invoiced' });

    await expect(
      service.update(challan.id, { vehicleNo: 'XX-00-AA-0000' }, 'user-1'),
    ).rejects.toThrow('already invoiced');
  });

  it('syncs the order to dispatched when all items are delivered', async () => {
    const { database, service } = makeFixture();
    seedOrder(database);
    await service.create(
      {
        orderId: 'o1',
        customerId: 'c1',
        dispatchDate: '2026-08-06',
        dispatchType: 'full',
        items: [
          { itemId: 'i1', orderItemId: 'oi1', quantity: 10, rate: 500 },
          { itemId: 'i2', orderItemId: 'oi2', quantity: 5, rate: 300 },
        ],
      },
      'user-1',
    );
    expect(database.salesOrders._rows.get('o1').status).toBe('dispatched');
  });

  it('syncs the order to partial when only some items are delivered', async () => {
    const { database, service } = makeFixture();
    seedOrder(database);
    await service.create(
      {
        orderId: 'o1',
        customerId: 'c1',
        dispatchDate: '2026-08-06',
        dispatchType: 'partial',
        items: [{ itemId: 'i1', orderItemId: 'oi1', quantity: 3, rate: 500 }],
      },
      'user-1',
    );
    expect(database.salesOrders._rows.get('o1').status).toBe('partial');
  });

  it('returns the next challan number without advancing the counter (preview)', async () => {
    const { database, service } = makeFixture();
    seedOrder(database);
    // existing challans → next number computed from max sequence
    database.deliveryChallans._rows.set('dc1', {
      id: 'dc1',
      challanNumber: 'DC-0003',
      orderId: 'o1',
      customerId: 'c1',
      dispatchDate: '2026-08-05',
      isDeleted: false,
    });
    const next = await service.getNextNumber();
    expect(next.challanNumber).toBe('DC-0004');
  });
});
