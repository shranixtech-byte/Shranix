import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

const STATUS_COLORS: Record<string, string> = {
  new: '#6366f1',
  contacted: '#06b6d4',
  qualified: '#8b5cf6',
  interested: '#f59e0b',
  quotation_sent: '#ec4899',
  negotiation: '#f97316',
  won: '#22c55e',
  lost: '#ef4444',
  converted: '#84cc16',
};

const DORMANT_STATUSES = ['won', 'lost', 'converted'];

@Injectable()
export class CrmDashboardService {
  constructor(private readonly database: DatabaseService) {}

  private monthKey(iso: string | undefined | null): string {
    return String(iso || '').slice(0, 7);
  }

  private monthLabel(key: string): string {
    const [y, m] = key.split('-');
    const names = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${names[Number(m) - 1]} ${y?.slice(2)}`;
  }

  private lastMonths(n: number): { key: string; label: string }[] {
    const out: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: this.monthLabel(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`),
      });
    }
    return out;
  }

  private num(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private round(v: number, d = 2): number {
    const m = 10 ** d;
    return Math.round(v * m) / m;
  }

  private async all(repo: any, pageSize = 5000, filters?: any[]): Promise<any[]> {
    try {
      const q: any = { page: 1, pageSize };
      if (filters?.length) {
        q.filters = filters;
      }
      const res = await repo.findAll(q);
      return res?.data || [];
    } catch {
      return [];
    }
  }

  // ═════════════════════════════════════════════════════════
  // DASHBOARD
  // ═════════════════════════════════════════════════════════

  async getDashboard() {
    const [leads, followUps, tasks, opportunities, users] = await Promise.all([
      this.all(this.database.leads),
      this.all(this.database.followUps),
      this.all(this.database.crmTasks),
      this.all(this.database.opportunities),
      this.all(this.database.users, 1000),
    ]);

    const activeLeads = leads.filter((l) => !DORMANT_STATUSES.includes(l.status));
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const converted = leads.filter((l) => l.status === 'converted' || l.convertedToCustomer).length;
    const won = leads.filter((l) => l.status === 'won').length;
    const lost = leads.filter((l) => l.status === 'lost').length;
    const newThisMonth = leads.filter((l) => this.monthKey(l.createdAt) === monthStart).length;

    const pipelineValue = activeLeads.reduce((s, l) => s + this.num(l.expectedValue), 0);
    const wonValue = leads
      .filter((l) => l.status === 'won')
      .reduce((s, l) => s + this.num(l.wonValue || l.expectedValue), 0);
    const oppWeighted = opportunities
      .filter((o) => o.status === 'open')
      .reduce((s, o) => s + this.num(o.weightedValue), 0);

    const nowIso = new Date().toISOString();
    const followUpsDue = followUps.filter(
      (f) => f.status === 'scheduled' && String(f.scheduledAt || '') >= nowIso.slice(0, 10),
    ).length;
    const overdueFollowUps = followUps.filter(
      (f) => f.status === 'scheduled' && String(f.scheduledAt || '') < nowIso.slice(0, 10),
    ).length;
    const openTasks = tasks.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

    const kpis = [
      { key: 'totalLeads', label: 'Total Leads', value: leads.length },
      { key: 'newLeads', label: 'New Leads (month)', value: newThisMonth },
      { key: 'activeLeads', label: 'Active Leads', value: activeLeads.length },
      { key: 'convertedLeads', label: 'Converted', value: converted },
      { key: 'wonLeads', label: 'Won', value: won },
      { key: 'lostLeads', label: 'Lost', value: lost },
      { key: 'followUpsDue', label: 'Follow-ups Due', value: followUpsDue },
      { key: 'overdueFollowUps', label: 'Overdue Follow-ups', value: overdueFollowUps },
      { key: 'openTasks', label: 'Open Tasks', value: openTasks },
      { key: 'pipelineValue', label: 'Pipeline Value', value: this.round(pipelineValue) },
      { key: 'wonValue', label: 'Won Value', value: this.round(wonValue) },
      {
        key: 'conversionRate',
        label: 'Conversion Rate',
        value: leads.length ? this.round((converted / leads.length) * 100, 1) : 0,
      },
    ];

    // Charts
    const months = this.lastMonths(12);
    const leadByMonth = new Map<string, number>();
    const convertedByMonth = new Map<string, number>();
    for (const l of leads) {
      const k = this.monthKey(l.createdAt);
      leadByMonth.set(k, (leadByMonth.get(k) || 0) + 1);
      if (l.status === 'converted' || l.status === 'won') {
        convertedByMonth.set(k, (convertedByMonth.get(k) || 0) + 1);
      }
    }
    const leadTrend = months.map((m) => ({
      label: m.label,
      Leads: leadByMonth.get(m.key) || 0,
      Converted: convertedByMonth.get(m.key) || 0,
    }));

    const sourceMap = new Map<string, number>();
    for (const l of leads) {
      sourceMap.set(l.source || 'other', (sourceMap.get(l.source || 'other') || 0) + 1);
    }
    const leadSource = Array.from(sourceMap.entries()).map(([name, value]) => ({ name, value }));

    const statusMap = new Map<string, number>();
    for (const l of leads) {
      statusMap.set(l.status, (statusMap.get(l.status) || 0) + 1);
    }
    const pipelineFunnel = Array.from(statusMap.entries()).map(([stage, count]) => ({
      stage,
      count,
      color: STATUS_COLORS[stage] || '#94a3b8',
    }));

    const personMap = new Map<string, number>();
    for (const l of leads) {
      if (l.assignedTo) {
        personMap.set(l.assignedTo, (personMap.get(l.assignedTo) || 0) + 1);
      }
    }
    const userMap = new Map(users.map((u) => [u.id, u.name || u.email || u.id]));
    const salespersonPerformance = Array.from(personMap.entries()).map(([id, count]) => ({
      salesperson: userMap.get(id) || id,
      leads: count,
    }));

    const wonVsLost = [
      { name: 'Won', value: won },
      { name: 'Lost', value: lost },
      { name: 'Converted', value: converted },
    ];

    return {
      kpis,
      charts: {
        leadTrend,
        leadSource,
        pipelineFunnel,
        wonVsLost,
        salespersonPerformance,
        conversionTrend: months.map((m) => ({
          label: m.label,
          Rate:
            (leadByMonth.get(m.key) || 0) > 0
              ? this.round(
                  ((convertedByMonth.get(m.key) || 0) / (leadByMonth.get(m.key) || 1)) * 100,
                  1,
                )
              : 0,
        })),
      },
      pipelineValue: {
        pipeline: this.round(pipelineValue),
        weightedOpportunities: this.round(oppWeighted),
      },
    };
  }

  // ═════════════════════════════════════════════════════════
  // REPORTS
  // ═════════════════════════════════════════════════════════

  async getReport(type: string, query: { page?: number; pageSize?: number; status?: string }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 50;
    const [leads, followUps, tasks, opportunities, users] = await Promise.all([
      this.all(this.database.leads),
      this.all(this.database.followUps),
      this.all(this.database.crmTasks),
      this.all(this.database.opportunities),
      this.all(this.database.users, 1000),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u.name || u.email || u.id]));

    const paginate = (rows: any[]) => {
      const start = (page - 1) * pageSize;
      return {
        data: rows.slice(start, start + pageSize),
        total: rows.length,
        page,
        pageSize,
        totalPages: Math.ceil(rows.length / pageSize),
      };
    };

    switch (type) {
      case 'lead-register': {
        const rows = leads
          .filter((l) => !query.status || l.status === query.status)
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
          .map((l) => ({
            leadNumber: l.leadNumber,
            leadName: l.leadName,
            companyName: l.companyName || '',
            mobile: l.mobile || '',
            source: l.source,
            status: l.status,
            priority: l.priority,
            salesperson: userMap.get(l.assignedTo) || l.assignedTo || '',
            expectedValue: this.round(l.expectedValue),
            createdAt: String(l.createdAt).slice(0, 10),
          }));
        return paginate(rows);
      }
      case 'lead-source': {
        const sourceMap = new Map<string, { count: number; value: number }>();
        for (const l of leads) {
          const s = sourceMap.get(l.source || 'other') || { count: 0, value: 0 };
          s.count += 1;
          s.value += this.num(l.expectedValue);
          sourceMap.set(l.source || 'other', s);
        }
        return paginate(
          Array.from(sourceMap.entries()).map(([source, v]) => ({
            source,
            count: v.count,
            value: this.round(v.value),
          })),
        );
      }
      case 'lead-conversion': {
        return paginate(
          leads.map((l) => ({
            leadNumber: l.leadNumber,
            leadName: l.leadName,
            status: l.status,
            convertedToCustomer: !!l.convertedToCustomer,
            convertedCustomerId: l.convertedCustomerId || '',
            convertedAt: l.convertedAt ? String(l.convertedAt).slice(0, 10) : '',
          })),
        );
      }
      case 'lead-status': {
        const statusMap = new Map<string, number>();
        for (const l of leads) {
          statusMap.set(l.status, (statusMap.get(l.status) || 0) + 1);
        }
        return paginate(
          Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
        );
      }
      case 'salesperson-performance': {
        const personMap = new Map<string, { leads: number; converted: number; value: number }>();
        for (const l of leads) {
          const key = l.assignedTo || 'unassigned';
          const cur = personMap.get(key) || { leads: 0, converted: 0, value: 0 };
          cur.leads += 1;
          if (l.status === 'converted' || l.status === 'won') {
            cur.converted += 1;
          }
          cur.value += this.num(l.expectedValue);
          personMap.set(key, cur);
        }
        return paginate(
          Array.from(personMap.entries()).map(([id, v]) => ({
            salesperson: userMap.get(id) || id,
            leads: v.leads,
            converted: v.converted,
            conversionRate: v.leads ? this.round((v.converted / v.leads) * 100, 1) : 0,
            value: this.round(v.value),
          })),
        );
      }
      case 'follow-up-report': {
        const rows = followUps
          .filter((f) => !query.status || f.status === query.status)
          .sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)))
          .map((f) => ({
            leadId: f.leadId || '',
            customerId: f.customerId || '',
            followUpType: f.followUpType,
            scheduledAt: String(f.scheduledAt).slice(0, 10),
            status: f.status,
            priority: f.priority,
            salesperson: userMap.get(f.assignedTo) || f.assignedTo || '',
            outcome: f.outcome || '',
          }));
        return paginate(rows);
      }
      case 'overdue-follow-ups': {
        const today = new Date().toISOString().slice(0, 10);
        const rows = followUps
          .filter((f) => f.status === 'scheduled' && String(f.scheduledAt || '') < today)
          .sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)))
          .map((f) => ({
            leadId: f.leadId || '',
            customerId: f.customerId || '',
            followUpType: f.followUpType,
            scheduledAt: String(f.scheduledAt).slice(0, 10),
            priority: f.priority,
            salesperson: userMap.get(f.assignedTo) || f.assignedTo || '',
          }));
        return paginate(rows);
      }
      case 'pipeline': {
        const active = leads.filter((l) => !DORMANT_STATUSES.includes(l.status));
        const rows = active
          .sort((a, b) => this.num(b.expectedValue) - this.num(a.expectedValue))
          .map((l) => ({
            leadNumber: l.leadNumber,
            leadName: l.leadName,
            status: l.status,
            priority: l.priority,
            salesperson: userMap.get(l.assignedTo) || l.assignedTo || '',
            expectedValue: this.round(l.expectedValue),
            expectedCloseDate: l.expectedCloseDate ? String(l.expectedCloseDate).slice(0, 10) : '',
          }));
        return paginate(rows);
      }
      case 'won-lost': {
        const rows = leads
          .filter((l) => l.status === 'won' || l.status === 'lost')
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
          .map((l) => ({
            leadNumber: l.leadNumber,
            leadName: l.leadName,
            status: l.status,
            value: this.round(
              l.status === 'won'
                ? this.num(l.wonValue || l.expectedValue)
                : this.num(l.expectedValue),
            ),
            lostReason: l.lostReason || '',
            wonDate: l.wonDate ? String(l.wonDate).slice(0, 10) : '',
          }));
        return paginate(rows);
      }
      case 'lost-reason': {
        const reasonMap = new Map<string, number>();
        for (const l of leads) {
          if (l.status === 'lost' && l.lostReason) {
            reasonMap.set(l.lostReason, (reasonMap.get(l.lostReason) || 0) + 1);
          }
        }
        return paginate(
          Array.from(reasonMap.entries()).map(([reason, count]) => ({ reason, count })),
        );
      }
      case 'opportunities': {
        const rows = opportunities
          .sort((a, b) => this.num(b.weightedValue) - this.num(a.weightedValue))
          .map((o) => ({
            opportunityNumber: o.opportunityNumber,
            name: o.name,
            stage: o.stage,
            status: o.status,
            salesperson: userMap.get(o.salespersonId) || o.salespersonId || '',
            estimatedValue: this.round(o.estimatedValue),
            weightedValue: this.round(o.weightedValue),
            expectedCloseDate: o.expectedCloseDate ? String(o.expectedCloseDate).slice(0, 10) : '',
          }));
        return paginate(rows);
      }
      case 'tasks': {
        const rows = tasks
          .sort((a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')))
          .map((t) => ({
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate ? String(t.dueDate).slice(0, 10) : '',
            salesperson: userMap.get(t.assignedTo) || t.assignedTo || '',
            leadId: t.leadId || '',
            customerId: t.customerId || '',
          }));
        return paginate(rows);
      }
      default:
        return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }
  }
}
