import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

export const OPPORTUNITY_STAGES = [
  'lead',
  'contacted',
  'qualified',
  'interested',
  'quotation',
  'negotiation',
  'won',
  'lost',
] as const;

export const OPPORTUNITY_STATUSES = ['open', 'won', 'lost'] as const;

// Typical stage probability for weighted pipeline value (configurable default)
const STAGE_PROBABILITY: Record<string, number> = {
  lead: 10,
  contacted: 20,
  qualified: 35,
  interested: 50,
  quotation: 65,
  negotiation: 80,
  won: 100,
  lost: 0,
};

interface OpportunityQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  stage?: string;
  status?: string;
  salesperson?: string;
}

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async nextOpportunityNumber(): Promise<string> {
    const res = await this.database.opportunities
      .findAll({ page: 1, pageSize: 5000 } as any)
      .catch(() => ({ data: [] }));
    let max = 0;
    for (const o of res.data || []) {
      const m = /^OPP-(\d+)$/.exec(String(o.opportunityNumber || ''));
      if (m) {
        max = Math.max(max, Number(m[1]));
      }
    }
    return `OPP-${String(max + 1).padStart(4, '0')}`;
  }

  /** Weighted value = estimatedValue × stage probability. */
  private weighted(estimatedValue: number, stage: string): number {
    const prob = STAGE_PROBABILITY[stage] ?? 10;
    return Math.round((Number(estimatedValue) || 0) * prob) / 100;
  }

  private async logActivity(
    opp: any,
    type: string,
    title: string,
    userId: string,
    description?: string,
  ) {
    await this.database.leadActivities
      .create({
        leadId: opp.leadId || null,
        customerId: opp.customerId || null,
        activityType: type,
        title,
        description,
        referenceType: 'opportunity',
        referenceId: opp.id,
        userId,
        happenedAt: new Date().toISOString(),
        createdBy: userId,
      } as any)
      .catch(() => undefined);
  }

  async create(data: any, userId: string) {
    const opportunityNumber = data.opportunityNumber || (await this.nextOpportunityNumber());
    const stage = data.stage || 'lead';
    const clean = {
      ...data,
      id: undefined,
      opportunityNumber,
      stage,
      status: data.status || 'open',
      estimatedValue: Number(data.estimatedValue) || 0,
      probability: Number(data.probability) || (STAGE_PROBABILITY[stage] ?? 10),
      weightedValue: this.weighted(data.estimatedValue, stage),
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };
    const opp = await this.database.opportunities.create(clean as any);
    await this.logActivity(
      opp,
      'opportunity.created',
      `Opportunity ${opportunityNumber} created`,
      userId,
      data.name,
    );
    await this.audit.log({
      userId,
      event: 'opportunity.created',
      resource: 'opportunities',
      action: 'create',
      details: { opportunityId: opp.id, opportunityNumber },
    });
    return opp;
  }

  async findAll(query: OpportunityQuery) {
    const filters: any[] = [];
    if (query.stage) {
      filters.push({ field: 'stage', operator: 'eq', value: query.stage });
    }
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.salesperson) {
      filters.push({ field: 'salespersonId', operator: 'eq', value: query.salesperson });
    }
    return this.database.opportunities.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(query.search
        ? { search: query.search, searchFields: ['name', 'opportunityNumber'] }
        : {}),
      ...(filters.length ? { filters } : {}),
    } as any);
  }

  async findById(id: string) {
    const opp = await this.database.opportunities.findById(id);
    if (!opp || opp.isDeleted) {
      throw new NotFoundException('Opportunity not found');
    }
    return opp;
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.database.opportunities.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Opportunity not found');
    }

    const changed: any = { ...data, updatedBy: userId };
    const stage = changed.stage || existing.stage;
    if (stage !== existing.stage) {
      changed.stage = stage;
      if (stage === 'won') {
        changed.status = 'won';
        changed.wonAt = new Date().toISOString();
        changed.wonValue = changed.wonValue ?? existing.estimatedValue ?? 0;
      }
      if (stage === 'lost') {
        changed.status = 'lost';
        changed.lostReason = changed.lostReason || existing.lostReason || '';
      }
      await this.logActivity(
        existing,
        'opportunity.stage_changed',
        `Stage → ${stage}`,
        userId,
        existing.name,
      );
    }
    changed.probability = changed.probability ?? STAGE_PROBABILITY[stage] ?? 10;
    changed.weightedValue = this.weighted(changed.estimatedValue ?? existing.estimatedValue, stage);

    const updated = await this.database.opportunities.update(id, changed as any);
    await this.audit.log({
      userId,
      event: 'opportunity.updated',
      resource: 'opportunities',
      action: 'update',
      details: { opportunityId: id, stage },
    });
    return updated;
  }

  async updateStage(id: string, stage: string, userId: string) {
    if (!OPPORTUNITY_STAGES.includes(stage as any)) {
      throw new BadRequestException(`Invalid stage: ${stage}`);
    }
    return this.update(id, { stage }, userId);
  }

  async softDelete(id: string, userId: string) {
    const existing = await this.database.opportunities.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Opportunity not found');
    }
    await this.database.opportunities.softDelete(id);
    await this.audit.log({
      userId,
      event: 'opportunity.deleted',
      resource: 'opportunities',
      action: 'delete',
      details: { opportunityId: id },
    });
  }
}
