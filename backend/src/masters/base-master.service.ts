import { Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { MasterDataRepository } from '@shranix/database';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditService } from '../common/services/audit.service';

/** Map an entity name to a business module for the audit trail grouping. */
function auditModuleFor(entityName: string): string {
  const name = entityName.toLowerCase();
  if (
    name.includes('purchase') ||
    name.includes('supplier') ||
    name.includes('grn') ||
    name.includes('requisition') ||
    name.includes('po')
  ) {
    return 'Purchases';
  }
  if (
    name.includes('item') ||
    name.includes('warehouse') ||
    name.includes('inventory') ||
    name.includes('stock') ||
    name.includes('batch') ||
    name.includes('serial')
  ) {
    return 'Inventory';
  }
  if (name.includes('sales') || name.includes('customer') || name.includes('invoice')) {
    return 'Sales';
  }
  if (name.includes('setting')) {
    return 'Settings';
  }
  if (name.includes('user') || name.includes('role') || name.includes('permission')) {
    return 'Security';
  }
  if (
    name.includes('company') ||
    name.includes('branch') ||
    name.includes('financial') ||
    name.includes('bank') ||
    name.includes('department')
  ) {
    return 'Company';
  }
  return 'Masters';
}

export class BaseMasterService {
  protected readonly logger: Logger;
  protected readonly auditModule: string;

  constructor(
    protected readonly repository: MasterDataRepository<any>,
    private readonly entityName: string,
    protected readonly audit?: AuditService,
    private readonly uniqueField?: string,
  ) {
    this.logger = new Logger(`${entityName}Service`);
    this.auditModule = auditModuleFor(entityName);
  }

  async findAll(page = 1, pageSize = 50, search?: string, isActive?: boolean) {
    return this.repository.findAll({ page, pageSize, search, isActive });
  }

  async findById(id: string) {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new NotFoundException(`${this.entityName} with id "${id}" not found`);
    }
    return record;
  }

  async create(data: any, userId?: string) {
    // Check unique field if configured
    if (this.uniqueField && data[this.uniqueField]) {
      const existing = await this.repository.findAll({
        filters: [{ field: this.uniqueField, operator: 'eq', value: data[this.uniqueField] }],
        page: 1,
        pageSize: 1,
      });
      if (existing.data.length > 0) {
        throw new ConflictException(
          `${this.entityName} with ${this.uniqueField} "${data[this.uniqueField]}" already exists`,
        );
      }
    }
    const record = await this.repository.create(data);
    if (this.audit && userId) {
      await this.audit.log({
        userId,
        event: `${this.entityName.toLowerCase()}_created` as any,
        resource: this.entityName.toLowerCase(),
        action: 'create',
        entityId: record.id,
        module: this.auditModule,
        actionType: 'create',
        oldValues: null,
        newValues: data,
        details: { id: record.id, name: data.name || data.code },
      });
    }
    this.logger.log(`${this.entityName} created: ${record.id}`);
    return record;
  }

  async update(id: string, data: any, userId?: string) {
    const before = await this.repository.findById(id);
    if (!before) {
      throw new NotFoundException(`${this.entityName} with id "${id}" not found`);
    }
    const record = await this.repository.update(id, data);
    if (this.audit && userId) {
      await this.audit.log({
        userId,
        event: `${this.entityName.toLowerCase()}_updated` as any,
        resource: this.entityName.toLowerCase(),
        action: 'update',
        entityId: id,
        module: this.auditModule,
        actionType: 'update',
        oldValues: before as Record<string, unknown>,
        newValues: data,
        details: { id, changes: Object.keys(data) },
      });
    }
    this.logger.log(`${this.entityName} updated: ${id}`);
    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`${this.entityName} with id "${id}" not found`);
    }
    await this.repository.softDelete(id);
    if (this.audit && userId) {
      await this.audit.log({
        userId,
        event: `${this.entityName.toLowerCase()}_deleted` as any,
        resource: this.entityName.toLowerCase(),
        action: 'delete',
        entityId: id,
        module: this.auditModule,
        actionType: 'delete',
        oldValues: existing as Record<string, unknown>,
        newValues: null,
        details: { id },
      });
    }
    this.logger.log(`${this.entityName} soft-deleted: ${id}`);
    return { message: `${this.entityName} deleted successfully` };
  }

  async restore(id: string, userId?: string) {
    // NOTE: no findById pre-fetch here — findById excludes soft-deleted rows
    // (the very records restore() is meant to bring back).
    await this.repository.restore(id);
    if (this.audit && userId) {
      await this.audit.log({
        userId,
        event: `${this.entityName.toLowerCase()}_restored` as any,
        resource: this.entityName.toLowerCase(),
        action: 'restore',
        entityId: id,
        module: this.auditModule,
        actionType: 'restore',
        oldValues: { deletedAt: new Date().toISOString(), isDeleted: true },
        newValues: { deletedAt: null, isDeleted: false },
        details: { id },
      });
    }
    this.logger.log(`${this.entityName} restored: ${id}`);
    return { message: `${this.entityName} restored successfully` };
  }
}
