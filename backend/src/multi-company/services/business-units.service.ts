import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class BusinessUnitsService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(data: any, userId: string) {
    const item = await this.database.businessUnits.create({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'business_unit.created', resource: 'business_units', action: 'create', details: { unitId: item.id } });
    return item;
  }
  async findAll(params: any) { return this.database.businessUnits.findAll(params); }
  async findById(id: string) { return this.database.businessUnits.findById(id); }
  async update(id: string, data: any, userId: string) {
    const u = await this.database.businessUnits.update(id, data);
    await this.audit.log({ userId, event: 'business_unit.updated', resource: 'business_units', action: 'update', details: { unitId: id } });
    return u;
  }
  async softDelete(id: string) { await this.database.businessUnits.softDelete(id); }
}
