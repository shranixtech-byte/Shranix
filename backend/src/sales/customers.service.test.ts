import { describe, expect, it, vi, beforeEach } from 'vitest';

import { CustomersService } from './customers.service';

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
    ledgerMaster: makeRepo(),
    customers: makeRepo(),
    customerAddresses: makeRepo(),
    customerContacts: makeRepo(),
    customerDocuments: makeRepo(),
    customerGroups: makeRepo([
      { id: 'g1', name: 'Wholesale', isSystem: true },
      { id: 'g2', name: 'Retail', isSystem: true },
    ]),
    customerCategories: makeRepo([
      { id: 'c1', name: 'A' },
      { id: 'c2', name: 'VIP' },
    ]),
    creditProfiles: makeRepo(),
    salesInvoices: makeRepo(),
    salesSettings: makeRepo([]),
  };
  const audit = { log: vi.fn(async () => undefined) };
  const creditEngine = { upsertProfile: vi.fn(async () => undefined) };
  const service = new CustomersService(database as any, audit as any, creditEngine as any);
  return { database, audit, creditEngine, service };
}

function seedLedgerCustomer(db: any, overrides: Record<string, unknown> = {}) {
  const row = {
    id: 'c1',
    accountId: 'CUS-0001',
    ledgerType: 'customer',
    partyId: 'Sharma Traders',
    creditLimit: 5000,
    creditDays: 30,
    isActive: true,
    notes: JSON.stringify({
      code: 'CUS-0001',
      gstin: '27AABCU9603R1ZM',
      mobile: '9876543210',
      status: 'active',
      city: 'Nashik',
    }),
    openingBalance: 0,
    currentBalance: 0,
    isDeleted: false,
    deletedAt: null,
    ...overrides,
  };
  db.ledgerMaster._rows.set(row.id, row);
  return row;
}

describe('CustomersService (Phase 3 — dual-write facade)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a customer with auto-generated code on both master + ledger tables', async () => {
    const { database, service, creditEngine, audit } = makeFixture();

    const result = await service.create(
      { name: 'New Customer', mobile: '9812345678', creditLimit: 10000, creditDays: 15 },
      'user-1',
    );

    expect(result.code).toMatch(/^CUS-\d{4}$/);
    const id = result.id as string;
    // Same UUID on both tables
    const master = database.customers._rows.get(id);
    const ledger = database.ledgerMaster._rows.get(id);
    expect(master).toBeTruthy();
    expect(ledger).toBeTruthy();
    expect(master.customerCode).toBe(result.code);
    expect(master.name).toBe('New Customer');
    expect(ledger.partyId).toBe('New Customer');
    expect(ledger.ledgerType).toBe('customer');
    expect(ledger.accountId).toBe(result.code);
    expect(master.creditLimit).toBe(10000);
    expect(ledger.creditLimit).toBe(10000);
    expect(creditEngine.upsertProfile).toHaveBeenCalledWith(
      id,
      expect.objectContaining({ customerCode: result.code, creditLimit: 10000 }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ event: 'customer_created' }));
  });

  it('rejects a duplicate GSTIN (business rule)', async () => {
    const { database, service } = makeFixture();
    seedLedgerCustomer(database);

    await expect(
      service.create({ name: 'Dup GST', gstin: '27AABCU9603R1ZM' }, 'user-1'),
    ).rejects.toThrow(/already registered/i);
  });

  it('returns a mobile duplicate warning without blocking creation', async () => {
    const { database, service } = makeFixture();
    seedLedgerCustomer(database);

    const result = await service.create({ name: 'Second', mobile: '9876543210' }, 'user-1');
    expect(result.warnings?.mobileDuplicates).toHaveLength(1);
    expect(result.warnings.mobileDuplicates[0].id).toBe('c1');
  });

  it('rejects changing the customer code after creation', async () => {
    const { database, service } = makeFixture();
    seedLedgerCustomer(database);

    await expect(
      service.update('c1', { code: 'CUS-9999', name: 'Sharma Traders' }, 'user-1'),
    ).rejects.toThrow(/cannot be changed/i);
  });

  it('updates both master and ledger when credit terms change', async () => {
    const { database, service } = makeFixture();
    seedLedgerCustomer(database);

    const result = await service.update('c1', { creditLimit: 20000, creditDays: 45 }, 'user-1');
    expect(result.creditLimit).toBe(20000);
    expect(database.ledgerMaster._rows.get('c1').creditLimit).toBe(20000);
    expect(database.ledgerMaster._rows.get('c1').creditDays).toBe(45);
    // Notes JSON keeps extras in sync
    const notes = JSON.parse(database.ledgerMaster._rows.get('c1').notes);
    expect(notes.code).toBe('CUS-0001');
  });

  it('rejects deleting a customer that has invoices', async () => {
    const { database, service } = makeFixture();
    seedLedgerCustomer(database);
    database.salesInvoices._rows.set('inv-1', {
      id: 'inv-1',
      customerId: 'c1',
      status: 'posted',
      isDeleted: false,
    });

    await expect(service.delete('c1', 'user-1')).rejects.toThrow(/invoices exist/i);
    // Still present (not soft-deleted)
    expect(database.ledgerMaster._rows.get('c1').isDeleted).toBe(false);
  });

  it('soft-deletes both tables for an invoice-free customer', async () => {
    const { database, service } = makeFixture();
    seedLedgerCustomer(database);

    await service.delete('c1', 'user-1');
    expect(database.ledgerMaster._rows.get('c1').isDeleted).toBe(true);
  });

  it('syncs status across master, ledger and credit profile', async () => {
    const { database, service } = makeFixture();
    seedLedgerCustomer(database);
    database.creditProfiles._rows.set('p1', {
      id: 'p1',
      customerId: 'c1',
      isBlocked: false,
      isDeleted: false,
    });

    const res = await service.setStatus('c1', 'blocked', 'user-1');
    expect(res.status).toBe('blocked');
    expect(database.ledgerMaster._rows.get('c1').isActive).toBe(false);
    expect(database.creditProfiles._rows.get('p1').isBlocked).toBe(true);
    expect(database.creditProfiles._rows.get('p1').blockReason).toContain('blocked');

    await service.setStatus('c1', 'active', 'user-1');
    expect(database.ledgerMaster._rows.get('c1').isActive).toBe(true);
    expect(database.creditProfiles._rows.get('p1').isBlocked).toBe(false);
  });

  it('lists customers through the master table with profile enrichment', async () => {
    const { database, service } = makeFixture();
    seedLedgerCustomer(database);
    // Master row for c1 (dual-write simulation)
    database.customers._rows.set('c1', {
      id: 'c1',
      customerCode: 'CUS-0001',
      name: 'Sharma Traders',
      firmName: 'Sharma & Co',
      customerType: 'wholesale',
      groupId: 'g1',
      status: 'active',
      creditLimit: 5000,
      creditDays: 30,
      isDeleted: false,
    });
    database.creditProfiles._rows.set('p1', {
      id: 'p1',
      customerId: 'c1',
      outstanding: 2500,
      overdueAmount: 500,
      advanceBalance: 0,
      availableCredit: 2500,
      isBlocked: false,
      isDeleted: false,
    });

    const res = await service.listCustomers({ withProfile: true });
    expect(res.total).toBe(1);
    expect(res.data[0].firmName).toBe('Sharma & Co');
    expect(res.data[0].groupName).toBe('Wholesale');
    expect(res.data[0].outstanding).toBe(2500);
    expect(res.data[0].overdueAmount).toBe(500);
  });

  it('returns an outstanding report with summary totals', async () => {
    const { database, service } = makeFixture();
    seedLedgerCustomer(database);
    database.creditProfiles._rows.set('p1', {
      id: 'p1',
      customerId: 'c1',
      outstanding: 3000,
      overdueAmount: 1000,
      advanceBalance: 0,
      availableCredit: 2000,
      isBlocked: false,
      isDeleted: false,
    });

    const res = await service.getOutstanding({});
    expect(res.summary.totalOutstanding).toBe(3000);
    expect(res.summary.totalOverdue).toBe(1000);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].name).toBe('Sharma Traders');
  });

  it('rejects an invalid mobile number format', async () => {
    const { service } = makeFixture();
    await expect(service.create({ name: 'Bad Mobile', mobile: '12345' })).rejects.toThrow(
      /Invalid mobile/i,
    );
  });
});
