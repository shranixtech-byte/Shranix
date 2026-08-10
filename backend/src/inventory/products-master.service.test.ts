import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ProductsMasterService } from './products-master.service';

// ── In-memory repository mock (supports eq/like/gt filters + search + sort) ──
function makeRepo(initial: any[] = []) {
  const rows = new Map<string, any>();
  for (const r of initial) {
    rows.set(r.id, { ...r, isDeleted: false, deletedAt: null });
  }
  const matches = (r: any, f: any) => {
    const v = r[f.field];
    if (f.operator === 'eq') {
      return String(v ?? '') === String(f.value ?? '');
    }
    if (f.operator === 'gt') {
      return Number(v ?? 0) > Number(f.value);
    }
    if (f.operator === 'gte') {
      return Number(v ?? 0) >= Number(f.value);
    }
    if (f.operator === 'like') {
      return String(v ?? '').includes(String(f.value).replace(/%/g, ''));
    }
    if (f.operator === 'in') {
      return Array.isArray(f.value) && f.value.includes(v);
    }
    return true;
  };
  return {
    findById: vi.fn(async (id: string) => {
      const r = rows.get(id);
      return r && !r.isDeleted ? { ...r } : null;
    }),
    findAll: vi.fn(async (params: any = {}) => {
      let list = [...rows.values()].filter((r) => !r.isDeleted);
      for (const f of params?.filters || []) {
        list = list.filter((r) => matches(r, f));
      }
      if (params?.search && params?.searchFields?.length) {
        const q = String(params.search).toLowerCase();
        list = list.filter((r) =>
          params.searchFields.some((f: string) =>
            String(r[f] ?? '')
              .toLowerCase()
              .includes(q),
          ),
        );
      }
      if (params?.sorts?.[0] && list.length > 0) {
        const { field, order } = params.sorts[0];
        if (field in list[0]) {
          const dir = order === 'desc' ? -1 : 1;
          list = [...list].sort(
            (a, b) =>
              String(a[field] ?? '').localeCompare(String(b[field] ?? ''), undefined, {
                numeric: true,
              }) * dir,
          );
        }
      }
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 50;
      const start = (page - 1) * pageSize;
      const paged = list.slice(start, start + pageSize);
      return {
        data: paged,
        total: list.length,
        page,
        pageSize,
        totalPages: Math.ceil(list.length / pageSize),
      };
    }),
    create: vi.fn(async (data: any) => {
      const row = {
        ...data,
        id: data.id || `id-${rows.size + 1}`,
        createdAt: '2026-08-06T00:00:00.000Z',
        updatedAt: '2026-08-06T00:00:00.000Z',
        isDeleted: false,
        deletedAt: null,
      };
      rows.set(row.id, row);
      return { ...row };
    }),
    update: vi.fn(async (id: string, data: any) => {
      const row = rows.get(id);
      if (!row) {
        return null;
      }
      const updated = { ...row, ...data, updatedAt: '2026-08-06T00:00:00.000Z' };
      rows.set(id, updated);
      return { ...updated };
    }),
    softDelete: vi.fn(async (id: string) => {
      const r = rows.get(id);
      if (r) {
        r.isDeleted = true;
        r.deletedAt = '2026-08-06T00:00:00.000Z';
      }
    }),
    _rows: rows,
  };
}

function seedProduct(db: any, overrides: Record<string, unknown> = {}) {
  const p = {
    id: 'prod-1',
    name: 'Urea 46%',
    sku: 'UREA46',
    productCode: 'PRD-0001',
    type: 'fertilizer',
    status: 'active',
    mrp: 300,
    purchaseRate: 250,
    salesRate: 280,
    wholesalePrice: 270,
    dealerPrice: 260,
    minSellingPrice: 240,
    currentStock: 100,
    minStock: 20,
    categoryId: null,
    brandId: null,
    hasBatch: false,
    isActive: true,
    ...overrides,
  };
  db.items._rows.set(p.id, p);
  return p;
}

function makeFixture() {
  const database = {
    items: makeRepo(),
    productDocuments: makeRepo(),
    productPriceHistory: makeRepo(),
    categories: makeRepo([{ id: 'cat-1', name: 'Fertilizers' }]),
    brands: makeRepo([{ id: 'brand-1', name: 'IFFCO' }]),
    units: makeRepo([{ id: 'unit-1', name: 'Kilogram', shortName: 'KG' }]),
    gstRates: makeRepo([{ id: 'gst-1', rate: 5 }]),
    suppliers: makeRepo([{ id: 'sup-1', name: 'IFFCO Ltd' }]),
    batchMaster: makeRepo(),
    invStockBalance: makeRepo(),
    invStockLedger: makeRepo(),
    warehouses: makeRepo([{ id: 'wh-1', name: 'Main Warehouse' }]),
    invoiceItems: makeRepo(),
    poItems: makeRepo(),
    grnItems: makeRepo(),
    returnItems: makeRepo(),
    purchaseReturnItems: makeRepo(),
    salesOrderItems: makeRepo(),
    quotationItems: makeRepo(),
  };
  const audit = { log: vi.fn(async () => undefined) };
  const service = new ProductsMasterService(database as any, audit as any);
  return { database, audit, service };
}

describe('ProductsMasterService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a product with auto-generated code and initial price history', async () => {
    const { database, audit, service } = makeFixture();
    seedProduct(database);
    const result = await service.create(
      { name: 'DAP 18-46-0', type: 'fertilizer', mrp: 500, salesRate: 450, purchaseRate: 400 },
      'user-1',
    );

    expect(result.productCode).toBe('PRD-0002'); // next after PRD-0001
    expect(result.sku).toBe('DAP 18-46-0'.toUpperCase());
    expect(result.status).toBe('active');
    // Initial price history written for prices > 0
    expect(database.productPriceHistory._rows.size).toBeGreaterThan(0);
    expect(database.productPriceHistory._rows.get('id-1').priceType).toBe('mrp');
    // Audit logged
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ event: 'product_created' }));
  });

  it('rejects duplicate SKU / product code', async () => {
    const { database, service } = makeFixture();
    seedProduct(database, { productCode: 'PRD-0001', sku: 'UREA46' });

    await expect(
      service.create({ name: 'Duplicate Urea', productCode: 'PRD-0001', sku: 'UREA46' }),
    ).rejects.toThrow(/Duplicate/);
  });

  it('validates MRP >= selling price and selling >= min selling', async () => {
    const { service } = makeFixture();
    await expect(service.create({ name: 'Bad Price', mrp: 100, salesRate: 200 })).rejects.toThrow(
      /MRP must be >= Selling Price/,
    );
    await expect(
      service.create({ name: 'Bad Min', mrp: 500, salesRate: 300, minSellingPrice: 350 }),
    ).rejects.toThrow(/Selling Price must be >= Minimum Selling Price/);
  });

  it('rejects invalid product type and invalid status', async () => {
    const { service } = makeFixture();
    await expect(service.create({ name: 'X', type: 'alien' })).rejects.toThrow(
      /Invalid product type/,
    );
    await expect(service.create({ name: 'X', status: 'frozen' })).rejects.toThrow(/Status must be/);
  });

  it('updates a product and records price history without overwriting history', async () => {
    const { database, service } = makeFixture();
    seedProduct(database, { mrp: 300, salesRate: 280 });
    const updated = await service.update(
      'prod-1',
      { mrp: 320, salesRate: 300, name: 'Urea 46%' },
      'user-2',
    );

    expect(updated.mrp).toBe(320);
    expect(updated.salesRate).toBe(300);
    // Price history has entries for mrp + salesRate changes
    const historyRows = [...database.productPriceHistory._rows.values()];
    expect(
      historyRows.some((h) => h.priceType === 'mrp' && h.oldValue === 300 && h.newValue === 320),
    ).toBe(true);
    expect(
      historyRows.some(
        (h) => h.priceType === 'salesRate' && h.oldValue === 280 && h.newValue === 300,
      ),
    ).toBe(true);
  });

  it('blocks product code change (immutable after creation)', async () => {
    const { database, service } = makeFixture();
    seedProduct(database);
    await expect(service.update('prod-1', { productCode: 'PRD-9999' }, 'user-1')).rejects.toThrow(
      /Product Code cannot be changed/,
    );
  });

  it('updates product name to a duplicate rejects', async () => {
    const { database, service } = makeFixture();
    seedProduct(database, {
      id: 'prod-1',
      name: 'Urea 46%',
      sku: 'UREA46',
      productCode: 'PRD-0001',
    });
    seedProduct(database, { id: 'prod-2', name: 'DAP', sku: 'DAP1', productCode: 'PRD-0002' });
    await expect(service.update('prod-2', { name: 'Urea 46%' }, 'user-1')).rejects.toThrow(
      /Duplicate Product Name/,
    );
  });

  it('status change updates isActive and audits', async () => {
    const { database, audit, service } = makeFixture();
    seedProduct(database);
    const res = await service.setStatus('prod-1', 'blocked', 'user-1');
    expect(res.status).toBe('blocked');
    expect(database.items._rows.get('prod-1').isActive).toBe(false);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'product_status_changed' }),
    );
  });

  it('blocks deletion when transaction history exists', async () => {
    const { database, service } = makeFixture();
    seedProduct(database);
    // Add a sales invoice line referencing this product
    database.invoiceItems._rows.set('inv-item-1', {
      id: 'inv-item-1',
      itemId: 'prod-1',
      isDeleted: false,
    });
    await expect(service.delete('prod-1', 'user-1')).rejects.toThrow(
      /cannot be deleted because transaction history exists/,
    );
  });

  it('soft-deletes a product with no transaction history', async () => {
    const { database, service } = makeFixture();
    seedProduct(database);
    const res = await service.delete('prod-1', 'user-1');
    expect(res.message).toContain('deleted');
    expect(database.items._rows.get('prod-1').isDeleted).toBe(true);
  });

  it('searches across code / sku / barcode / name', async () => {
    const { database, service } = makeFixture();
    seedProduct(database, { name: 'Urea 46%', sku: 'UREA46', productCode: 'PRD-0001' });
    seedProduct(database, { id: 'prod-2', name: 'DAP', sku: 'DAP1', productCode: 'PRD-0002' });

    const byName = await service.searchProducts({ q: 'urea' });
    expect(byName.total).toBe(1);
    const byCode = await service.searchProducts({ q: 'PRD-0002' });
    expect(byCode.total).toBe(1);
    const bySku = await service.searchProducts({ q: 'DAP1' });
    expect(bySku.total).toBe(1);
  });

  it('list supports category / status filters and enrichment', async () => {
    const { database, service } = makeFixture();
    seedProduct(database, {
      categoryId: 'cat-1',
      brandId: 'brand-1',
      unitId: 'unit-1',
      gstRateId: 'gst-1',
      preferredSupplierId: 'sup-1',
    });
    seedProduct(database, {
      id: 'prod-2',
      name: 'DAP',
      sku: 'DAP1',
      productCode: 'PRD-0002',
      categoryId: 'cat-1',
    });

    const res = await service.findAll({ categoryId: 'cat-1' });
    expect(res.total).toBe(2);
    expect(res.data[0].categoryName).toBe('Fertilizers');
    expect(res.data[0].brandName).toBe('IFFCO');
    expect(res.data[0].unitName).toBe('KG');
    expect(res.data[0].gstRate).toBe(5);
    expect(res.data[0].preferredSupplierName).toBe('IFFCO Ltd');

    const inactive = await service.findAll({ status: 'inactive' });
    expect(inactive.total).toBe(0);
  });

  it('dashboard computes low stock and out-of-stock counts', async () => {
    const { database, service } = makeFixture();
    seedProduct(database, { currentStock: 100, minStock: 20 }); // in stock
    seedProduct(database, {
      id: 'prod-2',
      name: 'DAP',
      sku: 'DAP1',
      productCode: 'PRD-0002',
      currentStock: 5,
      minStock: 20,
    }); // low
    seedProduct(database, {
      id: 'prod-3',
      name: 'Pest',
      sku: 'PEST1',
      productCode: 'PRD-0003',
      currentStock: 0,
      minStock: 0,
    }); // out

    const dash = await service.getDashboard();
    expect(dash.summary.totalProducts).toBe(3);
    expect(dash.summary.lowStockProducts).toBe(1);
    expect(dash.summary.outOfStock).toBe(1);
    expect(dash.summary.activeProducts).toBe(3);
  });

  it('import parses rows, detects duplicates and skips in insert mode', async () => {
    const { database, service } = makeFixture();
    seedProduct(database, { productCode: 'PRD-0001', sku: 'UREA46' });
    const csv =
      'Product Name,SKU,MRP,Selling Price,Status\nUrea 46%,UREA46,300,280,active\nNew Product,NP1,100,90,active\n';
    const file = { originalname: 'products.csv', buffer: Buffer.from(csv) };

    const res = await service.importProducts(file, 'insert', 'user-1');
    expect(res.imported).toBe(1);
    expect(res.skipped).toBe(1);
    expect(res.errors).toHaveLength(0);
    // New product persisted
    expect([...database.items._rows.values()].some((p) => p.sku === 'NP1')).toBe(true);
  });

  it('import upsert updates existing product', async () => {
    const { database, service } = makeFixture();
    seedProduct(database, { productCode: 'PRD-0001', sku: 'UREA46', salesRate: 280 });
    const csv = 'Product Name,SKU,MRP,Selling Price\nUrea 46%,UREA46,350,320\n';
    const file = { originalname: 'products.csv', buffer: Buffer.from(csv) };

    const res = await service.importProducts(file, 'upsert', 'user-1');
    expect(res.updated).toBe(1);
    expect(res.errors).toHaveLength(0);
    expect(database.items._rows.get('prod-1').salesRate).toBe(320);
  });

  it('export returns csv buffer with BOM', async () => {
    const { database, service } = makeFixture();
    seedProduct(database);
    const out = await service.exportProducts('csv');
    expect(out.mime).toContain('text/csv');
    expect(out.buffer.toString('utf8').startsWith('\uFEFF')).toBe(true);
    expect(out.buffer.toString('utf8')).toContain('Urea 46%');
  });

  it('export rejects unknown format', async () => {
    const { service } = makeFixture();
    await expect(service.exportProducts('pdf')).rejects.toThrow(/Format must be/);
  });

  it('adds and removes documents with audit', async () => {
    const { database, service } = makeFixture();
    seedProduct(database);
    const doc = await service.addDocument(
      { productId: 'prod-1', docType: 'gst_certificate', fileName: 'gst.pdf' },
      'user-1',
    );
    expect(doc.fileName).toBe('gst.pdf');
    expect(database.productDocuments._rows.size).toBe(1);

    await service.removeDocument(doc.id, 'user-1');
    expect(database.productDocuments._rows.get(doc.id).isDeleted).toBe(true);
  });

  it('getPrices returns current + history', async () => {
    const { database, service } = makeFixture();
    seedProduct(database);
    database.productPriceHistory._rows.set('h1', {
      id: 'h1',
      productId: 'prod-1',
      priceType: 'mrp',
      oldValue: 300,
      newValue: 320,
      changedAt: '2026-08-01T00:00:00.000Z',
      isDeleted: false,
    });
    const prices = await service.getPrices('prod-1');
    expect(prices.current.mrp).toBe(300);
    expect(prices.history).toHaveLength(1);
  });

  it('reports low-stock and expiry lists', async () => {
    const { database, service } = makeFixture();
    seedProduct(database, { currentStock: 5, minStock: 20 });
    database.batchMaster._rows.set('b1', {
      id: 'b1',
      itemId: 'prod-1',
      batchNo: 'B-001',
      expDate: '2026-08-15',
      isDeleted: false,
    });
    const low = await service.getReports('low-stock');
    expect(low.count).toBe(1);

    const expiry = await service.getReports('expiry');
    expect(expiry.rows.length).toBeGreaterThan(0);
    expect(expiry.rows[0].daysToExpiry).toBeLessThan(90);
  });

  it('form masters returns reference lists', async () => {
    const { service } = makeFixture();
    const masters = await service.getFormMasters();
    expect(masters.categories).toHaveLength(1);
    expect(masters.brands).toHaveLength(1);
    expect(masters.productTypes.length).toBeGreaterThan(10);
    expect(masters.gstRates).toHaveLength(1);
  });
});
