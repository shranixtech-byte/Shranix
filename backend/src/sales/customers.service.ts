import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

import { SalesCreditEngineService } from './credit-engine.service';

// GSTIN: 2-digit state + 10-char PAN + entity code + Z + checksum (uppercase)
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
// PAN: 5 letters + 4 digits + 1 letter (uppercase)
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// Extra customer fields stored as JSON inside the ledger master notes column.
// These are NOT DB columns on shranix_ledger_master — they round-trip via notes.
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
];

@Injectable()
export class CustomersService {
  protected readonly logger = new Logger('CustomersService');

  constructor(
    protected readonly database: DatabaseService,
    protected readonly audit?: AuditService,
    private readonly creditEngine?: SalesCreditEngineService,
  ) {}

  /**
   * Store extra customer fields (gstin, pan, contactPerson, mobile, email,
   * address, city, state, pin, code, remarks, status, group, price list,
   * payment terms, loyalty points) as JSON in the notes field.
   */
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

  /** GSTIN/PAN format validation — active only when the matching setting is ON. */
  private async assertTaxValidation(data: any, settings?: any): Promise<void> {
    const cfg = settings || (await this.loadSettings());
    const gstin = String(data.gstin || '').trim();
    const pan = String(data.pan || '').trim();
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
    // GSTIN/PAN lowercase input → uppercase store (validation already accepts it)
    if (enriched.gstin) {
      enriched.gstin = String(enriched.gstin).trim().toUpperCase();
    }
    if (enriched.pan) {
      enriched.pan = String(enriched.pan).trim().toUpperCase();
    }
    return enriched;
  }

  /** Parse JSON notes back into the record */
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
    // Map status from isActive
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
   * Search customers by field — name (default), mobile, gstin or code.
   * Mobile/GSTIN/code live in the `notes` JSON payload, so those searches use a
   * JSON-substring LIKE on notes; name searches the party_id column.
   */
  async findAll(page = 1, pageSize = 50, search?: string, searchField?: string) {
    const q = String(search || '').trim();
    const filters: any[] = [{ field: 'ledgerType', operator: 'eq', value: 'customer' }];
    if (q) {
      const field = searchField || 'name';
      if (field === 'mobile' || field === 'gstin' || field === 'code') {
        // notes JSON: {"code":"...","gstin":"...","mobile":"...",...}
        filters.push({ field: 'notes', operator: 'like', value: `%"${field}":"${q}` });
      } else {
        filters.push({ field: 'partyId', operator: 'like', value: `%${q}%` });
      }
    }
    const result = await this.database.ledgerMaster.findAll({
      page,
      pageSize,
      filters,
    } as any);
    return {
      ...result,
      data: (result.data || []).map((r: any) => this.unpackNotes(r)),
    };
  }

  async findById(id: string) {
    const record = await this.database.ledgerMaster.findById(id);
    if (!record) {
      throw new NotFoundException(`Customer with id "${id}" not found`);
    }
    return this.unpackNotes(record);
  }

  async create(data: any, userId?: string) {
    const settings = await this.loadSettings();
    await this.assertTaxValidation(data, settings);
    const enriched = this.applyDefaults(data, settings);
    const notes = this.packNotes(enriched);
    const record = await this.database.ledgerMaster.create({
      accountId: enriched.code || `CUST-${Date.now()}`,
      ledgerType: 'customer',
      partyId: enriched.name || enriched.code || 'Customer',
      creditLimit: Number(enriched.creditLimit) || 0,
      creditDays: Number(enriched.creditDays) || 0,
      isActive: enriched.status !== 'inactive' && enriched.status !== 'blocked',
      notes,
      openingBalance: 0,
      openingBalanceType: 'debit',
      currentBalance: 0,
      createdBy: userId,
    });

    // Create/refresh the credit profile so credit limit shows immediately.
    // Non-fatal: profile failure should never fail customer creation.
    if (this.creditEngine) {
      try {
        await this.creditEngine.upsertProfile(record.id, {
          customerName: enriched.name || enriched.code || 'Customer',
          customerCode: enriched.code || '',
          creditLimit: Number(enriched.creditLimit) || 0,
          creditDays: Number(enriched.creditDays) || 0,
        });
      } catch (err) {
        this.logger.warn(
          `Credit profile not created for customer ${record.id}: ${(err as Error).message}`,
        );
      }
    }

    if (this.audit && userId) {
      await this.audit.log({
        userId,
        event: 'customer_created' as any,
        resource: 'customer',
        action: 'create',
        entityId: record.id,
        module: 'Sales',
        actionType: 'create',
        oldValues: null,
        newValues: enriched,
        details: { id: record.id, name: enriched.name || enriched.code },
      });
    }
    this.logger.log(`Customer created: ${record.id}`);
    return this.unpackNotes(record);
  }

  async update(id: string, data: any, userId?: string) {
    await this.assertTaxValidation(data);
    const existing = await this.database.ledgerMaster.findById(id);
    if (!existing) {
      throw new NotFoundException(`Customer with id "${id}" not found`);
    }

    // Merge existing notes with new data
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

    const updateData: Record<string, any> = {
      notes: JSON.stringify(mergedExtras),
      updatedAt: new Date().toISOString(),
    };
    if (userId) {
      updateData.updatedBy = userId;
    }
    if (data.creditLimit !== undefined) {
      updateData.creditLimit = Number(data.creditLimit);
    }
    if (data.creditDays !== undefined) {
      updateData.creditDays = Number(data.creditDays);
    }
    if (data.status !== undefined) {
      updateData.isActive = data.status !== 'inactive' && data.status !== 'blocked';
    }
    if (data.name !== undefined) {
      updateData.partyId = data.name;
    }
    if (data.code !== undefined) {
      updateData.accountId = data.code;
    }

    const record = await this.database.ledgerMaster.update(id, updateData);
    if (this.audit && userId) {
      await this.audit.log({
        userId,
        event: 'customer_updated' as any,
        resource: 'customer',
        action: 'update',
        entityId: id,
        module: 'Sales',
        actionType: 'update',
        oldValues: this.unpackNotes(existing),
        newValues: data,
        details: { id, changes: Object.keys(data) },
      });
    }
    this.logger.log(`Customer updated: ${id}`);
    return this.unpackNotes(record);
  }

  async delete(id: string, userId?: string) {
    const existing = await this.database.ledgerMaster.findById(id);
    if (!existing) {
      throw new NotFoundException(`Customer with id "${id}" not found`);
    }
    await this.database.ledgerMaster.softDelete(id);
    if (this.audit && userId) {
      await this.audit.log({
        userId,
        event: 'customer_deleted' as any,
        resource: 'customer',
        action: 'delete',
        entityId: id,
        module: 'Sales',
        actionType: 'delete',
        oldValues: this.unpackNotes(existing),
        newValues: null,
        details: { id },
      });
    }
    return { message: 'Customer deleted successfully' };
  }

  async restore(id: string, userId?: string) {
    await this.database.ledgerMaster.restore(id);
    if (this.audit && userId) {
      await this.audit.log({
        userId,
        event: 'customer_restored' as any,
        resource: 'customer',
        action: 'restore',
        entityId: id,
        module: 'Sales',
        actionType: 'restore',
        oldValues: { deletedAt: new Date().toISOString(), isDeleted: true },
        newValues: { deletedAt: null, isDeleted: false },
        details: { id },
      });
    }
    return { message: 'Customer restored successfully' };
  }
}
