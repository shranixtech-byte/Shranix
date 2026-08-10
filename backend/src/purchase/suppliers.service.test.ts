import { describe, expect, it, vi, beforeEach } from 'vitest';

import { SuppliersService } from './suppliers.service';

// ── In-memory repository mock (supports eq/like/in/gt filters + projection) ──
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
      const sortBy = params?.sortBy;
      if (sortBy && list.length > 0 && sortBy in list[0]) {
        const dir = params?.sortOrder === 'desc' ? -1 : 1;
        list = [...list].sort(
          (a, b) =>
            String(a[sortBy] ?? '').localeCompare(String(b[sortBy] ?? ''), undefined, {
              numeric: true,
            }) * dir,
        );
      }
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 50;
      const start = (page - 1) * pageSize;
      const paged = list.slice(start, start + pageSize);
      const data = params?.fields?.length
        ? paged.map((r) => Object.fromEntries(params.fields.map((f: string) => [f, r[f]])))
        : paged;
      return {
        data,
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
        createdAt: data.createdAt || '2026-08-06T00:00:00.000Z',
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
      const row = rows.get(id);
      if (row) {
        row.isDeleted = true;
        row.deletedAt = '2026-08-06T00:00:00.000Z';
      }
      return { ...row };
    }),
    restore: vi.fn(async (id: string) => {
      const row = rows.get(id);
      if (row) {
        row.isDeleted = false;
        row.deletedAt = null;
      }
      return { ...row };
    }),
    _rows: rows,
  };
}

function makeFixture() {
  const database = {
    suppliers: makeRepo(),
    ledgerMaster: makeRepo(),
    supplierAddresses: makeRepo(),
    supplierContacts: makeRepo(),
    supplierDocuments: makeRepo(),
    supplierGroups: makeRepo([
      { id: 'g1', name: 'Distributor', isSystem: true },
      { id: 'g2', name: 'Manufacturer', isSystem: true },
    ]),
    supplierCategories: makeRepo([
      { id: 'c1', name: 'A' },
      { id: 'c2', name: 'Premium' },
    ]),
    purchaseInvoices: makeRepo(),
    purchaseOrders: makeRepo(),
    grn: makeRepo(),
    purchaseSettings: makeRepo([]),
  };
  const audit = { log: vi.fn(async () => undefined) };
  const service = new SuppliersService(database as any, audit as any);
  return { database, audit, service };
}

function seedSupplier(db: any, overrides: Record<string, unknown> = {}) {
  const sup = {
    id: 's1',
    code: 'SUP-0001',
    name: 'Agro Traders',
    firmName: 'Agro Traders Pvt Ltd',
    supplierType: 'distributor',
    gstin: '27AABCD1234F1Z5',
    pan: 'AABCD1234F',
    mobile: '9876543210',
    status: 'active',
    isActive: true,
    isDeleted: false,
    creditLimit: 50000,
    creditDays: 30,
    openingBalance: 0,
    currentBalance: 0,
    notes: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
  db.suppliers._rows.set(sup.id, sup);
  return sup;
}

describe('SuppliersService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a supplier with auto-generated code and mirrors it to the ledger', async () => {
    const { database, audit, service } = makeFixture();

    const result = await service.create(
      { name: 'Green Fields Agro', mobile: '9876543210', status: 'active' },
      'user-1',
    );

    expect(result.code).toMatch(/^SUP-\d{4}$/);
    expect(result.name).toBe('Green Fields Agro');

    // Master row written
    const master = [...database.suppliers._rows.values()].find(
      (r) => r.name === 'Green Fields Agro',
    );
    expect(master).toBeTruthy();
    expect(master.code).toBe(result.code);
    expect(master.isActive).toBe(true);

    // Ledger mirror written with supplier type
    const ledger = [...database.ledgerMaster._rows.values()].find(
      (r) => r.ledgerType === 'supplier',
    );
    expect(ledger).toBeTruthy();
    expect(ledger.accountId).toBe(result.code);
    expect(ledger.partyId).toBe('Green Fields Agro');

    // Audit logged
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ event: 'supplier_created' }));
  });

  it('assigns sequential codes SUP-0001, SUP-0002 …', async () => {
    const { service } = makeFixture();
    const a = await service.create({ name: 'First Supplier' });
    const b = await service.create({ name: 'Second Supplier' });
    expect(a.code).toBe('SUP-0001');
    expect(b.code).toBe('SUP-0002');
  });

  it('rejects an invalid GSTIN format', async () => {
    const { service } = makeFixture();
    await expect(service.create({ name: 'Bad GST', gstin: '123' })).rejects.toThrow(
      /Invalid GSTIN/,
    );
  });

  it('rejects an invalid PAN and mobile', async () => {
    const { service } = makeFixture();
    await expect(service.create({ name: 'Bad PAN', pan: 'X' })).rejects.toThrow(/Invalid PAN/);
    await expect(service.create({ name: 'Bad Mobile', mobile: '123' })).rejects.toThrow(
      /Invalid mobile/,
    );
  });

  it('blocks duplicate GSTIN across suppliers', async () => {
    const { database, service } = makeFixture();
    seedSupplier(database);

    await expect(
      service.create({ name: 'Duplicate GST', gstin: '27AABCD1234F1Z5' }),
    ).rejects.toThrow(/already registered/);
  });

  it('returns a non-blocking mobile duplicate warning', async () => {
    const { database, service } = makeFixture();
    seedSupplier(database);

    const result = await service.create({ name: 'Same Mobile', mobile: '9876543210' });
    expect(result.warnings?.mobileDuplicates).toHaveLength(1);
    expect(result.warnings.mobileDuplicates[0].name).toBe('Agro Traders');
  });

  it('applies default credit days from purchase settings when not provided', async () => {
    const { database, service } = makeFixture();
    database.purchaseSettings._rows.set('ps1', {
      id: 'ps1',
      supplierCreditDays: 45,
      isDeleted: false,
    });

    const result = await service.create({ name: 'Default Terms Supplier' });
    expect(result.creditDays).toBe(45);
  });

  it('updates a supplier and writes through to the ledger', async () => {
    const { database, audit, service } = makeFixture();
    seedSupplier(database);
    database.ledgerMaster._rows.set('s1', {
      id: 's1',
      accountId: 'SUP-0001',
      ledgerType: 'supplier',
      partyId: 'Agro Traders',
      isActive: true,
    });

    const result = await service.update(
      's1',
      { creditLimit: 75000, email: 'agro@test.in' },
      'user-1',
    );

    expect(result.creditLimit).toBe(75000);
    const master = database.suppliers._rows.get('s1');
    expect(master.email).toBe('agro@test.in');
    expect(master.updatedBy).toBe('user-1');

    // Ledger write-through
    const ledger = database.ledgerMaster._rows.get('s1');
    expect(ledger.creditLimit).toBe(75000);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ event: 'supplier_updated' }));
  });

  it('rejects changing the supplier code after creation', async () => {
    const { database, service } = makeFixture();
    seedSupplier(database);

    await expect(service.update('s1', { code: 'SUP-9999' })).rejects.toThrow(/cannot be changed/);
  });

  it('soft-deletes the supplier and the ledger mirror', async () => {
    const { database, audit, service } = makeFixture();
    seedSupplier(database);
    database.ledgerMaster._rows.set('s1', {
      id: 's1',
      accountId: 'SUP-0001',
      ledgerType: 'supplier',
      isActive: true,
    });

    await service.delete('s1', 'user-1');
    expect(database.suppliers._rows.get('s1').isDeleted).toBe(true);
    expect(database.ledgerMaster._rows.get('s1').isDeleted).toBe(true);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ event: 'supplier_deleted' }));
    // NotFound for re-fetch (soft-deleted filtered out)
    await expect(service.findById('s1')).rejects.toThrow(/not found/);
  });

  it('blocks deletion when the supplier has purchase invoices', async () => {
    const { database, service } = makeFixture();
    seedSupplier(database);
    database.purchaseInvoices._rows.set('pi1', {
      id: 'pi1',
      supplierId: 's1',
      status: 'posted',
      isDeleted: false,
    });

    await expect(service.delete('s1')).rejects.toThrow(/Cannot delete/);
    expect(database.suppliers._rows.get('s1').isDeleted).toBe(false);
  });

  it('allows deletion when only cancelled invoices exist', async () => {
    const { database, service } = makeFixture();
    seedSupplier(database);
    database.purchaseInvoices._rows.set('pi1', {
      id: 'pi1',
      supplierId: 's1',
      status: 'cancelled',
      isDeleted: false,
    });

    await service.delete('s1');
    expect(database.suppliers._rows.get('s1').isDeleted).toBe(true);
  });

  it('updates status and syncs the ledger isActive flag', async () => {
    const { database, audit, service } = makeFixture();
    seedSupplier(database);
    database.ledgerMaster._rows.set('s1', {
      id: 's1',
      ledgerType: 'supplier',
      isActive: true,
    });

    const result = await service.setStatus('s1', 'blocked', 'user-1');
    expect(result.status).toBe('blocked');
    expect(database.suppliers._rows.get('s1').status).toBe('blocked');
    expect(database.suppliers._rows.get('s1').isActive).toBe(false);
    expect(database.ledgerMaster._rows.get('s1').isActive).toBe(false);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'supplier_status_changed' }),
    );
  });

  it('rejects an invalid status', async () => {
    const { service } = makeFixture();
    await expect(service.setStatus('s1', 'archived')).rejects.toThrow(/Status must be/);
  });

  it('bulk deletes only suppliers without purchase documents', async () => {
    const { database, service } = makeFixture();
    seedSupplier(database, { id: 's1' });
    seedSupplier(database, { id: 's2', code: 'SUP-0002', name: 'Second Supplier' });
    database.purchaseInvoices._rows.set('pi1', {
      id: 'pi1',
      supplierId: 's2',
      status: 'posted',
      isDeleted: false,
    });

    const result = await service.bulkDelete(['s1', 's2'], 'user-1');
    expect(result.deleted).toBe(1);
    expect(result.failed).toBe(1);
    expect(database.suppliers._rows.get('s1').isDeleted).toBe(true);
    expect(database.suppliers._rows.get('s2').isDeleted).toBe(false);
  });

  it('computes the dashboard summary', async () => {
    const { database, service } = makeFixture();
    seedSupplier(database, { id: 's1', status: 'active' });
    seedSupplier(database, {
      id: 's2',
      code: 'SUP-0002',
      name: 'Blocked Co',
      status: 'blocked',
      isActive: false,
    });
    seedSupplier(database, {
      id: 's3',
      code: 'SUP-0003',
      name: 'New Co',
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    database.purchaseInvoices._rows.set('pi1', {
      id: 'pi1',
      supplierId: 's1',
      status: 'posted',
      grandTotal: 10000,
      balanceAmount: 4000,
      isDeleted: false,
    });

    const dash = await service.getDashboard();
    expect(dash.summary.totalSuppliers).toBe(3);
    expect(dash.summary.activeSuppliers).toBe(2);
    expect(dash.summary.blockedSuppliers).toBe(1);
    expect(dash.summary.newThisMonth).toBeGreaterThanOrEqual(1);
    expect(dash.summary.totalPayable).toBe(4000);
    expect(dash.summary.totalPurchaseValue).toBe(10000);
    expect(dash.topSuppliers[0].name).toBe('Agro Traders');
  });

  it('reports outstanding payables grouped per supplier', async () => {
    const { database, service } = makeFixture();
    seedSupplier(database, { id: 's1' });
    database.purchaseInvoices._rows.set('pi1', {
      id: 'pi1',
      supplierId: 's1',
      status: 'posted',
      grandTotal: 10000,
      balanceAmount: 4000,
      dueDate: '2026-01-01',
      isDeleted: false,
    });

    const out = await service.getOutstanding();
    expect(out.total).toBe(1);
    expect(out.data[0].name).toBe('Agro Traders');
    expect(out.data[0].outstanding).toBe(4000);
    expect(out.data[0].overdueAmount).toBe(4000);
    expect(out.summary.totalPayable).toBe(4000);
  });

  it('returns the supplier 360 ledger of purchase invoices', async () => {
    const { database, service } = makeFixture();
    seedSupplier(database, { id: 's1' });
    database.purchaseInvoices._rows.set('pi1', {
      id: 'pi1',
      supplierId: 's1',
      status: 'posted',
      invoiceNumber: 'PINV-001',
      invoiceDate: '2026-07-15',
      grandTotal: 10000,
      paidAmount: 6000,
      balanceAmount: 4000,
      paymentStatus: 'partial',
      isDeleted: false,
    });

    const ledger = await service.getLedger('s1');
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.summary.totalValue).toBe(10000);
    expect(ledger.summary.totalBalance).toBe(4000);
  });

  it('exports suppliers as CSV with a BOM header', async () => {
    const { database, service } = makeFixture();
    seedSupplier(database);

    const result = await service.exportSuppliers('csv');
    expect(result.mime).toContain('text/csv');
    expect(result.fileName).toMatch(/^suppliers-\d{14}\.csv$/);
    const text = result.buffer.toString('utf8');
    expect(text).toContain('Supplier Code');
    expect(text).toContain('Agro Traders');
  });

  it('imports suppliers from CSV rows with duplicate detection', async () => {
    const { database, service } = makeFixture();
    seedSupplier(database); // GSTIN 27AABCD1234F1Z5 / mobile 9876543210

    const csv = [
      'Supplier Name,Supplier Code,GSTIN,Mobile',
      'New Imported Co,SUP-9000,29ABCDE1234F1Z5,9000000000',
      'Agro Traders,,27AABCD1234F1Z5,9876543210', // duplicate GSTIN → skipped
    ].join('\n');

    const result = await service.importSuppliers(
      { originalname: 'suppliers.csv', buffer: Buffer.from(csv) },
      'insert',
      'user-1',
    );

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect([...database.suppliers._rows.values()].some((r: any) => r.code === 'SUP-9000')).toBe(
      true,
    );
  });

  it('upserts existing suppliers on import', async () => {
    const { database, service } = makeFixture();
    seedSupplier(database); // id s1, code SUP-0001

    const csv = [
      'Supplier Code,Supplier Name,Credit Limit',
      'SUP-0001,Agro Traders Renamed,90000',
    ].join('\n');
    const result = await service.importSuppliers(
      { originalname: 'x.csv', buffer: Buffer.from(csv) },
      'upsert',
    );
    expect(result.updated).toBe(1);
    expect(database.suppliers._rows.get('s1').name).toBe('Agro Traders Renamed');
    expect(database.suppliers._rows.get('s1').creditLimit).toBe(90000);
  });

  it('creates and lists addresses / contacts / documents for a supplier', async () => {
    const { database, service } = makeFixture();
    seedSupplier(database);

    const addr = await service.createAddress('s1', {
      addressType: 'billing',
      address: '12 Main Road',
      state: 'Maharashtra',
      pincode: '411001',
    });
    expect(addr.addressType).toBe('billing');
    expect(database.supplierAddresses._rows.get(addr.id).state).toBe('Maharashtra');

    const contact = await service.createContact('s1', {
      contactType: 'sales',
      name: 'Ravi Kumar',
      mobile: '9000000001',
    });
    expect(contact.name).toBe('Ravi Kumar');

    const doc = await service.createDocument('s1', {
      docType: 'gst_certificate',
      fileName: 'gst.pdf',
    });
    expect(doc.docType).toBe('gst_certificate');

    const addresses = await service.listAddresses('s1');
    expect(addresses).toHaveLength(1);
    const contacts = await service.listContacts('s1');
    expect(contacts).toHaveLength(1);
    const docs = await service.listDocuments('s1');
    expect(docs).toHaveLength(1);

    // Child updates + deletes
    await service.updateAddress('s1', addr.id, { pincode: '400001' });
    expect(database.supplierAddresses._rows.get(addr.id).pincode).toBe('400001');
    await service.updateContact('s1', contact.id, { designation: 'Area Manager' });
    expect(database.supplierContacts._rows.get(contact.id).designation).toBe('Area Manager');

    await service.deleteAddress('s1', addr.id);
    expect(database.supplierAddresses._rows.get(addr.id).isDeleted).toBe(true);
    await service.deleteContact('s1', contact.id);
    await service.deleteDocument('s1', doc.id);
    expect(database.supplierContacts._rows.get(contact.id).isDeleted).toBe(true);
    expect(database.supplierDocuments._rows.get(doc.id).isDeleted).toBe(true);
  });

  it('rejects child operations for a missing supplier', async () => {
    const { service } = makeFixture();
    await expect(service.createAddress('nope', { addressType: 'billing' })).rejects.toThrow(
      /not found/,
    );
  });

  it('finds supplier by id and returns child counts', async () => {
    const { database, service } = makeFixture();
    seedSupplier(database);
    database.supplierAddresses._rows.set('a1', {
      id: 'a1',
      supplierId: 's1',
      isDeleted: false,
    });

    const found = await service.findById('s1');
    expect(found.name).toBe('Agro Traders');
    expect(found.addressCount).toBe(1);
  });
});
