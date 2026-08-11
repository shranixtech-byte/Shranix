import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

const dbRequire = createRequire(join(process.cwd(), '..', 'database', 'package.json'));
const { createClient } = dbRequire('@libsql/client');
const { drizzle } = dbRequire('drizzle-orm/libsql');
const { migrate } = dbRequire('drizzle-orm/libsql/migrator');

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { CustomersService } from '../sales/customers.service';

import { CrmDashboardService } from './services/crm-dashboard.service';
import {
  FollowUpsService,
  CrmTasksService,
  ActivitiesService,
} from './services/engagement.service';
import { LeadsService } from './services/leads.service';
import { OpportunitiesService } from './services/opportunities.service';

/**
 * REAL-DB integration tests for the Phase-6 CRM module.
 *
 * Seeds leads, follow-ups, tasks, opportunities on a migrated temp DB and
 * verifies: lead numbering/CRUD, assignment history, status transitions,
 * duplicate-customer detection, transaction-safe conversion (existing +
 * new customer), double-conversion prevention, timeline, reminders and
 * dashboard KPIs.
 */
describe('CRM (real DB)', () => {
  let database: DatabaseService;
  let leads: LeadsService;
  let opportunities: OpportunitiesService;
  let followUps: FollowUpsService;
  let tasks: CrmTasksService;
  let activities: ActivitiesService;
  let dashboard: CrmDashboardService;

  const userId = 'user-crm-1';

  beforeAll(async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'crm-'));
    const client = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(client as any);

    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    database = new DatabaseService(drizzleDb as any);
    const audit = new AuditService(database, {
      getIp: () => null,
      getUserAgent: () => null,
    } as any);
    const customers = new CustomersService(database);
    leads = new LeadsService(database, audit, customers);
    opportunities = new OpportunitiesService(database, audit);
    followUps = new FollowUpsService(database, audit);
    tasks = new CrmTasksService(database, audit);
    activities = new ActivitiesService(database);
    dashboard = new CrmDashboardService(database);
  });

  afterAll(async () => {
    await database.onModuleDestroy?.().catch(() => undefined);
  });

  it('creates leads with sequential numbering and scores them', async () => {
    const lead = await leads.create(
      {
        leadName: 'Rahul Patil',
        mobile: '9822011122',
        source: 'referral',
        expectedValue: 150000,
        leadType: 'business',
      },
      userId,
    );
    expect(lead.leadNumber).toBe('L-0001');
    expect(lead.status).toBe('new');

    const lead2 = await leads.create(
      { leadName: 'Suresh Deshmukh', mobile: '9822011133', source: 'website', expectedValue: 5000 },
      userId,
    );
    expect(lead2.leadNumber).toBe('L-0002');

    // Referral + high value business lead should score higher
    expect(Number(lead.score)).toBeGreaterThan(Number(lead2.score));
    expect(lead.scoreLevel).toBe('medium');

    const list = await leads.findAll({ page: 1, pageSize: 10 });
    expect(list.total).toBe(2);
  });

  it('logs assignment and status transitions to the timeline', async () => {
    const lead = await leads.create({ leadName: 'Test Assign', mobile: '9822011144' }, userId);
    await leads.assign(lead.id, userId, 'sales-exec-1');

    const detail1 = await leads.findById(lead.id);
    expect(detail1.assignedTo).toBe('sales-exec-1');
    expect(detail1.assignedAt).toBeTruthy();
    expect(detail1.activities.some((a: any) => a.activityType === 'lead.assigned')).toBe(true);

    await leads.update(lead.id, { status: 'interested' }, userId);
    const detail2 = await leads.findById(lead.id);
    expect(detail2.status).toBe('interested');
    expect(detail2.activities.some((a: any) => a.activityType === 'lead.status_changed')).toBe(
      true,
    );
  });

  it('converts a lead to a NEW customer with a conversion record', async () => {
    const lead = await leads.create(
      {
        leadName: 'New Customer Lead',
        companyName: 'Kisan Agro',
        mobile: '9822011155',
        email: 'kisan@example.com',
        state: 'MH',
      },
      userId,
    );
    const res = await leads.convert(lead.id, userId);
    expect(res.converted).toBe(true);
    expect(res.method).toBe('new');
    expect(res.customerId).toBeTruthy();

    const detail = await leads.findById(lead.id);
    expect(detail.status).toBe('converted');
    expect(detail.convertedToCustomer).toBe(true);
    expect(detail.convertedCustomerId).toBe(res.customerId);

    // Customer exists in the ledger master with lead-derived data
    const customer = await database.ledgerMaster.findById(res.customerId);
    expect(customer).toBeTruthy();
    expect(customer.ledgerType).toBe('customer');
    expect(customer.partyId).toBe('Kisan Agro');

    // Conversion record exists
    const convs = await database.leadConversions.findAll({ page: 1, pageSize: 10 } as any);
    expect(convs.data.length).toBe(1);
    expect(convs.data[0].leadId).toBe(lead.id);

    // Double conversion blocked
    await expect(leads.convert(lead.id, userId)).rejects.toThrow();
  });

  it('detects duplicate customers and converts to an existing one', async () => {
    // First lead converted → creates customer with mobile 9822011166
    const lead1 = await leads.create({ leadName: 'Dup Lead One', mobile: '9822011166' }, userId);
    await leads.convert(lead1.id, userId);

    // Second lead with same mobile → duplicate detection surfaces the match
    const lead2 = await leads.create({ leadName: 'Dup Lead Two', mobile: '9822011166' }, userId);
    const matches = await leads.findDuplicateCustomers(lead2);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].mobile).toBe('9822011166');

    const convRes = await leads.convert(lead2.id, userId, matches[0].customerId);
    expect(convRes.converted).toBe(true);
    expect(convRes.method).toBe('existing');
    expect(convRes.customerId).toBe(matches[0].customerId);
  });

  it('manages follow-ups with reminders and completion chaining', async () => {
    const lead = await leads.create({ leadName: 'Follow-up Lead', mobile: '9822011177' }, userId);
    const past = await followUps.create(
      {
        leadId: lead.id,
        scheduledAt: '2020-01-01T10:00',
        followUpType: 'phone',
        purpose: 'initial',
      },
      userId,
    );
    const future = await followUps.create(
      { leadId: lead.id, scheduledAt: '2099-01-01T10:00', followUpType: 'visit', purpose: 'demo' },
      userId,
    );

    const reminders = await followUps.reminders();
    expect(reminders.overdue.some((f: any) => f.id === past.id)).toBe(true);
    expect(reminders.upcoming.some((f: any) => f.id === future.id)).toBe(true);

    await followUps.complete(past.id, userId, {
      outcome: 'interested',
      nextFollowUpAt: '2099-02-01T10:00',
    });
    const done = await database.followUps.findById(past.id);
    expect(done.status).toBe('completed');

    // Completion with nextFollowUpAt chains a new scheduled follow-up
    const all = await followUps.findAll({ page: 1, pageSize: 20 });
    expect(all.total).toBe(3);
  });

  it('manages tasks and activity timeline', async () => {
    const lead = await leads.create({ leadName: 'Task Lead', mobile: '9822011188' }, userId);
    const task = await tasks.create(
      { title: 'Send quotation', leadId: lead.id, dueDate: '2026-09-01', priority: 'high' },
      userId,
    );
    expect(task.status).toBe('open');

    await tasks.update(task.id, { status: 'completed' }, userId);
    const done = await database.crmTasks.findById(task.id);
    expect(done.status).toBe('completed');
    expect(done.completedAt).toBeTruthy();

    const timeline = await activities.timeline({ leadId: lead.id });
    const types = (timeline.data || []).map((a: any) => a.activityType);
    expect(types).toContain('lead.created');
    expect(types).toContain('task.created');
  });

  it('computes dashboard KPIs, funnel and weighted opportunity value', async () => {
    const lead = await leads.create(
      { leadName: 'Dash Lead', mobile: '9822011199', source: 'walk-in', expectedValue: 100000 },
      userId,
    );
    await opportunities.create(
      { name: 'Dash Opp', leadId: lead.id, estimatedValue: 200000, stage: 'negotiation' },
      userId,
    );

    const data = await dashboard.getDashboard();
    expect(data.kpis.find((k) => k.key === 'totalLeads')?.value).toBeGreaterThan(0);
    expect(data.charts.pipelineFunnel.length).toBeGreaterThan(0);
    // negotiation stage = 80% → weighted 160000
    expect(data.pipelineValue.weightedOpportunities).toBe(160000);

    const report = await dashboard.getReport('lead-register', { page: 1, pageSize: 10 });
    expect(report.total).toBeGreaterThan(0);
    expect(report.data[0]).toHaveProperty('leadNumber');
  });
});
