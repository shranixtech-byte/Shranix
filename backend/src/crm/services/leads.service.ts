import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';
import { CustomersService } from '../../sales/customers.service';

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'interested',
  'quotation_sent',
  'negotiation',
  'won',
  'lost',
  'converted',
] as const;

export const LEAD_SOURCES = [
  'website',
  'instagram',
  'facebook',
  'whatsapp',
  'phone_call',
  'walk-in',
  'referral',
  'existing_customer',
  'advertisement',
  'dealer_reference',
  'other',
] as const;

export const LEAD_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

// Configurable-ish scoring weights (source → base points)
const SOURCE_SCORE: Record<string, number> = {
  referral: 20,
  existing_customer: 25,
  dealer_reference: 15,
  website: 10,
  instagram: 8,
  facebook: 8,
  whatsapp: 12,
  phone_call: 12,
  walk_in: 15,
  advertisement: 5,
  other: 5,
};

interface LeadQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  source?: string;
  salesperson?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class LeadsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly customers: CustomersService,
  ) {}

  // ═════════════════════════════════════════════════════════
  // Numbering
  // ═════════════════════════════════════════════════════════

  async nextLeadNumber(): Promise<string> {
    let max = 0;
    try {
      const maxVal = await this.database.leads.maxFieldValue('leadNumber');
      if (maxVal) {
        const m = /^L-(\d+)$/.exec(String(maxVal));
        if (m) {
          max = Number(m[1]);
        }
      }
    } catch {
      /* best-effort */
    }
    return `L-${String(max + 1).padStart(4, '0')}`;
  }

  // ═════════════════════════════════════════════════════════
  // Scoring (configurable weights — factors: source, value, type, engagement)
  // ═════════════════════════════════════════════════════════

  private scoreFactors(lead: any, engagementCount: number): { score: number; level: string } {
    let score = SOURCE_SCORE[lead.source] ?? 5;
    // Expected value band
    const value = Number(lead.expectedValue) || 0;
    if (value >= 500000) {
      score += 30;
    } else if (value >= 100000) {
      score += 20;
    } else if (value >= 25000) {
      score += 10;
    } else if (value > 0) {
      score += 5;
    }
    // Business leads score higher
    if (lead.leadType === 'business') {
      score += 10;
    }
    // Engagement
    score += Math.min(engagementCount * 3, 15);
    // Priority
    if (lead.priority === 'high' || lead.priority === 'urgent') {
      score += 10;
    }

    const level = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
    return { score: Math.min(score, 100), level };
  }

  private async recomputeScore(id: string): Promise<void> {
    const lead = await this.database.leads.findById(id).catch(() => null);
    if (!lead) {
      return;
    }
    const activities = await this.database.leadActivities
      .findAll({
        page: 1,
        pageSize: 500,
        filters: [{ field: 'leadId', operator: 'eq', value: id }],
      } as any)
      .catch(() => ({ total: 0, data: [] }));
    // Engagement = real interactions only; exclude the auto-created 'lead.created' event
    const engagement = (activities.data || []).filter(
      (a: any) => a.activityType && a.activityType !== 'lead.created',
    ).length;
    const { score, level } = this.scoreFactors(lead, engagement);
    await this.database.leads
      .update(id, { score, scoreLevel: level } as any)
      .catch(() => undefined);
  }

  // ═════════════════════════════════════════════════════════
  // CRUD
  // ═════════════════════════════════════════════════════════

  async create(data: any, userId: string) {
    const leadNumber = data.leadNumber || (await this.nextLeadNumber());
    const clean = {
      ...data,
      id: undefined,
      leadNumber,
      status: data.status || 'new',
      priority: data.priority || 'medium',
      score: 0,
      scoreLevel: 'low',
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };
    if (clean.assignedTo) {
      clean.assignedBy = clean.assignedBy || userId;
      clean.assignedAt = new Date().toISOString();
    }
    const lead = await this.database.leads.create(clean as any);
    await this.database.leadActivities
      .create({
        leadId: lead.id,
        activityType: 'lead.created',
        title: `Lead ${leadNumber} created`,
        description: data.leadName || data.companyName || '',
        userId,
        happenedAt: new Date().toISOString(),
        createdBy: userId,
      } as any)
      .catch(() => undefined);
    await this.audit.log({
      userId,
      event: 'lead.created',
      resource: 'leads',
      action: 'create',
      details: { leadId: lead.id, leadNumber },
    });
    // Score on create (was previously only recomputed on update → new leads stayed at 0)
    await this.recomputeScore(lead.id);
    return (await this.database.leads.findById(lead.id)) ?? lead;
  }

  async findAll(query: LeadQuery) {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.source) {
      filters.push({ field: 'source', operator: 'eq', value: query.source });
    }
    if (query.salesperson) {
      filters.push({ field: 'assignedTo', operator: 'eq', value: query.salesperson });
    }
    if (query.priority) {
      filters.push({ field: 'priority', operator: 'eq', value: query.priority });
    }
    if (query.dateFrom) {
      filters.push({ field: 'createdAt', operator: 'gte', value: query.dateFrom });
    }
    if (query.dateTo) {
      filters.push({ field: 'createdAt', operator: 'lte', value: query.dateTo });
    }

    const result = await this.database.leads.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(query.search
        ? {
            search: query.search,
            searchFields: ['leadNumber', 'leadName', 'companyName', 'mobile', 'whatsapp', 'email'],
          }
        : {}),
      ...(filters.length ? { filters } : {}),
    } as any);
    return result;
  }

  async findById(id: string) {
    const lead = await this.database.leads.findById(id);
    if (!lead || lead.isDeleted) {
      throw new NotFoundException('Lead not found');
    }

    const [activities, followUps, tasks, notes, opportunities] = await Promise.all([
      this.database.leadActivities
        .findAll({
          page: 1,
          pageSize: 100,
          filters: [{ field: 'leadId', operator: 'eq', value: id }],
        } as any)
        .catch(() => ({ data: [], total: 0 })),
      this.database.followUps
        .findAll({
          page: 1,
          pageSize: 50,
          filters: [{ field: 'leadId', operator: 'eq', value: id }],
        } as any)
        .catch(() => ({ data: [], total: 0 })),
      this.database.crmTasks
        .findAll({
          page: 1,
          pageSize: 50,
          filters: [{ field: 'leadId', operator: 'eq', value: id }],
        } as any)
        .catch(() => ({ data: [], total: 0 })),
      this.database.crmNotes
        .findAll({
          page: 1,
          pageSize: 50,
          filters: [{ field: 'leadId', operator: 'eq', value: id }],
        } as any)
        .catch(() => ({ data: [], total: 0 })),
      this.database.opportunities
        .findAll({
          page: 1,
          pageSize: 20,
          filters: [{ field: 'leadId', operator: 'eq', value: id }],
        } as any)
        .catch(() => ({ data: [], total: 0 })),
    ]);

    return {
      ...lead,
      activities: activities.data || [],
      followUps: followUps.data || [],
      tasks: tasks.data || [],
      notes: notes.data || [],
      opportunities: opportunities.data || [],
    };
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.database.leads.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Lead not found');
    }

    const changed = { ...data };
    // Status transition logging
    if (changed.status && changed.status !== existing.status) {
      await this.database.leadActivities
        .create({
          leadId: id,
          activityType: 'lead.status_changed',
          title: `Status changed to ${changed.status}`,
          description: `from ${existing.status}`,
          userId,
          happenedAt: new Date().toISOString(),
          createdBy: userId,
        } as any)
        .catch(() => undefined);
      if (changed.status === 'won') {
        changed.wonDate = changed.wonDate || new Date().toISOString();
        changed.wonValue = changed.wonValue ?? existing.expectedValue ?? 0;
      }
      if (changed.status === 'lost') {
        changed.lostReason = changed.lostReason || data.lostReason || '';
      }
    }
    // Assignment change logging
    if (changed.assignedTo && changed.assignedTo !== existing.assignedTo) {
      changed.assignedBy = userId;
      changed.assignedAt = new Date().toISOString();
      await this.database.leadActivities
        .create({
          leadId: id,
          activityType: 'lead.assigned',
          title: 'Lead reassigned',
          description: `assigned to ${changed.assignedTo}`,
          userId,
          happenedAt: new Date().toISOString(),
          createdBy: userId,
        } as any)
        .catch(() => undefined);
      await this.audit.log({
        userId,
        event: 'lead.assigned',
        resource: 'leads',
        action: 'assign',
        details: { leadId: id, assignedTo: changed.assignedTo },
      });
    }

    const updated = await this.database.leads.update(id, { ...changed, updatedBy: userId } as any);
    await this.recomputeScore(id);
    await this.audit.log({
      userId,
      event: 'lead.updated',
      resource: 'leads',
      action: 'update',
      details: { leadId: id },
    });
    return updated;
  }

  /** Explicit assignment endpoint with history. */
  async assign(id: string, userId: string, assignedTo: string) {
    if (!assignedTo) {
      throw new BadRequestException('assignedTo is required');
    }
    const existing = await this.database.leads.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Lead not found');
    }
    if (existing.assignedTo === assignedTo) {
      return existing;
    }
    return this.update(id, { assignedTo }, userId);
  }

  async softDelete(id: string, userId: string) {
    const existing = await this.database.leads.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Lead not found');
    }
    await this.database.leads.softDelete(id);
    await this.audit.log({
      userId,
      event: 'lead.deleted',
      resource: 'leads',
      action: 'delete',
      details: { leadId: id },
    });
  }

  // ═════════════════════════════════════════════════════════
  // Conversion — transaction-safe, duplicate-customer safe
  // ═════════════════════════════════════════════════════════

  /**
   * Search existing customers for duplicate matches (mobile / gstin / email / name).
   * Customers live in ledger_master (ledgerType=customer) with extras in notes JSON.
   */
  async findDuplicateCustomers(lead: any): Promise<any[]> {
    const customers = await this.database.ledgerMaster
      .findAll({
        page: 1,
        pageSize: 5000,
        filters: [{ field: 'ledgerType', operator: 'eq', value: 'customer' }],
      } as any)
      .catch(() => ({ data: [] }));
    const norm = (s: any) =>
      String(s || '')
        .replace(/[\s-]/g, '')
        .toLowerCase();
    const leadMobile = norm(lead.mobile);
    const leadGstin = norm(lead.gstin);
    const leadEmail = norm(lead.email);
    const leadName = norm(lead.companyName || lead.leadName || lead.contactPerson);

    const matches: any[] = [];
    for (const c of customers.data || []) {
      let notes: any = {};
      try {
        notes = JSON.parse(c.notes || '{}');
      } catch {
        /* ignore */
      }
      const score = [
        leadMobile && norm(notes.mobile) === leadMobile ? 3 : 0,
        leadGstin && norm(notes.gstin) === leadGstin ? 3 : 0,
        leadEmail && norm(notes.email) === leadEmail ? 2 : 0,
        leadName && norm(c.partyId) === leadName ? 1 : 0,
      ].reduce((a, b) => a + b, 0);
      if (score >= 2) {
        matches.push({
          customerId: c.id,
          customerCode: c.accountId || '',
          name: c.partyId,
          mobile: notes.mobile,
          gstin: notes.gstin,
          matchScore: score,
        });
      }
    }
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  async convert(id: string, userId: string, matchCustomerId?: string) {
    const lead = await this.database.leads.findById(id);
    if (!lead || lead.isDeleted) {
      throw new NotFoundException('Lead not found');
    }
    if (lead.convertedToCustomer) {
      throw new BadRequestException('Lead is already converted');
    }

    let customerId: string;
    let customerCode = '';
    let method = 'new';
    let matchedCustomerId: string | null = null;
    let customerName = lead.companyName || lead.leadName || lead.contactPerson || lead.mobile || '';

    if (matchCustomerId) {
      // Convert to an explicitly selected existing customer
      const customer = await this.database.ledgerMaster.findById(matchCustomerId).catch(() => null);
      if (!customer || customer.ledgerType !== 'customer') {
        throw new BadRequestException('Selected customer does not exist');
      }
      customerId = customer.id;
      customerCode = customer.accountId || '';
      method = 'existing';
      matchedCustomerId = customer.id;
    } else {
      // Duplicate detection first — surface matches for selection
      const matches = await this.findDuplicateCustomers(lead);
      if (matches.length > 0) {
        return { matched: true, matches };
      }
      // Create a brand-new customer via the existing Customer Master service
      const name = customerName || 'New Customer';
      customerName = name;
      const customer = await this.customers.create(
        {
          name,
          mobile: lead.mobile || undefined,
          gstin: lead.gstin || undefined,
          email: lead.email || undefined,
          address: lead.address || undefined,
          city: lead.city || undefined,
          district: lead.district || undefined,
          state: lead.state || undefined,
          pin: lead.pincode || undefined,
          contactPerson: lead.contactPerson || undefined,
          firmName: lead.companyName || undefined,
          notes: `Converted from lead ${lead.leadNumber}`,
        },
        userId,
      );
      customerId = customer.id;
      customerCode = customer.accountId || customer.code || '';
      matchedCustomerId = null;
    }

    // Conversion record — unique leadId constraint prevents double conversion
    await this.database.leadConversions
      .create({
        leadId: id,
        customerId,
        customerCode,
        matchMethod: method,
        matchedCustomerId,
        convertedBy: userId,
        convertedAt: new Date().toISOString(),
        details: JSON.stringify({ leadNumber: lead.leadNumber, leadName: lead.leadName }),
      } as any)
      .catch(() => {
        throw new BadRequestException('Lead was already converted (duplicate conversion blocked)');
      });

    await this.database.leads.update(id, {
      status: 'converted',
      convertedToCustomer: true,
      convertedCustomerId: customerId,
      convertedAt: new Date().toISOString(),
      updatedBy: userId,
    } as any);

    await this.database.leadActivities
      .create({
        leadId: id,
        customerId,
        activityType: 'lead.converted',
        title: 'Lead converted to customer',
        description: `${customerName} (${method})`,
        referenceType: 'customer',
        referenceId: customerId,
        userId,
        happenedAt: new Date().toISOString(),
        createdBy: userId,
      } as any)
      .catch(() => undefined);

    await this.audit.log({
      userId,
      event: 'lead.converted',
      resource: 'leads',
      action: 'convert',
      details: { leadId: id, customerId, method },
    });

    return { converted: true, leadId: id, customerId, method, matched: method === 'existing' };
  }
}
