import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class LegalHoldsService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(data: any, userId: string) {
    const item = await this.database.legalHolds.create({ ...data, id: crypto.randomUUID(), status: 'active', createdAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'legal_hold.created', resource: 'legal_holds', action: 'create', details: { holdId: item.id } });
    return item;
  }
  async findAll(params: any) { return this.database.legalHolds.findAll(params); }
  async findById(id: string) { return this.database.legalHolds.findById(id); }
  async update(id: string, data: any, userId: string) {
    const u = await this.database.legalHolds.update(id, data);
    await this.audit.log({ userId, event: 'legal_hold.updated', resource: 'legal_holds', action: 'update', details: { holdId: id } });
    return u;
  }
  async delete(id: string) { await this.database.legalHolds.softDelete(id); }
}
