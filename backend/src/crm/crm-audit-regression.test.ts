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

import { FollowUpsService, CrmTasksService, MeetingsService } from './services/engagement.service';
import { LeadsService } from './services/leads.service';
import { OpportunitiesService } from './services/opportunities.service';

/**
 * CRM MODULE AUDIT REGRESSION TESTS (2026-08-26)
 *
 * Bugs covered:
 *  1. Lead source scoring: 'walk-in' (with hyphen) never matched 'walk_in' key
 *  2. Follow-up complete allows completing already completed/missed follow-ups
 *  3. Follow-up markMissed allows marking completed follow-ups as missed
 *  4. CRM Task status not validated (accepts any arbitrary value)
 *  5. Meeting status not validated (accepts any arbitrary value)
 */
describe('CRM Audit Regression Tests (real DB)', () => {
  let dbDir: string;
  let database: DatabaseService;
  let leads: LeadsService;
  let opportunities: OpportunitiesService;
  let followUps: FollowUpsService;
  let tasks: CrmTasksService;
  let meetings: MeetingsService;
  const userId = 'test-user-1';

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'crm-audit-'));
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
    meetings = new MeetingsService(database, audit);
  });

  afterAll(async () => {
    try {
      await (database as any).close?.();
    } catch {
      /* ignore */
    }
  });

  // ═════════════════════════════════════════════════════════
  // BUG 1 REGRESSION: Lead source scoring walk-in mismatch
  // ═════════════════════════════════════════════════════════
  describe('Bug 1: Lead source scoring — walk-in gets correct score', () => {
    it('walk-in source lead gets score >= 15 (not default 5)', async () => {
      const walkInLead = await leads.create(
        { leadName: 'Walk-in Customer', source: 'walk-in', expectedValue: 5000 },
        userId,
      );
      const otherLead = await leads.create(
        { leadName: 'Other Source', source: 'other', expectedValue: 5000 },
        userId,
      );

      // walk-in should score significantly higher than 'other'
      expect(Number(walkInLead.score)).toBeGreaterThan(Number(otherLead.score));
      // walk-in base is 15, other is 5 → difference should be >= 10
      expect(Number(walkInLead.score) - Number(otherLead.score)).toBeGreaterThanOrEqual(10);
    });

    it('referral source gets highest base score', async () => {
      const referralLead = await leads.create(
        { leadName: 'Referral', source: 'referral', expectedValue: 5000 },
        userId,
      );
      const walkInLead = await leads.create(
        { leadName: 'Walk-in', source: 'walk-in', expectedValue: 5000 },
        userId,
      );

      // referral (20) > walk-in (15)
      expect(Number(referralLead.score)).toBeGreaterThan(Number(walkInLead.score));
    });

    it('existing_customer source gets highest base score (25)', async () => {
      const ecLead = await leads.create(
        { leadName: 'Existing Customer', source: 'existing_customer', expectedValue: 5000 },
        userId,
      );
      const referralLead = await leads.create(
        { leadName: 'Referral', source: 'referral', expectedValue: 5000 },
        userId,
      );

      expect(Number(ecLead.score)).toBeGreaterThan(Number(referralLead.score));
    });

    it('high expected value increases score', async () => {
      const highValue = await leads.create(
        { leadName: 'High Value', source: 'website', expectedValue: 600000 },
        userId,
      );
      const lowValue = await leads.create(
        { leadName: 'Low Value', source: 'website', expectedValue: 1000 },
        userId,
      );

      expect(Number(highValue.score)).toBeGreaterThan(Number(lowValue.score));
    });
  });

  // ═════════════════════════════════════════════════════════
  // BUG 2 REGRESSION: Follow-up complete status validation
  // ═════════════════════════════════════════════════════════
  describe('Bug 2: Follow-up complete must require scheduled status', () => {
    it('allows completing a scheduled follow-up', async () => {
      const lead = await leads.create({ leadName: 'FU Test', mobile: '9999000001' }, userId);
      const fu = await followUps.create(
        { leadId: lead.id, scheduledAt: '2026-09-01T10:00', followUpType: 'phone' },
        userId,
      );
      expect(fu.status).toBe('scheduled');

      await followUps.complete(fu.id, userId, { outcome: 'interested' });
      const completed = await database.followUps.findById(fu.id);
      expect(completed.status).toBe('completed');
    });

    it('rejects completing an already completed follow-up', async () => {
      const lead = await leads.create({ leadName: 'FU Double', mobile: '9999000002' }, userId);
      const fu = await followUps.create(
        { leadId: lead.id, scheduledAt: '2026-09-02T10:00', followUpType: 'phone' },
        userId,
      );
      await followUps.complete(fu.id, userId, { outcome: 'done' });

      await expect(followUps.complete(fu.id, userId, { outcome: 'again' })).rejects.toThrow(
        /scheduled/i,
      );
    });

    it('rejects completing a missed follow-up', async () => {
      const lead = await leads.create({ leadName: 'FU Missed', mobile: '9999000003' }, userId);
      const fu = await followUps.create(
        { leadId: lead.id, scheduledAt: '2026-09-03T10:00', followUpType: 'phone' },
        userId,
      );
      await followUps.markMissed(fu.id, userId);

      await expect(followUps.complete(fu.id, userId, { outcome: 'late' })).rejects.toThrow(
        /scheduled/i,
      );
    });
  });

  // ═════════════════════════════════════════════════════════
  // BUG 3 REGRESSION: Follow-up markMissed status validation
  // ═════════════════════════════════════════════════════════
  describe('Bug 3: Follow-up markMissed must require scheduled status', () => {
    it('allows marking a scheduled follow-up as missed', async () => {
      const lead = await leads.create({ leadName: 'FU Miss2', mobile: '9999000004' }, userId);
      const fu = await followUps.create(
        { leadId: lead.id, scheduledAt: '2026-09-04T10:00', followUpType: 'phone' },
        userId,
      );
      await followUps.markMissed(fu.id, userId);
      const missed = await database.followUps.findById(fu.id);
      expect(missed.status).toBe('missed');
    });

    it('rejects marking a completed follow-up as missed', async () => {
      const lead = await leads.create({ leadName: 'FU Miss3', mobile: '9999000005' }, userId);
      const fu = await followUps.create(
        { leadId: lead.id, scheduledAt: '2026-09-05T10:00', followUpType: 'phone' },
        userId,
      );
      await followUps.complete(fu.id, userId, { outcome: 'done' });

      await expect(followUps.markMissed(fu.id, userId)).rejects.toThrow(/scheduled/i);
    });
  });

  // ═════════════════════════════════════════════════════════
  // BUG 4 REGRESSION: CRM Task status validation
  // ═════════════════════════════════════════════════════════
  describe('Bug 4: CRM Task status must be validated', () => {
    it('allows valid status transitions', async () => {
      const task = await tasks.create({ title: 'Task Valid', priority: 'high' }, userId);
      expect(task.status).toBe('open');

      await tasks.update(task.id, { status: 'in_progress' }, userId);
      const inProgress = await database.crmTasks.findById(task.id);
      expect(inProgress.status).toBe('in_progress');

      await tasks.update(task.id, { status: 'completed' }, userId);
      const completed = await database.crmTasks.findById(task.id);
      expect(completed.status).toBe('completed');
    });

    it('rejects invalid status values', async () => {
      const task = await tasks.create({ title: 'Task Invalid', priority: 'high' }, userId);

      await expect(tasks.update(task.id, { status: 'banana' }, userId)).rejects.toThrow(/Invalid/i);
    });

    it('rejects arbitrary status strings', async () => {
      const task = await tasks.create({ title: 'Task Random', priority: 'high' }, userId);

      await expect(tasks.update(task.id, { status: 'almost_done' }, userId)).rejects.toThrow(
        /Invalid/i,
      );
    });
  });

  // ═════════════════════════════════════════════════════════
  // BUG 5 REGRESSION: Meeting status validation
  // ═════════════════════════════════════════════════════════
  describe('Bug 5: Meeting status must be validated', () => {
    it('allows valid status transitions', async () => {
      const meeting = await meetings.create(
        { title: 'Client Meeting', meetingDate: '2026-09-10T14:00' },
        userId,
      );
      expect(meeting.status).toBe('scheduled');

      await meetings.update(meeting.id, { status: 'completed' }, userId);
      const completed = await database.meetings.findById(meeting.id);
      expect(completed.status).toBe('completed');
    });

    it('allows rescheduled status', async () => {
      const meeting = await meetings.create(
        { title: 'Reschedule Meeting', meetingDate: '2026-09-11T14:00' },
        userId,
      );
      await meetings.update(meeting.id, { status: 'rescheduled' }, userId);
      const rescheduled = await database.meetings.findById(meeting.id);
      expect(rescheduled.status).toBe('rescheduled');
    });

    it('rejects invalid meeting status', async () => {
      const meeting = await meetings.create(
        { title: 'Bad Status Meeting', meetingDate: '2026-09-12T14:00' },
        userId,
      );

      await expect(meetings.update(meeting.id, { status: 'maybe' }, userId)).rejects.toThrow(
        /Invalid/i,
      );
    });
  });

  // ═════════════════════════════════════════════════════════
  // OPPORTUNITY SCORING & PIPELINE
  // ═════════════════════════════════════════════════════════
  describe('Opportunity weighted value calculation', () => {
    it('weighted value = estimatedValue × stage probability', async () => {
      const opp = await opportunities.create(
        { name: 'Big Deal', estimatedValue: 200000, stage: 'negotiation' },
        userId,
      );
      // negotiation = 80% → 200000 × 0.80 = 160000
      expect(Number(opp.weightedValue)).toBe(160000);
      expect(Number(opp.probability)).toBe(80);
    });

    it('won stage sets probability to 100', async () => {
      const opp = await opportunities.create(
        { name: 'Won Deal', estimatedValue: 100000, stage: 'lead' },
        userId,
      );
      await opportunities.updateStage(opp.id, 'won', userId);
      const updated = await opportunities.findById(opp.id);
      expect(Number(updated.weightedValue)).toBe(100000);
      expect(Number(updated.probability)).toBe(100);
    });

    it('lost stage sets probability to 0', async () => {
      const opp = await opportunities.create(
        { name: 'Lost Deal', estimatedValue: 100000, stage: 'lead' },
        userId,
      );
      await opportunities.updateStage(opp.id, 'lost', userId);
      const updated = await opportunities.findById(opp.id);
      expect(Number(updated.weightedValue)).toBe(0);
      expect(Number(updated.probability)).toBe(0);
    });

    it('rejects invalid stage values', async () => {
      const opp = await opportunities.create(
        { name: 'Stage Test', estimatedValue: 50000, stage: 'lead' },
        userId,
      );
      await expect(opportunities.updateStage(opp.id, 'invalid_stage', userId)).rejects.toThrow(
        /Invalid/i,
      );
    });
  });

  // ═════════════════════════════════════════════════════════
  // LEAD CONVERSION
  // ═════════════════════════════════════════════════════════
  describe('Lead conversion workflow', () => {
    it('prevents double conversion', async () => {
      const lead = await leads.create({ leadName: 'Double Convert', mobile: '9999000010' }, userId);
      await leads.convert(lead.id, userId);
      await expect(leads.convert(lead.id, userId)).rejects.toThrow(/already converted/i);
    });

    it('finds duplicate customers by mobile', async () => {
      const lead1 = await leads.create({ leadName: 'Dup Mobile 1', mobile: '9999000020' }, userId);
      await leads.convert(lead1.id, userId);

      const lead2 = await leads.create({ leadName: 'Dup Mobile 2', mobile: '9999000020' }, userId);
      const matches = await leads.findDuplicateCustomers(lead2);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].mobile).toBe('9999000020');
    });
  });
});
