import { describe, expect, it, vi, beforeEach } from 'vitest';

import { DocumentConversionService } from './conversion.service';

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
          return true;
        });
      }
      const start = (page - 1) * pageSize;
      return { data: list.slice(start, start + pageSize), total: list.length };
    }),
    findMaxSequenceForPrefix: vi.fn(async () => 0),
    _rows: rows,
  };
}

function makeFixture() {
  const database = {
    salesQuotations: makeRepo(),
    quotationItems: makeRepo(),
    salesOrders: makeRepo(),
    salesOrderItems: makeRepo(),
    deliveryChallans: makeRepo(),
    challanItems: makeRepo(),
    salesInvoices: makeRepo(),
    invoiceItems: makeRepo(),
    salesSettings: makeRepo([
      {
        id: 'settings-1',
        autoOrderNumber: true,
        orderPrefix: 'SO-',
        orderNextNumber: 1,
        challanPrefix: 'DC-',
        challanNextNumber: 1,
        defaultPaymentTerms: 'credit',
      },
    ]),
  };

  const numbering = {
    nextQuoteNumber: vi.fn(async () => 'SQ-0001'),
    nextOrderNumber: vi.fn(async () => 'SO-0001'),
    nextChallanNumber: vi.fn(async () => 'DC-0001'),
  };

  const invoicesService = {
    getNextNumber: vi.fn(async () => ({ invoiceNumber: 'SLCR26-001', financialYear: '2026-27' })),
  };

  const audit = { log: vi.fn(async () => undefined) };

  const service = new DocumentConversionService(
    database as any,
    numbering as any,
    invoicesService as any,
    audit as any,
  );

  return { database, numbering, invoicesService, audit, service };
}

function seedQuote(db: any, overrides: Record<string, unknown> = {}) {
  const quote = {
    id: 'q1',
    quoteNumber: 'SQ-0001',
    customerId: 'c1',
    quoteDate: '2026-08-06',
    validTill: '2026-08-21',
    status: 'approved',
    branchId: null,
    financialYearId: 'fy1',
    paymentTerms: 'credit',
    subTotal: 1000,
    discountPercent: 0,
    discountAmount: 0,
    taxAmount: 180,
    roundOff: 0,
    grandTotal: 1180,
    terms: 'Net 30',
    notes: '',
    convertedToOrder: false,
    orderId: null,
    ...overrides,
  };
  db.salesQuotations._rows.set(quote.id, quote);
  db.quotationItems._rows.set('qi1', {
    id: 'qi1',
    quotationId: 'q1',
    itemId: 'i1',
    description: 'Fertilizer 50kg',
    quantity: 2,
    rate: 500,
    discountPercent: 0,
    discountAmount: 0,
    taxableValue: 1000,
    gstRate: 18,
    igst: 0,
    cgst: 90,
    sgst: 90,
    cess: 0,
    totalAmount: 1180,
  });
  return quote;
}

describe('DocumentConversionService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('converts a quotation all the way to an invoice in one click (full chain)', async () => {
    const { database, service, numbering, invoicesService, audit } = makeFixture();
    seedQuote(database);

    const result = await service.convert('q1', 'user-1');

    expect(result.completed).toEqual(['order', 'challan', 'invoice']);
    expect(result.error).toBeUndefined();
    expect(numbering.nextOrderNumber).toHaveBeenCalled();
    expect(numbering.nextChallanNumber).toHaveBeenCalled();
    expect(invoicesService.getNextNumber).toHaveBeenCalledWith(expect.any(String), 'credit');

    // Order: header copied + quotation linked + items copied
    const order = result.order;
    expect(order.status).toBe('confirmed');
    expect(order.customerId).toBe('c1');
    expect(order.quotationId).toBe('q1');
    expect(order.grandTotal).toBe(1180);
    expect(order.notes).toContain('SQ-0001');
    const orderItem = [...database.salesOrderItems._rows.values()][0];
    expect(orderItem.orderId).toBe(order.id);
    expect(orderItem.itemId).toBe('i1');
    expect(orderItem.totalAmount).toBe(1180);

    // Quotation marked converted
    const updatedQuote = database.salesQuotations._rows.get('q1');
    expect(updatedQuote.convertedToOrder).toBe(true);
    expect(updatedQuote.orderId).toBe(order.id);
    expect(updatedQuote.status).toBe('converted');

    // Challan: full dispatch + order items linked
    const challan = result.challan;
    expect(challan.dispatchType).toBe('full');
    expect(challan.status).toBe('dispatched');
    expect(challan.orderId).toBe(order.id);
    const challanItem = [...database.challanItems._rows.values()][0];
    expect(challanItem.orderItemId).toBe(orderItem.id);
    expect(challanItem.quantity).toBe(2);

    // Order marked dispatched
    expect(database.salesOrders._rows.get(order.id).status).toBe('dispatched');

    // Invoice: linked to challan + order, credit → unpaid with balance
    const invoice = result.invoice;
    expect(invoice.challanId).toBe(challan.id);
    expect(invoice.orderId).toBe(order.id);
    expect(invoice.paymentStatus).toBe('unpaid');
    expect(invoice.balanceAmount).toBe(1180);
    expect(invoice.grandTotal).toBe(1180);
    const invoiceItem = [...database.invoiceItems._rows.values()][0];
    expect(invoiceItem.challanItemId).toBe(challanItem.id);
    expect(invoiceItem.orderItemId).toBe(orderItem.id);

    // Challan marked invoiced
    expect(database.deliveryChallans._rows.get(challan.id).status).toBe('invoiced');

    // Audit trail logged
    const events = audit.log.mock.calls.map((c: any[]) => c[0]?.event);
    expect(events).toEqual(
      expect.arrayContaining([
        'sales_quotation_converted',
        'sales_order_converted',
        'delivery_challan_converted',
      ]),
    );
  });

  it('blocks an already-converted quotation', async () => {
    const { database, service } = makeFixture();
    seedQuote(database, { convertedToOrder: true, orderId: 'order-9' });

    const result = await service.convert('q1');
    expect(result.completed).toEqual([]);
    expect(result.error?.step).toBe('order');
    expect(result.error?.message).toContain('already converted');
  });

  it('blocks rejected, lost, and in-approval quotations', async () => {
    for (const status of ['rejected', 'expired', 'lost', 'pending', 'under_review']) {
      const { database, service } = makeFixture();
      seedQuote(database, { status });
      const result = await service.convert('q1');
      expect(result.error?.step).toBe('order');
      expect(result.error?.message).toContain(status);
    }
  });

  it('runs only the requested steps', async () => {
    const { database, service } = makeFixture();
    seedQuote(database);

    const result = await service.convert('q1', 'user-1', ['order']);
    expect(result.completed).toEqual(['order']);
    expect(result.order).toBeDefined();
    expect(result.challan).toBeUndefined();
    expect(result.invoice).toBeUndefined();
    expect(database.salesInvoices._rows.size).toBe(0);
  });

  it('reports a missing prerequisite clearly (invoice without challan step)', async () => {
    const { database, service } = makeFixture();
    seedQuote(database);

    const result = await service.convert('q1', 'user-1', ['order', 'invoice']);
    expect(result.completed).toEqual(['order']);
    expect(result.error?.step).toBe('invoice');
    expect(result.error?.message).toContain('Challan step');
  });

  it('blocks a second full-dispatch challan for the same order', async () => {
    const { database, service } = makeFixture();
    seedQuote(database);

    await service.convertQuotationToOrder('q1', 'user-1');
    const order = [...database.salesOrders._rows.values()][0];
    database.deliveryChallans._rows.set('dc-exists', {
      id: 'dc-exists',
      challanNumber: 'DC-0099',
      orderId: order.id,
      dispatchType: 'full',
      status: 'dispatched',
      isDeleted: false,
    });

    await expect(service.convertOrderToChallan(order.id, 'user-1')).rejects.toThrow(
      'already has a full-dispatch challan',
    );
  });

  it('blocks invoicing a partial-dispatch challan', async () => {
    const { database, service } = makeFixture();
    seedQuote(database);

    await service.convertQuotationToOrder('q1', 'user-1');
    const order = [...database.salesOrders._rows.values()][0];
    const { challan } = await service.convertOrderToChallan(order.id, 'user-1');
    database.deliveryChallans._rows.set(challan.id, { ...challan, dispatchType: 'partial' });

    await expect(service.convertChallanToInvoice(challan.id, 'user-1')).rejects.toThrow(
      'partial dispatch',
    );
  });

  it('blocks invoicing a challan twice', async () => {
    const { database, service } = makeFixture();
    seedQuote(database);

    await service.convertQuotationToOrder('q1', 'user-1');
    const order = [...database.salesOrders._rows.values()][0];
    const { challan } = await service.convertOrderToChallan(order.id, 'user-1');

    database.salesInvoices._rows.set('inv-exists', {
      id: 'inv-exists',
      invoiceNumber: 'SLCR26-0099',
      challanId: challan.id,
      orderId: order.id,
      isDeleted: false,
    });

    await expect(service.convertChallanToInvoice(challan.id, 'user-1')).rejects.toThrow(
      'already invoiced',
    );
  });

  it('creates a cash invoice when the quotation is cash-paid', async () => {
    const { database, service, invoicesService } = makeFixture();
    seedQuote(database, { paymentTerms: 'cash' });

    const result = await service.convert('q1', 'user-1');
    expect(invoicesService.getNextNumber).toHaveBeenCalledWith(expect.any(String), 'cash');
    expect(result.invoice.paymentStatus).toBe('paid');
    expect(result.invoice.paidAmount).toBe(1180);
    expect(result.invoice.balanceAmount).toBe(0);
  });
});
