import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CustomersService {
  protected readonly logger = new Logger('CustomersService');

  constructor(
    protected readonly database: DatabaseService,
    protected readonly audit?: AuditService,
  ) {}

  /**
   * Store extra customer fields (gstin, pan, contactPerson, mobile, email,
   * address, city, state, pin, code, remarks, status) as JSON in the notes field.
   */
  private packNotes(data: any): string {
    const payload: Record<string, any> = {};
    const extraFields = ['code','gstin','pan','contactPerson','mobile','email',
      'address','city','state','pin','status','remarks'];
    for (const f of extraFields) {
      if (data[f] !== undefined && data[f] !== null) {
        payload[f] = data[f];
      }
    }
    return JSON.stringify(payload);
  }

  /** Parse JSON notes back into the record */
  private unpackNotes(record: any): any {
    if (!record) return record;
    let extras: Record<string, any> = {};
    try {
      if (record.notes && typeof record.notes === 'string' && record.notes.startsWith('{')) {
        extras = JSON.parse(record.notes);
      }
    } catch { /* ignore parse errors */ }
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

  async findAll(page = 1, pageSize = 50, search?: string) {
    const result = await this.database.ledgerMaster.findAll({
      page,
      pageSize,
      search,
      filters: [{ field: 'ledgerType', operator: 'eq', value: 'customer' }],
    } as any);
    return {
      ...result,
      data: (result.data || []).map((r: any) => this.unpackNotes(r)),
    };
  }

  async findById(id: string) {
    const record = await this.database.ledgerMaster.findById(id);
    if (!record) throw new NotFoundException(`Customer with id "${id}" not found`);
    return this.unpackNotes(record);
  }

  async create(data: any, userId?: string) {
    const notes = this.packNotes(data);
    const record = await this.database.ledgerMaster.create({
      accountId: data.code || `CUST-${Date.now()}`,
      ledgerType: 'customer',
      partyId: data.name || data.code || 'Customer',
      creditLimit: Number(data.creditLimit) || 0,
      creditDays: Number(data.creditDays) || 0,
      isActive: data.status !== 'inactive' && data.status !== 'blocked',
      notes,
      openingBalance: 0,
      openingBalanceType: 'debit',
      currentBalance: 0,
      createdBy: userId,
    });
    if (this.audit && userId) {
      await this.audit.log({
        userId,
        event: 'customer_created' as any,
        resource: 'customer',
        action: 'create',
        details: { id: record.id, name: data.name || data.code },
      });
    }
    this.logger.log(`Customer created: ${record.id}`);
    return this.unpackNotes(record);
  }

  async update(id: string, data: any, userId?: string) {
    const existing = await this.database.ledgerMaster.findById(id);
    if (!existing) throw new NotFoundException(`Customer with id "${id}" not found`);

    // Merge existing notes with new data
    let existingExtras: Record<string, any> = {};
    try {
      if (existing.notes && typeof existing.notes === 'string' && existing.notes.startsWith('{')) {
        existingExtras = JSON.parse(existing.notes);
      }
    } catch { /* ignore */ }

    const mergedExtras = { ...existingExtras };
    const extraFields = ['code','gstin','pan','contactPerson','mobile','email',
      'address','city','state','pin','status','remarks'];
    for (const f of extraFields) {
      if (data[f] !== undefined) {
        mergedExtras[f] = data[f];
      }
    }

    const updateData: Record<string, any> = {
      notes: JSON.stringify(mergedExtras),
      updatedAt: new Date().toISOString(),
    };
    if (userId) updateData.updatedBy = userId;
    if (data.creditLimit !== undefined) updateData.creditLimit = Number(data.creditLimit);
    if (data.creditDays !== undefined) updateData.creditDays = Number(data.creditDays);
    if (data.status !== undefined) updateData.isActive = data.status !== 'inactive' && data.status !== 'blocked';
    if (data.name !== undefined) updateData.partyId = data.name;
    if (data.code !== undefined) updateData.accountId = data.code;

    const record = await this.database.ledgerMaster.update(id, updateData);
    if (this.audit && userId) {
      await this.audit.log({
        userId,
        event: 'customer_updated' as any,
        resource: 'customer',
        action: 'update',
        details: { id, changes: Object.keys(data) },
      });
    }
    this.logger.log(`Customer updated: ${id}`);
    return this.unpackNotes(record);
  }

  async delete(id: string, userId?: string) {
    const existing = await this.database.ledgerMaster.findById(id);
    if (!existing) throw new NotFoundException(`Customer with id "${id}" not found`);
    await this.database.ledgerMaster.softDelete(id);
    if (this.audit && userId) {
      await this.audit.log({
        userId,
        event: 'customer_deleted' as any,
        resource: 'customer',
        action: 'delete',
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
        details: { id },
      });
    }
    return { message: 'Customer restored successfully' };
  }
}
