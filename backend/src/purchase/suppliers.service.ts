import crypto from 'node:crypto';

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

// GSTIN: 2-digit state + 10-char PAN + entity code + Z + checksum (uppercase)
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
// PAN: 5 letters + 4 digits + 1 letter (uppercase)
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
// Mobile: 10-digit Indian mobile (optional +91 prefix)
const MOBILE_REGEX = /^(\+?91[\s-]?)?[6-9][0-9]{9}$/;

const SUPPLIER_STATUSES = ['active', 'inactive', 'blocked'] as const;

/**
 * Extra supplier fields mirrored into the ledger_master `notes` JSON.
 * Legacy readers (finance screens, selection screens) read these keys from
 * notes — so every enterprise master field is also packed there.
 */
const EXTRA_SUPPLIER_FIELDS = [
  'code',
  'firmName',
  'supplierType',
  'groupId',
  'categoryId',
  'aadhaar',
  'upiId',
  'gstin',
  'pan',
  'contactPerson',
  'mobile',
  'altMobile',
  'whatsapp',
  'email',
  'website',
  'address',
  'village',
  'taluka',
  'district',
  'state',
  'city',
  'pin',
  'country',
  'openingBalance',
  'paymentTerms',
  'bankName',
  'bankAccountNo',
  'bankIfsc',
  'bankBranch',
  'status',
  'remarks',
];

/** Remove undefined/null values so drizzle inserts only real columns. */
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) {
      out[k] = v;
    }
  }
  return out as Partial<T>;
}

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * ═════════════════════════════════════════════════════════
 * SUPPLIER MASTER — dual-write facade (mirrors Customer Master).
 *
 * The `shranix_suppliers` table is the canonical enterprise master, and every
 * row is mirrored into `ledger_master` (ledgerType='supplier') so legacy
 * finance/ledger readers and the accounting stack keep working unchanged.
 * Legacy suppliers (pre-master) continue to work without a master row.
 * ═════════════════════════════════════════════════════════
 */
@Injectable()
export class SuppliersService {
  protected readonly logger = new Logger('SuppliersService');

  constructor(
    protected readonly database: DatabaseService,
    protected readonly audit?: AuditService,
  ) {}

  // ═════════════════════════════════════════════════════════
  // HELPERS
  // ═════════════════════════════════════════════════════════

  /** Store extra supplier fields as JSON in the ledger notes column. */
  private packNotes(data: any): string {
    const payload: Record<string, any> = {};
    for (const f of EXTRA_SUPPLIER_FIELDS) {
      if (data[f] !== undefined && data[f] !== null) {
        payload[f] = data[f];
      }
    }
    return JSON.stringify(payload);
  }

  /** GSTIN/PAN/mobile format validation — GST/PAN active only when setting is ON. */
  private async assertTaxValidation(data: any): Promise<void> {
    let gstValidation = true;
    let panValidation = true;
    try {
      const r = await this.database.purchaseSettings.findAll({ page: 1, pageSize: 1 } as any);
      const cfg = r?.data?.[0] || {};
      gstValidation = cfg?.gstEnabled !== false;
      panValidation = cfg?.gstEnabled !== false;
    } catch {
      /* settings missing → validate by default */
    }
    const gstin = String(data.gstin || '').trim();
    const pan = String(data.pan || '').trim();
    const mobile = String(data.mobile || '').trim();
    const email = String(data.email || '').trim();
    const ifsc = String(data.bankIfsc || '').trim();
    if (gstValidation && gstin && !GSTIN_REGEX.test(gstin.toUpperCase())) {
      throw new BadRequestException(
        `Invalid GSTIN "${gstin}" — expected format: 22AAAAA0000A1Z5 (uppercase)`,
      );
    }
    if (panValidation && pan && !PAN_REGEX.test(pan.toUpperCase())) {
      throw new BadRequestException(
        `Invalid PAN "${pan}" — expected format: AAAAA0000A (uppercase)`,
      );
    }
    if (mobile && !MOBILE_REGEX.test(mobile.replace(/[\s-]/g, ''))) {
      throw new BadRequestException(
        `Invalid mobile number "${mobile}" — expected 10-digit Indian number`,
      );
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException(`Invalid email "${email}"`);
    }
    // IFSC: 4 letters + 0 + 6 alphanumeric (uppercase)
    if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) {
      throw new BadRequestException(
        `Invalid IFSC "${ifsc}" — expected format: AAAA0XXXXXX (uppercase)`,
      );
    }
  }

  /** Apply supplier defaults (credit days) from purchase settings. */
  private async applyDefaults(data: any): Promise<any> {
    const enriched = { ...data };
    if (
      enriched.creditDays === undefined ||
      enriched.creditDays === null ||
      enriched.creditDays === ''
    ) {
      try {
        const r = await this.database.purchaseSettings.findAll({ page: 1, pageSize: 1 } as any);
        const settings = r.data?.[0];
        if (typeof settings?.supplierCreditDays === 'number') {
          enriched.creditDays = settings.supplierCreditDays;
        }
      } catch {
        /* best-effort default */
      }
    }
    if (enriched.gstin) {
      enriched.gstin = String(enriched.gstin).trim().toUpperCase();
    }
    if (enriched.pan) {
      enriched.pan = String(enriched.pan).trim().toUpperCase();
    }
    if (enriched.creditLimit !== undefined) {
      enriched.creditLimit = Math.max(0, num(enriched.creditLimit));
    }
    if (enriched.openingBalance !== undefined) {
      enriched.openingBalance = Math.max(0, num(enriched.openingBalance));
    }
    return enriched;
  }

  /** Parse JSON notes back into the record. */
  private unpackNotes(record: any): any {
    if (!record) {
      return record;
    }
    let extras: Record<string, any> = {};
    try {
      if (record.notes && typeof record.notes === 'string' && record.notes.startsWith('{')) {
        extras = JSON.parse(record.notes);
      }
    } catch {
      /* ignore parse errors */
    }
    return { ...record, ...extras };
  }

  /**
   * Compose the unified supplier record: master row (canonical) overlaid with
   * the ledger mirror (finances + legacy notes). Legacy suppliers without a
   * ledger row keep working unchanged.
   */
  private compose(
    master: any,
    ledger: any | null,
    groupMap?: Map<string, string>,
    categoryMap?: Map<string, string>,
  ): any {
    const base = this.unpackNotes(master);
    if (!ledger) {
      return this.withNames(base, groupMap, categoryMap);
    }
    const ledgerExtras = this.unpackNotes(ledger);
    return this.withNames(
      {
        ...base,
        code: base.code || ledgerExtras.code || (ledger as any).accountId || null,
        name: base.name || (ledger as any).partyId || base.code || '',
        openingBalance: num(base.openingBalance, num(ledgerExtras.openingBalance)),
        currentBalance: num(base.currentBalance, num((ledger as any).currentBalance)),
        creditLimit: num(base.creditLimit, num((ledger as any).creditLimit)),
        creditDays: num(base.creditDays, num((ledger as any).creditDays)),
        status:
          base.status || ledgerExtras.status || ((ledger as any).isActive ? 'active' : 'inactive'),
        ...(base.gstin ? {} : { gstin: ledgerExtras.gstin ?? null }),
        ...(base.mobile ? {} : { mobile: ledgerExtras.mobile ?? null }),
        ...(base.email ? {} : { email: ledgerExtras.email ?? null }),
        ...(base.address ? {} : { address: ledgerExtras.address ?? null }),
        ...(base.state ? {} : { state: ledgerExtras.state ?? null }),
        ...(base.district ? {} : { district: ledgerExtras.district ?? null }),
        ...(base.city ? {} : { city: ledgerExtras.city ?? null }),
        ...(base.pin ? {} : { pin: ledgerExtras.pin ?? null }),
        ...(base.remarks ? {} : { remarks: ledgerExtras.remarks ?? null }),
      },
      groupMap,
      categoryMap,
    );
  }

  /** Attach group/category display names (best-effort). */
  private withNames(
    record: any,
    groupMap?: Map<string, string>,
    categoryMap?: Map<string, string>,
  ): any {
    if (!record) {
      return record;
    }
    return {
      ...record,
      groupName: record.groupId ? (groupMap?.get(record.groupId) ?? null) : null,
      categoryName: record.categoryId ? (categoryMap?.get(record.categoryId) ?? null) : null,
    };
  }

  /** Load supplier group/category reference maps (for list composition). */
  private async loadReferenceMaps(): Promise<{
    groups: Map<string, string>;
    categories: Map<string, string>;
  }> {
    const [gRes, cRes] = await Promise.all([
      this.database.supplierGroups
        ?.findAll({ page: 1, pageSize: 1000, fields: ['id', 'name'] } as any)
        .catch(() => ({ data: [] })) || Promise.resolve({ data: [] }),
      this.database.supplierCategories
        ?.findAll({ page: 1, pageSize: 1000, fields: ['id', 'name'] } as any)
        .catch(() => ({ data: [] })) || Promise.resolve({ data: [] }),
    ]);
    return {
      groups: new Map(((gRes as any)?.data || []).map((r: any) => [r.id, r.name])),
      categories: new Map(((cRes as any)?.data || []).map((r: any) => [r.id, r.name])),
    };
  }

  /** Auto-generate the next supplier code (SUP-0001 …) — scans master + ledger. */
  private async nextSupplierCode(): Promise<string> {
    let max = 0;
    try {
      const master = await this.database.suppliers.findAll({
        page: 1,
        pageSize: 10000,
        fields: ['code'],
      } as any);
      for (const r of master?.data || []) {
        const m = String(r.code || '').match(/SUP-(\d+)/);
        if (m) {
          max = Math.max(max, parseInt(m[1], 10));
        }
      }
      const ledger = await this.database.ledgerMaster.findAll({
        page: 1,
        pageSize: 10000,
        filters: [{ field: 'ledgerType', operator: 'eq', value: 'supplier' }],
        fields: ['accountId'],
      } as any);
      for (const r of ledger?.data || []) {
        const m = String(r.accountId || '').match(/SUP-(\d+)/);
        if (m) {
          max = Math.max(max, parseInt(m[1], 10));
        }
      }
    } catch {
      /* ignore — start at 1 */
    }
    return `SUP-${String(max + 1).padStart(4, '0')}`;
  }

  /** GST duplicate check (business rule). Throws when another supplier (excluding `excludeId`) uses the same GSTIN. */
  private async assertUniqueGstin(gstin: string | undefined, excludeId?: string): Promise<void> {
    const g = String(gstin || '')
      .trim()
      .toUpperCase();
    if (!g) {
      return;
    }
    // 1. Master table column
    try {
      const res = await this.database.suppliers.findAll({
        page: 1,
        pageSize: 50,
        filters: [{ field: 'gstin', operator: 'eq', value: g }],
        fields: ['id', 'gstin'],
      } as any);
      for (const r of res?.data || []) {
        if (r.id !== excludeId && String(r.gstin || '').toUpperCase() === g) {
          throw new BadRequestException(`GSTIN "${g}" is already registered for another supplier`);
        }
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      /* table missing → fall through to notes scan */
    }
    // 2. Legacy notes JSON scan
    const notes = await this.database.ledgerMaster.findAll({
      page: 1,
      pageSize: 1000,
      filters: [
        { field: 'ledgerType', operator: 'eq', value: 'supplier' },
        { field: 'notes', operator: 'like', value: `%"gstin":"${g}"` },
      ],
      fields: ['id', 'notes'],
    } as any);
    for (const r of notes?.data || []) {
      if (r.id === excludeId) {
        continue;
      }
      try {
        const n = JSON.parse(r.notes || '{}');
        if (String(n.gstin || '').toUpperCase() === g) {
          throw new BadRequestException(`GSTIN "${g}" is already registered for another supplier`);
        }
      } catch (err) {
        if (err instanceof BadRequestException) {
          throw err;
        }
        /* ignore parse errors */
      }
    }
  }

  /** Mobile duplicate detection (non-blocking warning). */
  private async findMobileDuplicates(
    mobile: string | undefined,
    excludeId?: string,
  ): Promise<any[]> {
    const m = String(mobile || '').trim();
    if (!m) {
      return [];
    }
    const dupes: any[] = [];
    try {
      const res = await this.database.suppliers.findAll({
        page: 1,
        pageSize: 50,
        filters: [{ field: 'mobile', operator: 'eq', value: m }],
        fields: ['id', 'name', 'code', 'mobile'],
      } as any);
      for (const r of res?.data || []) {
        if (r.id !== excludeId && String(r.mobile || '') === m) {
          dupes.push({ id: r.id, name: r.name, code: r.code });
        }
      }
    } catch {
      /* table missing */
    }
    if (dupes.length === 0) {
      const notes = await this.database.ledgerMaster.findAll({
        page: 1,
        pageSize: 500,
        filters: [
          { field: 'ledgerType', operator: 'eq', value: 'supplier' },
          { field: 'notes', operator: 'like', value: `%"mobile":"${m}"` },
        ],
        fields: ['id', 'partyId', 'notes'],
      } as any);
      for (const r of notes?.data || []) {
        if (r.id === excludeId) {
          continue;
        }
        try {
          const n = JSON.parse(r.notes || '{}');
          if (String(n.mobile || '') === m) {
            dupes.push({ id: r.id, name: r.partyId, code: n.code });
          }
        } catch {
          /* ignore */
        }
      }
    }
    return dupes;
  }

  /** Does this supplier have any live purchase documents (invoices / POs / GRNs)? */
  private async hasPurchases(supplierId: string): Promise<boolean> {
    const checks: Promise<boolean>[] = [
      this.database.purchaseInvoices
        .findAll({
          page: 1,
          pageSize: 1,
          filters: [{ field: 'supplierId', operator: 'eq', value: supplierId }],
          fields: ['id', 'status'],
        } as any)
        .then((r: any) => Boolean(r?.data?.[0] && r.data[0].status !== 'cancelled'))
        .catch(() => false),
      this.database.purchaseOrders
        .findAll({
          page: 1,
          pageSize: 1,
          filters: [{ field: 'supplierId', operator: 'eq', value: supplierId }],
          fields: ['id', 'status'],
        } as any)
        .then((r: any) => Boolean(r?.data?.[0] && r.data[0].status !== 'cancelled'))
        .catch(() => false),
      this.database.grn
        .findAll({
          page: 1,
          pageSize: 1,
          filters: [{ field: 'supplierId', operator: 'eq', value: supplierId }],
          fields: ['id', 'status'],
        } as any)
        .then((r: any) => Boolean(r?.data?.[0] && r.data[0].status !== 'cancelled'))
        .catch(() => false),
    ];
    const results = await Promise.all(checks);
    return results.some(Boolean);
  }

  private async auditLog(params: {
    userId?: string;
    event: string;
    action: string;
    entityId: string;
    oldValues?: any;
    newValues?: any;
    details?: Record<string, unknown>;
  }): Promise<void> {
    if (this.audit && params.userId) {
      await this.audit.log({
        userId: params.userId,
        event: params.event as any,
        resource: 'supplier',
        action: params.action,
        entityId: params.entityId,
        module: 'Purchases',
        actionType: params.action,
        oldValues: params.oldValues ?? null,
        newValues: params.newValues ?? null,
        details: params.details ?? null,
      });
    }
  }

  private async countChild(repo: any, supplierId: string): Promise<number> {
    try {
      const res = await repo.findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'supplierId', operator: 'eq', value: supplierId }],
        fields: ['id'],
      } as any);
      return Number(res?.total || 0);
    } catch {
      return 0;
    }
  }

  // ═════════════════════════════════════════════════════════
  // LIST / SEARCH
  // ═════════════════════════════════════════════════════════

  /**
   * Legacy list — paginated supplier table scan with notes-based search.
   * Response shape is unchanged (selection screens, purchase-common, etc.).
   */
  async findAll(page = 1, pageSize = 50, search?: string, isActive?: boolean) {
    const q = String(search || '').trim();
    const filters: any[] = [];
    if (q) {
      filters.push({ field: 'name', operator: 'like', value: `%${q}%` });
    }
    if (isActive !== undefined) {
      filters.push({ field: 'isActive', operator: 'eq', value: isActive });
    }
    const result = await this.database.suppliers.findAll({
      page,
      pageSize,
      filters: filters.length > 0 ? filters : undefined,
    } as any);
    // Attach ledger finances (best-effort)
    const ids = (result.data || []).map((r: any) => r.id);
    const [ledgerRes, refs] = await Promise.all([
      this.database.ledgerMaster
        .findAll({
          page: 1,
          pageSize: 10000,
          filters: [{ field: 'id', operator: 'in', value: ids }],
        } as any)
        .catch(() => ({ data: [] })),
      this.loadReferenceMaps(),
    ]);
    const ledgerMap = new Map(((ledgerRes as any)?.data || []).map((r: any) => [r.id, r]));
    return {
      ...result,
      data: (result.data || []).map((r: any) =>
        this.compose(r, ledgerMap.get(r.id) || null, refs.groups, refs.categories),
      ),
    };
  }

  /**
   * Enterprise list — real column filters on the supplier master table.
   * Used by the Supplier List page (status/type/search/sort).
   */
  async listSuppliers(
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      supplierType?: string;
      groupId?: string;
      categoryId?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
      withLedger?: boolean;
    } = {},
  ): Promise<any> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const search = String(params.search || '').trim();
    const filters: any[] = [];
    if (params.status && SUPPLIER_STATUSES.includes(params.status as any)) {
      filters.push({ field: 'status', operator: 'eq', value: params.status });
    }
    if (params.supplierType) {
      filters.push({ field: 'supplierType', operator: 'eq', value: params.supplierType });
    }
    const sortBy = ['name', 'code', 'createdAt', 'status', 'creditLimit'].includes(
      String(params.sortBy || ''),
    )
      ? params.sortBy
      : undefined;
    if (params.groupId) {
      filters.push({ field: 'groupId', operator: 'eq', value: params.groupId });
    }
    if (params.categoryId) {
      filters.push({ field: 'categoryId', operator: 'eq', value: params.categoryId });
    }

    const res = await this.database.suppliers.findAll({
      page,
      pageSize,
      filters: filters.length > 0 ? filters : undefined,
      search: search || undefined,
      searchFields: search
        ? ['name', 'code', 'mobile', 'gstin', 'firmName', 'email', 'contactPerson']
        : undefined,
      sortBy,
      sortOrder: params.sortDir || 'asc',
    } as any);

    if ((res?.data || []).length === 0) {
      return res;
    }
    const ids = (res.data as any[]).map((r: any) => r.id);
    let ledgerMap = new Map<string, any>();
    const refs = await this.loadReferenceMaps();
    if (params.withLedger !== false) {
      const ledgerRes = await this.database.ledgerMaster
        .findAll({
          page: 1,
          pageSize: 10000,
          filters: [{ field: 'id', operator: 'in', value: ids }],
        } as any)
        .catch(() => ({ data: [] }));
      ledgerMap = new Map(((ledgerRes as any)?.data || []).map((r: any) => [r.id, r]));
    }
    // Attach live outstanding (payable) from unpaid purchase invoices
    const outstandingMap = await this.loadOutstandingMap(ids);
    return {
      ...res,
      data: (res.data as any[]).map((r: any) => {
        const composed = this.compose(r, ledgerMap.get(r.id) || null, refs.groups, refs.categories);
        const agg = outstandingMap.get(r.id);
        if (agg) {
          composed.outstanding = agg.outstanding;
          composed.overdueAmount = agg.overdue;
          composed.openInvoices = agg.invoices;
        }
        return composed;
      }),
    };
  }

  /** Aggregate unpaid purchase-invoice balances per supplier (payable side). */
  private async loadOutstandingMap(
    supplierIds: string[],
  ): Promise<Map<string, { outstanding: number; overdue: number; invoices: number }>> {
    const map = new Map<string, { outstanding: number; overdue: number; invoices: number }>();
    if (supplierIds.length === 0) {
      return map;
    }
    const res = await this.database.purchaseInvoices
      .findAll({
        page: 1,
        pageSize: 10000,
        filters: [{ field: 'supplierId', operator: 'in', value: supplierIds }],
      } as any)
      .catch(() => ({ data: [] }));
    const today = new Date().toISOString().split('T')[0];
    for (const inv of (res as any)?.data || []) {
      if (['draft', 'cancelled'].includes(String(inv.status))) {
        continue;
      }
      const bal = num(inv.balanceAmount);
      if (bal <= 0) {
        continue;
      }
      const cur = map.get(inv.supplierId) || { outstanding: 0, overdue: 0, invoices: 0 };
      cur.outstanding += bal;
      if (String(inv.dueDate || '') < today) {
        cur.overdue += bal;
      }
      cur.invoices += 1;
      map.set(inv.supplierId, cur);
    }
    return map;
  }

  /** Quick search across name / code / mobile / gstin / firm / email / contact person. */
  async searchSuppliers(
    params: { q?: string; page?: number; pageSize?: number } = {},
  ): Promise<any> {
    const q = String(params.q || '').trim();
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    if (!q) {
      return this.listSuppliers({ page, pageSize });
    }
    const res = await this.database.suppliers.findAll({
      page,
      pageSize,
      search: q,
      searchFields: [
        'name',
        'code',
        'mobile',
        'gstin',
        'firmName',
        'email',
        'contactPerson',
        'whatsapp',
      ],
      sortBy: 'name',
      sortOrder: 'asc',
    } as any);
    const ids = (res.data || []).map((r: any) => r.id);
    const [ledgerRes, refs] = await Promise.all([
      this.database.ledgerMaster
        .findAll({
          page: 1,
          pageSize: 10000,
          filters: [{ field: 'id', operator: 'in', value: ids }],
        } as any)
        .catch(() => ({ data: [] })),
      this.loadReferenceMaps(),
    ]);
    const ledgerMap = new Map(((ledgerRes as any)?.data || []).map((r: any) => [r.id, r]));
    return {
      ...res,
      data: (res.data || []).map((r: any) =>
        this.compose(r, ledgerMap.get(r.id) || null, refs.groups, refs.categories),
      ),
    };
  }

  async findById(id: string) {
    const record = await this.database.suppliers.findById(id);
    if (!record) {
      throw new NotFoundException(`Supplier with id "${id}" not found`);
    }
    let ledger: any = null;
    try {
      ledger = await this.database.ledgerMaster.findById(id);
    } catch {
      /* ledger mirror missing */
    }
    const refs = await this.loadReferenceMaps();
    const composed = this.compose(record, ledger, refs.groups, refs.categories);
    composed.addressCount = await this.countChild(this.database.supplierAddresses, id);
    composed.contactCount = await this.countChild(this.database.supplierContacts, id);
    composed.documentCount = await this.countChild(this.database.supplierDocuments, id);
    return composed;
  }

  // ═════════════════════════════════════════════════════════
  // CREATE / UPDATE / DELETE (dual-write facade)
  // ═════════════════════════════════════════════════════════

  async create(data: any, userId?: string) {
    // Validate required name field — reject empty / whitespace-only names.
    const rawName = String(data?.name ?? '').trim();
    if (!rawName) {
      throw new BadRequestException('Supplier name is required and cannot be empty');
    }
    await this.assertTaxValidation(data);
    const enriched = await this.applyDefaults(data);

    // Business rule — auto code generation (SUP-0001 …) unless provided.
    // Retry on unique collision: soft-deleted rows keep their code, so the
    // max-code scan (which excludes them) can hand out an in-use number.
    let code = String(enriched.code || '').trim() || (await this.nextSupplierCode());
    // GST duplicate check (blocking)
    await this.assertUniqueGstin(enriched.gstin, undefined);
    // Mobile duplicate (non-blocking warning)
    const mobileWarnings = await this.findMobileDuplicates(enriched.mobile, undefined);

    const id = crypto.randomUUID();
    const notes = this.packNotes({ ...enriched, code });
    const isActive = enriched.status !== 'inactive' && enriched.status !== 'blocked';

    const masterData = compact({
      id,
      code,
      name: enriched.name || code,
      firmName: enriched.firmName,
      supplierType: enriched.supplierType || 'regular',
      groupId: enriched.groupId,
      categoryId: enriched.categoryId,
      gstin: enriched.gstin,
      pan: enriched.pan,
      aadhaar: enriched.aadhaar,
      contactPerson: enriched.contactPerson,
      mobile: enriched.mobile,
      altMobile: enriched.altMobile,
      whatsapp: enriched.whatsapp,
      email: enriched.email,
      website: enriched.website,
      address: enriched.address,
      village: enriched.village,
      taluka: enriched.taluka,
      district: enriched.district,
      state: enriched.state,
      city: enriched.city,
      pin: enriched.pin,
      country: enriched.country || 'India',
      openingBalance: num(enriched.openingBalance),
      currentBalance: num(enriched.openingBalance),
      creditLimit: num(enriched.creditLimit),
      creditDays: num(enriched.creditDays, 0),
      paymentTerms: enriched.paymentTerms,
      upiId: enriched.upiId,
      bankName: enriched.bankName,
      bankAccountNo: enriched.bankAccountNo,
      bankIfsc: enriched.bankIfsc,
      bankBranch: enriched.bankBranch,
      status: enriched.status || 'active',
      isActive,
      remarks: enriched.remarks,
      notes,
      createdBy: userId,
      updatedBy: userId,
    });
    const ledgerData = compact({
      id,
      accountId: code,
      ledgerType: 'supplier',
      partyId: enriched.name || code,
      openingBalance: num(enriched.openingBalance),
      openingBalanceType: 'credit',
      currentBalance: num(enriched.openingBalance),
      creditLimit: num(enriched.creditLimit),
      creditDays: num(enriched.creditDays, 0),
      isActive,
      notes,
      createdBy: userId,
      updatedBy: userId,
    });

    try {
      await this.database.suppliers.create(masterData);
    } catch (err: any) {
      const msg = String(err?.message || '');
      const uniqueCode =
        /UNIQUE constraint failed[^)]*code/i.test(msg) ||
        /UNIQUE/i.test(msg) ||
        /Failed query.*insert/i.test(msg);
      if (!uniqueCode) {
        throw err;
      }
      // Bump the code until free (max 50 attempts). Manual increment: the
      // max-code scan excludes soft-deleted rows, so re-scanning is a no-op.
      let bumped: string | null = null;
      let seq = Number(String(code || '').match(/SUP-(\d+)/)?.[1] || 0);
      for (let i = 0; i < 50; i += 1) {
        seq += 1;
        code = `SUP-${String(seq).padStart(4, '0')}`;
        masterData.code = code;
        ledgerData.accountId = code;
        // Keep the packed notes in sync with the final code
        masterData.notes = this.packNotes({ ...enriched, code });
        ledgerData.notes = masterData.notes;
        try {
          await this.database.suppliers.create(masterData);
          bumped = code;
          break;
        } catch (e2: any) {
          const e2Msg = String(e2?.message || '');
          if (
            !/UNIQUE constraint failed[^)]*code/i.test(e2Msg) &&
            !/UNIQUE/i.test(e2Msg) &&
            !/Failed query.*insert/i.test(e2Msg)
          ) {
            throw e2;
          }
        }
      }
      if (!bumped) {
        throw new BadRequestException(
          'Could not allocate a unique supplier code — contact an administrator',
        );
      }
    }
    const record = await this.database.ledgerMaster.create(ledgerData).catch(() => masterData);

    await this.auditLog({
      userId,
      event: 'supplier_created',
      action: 'create',
      entityId: id,
      newValues: enriched,
      details: { id, name: enriched.name || code, code },
    });
    this.logger.log(`Supplier created: ${id} (${code})`);
    const refs = await this.loadReferenceMaps();
    const composed = this.compose(masterData, record, refs.groups, refs.categories);
    composed.warnings =
      mobileWarnings.length > 0 ? { mobileDuplicates: mobileWarnings } : undefined;
    return composed;
  }

  async update(id: string, data: any, userId?: string) {
    await this.assertTaxValidation(data);
    const existing = await this.database.suppliers.findById(id);
    if (!existing) {
      throw new NotFoundException(`Supplier with id "${id}" not found`);
    }
    let ledger: any = null;
    try {
      ledger = await this.database.ledgerMaster.findById(id);
    } catch {
      /* ledger mirror missing */
    }

    // Business rule — supplier code is immutable
    if (data.code !== undefined && String(data.code).trim()) {
      const currentCode = existing.code || (ledger as any)?.accountId;
      if (String(data.code).trim() !== String(currentCode || '').trim()) {
        throw new BadRequestException('Supplier code cannot be changed after creation');
      }
    }
    await this.assertUniqueGstin(data.gstin ?? existing.gstin, id);
    const mobileWarnings = await this.findMobileDuplicates(data.mobile ?? existing.mobile, id);

    // Merge existing notes with new data (backward-compat notes JSON)
    let existingExtras: Record<string, any> = {};
    try {
      if (existing.notes && typeof existing.notes === 'string' && existing.notes.startsWith('{')) {
        existingExtras = JSON.parse(existing.notes);
      }
    } catch {
      /* ignore */
    }
    const mergedExtras = { ...existingExtras };
    for (const f of EXTRA_SUPPLIER_FIELDS) {
      if (data[f] !== undefined) {
        mergedExtras[f] = data[f];
      }
    }

    const isActive =
      data.status !== undefined
        ? data.status !== 'inactive' && data.status !== 'blocked'
        : Boolean(existing.isActive ?? true);

    const masterData = compact({
      name: data.name ?? existing.name,
      firmName: data.firmName ?? existing.firmName,
      supplierType: data.supplierType ?? existing.supplierType,
      groupId: data.groupId ?? existing.groupId,
      categoryId: data.categoryId ?? existing.categoryId,
      gstin: data.gstin ?? existing.gstin,
      pan: data.pan ?? existing.pan,
      aadhaar: data.aadhaar ?? existing.aadhaar,
      contactPerson: data.contactPerson ?? existing.contactPerson,
      mobile: data.mobile ?? existing.mobile,
      altMobile: data.altMobile ?? existing.altMobile,
      whatsapp: data.whatsapp ?? existing.whatsapp,
      email: data.email ?? existing.email,
      website: data.website ?? existing.website,
      address: data.address ?? existing.address,
      village: data.village ?? existing.village,
      taluka: data.taluka ?? existing.taluka,
      district: data.district ?? existing.district,
      state: data.state ?? existing.state,
      city: data.city ?? existing.city,
      pin: data.pin ?? existing.pin,
      country: data.country ?? existing.country,
      openingBalance:
        data.openingBalance !== undefined ? num(data.openingBalance) : existing.openingBalance,
      currentBalance:
        data.openingBalance !== undefined ? num(data.openingBalance) : existing.currentBalance,
      creditLimit: data.creditLimit !== undefined ? num(data.creditLimit) : existing.creditLimit,
      creditDays: data.creditDays !== undefined ? num(data.creditDays) : existing.creditDays,
      paymentTerms: data.paymentTerms ?? existing.paymentTerms,
      upiId: data.upiId ?? existing.upiId,
      bankName: data.bankName ?? existing.bankName,
      bankAccountNo: data.bankAccountNo ?? existing.bankAccountNo,
      bankIfsc: data.bankIfsc ?? existing.bankIfsc,
      bankBranch: data.bankBranch ?? existing.bankBranch,
      status: data.status ?? existing.status,
      isActive,
      remarks: data.remarks ?? existing.remarks,
      notes: JSON.stringify(mergedExtras),
      updatedBy: userId,
    });
    await this.database.suppliers.update(id, masterData);

    // ── Ledger write-through (best-effort) ──
    if (ledger) {
      const ledgerUpdate = compact({
        partyId: data.name ?? (ledger as any).partyId,
        openingBalance:
          data.openingBalance !== undefined
            ? num(data.openingBalance)
            : (ledger as any).openingBalance,
        currentBalance:
          data.openingBalance !== undefined
            ? num(data.openingBalance)
            : (ledger as any).currentBalance,
        creditLimit:
          data.creditLimit !== undefined ? num(data.creditLimit) : (ledger as any).creditLimit,
        creditDays:
          data.creditDays !== undefined ? num(data.creditDays) : (ledger as any).creditDays,
        isActive,
        notes: JSON.stringify(mergedExtras),
        updatedBy: userId,
      });
      await this.database.ledgerMaster.update(id, ledgerUpdate).catch(() => undefined);
    } else {
      await this.database.ledgerMaster
        .create(
          compact({
            id,
            accountId: existing.code || `SUP-${id.slice(0, 4)}`,
            ledgerType: 'supplier',
            partyId: data.name ?? existing.name,
            openingBalance: num(data.openingBalance ?? existing.openingBalance),
            openingBalanceType: 'credit',
            currentBalance: num(data.openingBalance ?? existing.currentBalance),
            creditLimit: num(data.creditLimit ?? existing.creditLimit),
            creditDays: num(data.creditDays ?? existing.creditDays),
            isActive,
            notes: JSON.stringify(mergedExtras),
            createdBy: userId,
            updatedBy: userId,
          }),
        )
        .catch(() => undefined);
    }

    await this.auditLog({
      userId,
      event: 'supplier_updated',
      action: 'update',
      entityId: id,
      oldValues: existing,
      newValues: data,
      details: { id, changes: Object.keys(data) },
    });
    this.logger.log(`Supplier updated: ${id}`);
    const fresh = await this.database.suppliers.findById(id);
    const refs = await this.loadReferenceMaps();
    const composed = this.compose(fresh, ledger, refs.groups, refs.categories);
    composed.warnings =
      mobileWarnings.length > 0 ? { mobileDuplicates: mobileWarnings } : undefined;
    return composed;
  }

  /** Business rule guard + soft delete on BOTH tables (master + ledger mirror). */
  async delete(id: string, userId?: string) {
    const existing = await this.database.suppliers.findById(id);
    if (!existing) {
      throw new NotFoundException(`Supplier with id "${id}" not found`);
    }
    // Business rule — cannot delete a supplier having purchase documents
    if (await this.hasPurchases(id)) {
      throw new BadRequestException(
        'Cannot delete this supplier — purchase invoices/orders exist. Deactivate the supplier instead.',
      );
    }
    await this.database.suppliers.softDelete(id);
    try {
      await this.database.ledgerMaster.softDelete(id);
    } catch {
      /* ledger mirror missing */
    }
    await this.auditLog({
      userId,
      event: 'supplier_deleted',
      action: 'delete',
      entityId: id,
      oldValues: existing,
      details: { id },
    });
    return { message: 'Supplier deleted successfully' };
  }

  async restore(id: string, userId?: string) {
    await this.database.suppliers.restore(id);
    try {
      await this.database.ledgerMaster.restore(id);
    } catch {
      /* ledger mirror missing */
    }
    await this.auditLog({
      userId,
      event: 'supplier_restored',
      action: 'restore',
      entityId: id,
      details: { id },
    });
    return { message: 'Supplier restored successfully' };
  }

  // ═════════════════════════════════════════════════════════
  // STATUS / BULK ACTIONS
  // ═════════════════════════════════════════════════════════

  /** PATCH status — syncs master status + ledger isActive. */
  async setStatus(id: string, status: string, userId?: string) {
    if (!SUPPLIER_STATUSES.includes(status as any)) {
      throw new BadRequestException('Status must be active, inactive or blocked');
    }
    const existing = await this.database.suppliers.findById(id);
    if (!existing) {
      throw new NotFoundException(`Supplier with id "${id}" not found`);
    }
    const oldStatus = existing.status || (existing.isActive ? 'active' : 'inactive');
    const isActive = status !== 'inactive' && status !== 'blocked';

    await this.database.suppliers.update(id, {
      status,
      isActive,
      updatedAt: new Date().toISOString(),
      ...(userId ? { updatedBy: userId } : {}),
    });
    try {
      await this.database.ledgerMaster.update(id, {
        isActive,
        updatedAt: new Date().toISOString(),
        ...(userId ? { updatedBy: userId } : {}),
      });
    } catch {
      /* ledger mirror missing */
    }
    await this.auditLog({
      userId,
      event: 'supplier_status_changed',
      action: 'status_change',
      entityId: id,
      oldValues: { status: oldStatus },
      newValues: { status },
      details: { id, from: oldStatus, to: status },
    });
    this.logger.log(`Supplier ${id} status → ${status}`);
    return { id, status, message: `Supplier status updated to "${status}"` };
  }

  async bulkStatus(ids: string[], status: string, userId?: string) {
    if (!SUPPLIER_STATUSES.includes(status as any)) {
      throw new BadRequestException('Status must be active, inactive or blocked');
    }
    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        await this.setStatus(id, status, userId);
        results.push({ id, ok: true });
      } catch (err) {
        results.push({ id, ok: false, error: (err as Error).message });
      }
    }
    const updated = results.filter((r) => r.ok).length;
    await this.auditLog({
      userId,
      event: 'supplier_bulk_status',
      action: 'bulk_status',
      entityId: 'bulk',
      details: { ids, status, updated },
    });
    return { updated, failed: results.length - updated, results };
  }

  async bulkDelete(ids: string[], userId?: string) {
    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        await this.delete(id, userId);
        results.push({ id, ok: true });
      } catch (err) {
        results.push({ id, ok: false, error: (err as Error).message });
      }
    }
    const deleted = results.filter((r) => r.ok).length;
    await this.auditLog({
      userId,
      event: 'supplier_bulk_delete',
      action: 'bulk_delete',
      entityId: 'bulk',
      details: { ids, deleted },
    });
    return { deleted, failed: results.length - deleted, results };
  }

  // ═════════════════════════════════════════════════════════
  // DASHBOARD / OUTSTANDING / LEDGER
  // ═════════════════════════════════════════════════════════

  async getDashboard(): Promise<any> {
    const [suppliersRes, invoicesRes, ordersRes] = await Promise.all([
      this.database.suppliers
        .findAll({ page: 1, pageSize: 10000 } as any)
        .catch(() => ({ data: [] })),
      this.database.purchaseInvoices
        .findAll({ page: 1, pageSize: 10000 } as any)
        .catch(() => ({ data: [] })),
      this.database.purchaseOrders
        .findAll({ page: 1, pageSize: 10000 } as any)
        .catch(() => ({ data: [] })),
    ]);
    const suppliers = suppliersRes.data || [];
    const invoices = invoicesRes.data || [];
    const orders = ordersRes.data || [];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const byStatus: Record<string, number> = { active: 0, inactive: 0, blocked: 0 };
    for (const s of suppliers) {
      const status = s.status || (s.isActive ? 'active' : 'inactive');
      byStatus[status] = (byStatus[status] || 0) + 1;
    }

    // Payable = sum of unpaid purchase invoice balances (payable side is credit)
    let totalPayable = 0;
    let pendingPayments = 0;
    for (const inv of invoices) {
      if (['draft', 'cancelled'].includes(String(inv.status))) {
        continue;
      }
      const bal = num(inv.balanceAmount);
      totalPayable += bal;
      if (bal > 0) {
        pendingPayments += 1;
      }
    }

    // Top suppliers by purchase value
    const purchaseMap = new Map<string, number>();
    for (const inv of invoices) {
      if (['draft', 'cancelled'].includes(String(inv.status))) {
        continue;
      }
      purchaseMap.set(inv.supplierId, (purchaseMap.get(inv.supplierId) || 0) + num(inv.grandTotal));
    }
    const supplierMap = new Map(suppliers.map((s: any) => [s.id, s]));
    const topSuppliers = [...purchaseMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([supplierId, amount]) => {
        const s = supplierMap.get(supplierId);
        return {
          id: supplierId,
          name: s?.name || supplierId,
          code: s?.code || null,
          amount: Math.round(amount * 100) / 100,
        };
      });

    // Recent suppliers (newest first)
    const recent = [...suppliers]
      .sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, 8);

    const newThisMonth = suppliers.filter(
      (s: any) => String(s.createdAt || '') >= monthStart,
    ).length;
    const newToday = suppliers.filter((s: any) => String(s.createdAt || '') >= todayStart).length;

    return {
      summary: {
        totalSuppliers: suppliers.length,
        activeSuppliers: byStatus.active || 0,
        inactiveSuppliers: byStatus.inactive || 0,
        blockedSuppliers: byStatus.blocked || 0,
        newThisMonth,
        newToday,
        pendingPayments,
        totalPayable: Math.round(totalPayable * 100) / 100,
        totalPurchaseValue:
          Math.round(
            invoices
              .filter((inv: any) => !['draft', 'cancelled'].includes(String(inv.status)))
              .reduce((s: number, inv: any) => s + num(inv.grandTotal), 0) * 100,
          ) / 100,
        openOrders: orders.filter((o: any) =>
          ['draft', 'submitted', 'approved', 'partially_received'].includes(String(o.status)),
        ).length,
      },
      byStatus,
      topSuppliers,
      recent,
    };
  }

  /** Outstanding (payable) report — suppliers with unpaid purchase invoice balances. */
  async getOutstanding(
    params: { page?: number; pageSize?: number; search?: string; status?: string } = {},
  ) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const invoicesRes = await this.database.purchaseInvoices
      .findAll({
        page: 1,
        pageSize: 10000,
        filters: [{ field: 'balanceAmount', operator: 'gt', value: 0 }],
      } as any)
      .catch(() => ({ data: [] }));
    const invoices = (invoicesRes.data || []).filter(
      (inv: any) => !['draft', 'cancelled'].includes(String(inv.status)),
    );

    // Aggregate payable per supplier
    const payableMap = new Map<
      string,
      { outstanding: number; overdue: number; invoices: number }
    >();
    const today = new Date().toISOString().split('T')[0];
    for (const inv of invoices) {
      const sid = inv.supplierId;
      const cur = payableMap.get(sid) || { outstanding: 0, overdue: 0, invoices: 0 };
      const bal = num(inv.balanceAmount);
      cur.outstanding += bal;
      if (String(inv.dueDate || '') < today) {
        cur.overdue += bal;
      }
      cur.invoices += 1;
      payableMap.set(sid, cur);
    }

    const ids = [...payableMap.keys()];
    const suppliersRes = await this.database.suppliers
      .findAll({
        page: 1,
        pageSize: 10000,
        filters: [{ field: 'id', operator: 'in', value: ids }],
      } as any)
      .catch(() => ({ data: [] }));
    const supplierMap = new Map(((suppliersRes as any)?.data || []).map((r: any) => [r.id, r]));

    const q = String(params.search || '')
      .trim()
      .toLowerCase();
    const rows = [...payableMap.entries()]
      .map(([supplierId, agg]) => {
        const s = supplierMap.get(supplierId) as any;
        return {
          id: supplierId,
          name: s?.name || supplierId,
          code: s?.code || null,
          mobile: s?.mobile || null,
          gstin: s?.gstin || null,
          status: s?.status || 'active',
          creditLimit: num(s?.creditLimit),
          creditDays: num(s?.creditDays),
          outstanding: Math.round(agg.outstanding * 100) / 100,
          overdueAmount: Math.round(agg.overdue * 100) / 100,
          openInvoices: agg.invoices,
        };
      })
      .filter((r: any) => {
        if (q) {
          const hay = [r.name, r.code, r.mobile, r.gstin].filter(Boolean).join(' ').toLowerCase();
          if (!hay.includes(q)) {
            return false;
          }
        }
        if (params.status && r.status !== params.status) {
          return false;
        }
        return true;
      })
      .sort((a: any, b: any) => b.outstanding - a.outstanding);

    const total = rows.length;
    const start = (page - 1) * pageSize;
    return {
      data: rows.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      summary: {
        totalPayable:
          Math.round(rows.reduce((s: number, r: any) => s + r.outstanding, 0) * 100) / 100,
        totalOverdue:
          Math.round(rows.reduce((s: number, r: any) => s + r.overdueAmount, 0) * 100) / 100,
        suppliers: total,
      },
    };
  }

  /** Supplier 360° ledger — recent purchase invoices + payments status. */
  async getLedger(supplierId: string): Promise<any> {
    await this.assertSupplier(supplierId);
    const res = await this.database.purchaseInvoices.findAll({
      page: 1,
      pageSize: 500,
      filters: [{ field: 'supplierId', operator: 'eq', value: supplierId }],
      sortBy: 'invoiceDate',
      sortOrder: 'desc',
    } as any);
    const rows = (res?.data || [])
      .filter((inv: any) => !['draft', 'cancelled'].includes(String(inv.status)))
      .map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        grandTotal: num(inv.grandTotal),
        paidAmount: num(inv.paidAmount),
        balanceAmount: num(inv.balanceAmount),
        paymentStatus: inv.paymentStatus,
        status: inv.status,
      }));
    return {
      supplierId,
      entries: rows,
      summary: {
        totalInvoices: rows.length,
        totalValue: Math.round(rows.reduce((s: number, r: any) => s + r.grandTotal, 0) * 100) / 100,
        totalPaid: Math.round(rows.reduce((s: number, r: any) => s + r.paidAmount, 0) * 100) / 100,
        totalBalance:
          Math.round(rows.reduce((s: number, r: any) => s + r.balanceAmount, 0) * 100) / 100,
      },
    };
  }

  // ═════════════════════════════════════════════════════════
  // EXPORT / IMPORT
  // ═════════════════════════════════════════════════════════

  private async fetchAllSuppliers(): Promise<any[]> {
    const pageSize = 500;
    const all: any[] = [];
    let page = 1;
    for (;;) {
      const res = await this.database.suppliers.findAll({ page, pageSize } as any);
      const rows = res?.data || [];
      all.push(...rows);
      if (rows.length < pageSize) {
        break;
      }
      page += 1;
    }
    const ids = all.map((r: any) => r.id);
    const ledgerRes = await this.database.ledgerMaster
      .findAll({
        page: 1,
        pageSize: 10000,
        filters: [{ field: 'id', operator: 'in', value: ids }],
      } as any)
      .catch(() => ({ data: [] }));
    const ledgerMap = new Map(((ledgerRes as any)?.data || []).map((r: any) => [r.id, r]));
    return all.map((r: any) => this.compose(r, ledgerMap.get(r.id) || null));
  }

  /** Build friendly export rows (flat, spreadsheet-friendly). */
  private toExportRows(suppliers: any[]): Record<string, unknown>[] {
    return suppliers.map((s) => ({
      'Supplier Code': s.code ?? '',
      'Supplier Name': s.name ?? '',
      'Firm Name': s.firmName ?? '',
      'Supplier Type': s.supplierType ?? '',
      Group: s.groupName ?? '',
      Category: s.categoryName ?? '',
      Aadhaar: s.aadhaar ?? '',
      GSTIN: s.gstin ?? '',
      PAN: s.pan ?? '',
      'Contact Person': s.contactPerson ?? '',
      Mobile: s.mobile ?? '',
      'Alternate Mobile': s.altMobile ?? '',
      WhatsApp: s.whatsapp ?? '',
      Email: s.email ?? '',
      Website: s.website ?? '',
      Address: s.address ?? '',
      Village: s.village ?? '',
      Taluka: s.taluka ?? '',
      District: s.district ?? '',
      City: s.city ?? '',
      State: s.state ?? '',
      Pincode: s.pin ?? '',
      Country: s.country ?? '',
      'Opening Balance': num(s.openingBalance),
      'Current Balance': num(s.currentBalance),
      'Credit Limit': num(s.creditLimit),
      'Credit Days': num(s.creditDays),
      'Payment Terms': s.paymentTerms ?? '',
      'Bank Name': s.bankName ?? '',
      'Bank Account No': s.bankAccountNo ?? '',
      'Bank IFSC': s.bankIfsc ?? '',
      'Bank Branch': s.bankBranch ?? '',
      'UPI ID': s.upiId ?? '',
      Status: s.status ?? 'active',
      Remarks: s.remarks ?? '',
    }));
  }

  private buildCsv(rows: Record<string, unknown>[]): Buffer {
    const headers = Object.keys(rows[0] || {});
    const escape = (v: unknown): string => {
      const s = String(v ?? '');
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
    ];
    return Buffer.from(`\uFEFF${lines.join('\r\n')}`, 'utf8');
  }

  /** GET /suppliers/export?format=csv|xlsx — downloadable file payload. */
  async exportSuppliers(
    format = 'csv',
  ): Promise<{ fileName: string; buffer: Buffer; mime: string }> {
    const fmt = String(format).toLowerCase();
    if (!['csv', 'xlsx', 'json'].includes(fmt)) {
      throw new BadRequestException('Format must be csv, xlsx or json');
    }
    const rows = this.toExportRows(await this.fetchAllSuppliers());
    const ts = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
    if (fmt === 'json') {
      return {
        fileName: `suppliers-${ts}.json`,
        buffer: Buffer.from(JSON.stringify(rows, null, 2), 'utf8'),
        mime: 'application/json',
      };
    }
    if (fmt === 'csv') {
      return {
        fileName: `suppliers-${ts}.csv`,
        buffer: this.buildCsv(rows),
        mime: 'text/csv; charset=utf-8',
      };
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map((h) => ({
      wch: Math.min(Math.max(h.length + 2, 12), 32),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return {
      fileName: `suppliers-${ts}.xlsx`,
      buffer: Buffer.from(buffer),
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  /**
   * POST /suppliers/import — Excel/CSV/JSON upload with duplicate detection.
   * mode 'insert' → skip duplicates; 'upsert' → update existing.
   * Duplicate keys: supplier code / GSTIN / mobile (case-insensitive).
   */
  async importSuppliers(
    file: { originalname?: string; buffer?: Buffer },
    mode: 'insert' | 'upsert',
    userId?: string,
  ): Promise<any> {
    if (!file?.buffer) {
      throw new BadRequestException('No file provided');
    }
    const m = mode === 'upsert' ? 'upsert' : 'insert';
    const ext =
      String(file.originalname || '')
        .split('.')
        .pop()
        ?.toLowerCase() || '';

    let rows: Record<string, unknown>[];
    try {
      if (ext === 'json') {
        const parsed = JSON.parse(file.buffer.toString('utf8'));
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        const wb = XLSX.read(file.buffer, { type: 'buffer' });
        const first = wb.SheetNames[0];
        if (!first) {
          throw new BadRequestException('Spreadsheet contains no sheets');
        }
        rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[first], { defval: '' });
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException(`Could not read file: ${(err as Error).message}`);
    }
    if (rows.length > 5000) {
      throw new BadRequestException('File is too large — maximum 5,000 rows per import');
    }

    const findRow = (row: Record<string, unknown>, ...keys: string[]): unknown => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return row[k];
        }
        const snake = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = Object.keys(row).find(
          (rk) => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === snake,
        );
        if (found) {
          return row[found];
        }
      }
      return undefined;
    };

    const result = {
      entity: 'suppliers',
      mode: m,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number; message: string }[],
    };

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        const name = String(findRow(row, 'Supplier Name', 'name') ?? '').trim();
        if (!name) {
          throw new Error('"Supplier Name" is required');
        }
        const payload: Record<string, unknown> = {
          name,
          code: String(findRow(row, 'Supplier Code', 'code') ?? '').trim() || undefined,
          firmName: String(findRow(row, 'Firm Name') ?? '').trim() || undefined,
          supplierType: String(findRow(row, 'Supplier Type') ?? '').trim() || undefined,
          groupId: String(findRow(row, 'Group ID') ?? '').trim() || undefined,
          categoryId: String(findRow(row, 'Category ID') ?? '').trim() || undefined,
          aadhaar: String(findRow(row, 'Aadhaar') ?? '').trim() || undefined,
          gstin: String(findRow(row, 'GSTIN', 'gst') ?? '').trim() || undefined,
          pan: String(findRow(row, 'PAN') ?? '').trim() || undefined,
          contactPerson: String(findRow(row, 'Contact Person') ?? '').trim() || undefined,
          mobile: String(findRow(row, 'Mobile') ?? '').trim() || undefined,
          altMobile: String(findRow(row, 'Alternate Mobile') ?? '').trim() || undefined,
          whatsapp: String(findRow(row, 'WhatsApp') ?? '').trim() || undefined,
          email: String(findRow(row, 'Email') ?? '').trim() || undefined,
          website: String(findRow(row, 'Website') ?? '').trim() || undefined,
          address: String(findRow(row, 'Address') ?? '').trim() || undefined,
          village: String(findRow(row, 'Village') ?? '').trim() || undefined,
          taluka: String(findRow(row, 'Taluka') ?? '').trim() || undefined,
          district: String(findRow(row, 'District') ?? '').trim() || undefined,
          city: String(findRow(row, 'City') ?? '').trim() || undefined,
          state: String(findRow(row, 'State') ?? '').trim() || undefined,
          pin: String(findRow(row, 'Pincode', 'PIN') ?? '').trim() || undefined,
          country: String(findRow(row, 'Country') ?? '').trim() || undefined,
          openingBalance: num(findRow(row, 'Opening Balance')),
          creditLimit: num(findRow(row, 'Credit Limit')),
          creditDays: num(findRow(row, 'Credit Days')),
          paymentTerms: String(findRow(row, 'Payment Terms') ?? '').trim() || undefined,
          upiId: String(findRow(row, 'UPI ID') ?? '').trim() || undefined,
          bankName: String(findRow(row, 'Bank Name') ?? '').trim() || undefined,
          bankAccountNo: String(findRow(row, 'Bank Account No') ?? '').trim() || undefined,
          bankIfsc: String(findRow(row, 'Bank IFSC') ?? '').trim() || undefined,
          bankBranch: String(findRow(row, 'Bank Branch') ?? '').trim() || undefined,
          status:
            String(findRow(row, 'Status') ?? 'active')
              .trim()
              .toLowerCase() || 'active',
          remarks: String(findRow(row, 'Remarks') ?? '').trim() || undefined,
        };

        // Duplicate detection — match by code / gstin / mobile (excluding empty)
        const existingId = await this.findDuplicateId(payload);
        if (existingId) {
          if (m === 'insert') {
            result.skipped += 1;
            continue;
          }
          await this.update(existingId, payload, userId);
          result.updated += 1;
          continue;
        }
        await this.create(payload, userId);
        result.imported += 1;
      } catch (err) {
        result.errors.push({ row: i + 2, message: (err as Error).message });
      }
    }

    this.logger.log(
      `Import suppliers: +${result.imported} ~${result.updated} -${result.skipped} errors:${result.errors.length}`,
    );
    return result;
  }

  private async findDuplicateId(payload: Record<string, unknown>): Promise<string | null> {
    const code = String(payload.code || '').trim();
    const gstin = String(payload.gstin || '')
      .trim()
      .toUpperCase();
    const mobile = String(payload.mobile || '').trim();
    if (code) {
      const res = await this.database.suppliers
        .findAll({
          page: 1,
          pageSize: 1,
          filters: [{ field: 'code', operator: 'eq', value: code }],
          fields: ['id'],
        } as any)
        .catch(() => ({ data: [] }));
      if (res?.data?.[0]) {
        return res.data[0].id;
      }
    }
    if (gstin) {
      const res = await this.database.suppliers
        .findAll({
          page: 1,
          pageSize: 1,
          filters: [{ field: 'gstin', operator: 'eq', value: gstin }],
          fields: ['id'],
        } as any)
        .catch(() => ({ data: [] }));
      if (res?.data?.[0]) {
        return res.data[0].id;
      }
      const notes = await this.database.ledgerMaster
        .findAll({
          page: 1,
          pageSize: 5,
          filters: [{ field: 'notes', operator: 'like', value: `%"gstin":"${gstin}"` }],
          fields: ['id'],
        } as any)
        .catch(() => ({ data: [] }));
      if (notes?.data?.[0]) {
        return notes.data[0].id;
      }
    }
    if (mobile) {
      const res = await this.database.suppliers
        .findAll({
          page: 1,
          pageSize: 1,
          filters: [{ field: 'mobile', operator: 'eq', value: mobile }],
          fields: ['id'],
        } as any)
        .catch(() => ({ data: [] }));
      if (res?.data?.[0]) {
        return res.data[0].id;
      }
    }
    return null;
  }

  // ═════════════════════════════════════════════════════════
  // REFERENCE DATA — GROUPS / CATEGORIES
  // ═════════════════════════════════════════════════════════

  async listGroups(): Promise<any[]> {
    const res = await this.database.supplierGroups
      .findAll({ page: 1, pageSize: 1000, sortBy: 'sortOrder', sortOrder: 'asc' } as any)
      .catch(() => ({ data: [] }));
    return (res as any)?.data || [];
  }

  async createGroup(
    data: { name: string; description?: string; sortOrder?: number },
    userId?: string,
  ) {
    const name = String(data.name || '').trim();
    if (!name) {
      throw new BadRequestException('Group name is required');
    }
    const record = await this.database.supplierGroups.create({
      name,
      description: data.description || null,
      sortOrder: Number(data.sortOrder) || 0,
      isSystem: false,
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
    });
    await this.auditLog({
      userId,
      event: 'supplier_group_created',
      action: 'group_create',
      entityId: (record as any).id,
      newValues: { name },
      details: { groupId: (record as any).id },
    });
    return record;
  }

  async listCategories(): Promise<any[]> {
    const res = await this.database.supplierCategories
      .findAll({ page: 1, pageSize: 1000, sortBy: 'priority', sortOrder: 'asc' } as any)
      .catch(() => ({ data: [] }));
    return (res as any)?.data || [];
  }

  async createCategory(
    data: { name: string; description?: string; priority?: number },
    userId?: string,
  ) {
    const name = String(data.name || '').trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }
    const record = await this.database.supplierCategories.create({
      name,
      description: data.description || null,
      priority: Number(data.priority) || 0,
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
    });
    await this.auditLog({
      userId,
      event: 'supplier_category_created',
      action: 'category_create',
      entityId: (record as any).id,
      newValues: { name },
      details: { categoryId: (record as any).id },
    });
    return record;
  }

  // ═════════════════════════════════════════════════════════
  // CHILD RESOURCES — ADDRESSES / CONTACTS / DOCUMENTS
  // ═════════════════════════════════════════════════════════

  private async assertSupplier(supplierId: string): Promise<void> {
    const supplier = await this.database.suppliers.findById(supplierId).catch(() => null);
    if (!supplier) {
      throw new NotFoundException(`Supplier with id "${supplierId}" not found`);
    }
  }

  async listAddresses(supplierId: string) {
    await this.assertSupplier(supplierId);
    const res = await this.database.supplierAddresses.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'supplierId', operator: 'eq', value: supplierId }],
      sortBy: 'createdAt',
      sortOrder: 'asc',
    } as any);
    return res?.data || [];
  }

  async createAddress(supplierId: string, data: any, userId?: string) {
    await this.assertSupplier(supplierId);
    const record = await this.database.supplierAddresses.create({
      supplierId,
      addressType: data.addressType || 'billing',
      address: data.address || null,
      village: data.village || null,
      taluka: data.taluka || null,
      district: data.district || null,
      state: data.state || null,
      country: data.country || 'India',
      pincode: data.pincode || null,
      isDefault: Boolean(data.isDefault),
      createdBy: userId,
      updatedBy: userId,
    });
    await this.auditLog({
      userId,
      event: 'supplier_address_added',
      action: 'address_add',
      entityId: supplierId,
      newValues: data,
      details: { addressId: (record as any).id },
    });
    return record;
  }

  async updateAddress(supplierId: string, addressId: string, data: any, userId?: string) {
    await this.assertSupplier(supplierId);
    const existing = await this.database.supplierAddresses.findById(addressId);
    if (!existing) {
      throw new NotFoundException('Address not found');
    }
    const record = await this.database.supplierAddresses.update(
      addressId,
      compact({
        addressType: data.addressType,
        address: data.address,
        village: data.village,
        taluka: data.taluka,
        district: data.district,
        state: data.state,
        country: data.country,
        pincode: data.pincode,
        isDefault: data.isDefault,
        updatedBy: userId,
      }),
    );
    await this.auditLog({
      userId,
      event: 'supplier_address_updated',
      action: 'address_update',
      entityId: supplierId,
      oldValues: existing,
      newValues: data,
      details: { addressId },
    });
    return record;
  }

  async deleteAddress(supplierId: string, addressId: string, userId?: string) {
    await this.assertSupplier(supplierId);
    const existing = await this.database.supplierAddresses.findById(addressId);
    if (!existing) {
      throw new NotFoundException('Address not found');
    }
    await this.database.supplierAddresses.softDelete(addressId);
    await this.auditLog({
      userId,
      event: 'supplier_address_deleted',
      action: 'address_delete',
      entityId: supplierId,
      oldValues: existing,
      details: { addressId },
    });
    return { message: 'Address deleted' };
  }

  async listContacts(supplierId: string) {
    await this.assertSupplier(supplierId);
    const res = await this.database.supplierContacts.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'supplierId', operator: 'eq', value: supplierId }],
      sortBy: 'createdAt',
      sortOrder: 'asc',
    } as any);
    return res?.data || [];
  }

  async createContact(supplierId: string, data: any, userId?: string) {
    await this.assertSupplier(supplierId);
    const record = await this.database.supplierContacts.create({
      supplierId,
      contactType: data.contactType || 'owner',
      name: data.name,
      mobile: data.mobile || null,
      email: data.email || null,
      designation: data.designation || null,
      isPrimary: Boolean(data.isPrimary),
      createdBy: userId,
      updatedBy: userId,
    });
    await this.auditLog({
      userId,
      event: 'supplier_contact_added',
      action: 'contact_add',
      entityId: supplierId,
      newValues: data,
      details: { contactId: (record as any).id },
    });
    return record;
  }

  async updateContact(supplierId: string, contactId: string, data: any, userId?: string) {
    await this.assertSupplier(supplierId);
    const existing = await this.database.supplierContacts.findById(contactId);
    if (!existing) {
      throw new NotFoundException('Contact not found');
    }
    const record = await this.database.supplierContacts.update(
      contactId,
      compact({
        contactType: data.contactType,
        name: data.name,
        mobile: data.mobile,
        email: data.email,
        designation: data.designation,
        isPrimary: data.isPrimary,
        updatedBy: userId,
      }),
    );
    await this.auditLog({
      userId,
      event: 'supplier_contact_updated',
      action: 'contact_update',
      entityId: supplierId,
      oldValues: existing,
      newValues: data,
      details: { contactId },
    });
    return record;
  }

  async deleteContact(supplierId: string, contactId: string, userId?: string) {
    await this.assertSupplier(supplierId);
    const existing = await this.database.supplierContacts.findById(contactId);
    if (!existing) {
      throw new NotFoundException('Contact not found');
    }
    await this.database.supplierContacts.softDelete(contactId);
    await this.auditLog({
      userId,
      event: 'supplier_contact_deleted',
      action: 'contact_delete',
      entityId: supplierId,
      oldValues: existing,
      details: { contactId },
    });
    return { message: 'Contact deleted' };
  }

  async listDocuments(supplierId: string) {
    await this.assertSupplier(supplierId);
    const res = await this.database.supplierDocuments.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'supplierId', operator: 'eq', value: supplierId }],
      sortBy: 'createdAt',
      sortOrder: 'desc',
    } as any);
    return res?.data || [];
  }

  async createDocument(supplierId: string, data: any, userId?: string) {
    await this.assertSupplier(supplierId);
    const record = await this.database.supplierDocuments.create({
      supplierId,
      docType: data.docType || 'other',
      fileName: data.fileName || 'document',
      fileUrl: data.fileUrl || null,
      fileSize: num(data.fileSize),
      mimeType: data.mimeType || null,
      notes: data.notes || null,
      createdBy: userId,
      updatedBy: userId,
    });
    await this.auditLog({
      userId,
      event: 'supplier_document_added',
      action: 'document_add',
      entityId: supplierId,
      newValues: data,
      details: { documentId: (record as any).id },
    });
    return record;
  }

  async deleteDocument(supplierId: string, documentId: string, userId?: string) {
    await this.assertSupplier(supplierId);
    const existing = await this.database.supplierDocuments.findById(documentId);
    if (!existing) {
      throw new NotFoundException('Document not found');
    }
    await this.database.supplierDocuments.softDelete(documentId);
    await this.auditLog({
      userId,
      event: 'supplier_document_deleted',
      action: 'document_delete',
      entityId: supplierId,
      oldValues: existing,
      details: { documentId },
    });
    return { message: 'Document deleted' };
  }
}
