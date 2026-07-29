import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class OpportunitiesService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(data: any, userId: string) {
    const opp = await this.database.opportunities.create({ ...data, id: crypto.randomUUID(), stage: 'prospecting', createdAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'opportunity.created', resource: 'opportunities', action: 'create', details: { opportunityId: opp.id } });
    return opp;
  }

  async findAll(params: { page: number; pageSize: number; stage?: string }) { return this.database.opportunities.findAll(params); }
  async findById(id: string) { return this.database.opportunities.findById(id); }

  async update(id: string, data: any, userId: string) {
    const updated = await this.database.opportunities.update(id, data);
    await this.audit.log({ userId, event: 'opportunity.updated', resource: 'opportunities', action: 'update', details: { opportunityId: id } });
    return updated;
  }

  async softDelete(id: string, userId: string) {
    await this.database.opportunities.softDelete(id);
    await this.audit.log({ userId, event: 'opportunity.deleted', resource: 'opportunities', action: 'delete', details: { opportunityId: id } });
  }

  async updateStage(id: string, stage: string, userId: string) {
    await this.database.opportunities.update(id, { stage });
    await this.audit.log({ userId, event: 'opportunity.stage_changed', resource: 'opportunities', action: 'update_stage', details: { opportunityId: id, newStage: stage } });
    return { updated: true, id, stage };
  }
}
