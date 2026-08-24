import crypto from 'node:crypto';

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

import { SalesCreditEngineService } from './credit-engine.service';
import { SalesReportsService } from './reports.service';

// GSTIN: 2-digit state + 10-char PAN + entity code + Z + checksum (uppercase)
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
// PAN: 5 letters + 4 digits + 1 letter (uppercase)
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
// Mobile: 10-digit Indian mobile (optional +91 prefix)
const MOBILE_REGEX = /^(\+?91[\s-]?)?[6-9][0-9]{9}$/;

const CUSTOMER_STATUSES = ['active', 'inactive', 'blocked'] as const;

/**
 * Extra customer fields mirrored into the ledger_master `notes` JSON.
 * Legacy readers (PDF templates, selection screens, reports) read these
 * keys from notes — so every master field is also packed there.
 */
const EXTRA_CUSTOMER_FIELDS = [
  'code',
  'gstin',
  'pan',
  'contactPerson',
  'mobile',
  'email',
  'address',
  'city',
  'district',
  'state',
  'pin',
  'status',
  'remarks',
  'customerGroup',
  'priceList',
  'paymentTerms',
  'loyaltyPoints',
  // ── Phase 3: Customer Master extras ──
  'firmName',
  'customerType',
  'customerCategory',
  'altMobile',
  'whatsapp',
  'website',
  'village',
  'taluka',
  'country',
  'openingBalance',
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

@Injectable()
export class CustomersService {
  protected readonly logger = new Logger('CustomersService');

  constructor(
    protected readonly database: DatabaseService,
    protected readonly audit?: AuditService,
    private readonly creditEngine?: SalesCreditEngineService,
    private readonly reportsService?: SalesReportsService,
  ) {}

  // ═════════════════════════════════════════════════════════
  // HELPERS
  // ═════════════════════════════════════════════════════════

  /** Store extra customer fields as JSON in the ledger notes column. */
  private packNotes(data: any): string {
    const payload: Record<string, any> = {};
    for (const f of EXTRA_CUSTOMER_FIELDS) {
      if (data[f] !== undefined && data[f] !== null) {
        payload[f] = data[f];
      }
    }
    return JSON.stringify(payload);
  }

  /** Load the single sales settings row (best-effort — defaults on failure). */
  private async loadSettings(): Promise<any> {
    try {
      const r = await this.database.salesSettings.findAll({ page: 1, pageSize: 1 } as any);
      return r?.data?.[0] || {};
    } catch {
      return {};
    }
  }

  /** GSTIN/PAN/mobile format validation — GST/PAN active only when the setting is ON. */
  private async assertTaxValidation(data: any, settings?: any): Promise<void> {
    const cfg = settings || (await this.loadSettings());
    const gstin = String(data.gstin || '').trim();
    const pan = String(data.pan || '').trim();
    const mobile = String(data.mobile || '').trim();
    if (cfg?.gstValidation !== false && gstin && !GSTIN_REGEX.test(gstin.toUpperCase())) {
      throw new BadRequestException(
        `Invalid GSTIN "${gstin}" — expected format: 22AAAAA0000A1Z5 (uppercase)`,
      );
    }
    if (cfg?.panValidation !== false && pan && !PAN_REGEX.test(pan.toUpperCase())) {
      throw new BadRequestException(
        `Invalid PAN "${pan}" — expected format: AAAAA0000A (uppercase)`,
      );
    }
    if (mobile && !MOBILE_REGEX.test(mobile.replace(/[\s-]/g, ''))) {
      throw new BadRequestException(
        `Invalid mobile number "${mobile}" — expected 10-digit Indian number`,
      );
    }
  }

  /** Apply customer defaults (credit limit, payment terms, group, price list) from settings. */
  private applyDefaults(data: any, settings: any): any {
    const enriched = { ...data };
    if (
      (enriched.creditLimit === undefined ||
        enriched.creditLimit === null ||
        enriched.creditLimit === '') &&
      settings?.defaultCreditLimit
    ) {
      enriched.creditLimit = Number(settings.defaultCreditLimit) || 0;
    }
    if (!String(enriched.paymentTerms || '').trim() && settings?.defaultPaymentTerms) {
      enriched.paymentTerms = settings.defaultPaymentTerms;
    }
    if (!String(enriched.customerGroup || '').trim() && settings?.defaultCustomerGroup) {
      enriched.customerGroup = settings.defaultCustomerGroup;
    }
    if (!String(enriched.priceList || '').trim() && settings?.defaultPriceList) {
      enriched.priceList = settings.defaultPriceList;
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
    const status = extras.status || (record.isActive ? 'active' : 'inactive');
    return {
      ...record,
      ...extras,
      name: record.partyId || extras.name || extras.code || '',
      status,
      creditLimit: record.creditLimit || 0,
      creditDays: record.creditDays || 0,
    };
  }

  /**
   * Compose the unified customer record: ledger row (source of truth for
   * finances + legacy notes) overlaid with the enterprise master row.
   * Legacy customers without a master row keep working unchanged.
   */
  private compose(
    ledger: any,
    master: any | null,
    groupMap?: Map<string, string>,
    categoryMap?: Map<string, string>,
  ): any {
    const base = this.unpackNotes(ledger);
    if (!master) {
      return base;
    }
    const groupId = master.groupId || null;
    const categoryId = master.categoryId || null;
    const groupName = (groupId ? groupMap?.get(groupId) : null) || base.customerGroup || null;
    const categoryName =
      (categoryId ? categoryMap?.get(categoryId) : null) || base.customerCategory || null;
    return {
      ...base,
      code: master.customerCode || base.code,
      name: master.name || base.name,
      firmName: master.firmName ?? base.firmName ?? null,
      customerType: master.customerType || base.customerType || 'retail',
      groupId,
      categoryId,
      groupName,
      categoryName,
      gstin: master.gstin ?? base.gstin ?? null,
      pan: master.pan ?? base.pan ?? null,
      mobile: master.mobile ?? base.mobile ?? null,
      altMobile: master.altMobile ?? base.altMobile ?? null,
      whatsapp: master.whatsapp ?? base.whatsapp ?? null,
      email: master.email ?? base.email ?? null,
      website: master.website ?? base.website ?? null,
      village: master.village ?? base.village ?? null,
      taluka: master.taluka ?? base.taluka ?? null,
      district: master.district ?? base.district ?? null,
      country: master.country ?? base.country ?? null,
      openingBalance: num(master.openingBalance ?? base.openingBalance),
      currentBalance: num(master.currentBalance ?? base.currentBalance),
      status: master.status || base.status,
      remarks: master.remarks ?? base.remarks ?? null,
    };
  }

  /** Batch-load master rows + group/category names for a set of customer ids. */
  private async loadMasterContext(ids: string[]): Promise<{
    masters: Map<string, any>;
    groups: Map<string, string>;
    categories: Map<string, string>;
  }> {
    const masters = new Map<string, any>();
    if (ids.length === 0) {
      return { masters, groups: new Map(), categories: new Map() };
    }
    try {
      const res = await this.database.customers.findAll({
        page: 1,
        pageSize: 10000,
        filters: [{ field: 'id', operator: 'in', value: ids }],
      } as any);
      for (const r of res?.data || []) {
        masters.set(r.id, r);
      }
    } catch {
      /* master table unavailable → legacy-only mode */
    }
    const groups = new Map<string, string>();
    const categories = new Map<string, string>();
    try {
      const [gRes, cRes] = await Promise.all([
        this.database.customerGroups.findAll({ page: 1, pageSize: 1000 } as any),
        this.database.customerCategories.findAll({ page: 1, pageSize: 1000 } as any),
      ]);
      for (const g of gRes?.data || []) {
        groups.set(g.id, g.name);
      }
      for (const c of cRes?.data || []) {
        categories.set(c.id, c.name);
      }
    } catch {
      /* reference tables missing → names resolve to null */
    }
    return { masters, groups, categories };
  }

  /** Auto-generate the next customer code (CUS-0001 …).
   *
   * Uses maxFieldValue() which scans ALL rows — including soft-deleted ones —
   * because the unique index on customerCode / accountId prevents code reuse
   * even after soft-delete.  The old findAll-based scan filtered out deleted
   * rows, causing the generator to produce codes that already exist in the
   * unique index → INSERT constraint violation → 500.
   */
  private async nextCustomerCode(): Promise<string> {
    let max = 0;
    try {
      // maxFieldValue scans the raw table WITHOUT soft-delete filtering,
      // so deleted codes are counted and never reused.
      const ledgerMax = await this.database.ledgerMaster.maxFieldValue('accountId');
      if (ledgerMax) {
        const m = String(ledgerMax).match(/CUS-(\d+)/);
        if (m) {
          max = Math.max(max, parseInt(m[1], 10));
        }
      }
      const masterMax = await this.database.customers.maxFieldValue('customerCode');
      if (masterMax) {
        const m = String(masterMax).match(/CUS-(\d+)/);
        if (m) {
          max = Math.max(max, parseInt(m[1], 10));
        }
      }
    } catch {
      /* ignore — start at 1 */
    }
    return `CUS-${String(max + 1).padStart(4, '0')}`;
  }

  /**
   * GST duplicate check (business rule). Throws when another customer
   * (excluding `excludeId`) already uses the same GSTIN.
   */
  private async assertUniqueGstin(gstin: string | undefined, excludeId?: string): Promise<void> {
    const g = String(gstin || '')
      .trim()
      .toUpperCase();
    if (!g) {
      return;
    }
    // 1. Master table column
    try {
      const res = await this.database.customers.findAll({
        page: 1,
        pageSize: 50,
        filters: [{ field: 'gstin', operator: 'eq', value: g }],
        fields: ['id', 'gstin'],
      } as any);
      for (const r of res?.data || []) {
        if (r.id !== excludeId && String(r.gstin || '').toUpperCase() === g) {
          throw new BadRequestException(`GSTIN "${g}" is already registered for another customer`);
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
        { field: 'ledgerType', operator: 'eq', value: 'customer' },
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
          throw new BadRequestException(`GSTIN "${g}" is already registered for another customer`);
        }
      } catch (err) {
        if (err instanceof BadRequestException) {
          throw err;
        }
        /* ignore parse errors */
      }
    }
  }

  /**
   * Mobile duplicate detection (non-blocking warning). Returns the list of
   * other customers sharing the same mobile number.
   */
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
      const res = await this.database.customers.findAll({
        page: 1,
        pageSize: 50,
        filters: [{ field: 'mobile', operator: 'eq', value: m }],
        fields: ['id', 'name', 'customerCode', 'mobile'],
      } as any);
      for (const r of res?.data || []) {
        if (r.id !== excludeId && String(r.mobile || '') === m) {
          dupes.push({ id: r.id, name: r.name, code: r.customerCode });
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
          { field: 'ledgerType', operator: 'eq', value: 'customer' },
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

  /** Resolve a free-text group name to a group id (match by name, case-insensitive). */
  private async resolveGroup(groupText: string | undefined): Promise<string | null> {
    const g = String(groupText || '').trim();
    if (!g) {
      return null;
    }
    try {
      const res = await this.database.customerGroups.findAll({
        page: 1,
        pageSize: 200,
        fields: ['id', 'name'],
      } as any);
      const hit = (res?.data || []).find(
        (r: any) => String(r.name).toLowerCase() === g.toLowerCase(),
      );
      return hit ? hit.id : null;
    } catch {
      return null;
    }
  }

  /** Resolve a free-text category name to a category id (match by name, case-insensitive). */
  private async resolveCategory(categoryText: string | undefined): Promise<string | null> {
    const c = String(categoryText || '').trim();
    if (!c) {
      return null;
    }
    try {
      const res = await this.database.customerCategories.findAll({
        page: 1,
        pageSize: 200,
        fields: ['id', 'name'],
      } as any);
      const hit = (res?.data || []).find(
        (r: any) => String(r.name).toLowerCase() === c.toLowerCase(),
      );
      return hit ? hit.id : null;
    } catch {
      return null;
    }
  }

  /** Does this customer have any live (non-cancelled) invoices? */
  private async hasInvoices(customerId: string): Promise<boolean> {
    try {
      const res = await this.database.salesInvoices.findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        fields: ['id', 'status'],
      } as any);
      const row = res?.data?.[0];
      return Boolean(row && row.status !== 'cancelled');
    } catch {
      return false;
    }
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
        resource: 'customer',
        action: params.action,
        entityId: params.entityId,
        module: 'Sales',
        actionType: params.action,
        oldValues: params.oldValues ?? null,
        newValues: params.newValues ?? null,
        details: params.details ?? null,
      });
    }
  }

  // ═════════════════════════════════════════════════════════
  // LIST / SEARCH
  // ═════════════════════════════════════════════════════════

  /**
   * Legacy list — paginated ledgerMaster scan with notes-based search.
   * Response shape is unchanged (selection screens, invoice-common, etc.).
   * Rows are enriched with enterprise master fields (firmName, group, …).
   */
  async findAll(page = 1, pageSize = 50, search?: string, searchField?: string) {
    const q = String(search || '').trim();
    const filters: any[] = [{ field: 'ledgerType', operator: 'eq', value: 'customer' }];
    if (q) {
      const field = searchField || 'name';
      if (field === 'mobile' || field === 'gstin' || field === 'code') {
        filters.push({ field: 'notes', operator: 'like', value: `%"${field}":"${q}` });
      } else {
        filters.push({ field: 'partyId', operator: 'like', value: `%${q}%` });
      }
    }
    const result = await this.database.ledgerMaster.findAll({ page, pageSize, filters } as any);
    const ids = (result.data || []).map((r: any) => r.id);
    const { masters, groups, categories } = await this.loadMasterContext(ids);
    return {
      ...result,
      data: (result.data || []).map((r: any) =>
        this.compose(r, masters.get(r.id) || null, groups, categories),
      ),
    };
  }

  /**
   * Enterprise list — real column filters on the customer master table.
   * Used by the Customer List page (status/group/category/search/sort).
   * Falls back to the legacy path when the master table is empty.
   */
  async listCustomers(
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      groupId?: string;
      categoryId?: string;
      customerType?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
      withProfile?: boolean;
    } = {},
  ): Promise<any> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const search = String(params.search || '').trim();
    const filters: any[] = [];
    if (params.status && CUSTOMER_STATUSES.includes(params.status as any)) {
      filters.push({ field: 'status', operator: 'eq', value: params.status });
    }
    if (params.groupId) {
      filters.push({ field: 'groupId', operator: 'eq', value: params.groupId });
    }
    if (params.categoryId) {
      filters.push({ field: 'categoryId', operator: 'eq', value: params.categoryId });
    }
    if (params.customerType) {
      filters.push({ field: 'customerType', operator: 'eq', value: params.customerType });
    }
    const sortBy = ['name', 'customerCode', 'createdAt', 'status', 'creditLimit'].includes(
      String(params.sortBy || ''),
    )
      ? params.sortBy
      : undefined;

    try {
      const res = await this.database.customers.findAll({
        page,
        pageSize,
        filters: filters.length > 0 ? filters : undefined,
        search: search || undefined,
        searchFields: search
          ? ['name', 'customerCode', 'mobile', 'gstin', 'firmName', 'email']
          : undefined,
        sortBy,
        sortOrder: params.sortDir || 'asc',
      } as any);
      if ((res?.data || []).length > 0) {
        const { groups, categories } = await this.loadMasterContext(
          (res.data as any[]).map((r: any) => r.id),
        );
        const ledgerIds = (res.data as any[]).map((r: any) => r.id);
        // Batch-load ledger rows so notes extras + finances stay in sync
        const ledgerRes = await this.database.ledgerMaster
          .findAll({
            page: 1,
            pageSize: 10000,
            filters: [{ field: 'id', operator: 'in', value: ledgerIds }],
          } as any)
          .catch(() => ({ data: [] }));
        const ledgerMap = new Map(((ledgerRes as any)?.data || []).map((r: any) => [r.id, r]));
        const profileMap = new Map<string, any>();
        if (params.withProfile) {
          try {
            const profiles = await this.database.creditProfiles.findAll({
              page: 1,
              pageSize: 10000,
              filters: [{ field: 'customerId', operator: 'in', value: ledgerIds }],
            } as any);
            for (const p of profiles?.data || []) {
              profileMap.set(p.customerId, p);
            }
          } catch {
            /* profiles missing */
          }
        }
        const masterRows = (res.data as any[]).map((master: any) => {
          const ledger = ledgerMap.get(master.id) || {
            id: master.id,
            partyId: master.name,
            creditLimit: master.creditLimit,
            creditDays: master.creditDays,
            isActive: master.status !== 'inactive' && master.status !== 'blocked',
          };
          const record = this.compose(ledger, master, groups, categories);
          const profile = profileMap.get(master.id);
          if (profile) {
            record.outstanding = num(profile.outstanding);
            record.advanceBalance = num(profile.advanceBalance);
            record.overdueAmount = num(profile.overdueAmount);
            record.availableCredit = num(profile.availableCredit);
            record.isBlocked = Boolean(profile.isBlocked);
            record.creditLimit = num(profile.creditLimit, num(master.creditLimit));
          }
          return record;
        });
        return { ...res, data: masterRows };
      }
    } catch {
      /* master query failed → fall through to legacy */
    }
    return this.findAll(page, pageSize, search || undefined);
  }

  /** Quick search across name / mobile / gstin / code / firm / village / email. */
  async searchCustomers(
    params: { q?: string; page?: number; pageSize?: number } = {},
  ): Promise<any> {
    const q = String(params.q || '').trim();
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    if (!q) {
      return this.listCustomers({ page, pageSize });
    }
    // Master table quick search (real columns) — includes firm/village/email
    try {
      const res = await this.database.customers.findAll({
        page,
        pageSize,
        search: q,
        searchFields: ['name', 'customerCode', 'mobile', 'gstin', 'firmName', 'email', 'whatsapp'],
        sortBy: 'name',
        sortOrder: 'asc',
      } as any);
      if ((res?.data || []).length > 0) {
        const ids = (res.data as any[]).map((r: any) => r.id);
        const { groups, categories } = await this.loadMasterContext(ids);
        const ledgerRes = await this.database.ledgerMaster
          .findAll({
            page: 1,
            pageSize: 10000,
            filters: [{ field: 'id', operator: 'in', value: ids }],
          } as any)
          .catch(() => ({ data: [] }));
        const ledgerMap = new Map(((ledgerRes as any)?.data || []).map((r: any) => [r.id, r]));
        return {
          ...res,
          data: (res.data as any[]).map((master: any) => {
            const ledger = ledgerMap.get(master.id) || {
              id: master.id,
              partyId: master.name,
              isActive: master.status !== 'inactive' && master.status !== 'blocked',
            };
            return this.compose(ledger, master, groups, categories);
          }),
        };
      }
    } catch {
      /* fall through */
    }
    return this.findAll(page, pageSize, q);
  }

  async findById(id: string) {
    const record = await this.database.ledgerMaster.findById(id);
    if (!record) {
      throw new NotFoundException(`Customer with id "${id}" not found`);
    }
    let master: any = null;
    try {
      master = await this.database.customers.findById(id);
    } catch {
      /* master table missing */
    }
    const { groups, categories } = await this.loadMasterContext([]);
    const composed = this.compose(record, master, groups, categories);
    // Attach credit profile summary (best-effort)
    try {
      const profiles = await this.database.creditProfiles.findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'customerId', operator: 'eq', value: id }],
      } as any);
      const p = profiles?.data?.[0];
      if (p) {
        composed.outstanding = num(p.outstanding);
        composed.advanceBalance = num(p.advanceBalance);
        composed.overdueAmount = num(p.overdueAmount);
        composed.availableCredit = num(p.availableCredit);
        composed.isBlocked = Boolean(p.isBlocked);
        composed.blockReason = p.blockReason || null;
      }
    } catch {
      /* profiles missing */
    }
    // Attach address/contact counts
    composed.addressCount = await this.countChild(this.database.customerAddresses, id);
    composed.contactCount = await this.countChild(this.database.customerContacts, id);
    composed.documentCount = await this.countChild(this.database.customerDocuments, id);
    return composed;
  }

  private async countChild(repo: any, customerId: string): Promise<number> {
    try {
      const res = await repo.findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        fields: ['id'],
      } as any);
      return Number(res?.total || 0);
    } catch {
      return 0;
    }
  }

  // ═════════════════════════════════════════════════════════
  // CREATE / UPDATE / DELETE (dual-write facade)
  // ═════════════════════════════════════════════════════════

  async create(data: any, userId?: string) {
    // Validate required name field — reject empty / whitespace-only names.
    const rawName = String(data?.name ?? '').trim();
    if (!rawName) {
      throw new BadRequestException('Customer name is required and cannot be empty');
    }
    const settings = await this.loadSettings();
    await this.assertTaxValidation(data, settings);
    const enriched = this.applyDefaults(data, settings);

    // Business rule — auto code generation (CUS-0001 …) unless provided
    const code = String(enriched.code || '').trim() || (await this.nextCustomerCode());
    // GST duplicate check (blocking)
    await this.assertUniqueGstin(enriched.gstin, undefined);
    // Mobile duplicate (non-blocking warning)
    const mobileWarnings = await this.findMobileDuplicates(enriched.mobile, undefined);

    const id = crypto.randomUUID();
    const notes = this.packNotes({ ...enriched, code });
    const isActive = enriched.status !== 'inactive' && enriched.status !== 'blocked';
    const groupId = (await this.resolveGroup(enriched.customerGroup)) ?? enriched.groupId ?? null;
    const categoryId =
      (await this.resolveCategory(enriched.customerCategory)) ?? enriched.categoryId ?? null;

    const ledgerData = compact({
      id,
      accountId: code,
      ledgerType: 'customer',
      partyId: enriched.name || code,
      creditLimit: num(enriched.creditLimit),
      creditDays: num(enriched.creditDays, 0),
      isActive,
      notes,
      openingBalance: num(enriched.openingBalance),
      openingBalanceType: 'debit',
      currentBalance: num(enriched.openingBalance),
      createdBy: userId,
      updatedBy: userId,
    });
    const masterData = compact({
      id,
      customerCode: code,
      name: enriched.name || code,
      firmName: enriched.firmName,
      customerType: enriched.customerType || 'retail',
      groupId,
      categoryId,
      gstin: enriched.gstin,
      pan: enriched.pan,
      mobile: enriched.mobile,
      altMobile: enriched.altMobile,
      whatsapp: enriched.whatsapp,
      email: enriched.email,
      website: enriched.website,
      creditLimit: num(enriched.creditLimit),
      creditDays: num(enriched.creditDays, 0),
      openingBalance: num(enriched.openingBalance),
      currentBalance: num(enriched.openingBalance),
      status: enriched.status || 'active',
      remarks: enriched.remarks,
      createdBy: userId,
      updatedBy: userId,
    });

    // Race-safety + soft-delete collision: auto-code may collide with a
    // soft-deleted row that retains its UNIQUE index. Retry with bumped
    // code on any insert failure (same pattern as supplier / asset numbering).
    let attempts = 0;
    let finalCode = code;
    while (attempts < 50) {
      try {
        await this.database.customers.create(masterData);
        break;
      } catch (err: any) {
        const msg = String(err?.message || '');
        const isCodeCollision = /UNIQUE/i.test(msg) || /Failed query.*insert/i.test(msg);
        if (!isCodeCollision || attempts >= 49) {
          throw err;
        }
        attempts += 1;
        const m = finalCode.match(/CUS-(\d+)/);
        const seq = m ? parseInt(m[1], 10) + attempts : attempts;
        finalCode = `CUS-${String(seq).padStart(4, '0')}`;
        masterData.customerCode = finalCode;
        ledgerData.accountId = finalCode;
        const newNotes = this.packNotes({ ...enriched, code: finalCode });
        (masterData as any).notes = newNotes;
        (ledgerData as any).notes = newNotes;
      }
    }
    const record = await this.database.ledgerMaster.create(ledgerData);

    // Create/refresh the credit profile so credit limit shows immediately.
    // Use finalCode (which may have been bumped by the retry loop) instead of
    // the original code to avoid writing a stale / colliding code.
    if (this.creditEngine) {
      try {
        await this.creditEngine.upsertProfile(id, {
          customerName: enriched.name || finalCode,
          customerCode: finalCode,
          creditLimit: num(enriched.creditLimit),
          creditDays: num(enriched.creditDays, 0),
        });
      } catch (err) {
        this.logger.warn(
          `Credit profile not created for customer ${id}: ${(err as Error).message}`,
        );
      }
    }

    await this.auditLog({
      userId,
      event: 'customer_created',
      action: 'create',
      entityId: id,
      newValues: enriched,
      details: { id, name: enriched.name || finalCode, code: finalCode },
    });
    this.logger.log(`Customer created: ${id} (${finalCode})`);
    const composed = this.compose(record, masterData);
    composed.warnings =
      mobileWarnings.length > 0 ? { mobileDuplicates: mobileWarnings } : undefined;
    return composed;
  }

  async update(id: string, data: any, userId?: string) {
    await this.assertTaxValidation(data);
    const existing = await this.database.ledgerMaster.findById(id);
    if (!existing) {
      throw new NotFoundException(`Customer with id "${id}" not found`);
    }
    let master: any = null;
    try {
      master = await this.database.customers.findById(id);
    } catch {
      /* master table missing */
    }

    // Business rule — customer code is immutable
    if (data.code !== undefined && String(data.code).trim()) {
      const currentCode = master?.customerCode || existing.accountId;
      if (String(data.code).trim() !== String(currentCode || '').trim()) {
        throw new BadRequestException('Customer code cannot be changed after creation');
      }
    }
    await this.assertUniqueGstin(data.gstin ?? this.unpackNotes(existing).gstin, id);
    const mobileWarnings = await this.findMobileDuplicates(
      data.mobile ?? this.unpackNotes(existing).mobile,
      id,
    );

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
    for (const f of EXTRA_CUSTOMER_FIELDS) {
      if (data[f] !== undefined) {
        mergedExtras[f] = data[f];
      }
    }

    const isActive =
      data.status !== undefined
        ? data.status !== 'inactive' && data.status !== 'blocked'
        : existing.isActive;

    const updateData: Record<string, any> = {
      notes: JSON.stringify(mergedExtras),
      updatedAt: new Date().toISOString(),
    };
    if (userId) {
      updateData.updatedBy = userId;
    }
    if (data.creditLimit !== undefined) {
      updateData.creditLimit = num(data.creditLimit);
    }
    if (data.creditDays !== undefined) {
      updateData.creditDays = num(data.creditDays);
    }
    if (data.status !== undefined) {
      updateData.isActive = isActive;
    }
    if (data.name !== undefined) {
      updateData.partyId = data.name;
    }
    if (data.openingBalance !== undefined) {
      updateData.openingBalance = num(data.openingBalance);
      updateData.currentBalance = num(data.openingBalance);
    }

    await this.database.ledgerMaster.update(id, updateData);

    // ── Master table write-through ──
    if (master) {
      const groupId =
        data.customerGroup !== undefined
          ? ((await this.resolveGroup(data.customerGroup)) ?? null)
          : master.groupId;
      const categoryId =
        data.customerCategory !== undefined
          ? ((await this.resolveCategory(data.customerCategory)) ?? null)
          : master.categoryId;
      const masterData = compact({
        name: data.name ?? master.name,
        firmName: data.firmName ?? master.firmName,
        customerType: data.customerType ?? master.customerType,
        groupId,
        categoryId,
        gstin: data.gstin ?? master.gstin,
        pan: data.pan ?? master.pan,
        mobile: data.mobile ?? master.mobile,
        altMobile: data.altMobile ?? master.altMobile,
        whatsapp: data.whatsapp ?? master.whatsapp,
        email: data.email ?? master.email,
        website: data.website ?? master.website,
        creditLimit: data.creditLimit !== undefined ? num(data.creditLimit) : master.creditLimit,
        creditDays: data.creditDays !== undefined ? num(data.creditDays) : master.creditDays,
        openingBalance:
          data.openingBalance !== undefined ? num(data.openingBalance) : master.openingBalance,
        currentBalance:
          data.openingBalance !== undefined ? num(data.openingBalance) : master.currentBalance,
        status: data.status ?? master.status,
        remarks: data.remarks ?? master.remarks,
        updatedBy: userId,
      });
      await this.database.customers.update(id, masterData);
    }

    // Credit profile refresh when credit terms changed
    if (this.creditEngine && (data.creditLimit !== undefined || data.creditDays !== undefined)) {
      try {
        await this.creditEngine.upsertProfile(id, {
          customerName: data.name || master?.name || existing.partyId,
          customerCode: master?.customerCode || existing.accountId,
          creditLimit:
            data.creditLimit !== undefined ? num(data.creditLimit) : num(existing.creditLimit),
          creditDays:
            data.creditDays !== undefined ? num(data.creditDays) : num(existing.creditDays),
        });
      } catch (err) {
        this.logger.warn(`Credit profile not refreshed for ${id}: ${(err as Error).message}`);
      }
    }

    await this.auditLog({
      userId,
      event: 'customer_updated',
      action: 'update',
      entityId: id,
      oldValues: this.unpackNotes(existing),
      newValues: data,
      details: { id, changes: Object.keys(data) },
    });
    this.logger.log(`Customer updated: ${id}`);
    const fresh = await this.database.ledgerMaster.findById(id);
    const composed = this.compose(fresh, master);
    composed.warnings =
      mobileWarnings.length > 0 ? { mobileDuplicates: mobileWarnings } : undefined;
    return composed;
  }

  /** Business rule guard + soft delete on BOTH tables (master + ledger). */
  async delete(id: string, userId?: string) {
    const existing = await this.database.ledgerMaster.findById(id);
    if (!existing) {
      throw new NotFoundException(`Customer with id "${id}" not found`);
    }
    // Business rule — cannot delete a customer having invoices
    if (await this.hasInvoices(id)) {
      throw new BadRequestException(
        'Cannot delete this customer — sales invoices exist. Deactivate the customer instead.',
      );
    }
    await this.database.ledgerMaster.softDelete(id);
    try {
      await this.database.customers.softDelete(id);
    } catch {
      /* master table missing */
    }
    await this.auditLog({
      userId,
      event: 'customer_deleted',
      action: 'delete',
      entityId: id,
      oldValues: this.unpackNotes(existing),
      details: { id },
    });
    return { message: 'Customer deleted successfully' };
  }

  async restore(id: string, userId?: string) {
    await this.database.ledgerMaster.restore(id);
    try {
      await this.database.customers.restore(id);
    } catch {
      /* master table missing */
    }
    await this.auditLog({
      userId,
      event: 'customer_restored',
      action: 'restore',
      entityId: id,
      details: { id },
    });
    return { message: 'Customer restored successfully' };
  }

  // ═════════════════════════════════════════════════════════
  // STATUS / BULK ACTIONS
  // ═════════════════════════════════════════════════════════

  /** PATCH status — syncs ledger isActive + master status + credit block. */
  async setStatus(id: string, status: string, userId?: string) {
    if (!CUSTOMER_STATUSES.includes(status as any)) {
      throw new BadRequestException('Status must be active, inactive or blocked');
    }
    const existing = await this.database.ledgerMaster.findById(id);
    if (!existing) {
      throw new NotFoundException(`Customer with id "${id}" not found`);
    }
    const oldStatus =
      this.unpackNotes(existing).status || (existing.isActive ? 'active' : 'inactive');
    const isActive = status !== 'inactive' && status !== 'blocked';

    await this.database.ledgerMaster.update(id, {
      isActive,
      updatedAt: new Date().toISOString(),
      ...(userId ? { updatedBy: userId } : {}),
    });
    try {
      await this.database.customers.update(id, { status, updatedBy: userId });
    } catch {
      /* master table missing */
    }
    // Blocked → credit profile block (best-effort)
    try {
      const profiles = await this.database.creditProfiles.findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'customerId', operator: 'eq', value: id }],
      } as any);
      const p = profiles?.data?.[0];
      if (p) {
        await this.database.creditProfiles.update(p.id, {
          isBlocked: status === 'blocked',
          blockReason: status === 'blocked' ? 'Customer blocked from master' : null,
        });
      }
    } catch {
      /* profiles missing */
    }
    await this.auditLog({
      userId,
      event: 'customer_status_changed',
      action: 'status_change',
      entityId: id,
      oldValues: { status: oldStatus },
      newValues: { status },
      details: { id, from: oldStatus, to: status },
    });
    this.logger.log(`Customer ${id} status → ${status}`);
    return { id, status, message: `Customer status updated to "${status}"` };
  }

  async bulkStatus(ids: string[], status: string, userId?: string) {
    if (!CUSTOMER_STATUSES.includes(status as any)) {
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
      event: 'customer_bulk_status',
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
      event: 'customer_bulk_delete',
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
    const { masters, groups, categories } = await this.loadMasterContext([]);
    const [profilesRes, invoicesRes, ledgerRes] = await Promise.all([
      this.database.creditProfiles
        .findAll({ page: 1, pageSize: 10000 } as any)
        .catch(() => ({ data: [] })),
      this.database.salesInvoices
        .findAll({ page: 1, pageSize: 10000 } as any)
        .catch(() => ({ data: [] })),
      this.database.ledgerMaster
        .findAll({
          page: 1,
          pageSize: 10000,
          filters: [{ field: 'ledgerType', operator: 'eq', value: 'customer' }],
        } as any)
        .catch(() => ({ data: [] })),
    ]);
    const profiles = profilesRes.data || [];
    const invoices = invoicesRes.data || [];
    const ledgerRows = ledgerRes.data || [];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    let totalOutstanding = 0;
    let totalOverdue = 0;
    let totalAdvance = 0;
    for (const p of profiles) {
      totalOutstanding += num(p.outstanding);
      totalOverdue += num(p.overdueAmount);
      totalAdvance += num(p.advanceBalance);
    }

    const byStatus: Record<string, number> = { active: 0, inactive: 0, blocked: 0 };
    let withMaster = 0;
    for (const r of ledgerRows) {
      const master = masters.get(r.id);
      const status =
        master?.status || this.unpackNotes(r).status || (r.isActive ? 'active' : 'inactive');
      byStatus[status] = (byStatus[status] || 0) + 1;
      if (master) {
        withMaster += 1;
      }
    }

    // Top customers by invoice value (posted/confirmed invoices)
    const salesMap = new Map<string, number>();
    for (const inv of invoices) {
      if (['draft', 'cancelled'].includes(String(inv.status))) {
        continue;
      }
      salesMap.set(inv.customerId, (salesMap.get(inv.customerId) || 0) + num(inv.grandTotal));
    }
    const topCustomers = [...salesMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([customerId, amount]) => {
        const ledger = ledgerRows.find((r: any) => r.id === customerId);
        const master = masters.get(customerId);
        const profile = profiles.find((p: any) => p.customerId === customerId);
        return {
          id: customerId,
          name: master?.name || (ledger as any)?.partyId || customerId,
          code: master?.customerCode || null,
          amount: Math.round(amount * 100) / 100,
          outstanding: profile ? num(profile.outstanding) : 0,
        };
      });

    // Recent customers (newest first)
    const recent = [...ledgerRows]
      .sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, 8)
      .map((r: any) => {
        const master = masters.get(r.id);
        return this.compose(r, master, groups, categories);
      });

    const newThisMonth = ledgerRows.filter(
      (r: any) => String(r.createdAt || '') >= monthStart,
    ).length;

    return {
      summary: {
        totalCustomers: ledgerRows.length,
        activeCustomers: byStatus.active || 0,
        inactiveCustomers: byStatus.inactive || 0,
        blockedCustomers: byStatus.blocked || 0,
        newThisMonth,
        masterSynced: withMaster,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
        totalAdvance: Math.round(totalAdvance * 100) / 100,
        customersWithDue: profiles.filter((p: any) => num(p.outstanding) > 0).length,
      },
      byStatus,
      groupDistribution: await this.groupDistribution(),
      categoryDistribution: await this.categoryDistribution(),
      topCustomers,
      recent,
    };
  }

  private async groupDistribution(): Promise<{ name: string; count: number }[]> {
    try {
      const [groups, customers] = await Promise.all([
        this.database.customerGroups.findAll({ page: 1, pageSize: 1000 } as any),
        this.database.customers.findAll({ page: 1, pageSize: 10000, fields: ['groupId'] } as any),
      ]);
      const countMap = new Map<string, number>();
      for (const c of customers?.data || []) {
        if (c.groupId) {
          countMap.set(c.groupId, (countMap.get(c.groupId) || 0) + 1);
        }
      }
      return (groups?.data || [])
        .map((g: any) => ({ name: g.name, count: countMap.get(g.id) || 0 }))
        .filter((g: any) => g.count > 0)
        .sort((a: any, b: any) => b.count - a.count);
    } catch {
      return [];
    }
  }

  private async categoryDistribution(): Promise<{ name: string; count: number }[]> {
    try {
      const [categories, customers] = await Promise.all([
        this.database.customerCategories.findAll({ page: 1, pageSize: 1000 } as any),
        this.database.customers.findAll({
          page: 1,
          pageSize: 10000,
          fields: ['categoryId'],
        } as any),
      ]);
      const countMap = new Map<string, number>();
      for (const c of customers?.data || []) {
        if (c.categoryId) {
          countMap.set(c.categoryId, (countMap.get(c.categoryId) || 0) + 1);
        }
      }
      return (categories?.data || [])
        .map((c: any) => ({ name: c.name, count: countMap.get(c.id) || 0 }))
        .filter((c: any) => c.count > 0)
        .sort((a: any, b: any) => b.count - a.count);
    } catch {
      return [];
    }
  }

  /** Outstanding report — customers with balance, from credit profiles. */
  async getOutstanding(
    params: { page?: number; pageSize?: number; search?: string; status?: string } = {},
  ) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const profilesRes = await this.database.creditProfiles
      .findAll({
        page: 1,
        pageSize: 10000,
        filters: [{ field: 'outstanding', operator: 'gt', value: 0 }],
      } as any)
      .catch(() => ({ data: [] }));
    const profiles = profilesRes.data || [];
    const ids = profiles.map((p: any) => p.customerId);
    const { masters, groups, categories } = await this.loadMasterContext(ids);
    const ledgerRes = await this.database.ledgerMaster
      .findAll({
        page: 1,
        pageSize: 10000,
        filters: [{ field: 'id', operator: 'in', value: ids }],
      } as any)
      .catch(() => ({ data: [] }));
    const ledgerMap = new Map(((ledgerRes as any)?.data || []).map((r: any) => [r.id, r]));

    const q = String(params.search || '')
      .trim()
      .toLowerCase();
    const rows = profiles
      .map((p: any) => {
        const ledger = ledgerMap.get(p.customerId) as any;
        const master = masters.get(p.customerId) as any;
        const record = ledger ? this.compose(ledger, master, groups, categories) : ({} as any);
        return {
          id: p.customerId,
          name: master?.name || record.name || ledger?.partyId || p.customerId,
          code: master?.customerCode || p.customerCode || null,
          mobile: master?.mobile || record.mobile || null,
          gstin: master?.gstin || record.gstin || null,
          status: master?.status || record.status || 'active',
          creditLimit: num(p.creditLimit),
          outstanding: num(p.outstanding),
          overdueAmount: num(p.overdueAmount),
          advanceBalance: num(p.advanceBalance),
          availableCredit: num(p.availableCredit),
          isBlocked: Boolean(p.isBlocked),
          lastPaymentDate: p.lastPaymentDate || null,
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
        totalOutstanding:
          Math.round(rows.reduce((s: number, r: any) => s + r.outstanding, 0) * 100) / 100,
        totalOverdue:
          Math.round(rows.reduce((s: number, r: any) => s + r.overdueAmount, 0) * 100) / 100,
        totalAdvance:
          Math.round(rows.reduce((s: number, r: any) => s + r.advanceBalance, 0) * 100) / 100,
        customers: total,
      },
    };
  }

  /** Customer 360° ledger — delegates to the existing reports engine. */
  async getLedger(customerId: string): Promise<any> {
    if (this.reportsService) {
      return this.reportsService.getCustomerLedgerDetail(customerId);
    }
    throw new BadRequestException('Ledger service unavailable');
  }

  // ═════════════════════════════════════════════════════════
  // EXPORT / IMPORT
  // ═════════════════════════════════════════════════════════

  private async fetchAllCustomers(): Promise<any[]> {
    const { masters, groups, categories } = await this.loadMasterContext([]);
    const pageSize = 500;
    const all: any[] = [];
    let page = 1;
    for (;;) {
      const res = await this.database.ledgerMaster.findAll({
        page,
        pageSize,
        filters: [{ field: 'ledgerType', operator: 'eq', value: 'customer' }],
      } as any);
      const rows = res?.data || [];
      all.push(
        ...rows.map((r: any) => this.compose(r, masters.get(r.id) || null, groups, categories)),
      );
      if (rows.length < pageSize) {
        break;
      }
      page += 1;
    }
    return all;
  }

  /** Build friendly export rows (flat, spreadsheet-friendly). */
  private toExportRows(customers: any[]): Record<string, unknown>[] {
    return customers.map((c) => ({
      'Customer Code': c.code ?? '',
      'Customer Name': c.name ?? '',
      'Firm Name': c.firmName ?? '',
      'Customer Type': c.customerType ?? '',
      'Customer Group': c.groupName ?? c.customerGroup ?? '',
      'Customer Category': c.categoryName ?? c.customerCategory ?? '',
      GSTIN: c.gstin ?? '',
      PAN: c.pan ?? '',
      Mobile: c.mobile ?? '',
      'Alternate Mobile': c.altMobile ?? '',
      WhatsApp: c.whatsapp ?? '',
      Email: c.email ?? '',
      Website: c.website ?? '',
      'Contact Person': c.contactPerson ?? '',
      Address: c.address ?? '',
      Village: c.village ?? '',
      Taluka: c.taluka ?? '',
      District: c.district ?? '',
      City: c.city ?? '',
      State: c.state ?? '',
      Pincode: c.pin ?? '',
      'Credit Limit': num(c.creditLimit),
      'Credit Days': num(c.creditDays),
      'Opening Balance': num(c.openingBalance),
      'Current Balance': num(c.currentBalance),
      Status: c.status ?? 'active',
      Remarks: c.remarks ?? '',
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

  /** GET /customers/export?format=csv|xlsx — downloadable file payload. */
  async exportCustomers(
    format = 'csv',
  ): Promise<{ fileName: string; buffer: Buffer; mime: string }> {
    const fmt = String(format).toLowerCase();
    if (!['csv', 'xlsx', 'json'].includes(fmt)) {
      throw new BadRequestException('Format must be csv, xlsx or json');
    }
    const rows = this.toExportRows(await this.fetchAllCustomers());
    const ts = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
    if (fmt === 'json') {
      return {
        fileName: `customers-${ts}.json`,
        buffer: Buffer.from(JSON.stringify(rows, null, 2), 'utf8'),
        mime: 'application/json',
      };
    }
    if (fmt === 'csv') {
      return {
        fileName: `customers-${ts}.csv`,
        buffer: this.buildCsv(rows),
        mime: 'text/csv; charset=utf-8',
      };
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map((h) => ({
      wch: Math.min(Math.max(h.length + 2, 12), 32),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return {
      fileName: `customers-${ts}.xlsx`,
      buffer: Buffer.from(buffer),
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  /**
   * POST /customers/import — Excel/CSV/JSON upload with duplicate detection.
   * mode 'insert' → skip duplicates; 'upsert' → update existing.
   * Duplicate keys: customer code / GSTIN / mobile (case-insensitive).
   */
  async importCustomers(
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
      entity: 'customers',
      mode: m,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number; message: string }[],
    };

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        const name = String(findRow(row, 'Customer Name', 'name') ?? '').trim();
        if (!name) {
          throw new Error('"Customer Name" is required');
        }
        const payload: Record<string, unknown> = {
          name,
          code: String(findRow(row, 'Customer Code', 'code') ?? '').trim() || undefined,
          firmName: String(findRow(row, 'Firm Name') ?? '').trim() || undefined,
          customerType: String(findRow(row, 'Customer Type') ?? '').trim() || undefined,
          customerGroup: String(findRow(row, 'Customer Group') ?? '').trim() || undefined,
          customerCategory: String(findRow(row, 'Customer Category') ?? '').trim() || undefined,
          gstin: String(findRow(row, 'GSTIN', 'gst') ?? '').trim() || undefined,
          pan: String(findRow(row, 'PAN') ?? '').trim() || undefined,
          mobile: String(findRow(row, 'Mobile') ?? '').trim() || undefined,
          altMobile: String(findRow(row, 'Alternate Mobile') ?? '').trim() || undefined,
          whatsapp: String(findRow(row, 'WhatsApp') ?? '').trim() || undefined,
          email: String(findRow(row, 'Email') ?? '').trim() || undefined,
          website: String(findRow(row, 'Website') ?? '').trim() || undefined,
          contactPerson: String(findRow(row, 'Contact Person') ?? '').trim() || undefined,
          address: String(findRow(row, 'Address') ?? '').trim() || undefined,
          village: String(findRow(row, 'Village') ?? '').trim() || undefined,
          taluka: String(findRow(row, 'Taluka') ?? '').trim() || undefined,
          district: String(findRow(row, 'District') ?? '').trim() || undefined,
          city: String(findRow(row, 'City') ?? '').trim() || undefined,
          state: String(findRow(row, 'State') ?? '').trim() || undefined,
          pin: String(findRow(row, 'Pincode', 'PIN') ?? '').trim() || undefined,
          creditLimit: num(findRow(row, 'Credit Limit')),
          creditDays: num(findRow(row, 'Credit Days')),
          openingBalance: num(findRow(row, 'Opening Balance')),
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
      `Import customers: +${result.imported} ~${result.updated} -${result.skipped} errors:${result.errors.length}`,
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
      const res = await this.database.customers
        .findAll({
          page: 1,
          pageSize: 1,
          filters: [{ field: 'customerCode', operator: 'eq', value: code }],
          fields: ['id'],
        } as any)
        .catch(() => ({ data: [] }));
      if (res?.data?.[0]) {
        return res.data[0].id;
      }
    }
    if (gstin) {
      const res = await this.database.customers
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
      // legacy notes scan
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
      const res = await this.database.customers
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
  // CHILD RESOURCES — ADDRESSES / CONTACTS / DOCUMENTS
  // ═════════════════════════════════════════════════════════

  private async assertCustomer(customerId: string): Promise<void> {
    const customer = await this.database.ledgerMaster.findById(customerId).catch(() => null);
    if (!customer) {
      throw new NotFoundException(`Customer with id "${customerId}" not found`);
    }
  }

  async listAddresses(customerId: string) {
    await this.assertCustomer(customerId);
    const res = await this.database.customerAddresses.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
      sortBy: 'createdAt',
      sortOrder: 'asc',
    } as any);
    return res?.data || [];
  }

  async createAddress(customerId: string, data: any, userId?: string) {
    await this.assertCustomer(customerId);
    const record = await this.database.customerAddresses.create({
      customerId,
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
      event: 'customer_address_added',
      action: 'address_add',
      entityId: customerId,
      newValues: data,
      details: { addressId: (record as any).id },
    });
    return record;
  }

  async updateAddress(customerId: string, addressId: string, data: any, userId?: string) {
    await this.assertCustomer(customerId);
    const existing = await this.database.customerAddresses.findById(addressId);
    if (!existing) {
      throw new NotFoundException('Address not found');
    }
    const record = await this.database.customerAddresses.update(
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
      event: 'customer_address_updated',
      action: 'address_update',
      entityId: customerId,
      oldValues: existing,
      newValues: data,
      details: { addressId },
    });
    return record;
  }

  async deleteAddress(customerId: string, addressId: string, userId?: string) {
    await this.assertCustomer(customerId);
    const existing = await this.database.customerAddresses.findById(addressId);
    if (!existing) {
      throw new NotFoundException('Address not found');
    }
    await this.database.customerAddresses.softDelete(addressId);
    await this.auditLog({
      userId,
      event: 'customer_address_deleted',
      action: 'address_delete',
      entityId: customerId,
      oldValues: existing,
      details: { addressId },
    });
    return { message: 'Address deleted' };
  }

  async listContacts(customerId: string) {
    await this.assertCustomer(customerId);
    const res = await this.database.customerContacts.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
      sortBy: 'createdAt',
      sortOrder: 'asc',
    } as any);
    return res?.data || [];
  }

  async createContact(customerId: string, data: any, userId?: string) {
    await this.assertCustomer(customerId);
    const record = await this.database.customerContacts.create({
      customerId,
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
      event: 'customer_contact_added',
      action: 'contact_add',
      entityId: customerId,
      newValues: data,
      details: { contactId: (record as any).id },
    });
    return record;
  }

  async updateContact(customerId: string, contactId: string, data: any, userId?: string) {
    await this.assertCustomer(customerId);
    const existing = await this.database.customerContacts.findById(contactId);
    if (!existing) {
      throw new NotFoundException('Contact not found');
    }
    const record = await this.database.customerContacts.update(
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
      event: 'customer_contact_updated',
      action: 'contact_update',
      entityId: customerId,
      oldValues: existing,
      newValues: data,
      details: { contactId },
    });
    return record;
  }

  async deleteContact(customerId: string, contactId: string, userId?: string) {
    await this.assertCustomer(customerId);
    const existing = await this.database.customerContacts.findById(contactId);
    if (!existing) {
      throw new NotFoundException('Contact not found');
    }
    await this.database.customerContacts.softDelete(contactId);
    await this.auditLog({
      userId,
      event: 'customer_contact_deleted',
      action: 'contact_delete',
      entityId: customerId,
      oldValues: existing,
      details: { contactId },
    });
    return { message: 'Contact deleted' };
  }

  async listDocuments(customerId: string) {
    await this.assertCustomer(customerId);
    const res = await this.database.customerDocuments.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
      sortBy: 'createdAt',
      sortOrder: 'desc',
    } as any);
    return res?.data || [];
  }

  async createDocument(customerId: string, data: any, userId?: string) {
    await this.assertCustomer(customerId);
    const record = await this.database.customerDocuments.create({
      customerId,
      docType: data.docType || 'other',
      fileName: data.fileName,
      fileUrl: data.fileUrl || null,
      fileSize: num(data.fileSize),
      mimeType: data.mimeType || null,
      uploadedBy: userId,
      notes: data.notes || null,
      createdBy: userId,
      updatedBy: userId,
    });
    await this.auditLog({
      userId,
      event: 'customer_document_added',
      action: 'document_add',
      entityId: customerId,
      newValues: data,
      details: { documentId: (record as any).id },
    });
    return record;
  }

  async deleteDocument(customerId: string, documentId: string, userId?: string) {
    await this.assertCustomer(customerId);
    const existing = await this.database.customerDocuments.findById(documentId);
    if (!existing) {
      throw new NotFoundException('Document not found');
    }
    await this.database.customerDocuments.softDelete(documentId);
    await this.auditLog({
      userId,
      event: 'customer_document_deleted',
      action: 'document_delete',
      entityId: customerId,
      oldValues: existing,
      details: { documentId },
    });
    return { message: 'Document deleted' };
  }

  // ═════════════════════════════════════════════════════════
  // REFERENCE — GROUPS / CATEGORIES
  // ═════════════════════════════════════════════════════════

  async listGroups() {
    const res = await this.database.customerGroups.findAll({
      page: 1,
      pageSize: 1000,
      sortBy: 'sortOrder',
      sortOrder: 'asc',
    } as any);
    return res?.data || [];
  }

  async createGroup(data: any, userId?: string) {
    const name = String(data.name || '').trim();
    if (!name) {
      throw new BadRequestException('Group name is required');
    }
    const dup = await this.database.customerGroups.findAll({
      page: 1,
      pageSize: 1,
      filters: [{ field: 'name', operator: 'eq', value: name }],
      fields: ['id'],
    } as any);
    if (dup?.data?.[0]) {
      throw new BadRequestException(`Group "${name}" already exists`);
    }
    const record = await this.database.customerGroups.create({
      name,
      description: data.description || null,
      isSystem: false,
      sortOrder: num(data.sortOrder),
      isActive: data.isActive !== false,
      createdBy: userId,
      updatedBy: userId,
    });
    await this.auditLog({
      userId,
      event: 'customer_group_created',
      action: 'create',
      entityId: (record as any).id,
      newValues: data,
      details: { name },
    });
    return record;
  }

  async updateGroup(id: string, data: any, userId?: string) {
    const existing = await this.database.customerGroups.findById(id);
    if (!existing) {
      throw new NotFoundException('Group not found');
    }
    const record = await this.database.customerGroups.update(
      id,
      compact({
        name: data.name,
        description: data.description,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        updatedBy: userId,
      }),
    );
    await this.auditLog({
      userId,
      event: 'customer_group_updated',
      action: 'update',
      entityId: id,
      oldValues: existing,
      newValues: data,
    });
    return record;
  }

  async deleteGroup(id: string, userId?: string) {
    const existing = await this.database.customerGroups.findById(id);
    if (!existing) {
      throw new NotFoundException('Group not found');
    }
    if (existing.isSystem) {
      throw new BadRequestException('System groups cannot be deleted');
    }
    await this.database.customerGroups.softDelete(id);
    await this.auditLog({
      userId,
      event: 'customer_group_deleted',
      action: 'delete',
      entityId: id,
      oldValues: existing,
      details: { name: existing.name },
    });
    return { message: 'Group deleted' };
  }

  async listCategories() {
    const res = await this.database.customerCategories.findAll({
      page: 1,
      pageSize: 1000,
      sortBy: 'priority',
      sortOrder: 'asc',
    } as any);
    return res?.data || [];
  }

  async createCategory(data: any, userId?: string) {
    const name = String(data.name || '').trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }
    const dup = await this.database.customerCategories.findAll({
      page: 1,
      pageSize: 1,
      filters: [{ field: 'name', operator: 'eq', value: name }],
      fields: ['id'],
    } as any);
    if (dup?.data?.[0]) {
      throw new BadRequestException(`Category "${name}" already exists`);
    }
    const record = await this.database.customerCategories.create({
      name,
      description: data.description || null,
      priority: num(data.priority),
      isActive: data.isActive !== false,
      createdBy: userId,
      updatedBy: userId,
    });
    await this.auditLog({
      userId,
      event: 'customer_category_created',
      action: 'create',
      entityId: (record as any).id,
      newValues: data,
      details: { name },
    });
    return record;
  }

  async updateCategory(id: string, data: any, userId?: string) {
    const existing = await this.database.customerCategories.findById(id);
    if (!existing) {
      throw new NotFoundException('Category not found');
    }
    const record = await this.database.customerCategories.update(
      id,
      compact({
        name: data.name,
        description: data.description,
        priority: data.priority,
        isActive: data.isActive,
        updatedBy: userId,
      }),
    );
    await this.auditLog({
      userId,
      event: 'customer_category_updated',
      action: 'update',
      entityId: id,
      oldValues: existing,
      newValues: data,
    });
    return record;
  }

  async deleteCategory(id: string, userId?: string) {
    const existing = await this.database.customerCategories.findById(id);
    if (!existing) {
      throw new NotFoundException('Category not found');
    }
    await this.database.customerCategories.softDelete(id);
    await this.auditLog({
      userId,
      event: 'customer_category_deleted',
      action: 'delete',
      entityId: id,
      oldValues: existing,
      details: { name: existing.name },
    });
    return { message: 'Category deleted' };
  }
}
