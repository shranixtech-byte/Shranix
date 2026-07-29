import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class LeadsService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(data: any, userId: string) {
    const lead = await this.database.leads.create({ ...data, id: crypto.randomUUID(), status: 'new', createdAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'lead.created', resource: 'leads', action: 'create', details: { leadId: lead.id } });
    return lead;
  }

  async findAll(params: { page: number; pageSize: number; search?: string; status?: string }) { return this.database.leads.findAll(params); }
  async findById(id: string) { return this.database.leads.findById(id); }

  async update(id: string, data: any, userId: string) {
    const updated = await this.database.leads.update(id, data);
    await this.audit.log({ userId, event: 'lead.updated', resource: 'leads', action: 'update', details: { leadId: id } });
    return updated;
  }

  async softDelete(id: string, userId: string) {
    await this.database.leads.softDelete(id);
    await this.audit.log({ userId, event: 'lead.deleted', resource: 'leads', action: 'delete', details: { leadId: id } });
  }

  async convertToCustomer(leadId: string, userId: string) {
    await this.database.leads.update(leadId, { status: 'converted', convertedToCustomer: true, convertedAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'lead.converted', resource: 'leads', action: 'convert', details: { leadId } });
    return { converted: true, leadId };
  }
}
