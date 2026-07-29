import { Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { MasterDataRepository } from '@shranix/database';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditService } from '../common/services/audit.service';

export class BaseMasterService {
  protected readonly logger: Logger;

  constructor(
    protected readonly repository: MasterDataRepository<any>,
    private readonly entityName: string,
    protected readonly audit?: AuditService,
    private readonly uniqueField?: string,
  ) {
    this.logger = new Logger(`${entityName}Service`);
  }

  async findAll(page = 1, pageSize = 50, search?: string, isActive?: boolean) {
    return this.repository.findAll({ page, pageSize, search, isActive });
  }

  async findById(id: string) {
    const record = await this.repository.findById(id);
    if (!record) {throw new NotFoundException(`${this.entityName} with id "${id}" not found`);}
    return record;
  }

  async create(data: any, userId?: string) {
    // Check unique field if configured
    if (this.uniqueField && data[this.uniqueField]) {
      const existing = await this.repository.findAll({ search: data[this.uniqueField], page: 1, pageSize: 1 });
      if (existing.data.length > 0) {
        throw new ConflictException(`${this.entityName} with ${this.uniqueField} "${data[this.uniqueField]}" already exists`);
      }
    }
    const record = await this.repository.create(data);
    if (this.audit && userId) {
      await this.audit.log({ userId, event: `${this.entityName.toLowerCase()}_created` as any, resource: this.entityName.toLowerCase(), action: 'create', details: { id: record.id, name: data.name || data.code } });
    }
    this.logger.log(`${this.entityName} created: ${record.id}`);
    return record;
  }

  async update(id: string, data: any, userId?: string) {
    const record = await this.repository.update(id, data);
    if (!record) {throw new NotFoundException(`${this.entityName} with id "${id}" not found`);}
    if (this.audit && userId) {
      await this.audit.log({ userId, event: `${this.entityName.toLowerCase()}_updated` as any, resource: this.entityName.toLowerCase(), action: 'update', details: { id, changes: Object.keys(data) } });
    }
    this.logger.log(`${this.entityName} updated: ${id}`);
    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {throw new NotFoundException(`${this.entityName} with id "${id}" not found`);}
    await this.repository.softDelete(id);
    if (this.audit && userId) {
      await this.audit.log({ userId, event: `${this.entityName.toLowerCase()}_deleted` as any, resource: this.entityName.toLowerCase(), action: 'delete', details: { id } });
    }
    this.logger.log(`${this.entityName} soft-deleted: ${id}`);
    return { message: `${this.entityName} deleted successfully` };
  }

  async restore(id: string, userId?: string) {
    await this.repository.restore(id);
    if (this.audit && userId) {
      await this.audit.log({ userId, event: `${this.entityName.toLowerCase()}_restored` as any, resource: this.entityName.toLowerCase(), action: 'restore', details: { id } });
    }
    this.logger.log(`${this.entityName} restored: ${id}`);
    return { message: `${this.entityName} restored successfully` };
  }
}
