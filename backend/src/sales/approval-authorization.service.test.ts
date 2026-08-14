import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

// @libsql/client + drizzle-orm live in the database workspace (pnpm)
const dbRequire = createRequire(join(process.cwd(), '..', 'database', 'package.json'));
const { createClient } = dbRequire('@libsql/client');
const { drizzle } = dbRequire('drizzle-orm/libsql');
const { migrate } = dbRequire('drizzle-orm/libsql/migrator');

import { TransactionManager } from '../automation/transaction.manager';
import { DatabaseService } from '../database/database.service';

import { SalesApprovalEngineService } from './approval-engine.service';

/**
 * H3 — Legacy Sales Approval Engine: designated-approver security (real DB).
 *
 * The actor is ALWAYS the authenticated session id; client-supplied userId /
 * userRole cannot establish approval identity. The designated approver for the
 * CURRENT level (matrix `approvers` JSON: userId | role | canOverride) is
 * verified server-side before any mutation, and mutations are transactional.
 */
describe('H3 Legacy Sales Approval Security (real DB)', () => {
  let dbDir: string;
  let rawClient: any;
  let database: DatabaseService;
  let txn: TransactionManager;
  let engine: SalesApprovalEngineService;

  let managerUserId: string;
  let adminUserId: string;
  let employeeUserId: string;
  let designatedUserId: string;
  let otherUserId: string;

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'h3-sales-approval-'));
    rawClient = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(rawClient as any);
    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    database = new DatabaseService(drizzleDb as any);
    txn = new TransactionManager(database);
    engine = new SalesApprovalEngineService(database, { log: async () => undefined } as any, txn);

    await seed();
  });

  afterAll(async () => {
    try {
      await (database as any).close?.();
    } catch {
      /* ignore */
    }
  });

  async function seed() {
    const managerRole = await database.roles.createRole({
      name: 'manager',
      description: 'Manager',
    });
    const adminRole = await database.roles.createRole({ name: 'admin', description: 'Admin' });
    const employeeRole = await database.roles.createRole({
      name: 'employee',
      description: 'Employee',
    });

    const makeUser = async (email: string, firstName: string) =>
      database.users.create({
        email,
        firstName,
        lastName: 'Test',
        passwordHash: 'x',
        isActive: true,
        refreshTokenVersion: 0,
      } as any);

    const manager = await makeUser('mgr@test.com', 'Manager');
    const admin = await makeUser('adm@test.com', 'Admin');
    const employee = await makeUser('emp@test.com', 'Employee');
    const designated = await makeUser('des@test.com', 'Designated');
    const other = await makeUser('oth@test.com', 'Other');

    managerUserId = (manager as any).id;
    adminUserId = (admin as any).id;
    employeeUserId = (employee as any).id;
    designatedUserId = (designated as any).id;
    otherUserId = (other as any).id;

    const assignRole = async (userId: string, roleId: string) => {
      await rawClient.execute({
        sql: `INSERT INTO shranix_user_roles (id, user_id, role_id) VALUES (?, ?, ?)`,
        args: [randomUUID(), userId, roleId],
      });
    };
    await assignRole(managerUserId, (managerRole as any).id);
    await assignRole(adminUserId, (adminRole as any).id);
    await assignRole(employeeUserId, (employeeRole as any).id);

    const now = new Date().toISOString();
    // sales_invoice: L1 = manager (role), L2 = admin (explicit canOverride)
    await database.approvalMatrices.create({
      name: 'Sales Invoice Approval',
      documentType: 'sales_invoice',
      levels: 'two_level',
      levelCount: 2,
      approvers: JSON.stringify([
        { level: 1, role: 'manager', canOverride: false },
        { level: 2, role: 'admin', canOverride: true },
      ]),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as any);
    // credit_note: L1 = a SPECIFIC designated user (userId-based)
    await database.approvalMatrices.create({
      name: 'Credit Note Approval',
      documentType: 'credit_note',
      levels: 'single',
      levelCount: 1,
      approvers: JSON.stringify([
        { level: 1, role: 'operator', userId: designatedUserId, canOverride: false },
      ]),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as any);
    // proforma_invoice: single-level role (manager) — used for duplicate/concurrency
    await database.approvalMatrices.create({
      name: 'Proforma Invoice Approval',
      documentType: 'proforma_invoice',
      levels: 'single',
      levelCount: 1,
      approvers: JSON.stringify([{ level: 1, role: 'manager', canOverride: false }]),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as any);
  }

  /** Submit a real approval via the engine (creates the pending record). */
  async function submit(documentType: string, overrides: Record<string, any> = {}) {
    return engine.submitForApproval({
      documentType: documentType as any,
      documentId: overrides.documentId || `doc-${randomUUID()}`,
      documentNumber: overrides.documentNumber || `${documentType.toUpperCase()}-001`,
      customerId: overrides.customerId || 'cust-A',
      customerName: overrides.customerName || 'Customer A',
      amount: overrides.amount ?? 5000,
      discountAmount: 0,
      discountPercent: 0,
      gstAmount: 0,
      createdBy: overrides.createdBy || 'creator-1',
      createdByName: 'Creator',
      priority: 'medium',
    });
  }

  const approveAs = (id: string, actorId: string) =>
    engine.approve(id, actorId, 'Actor', { comment: 'approved' });
  const rejectAs = (id: string, actorId: string) =>
    engine.reject(id, actorId, 'Actor', { comment: 'rejected' });

  // ═══════════════════════════════════════════════════════
  // H3.15 TEST MATRIX
  // ═══════════════════════════════════════════════════════

  it('1. Correct role-based approver (manager at level 1) → SUCCESS', async () => {
    const rec = await submit('sales_invoice');
    const res = await approveAs((rec as any).id, managerUserId);
    expect((res as any).status).toBe('under_review');
    expect(Number((res as any).currentLevel)).toBe(2);
    const fresh = await database.salesApprovals.findById((rec as any).id);
    expect((fresh as any).status).toBe('under_review');
    expect(Number((fresh as any).currentLevel)).toBe(2);
  }, 60000);

  it('2. Wrong user (employee) approves → FORBIDDEN, no state change', async () => {
    const rec = await submit('sales_invoice');
    await expect(approveAs((rec as any).id, employeeUserId)).rejects.toThrow(ForbiddenException);
    const fresh = await database.salesApprovals.findById((rec as any).id);
    expect((fresh as any).status).toBe('pending');
    expect(Number((fresh as any).currentLevel)).toBe(1);
    const history = await engine.getHistory((rec as any).id);
    expect(history.filter((h: any) => h.action === 'approve').length).toBe(0);
  }, 60000);

  it('3. Client userId spoofing → blocked (actor is server-derived)', async () => {
    // The legacy DTO carries no identity fields; the only actor input is the
    // session id passed by the controller. Simulating a spoofed actor id that
    // is NOT the designated approver must be rejected by role resolution.
    const rec = await submit('sales_invoice');
    await expect(approveAs((rec as any).id, otherUserId)).rejects.toThrow(ForbiddenException);
  }, 60000);

  it('4. Client userRole spoofing → blocked (roles come from the server)', async () => {
    // Roles are resolved server-side from shranix_user_roles — there is no
    // client role input. An employee pretending to be a manager is rejected
    // because their DB role is employee, not manager.
    const rec = await submit('sales_invoice');
    await expect(approveAs((rec as any).id, employeeUserId)).rejects.toThrow(ForbiddenException);
    const fresh = await database.salesApprovals.findById((rec as any).id);
    expect((fresh as any).status).toBe('pending');
  }, 60000);

  it('6. Generic sales approval permission but wrong approver → blocked', async () => {
    // Endpoint permission (sales.approve) is NOT sufficient; designated-approver
    // verification at the current level is the binding check.
    const rec = await submit('sales_invoice');
    await expect(approveAs((rec as any).id, employeeUserId)).rejects.toThrow(ForbiddenException);
  }, 60000);

  it('9. Specific designated user → only that user succeeds (userId-based)', async () => {
    const rec = await submit('credit_note');
    // Manager holds the 'manager' role but is NOT the designated userId → blocked
    await expect(approveAs((rec as any).id, managerUserId)).rejects.toThrow(ForbiddenException);
    // Admin (no override at level 1) → blocked
    await expect(approveAs((rec as any).id, adminUserId)).rejects.toThrow(ForbiddenException);
    // The designated user → success
    const res = await approveAs((rec as any).id, designatedUserId);
    expect((res as any).status).toBe('approved');
  }, 60000);

  it('10. Already approved → duplicate approval blocked', async () => {
    const rec = await submit('proforma_invoice');
    const res = await approveAs((rec as any).id, managerUserId);
    expect((res as any).status).toBe('approved');
    await expect(approveAs((rec as any).id, managerUserId)).rejects.toThrow(BadRequestException);
  }, 60000);

  it('11. Already rejected → approval blocked', async () => {
    const rec = await submit('proforma_invoice');
    await rejectAs((rec as any).id, managerUserId);
    await expect(approveAs((rec as any).id, managerUserId)).rejects.toThrow(BadRequestException);
  }, 60000);

  it('12. Wrong approval level → level-1 approver cannot act at level 2', async () => {
    const rec = await submit('sales_invoice');
    await approveAs((rec as any).id, managerUserId); // L1 → level 2 (admin) now pending
    // Manager (L1 role) tries again at level 2 → not designated → 403
    await expect(approveAs((rec as any).id, managerUserId)).rejects.toThrow(ForbiddenException);
    // Admin (L2, canOverride) succeeds
    const res = await approveAs((rec as any).id, adminUserId);
    expect((res as any).status).toBe('approved');
  }, 60000);

  it('13. Out-of-order approval → level-2 approver cannot skip level 1', async () => {
    const rec = await submit('sales_invoice');
    // Admin is only designated at level 2; level 1 (manager) is pending
    await expect(approveAs((rec as any).id, adminUserId)).rejects.toThrow(ForbiddenException);
    const fresh = await database.salesApprovals.findById((rec as any).id);
    expect(Number((fresh as any).currentLevel)).toBe(1);
  }, 60000);

  it('14. Invalid approval ID → safe error', async () => {
    await expect(approveAs('missing-approval-id', managerUserId)).rejects.toThrow(
      NotFoundException,
    );
  }, 60000);

  it('15. Cross-scope: an approver cannot act on another approval they are not designated for', async () => {
    const recA = await submit('sales_invoice'); // designated: manager
    const recB = await submit('credit_note'); // designated: designatedUser
    // DesignatedUser tries to approve A (only manager designated) → 403
    await expect(approveAs((recA as any).id, designatedUserId)).rejects.toThrow(ForbiddenException);
    // Manager tries to approve B (only designatedUser) → 403
    await expect(approveAs((recB as any).id, managerUserId)).rejects.toThrow(ForbiddenException);
  }, 60000);

  it('16. Duplicate approval → blocked (second request rejected)', async () => {
    const rec = await submit('proforma_invoice');
    await approveAs((rec as any).id, managerUserId);
    await expect(approveAs((rec as any).id, managerUserId)).rejects.toThrow(BadRequestException);
    const fresh = await database.salesApprovals.findById((rec as any).id);
    expect((fresh as any).status).toBe('approved');
  }, 60000);

  it('18. Approval history records the server-derived actor', async () => {
    const rec = await submit('sales_invoice');
    await approveAs((rec as any).id, managerUserId);
    const history = await engine.getHistory((rec as any).id);
    const approveRows = history.filter((h: any) => h.action === 'approve');
    expect(approveRows.length).toBe(1);
    expect(approveRows[0].actionBy).toBe(managerUserId);
  }, 60000);

  it('19. Client identity cannot change the audit actor', async () => {
    // The DTO has no identity fields; even if a comment mentions another user,
    // the recorded actor is the server-passed session id.
    const rec = await submit('sales_invoice');
    await engine.approve((rec as any).id, managerUserId, 'Manager', {
      comment: `approving on behalf of ${otherUserId}`,
    });
    const history = await engine.getHistory((rec as any).id);
    const approveRows = history.filter((h: any) => h.action === 'approve');
    expect(approveRows[0].actionBy).toBe(managerUserId);
  }, 60000);

  it('20. Downstream failure rolls back the whole transition (transactional)', async () => {
    // Engine whose audit write fails AFTER the master update + history insert:
    // the transaction must roll back to the pre-approval state.
    const failingAudit = {
      log: async () => {
        throw new Error('audit service down');
      },
    };
    const txnEngine = new SalesApprovalEngineService(database, failingAudit as any, txn);
    const rec = await submit('proforma_invoice');
    await expect(
      txnEngine.approve((rec as any).id, managerUserId, 'Manager', { comment: 'ok' }),
    ).rejects.toThrow(/audit service down/);
    const fresh = await database.salesApprovals.findById((rec as any).id);
    expect((fresh as any).status).toBe('pending');
    expect(Number((fresh as any).currentLevel)).toBe(1);
    const history = await engine.getHistory((rec as any).id);
    expect(history.filter((h: any) => h.action === 'approve').length).toBe(0);
  }, 60000);

  it('Reject: only the designated approver can reject', async () => {
    const rec = await submit('sales_invoice');
    await expect(rejectAs((rec as any).id, employeeUserId)).rejects.toThrow(ForbiddenException);
    const res = await rejectAs((rec as any).id, managerUserId);
    expect((res as any).status).toBe('rejected');
    const fresh = await database.salesApprovals.findById((rec as any).id);
    expect((fresh as any).status).toBe('rejected');
  }, 60000);

  it('Send-back: only the designated approver can send back', async () => {
    const rec = await submit('sales_invoice');
    await expect(
      engine.sendBack((rec as any).id, employeeUserId, 'Employee', { comment: 'fix', reason: 'r' }),
    ).rejects.toThrow(ForbiddenException);
    const res = await engine.sendBack((rec as any).id, managerUserId, 'Manager', {
      comment: 'fix',
      reason: 'r',
    });
    expect((res as any).status).toBe('pending');
    expect(Number((res as any).currentLevel)).toBe(1);
  }, 60000);

  it('17. Concurrent approval → exactly one successful transition', async () => {
    // SQLite serializes write transactions; true concurrency uses TWO
    // connections to an ISOLATED db file. TransactionManager's bounded
    // SQLITE_BUSY retry lets the loser re-read after the winner commits and
    // hit the state/eligibility guard — exactly one success.
    const raceDir = mkdtempSync(join(tmpdir(), 'h3-race-'));
    const raceFile = `file:${join(raceDir, 'race.db')}`;
    const c1 = createClient({ url: raceFile });
    const c2 = createClient({ url: raceFile });
    const d1 = drizzle(c1 as any);
    await migrate(
      d1 as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );
    const db1 = new DatabaseService(d1 as any);
    const db2 = new DatabaseService(drizzle(c2 as any) as any);
    const buildEngine = (databaseX: DatabaseService) =>
      new SalesApprovalEngineService(
        databaseX,
        { log: async () => undefined } as any,
        new TransactionManager(databaseX),
      );
    const eng1 = buildEngine(db1);
    const eng2 = buildEngine(db2);

    // Seed a single-level proforma matrix + manager role + user
    const managerRole = await db1.roles.createRole({ name: 'manager', description: 'Manager' });
    const manager = await db1.users.create({
      email: 'racer-mgr@test.com',
      firstName: 'Racer',
      lastName: 'Manager',
      passwordHash: 'x',
      isActive: true,
      refreshTokenVersion: 0,
    } as any);
    const mgrId = (manager as any).id;
    await rawClientFor(c1, db1).execute({
      sql: `INSERT INTO shranix_user_roles (id, user_id, role_id) VALUES (?, ?, ?)`,
      args: [randomUUID(), mgrId, (managerRole as any).id],
    });
    const now = new Date().toISOString();
    await db1.approvalMatrices.create({
      name: 'Proforma Race',
      documentType: 'proforma_invoice',
      levels: 'single',
      levelCount: 1,
      approvers: JSON.stringify([{ level: 1, role: 'manager', canOverride: false }]),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as any);

    const rec = await eng1.submitForApproval({
      documentType: 'proforma_invoice',
      documentId: `doc-${randomUUID()}`,
      documentNumber: 'PROF-RACE-001',
      customerId: 'cust-A',
      customerName: 'Customer A',
      amount: 5000,
      discountAmount: 0,
      discountPercent: 0,
      gstAmount: 0,
      createdBy: 'creator',
      createdByName: 'Creator',
      priority: 'medium',
    });

    const [r1, r2] = await Promise.allSettled([
      eng1.approve((rec as any).id, mgrId, 'Manager', { comment: 'yes' }),
      eng2.approve((rec as any).id, mgrId, 'Manager', { comment: 'yes' }),
    ]);
    const successes = [r1, r2].filter((r) => r.status === 'fulfilled').length;
    expect(successes).toBe(1);

    // Assert final state via a THIRD fresh connection (immune to lock state)
    const c3 = createClient({ url: raceFile });
    const db3 = new DatabaseService(drizzle(c3 as any) as any);
    const fresh = await db3.salesApprovals.findById((rec as any).id);
    expect((fresh as any).status).toBe('approved');
    const history = await db3.approvalHistory.findAll({
      page: 1,
      pageSize: 50,
      filters: [{ field: 'approvalId', operator: 'eq', value: (rec as any).id }],
    } as any);
    expect(((history as any).data || []).filter((h: any) => h.action === 'approve').length).toBe(1);
  }, 60000);
});

/** Execute a raw statement on a specific libsql client (user_roles seeding). */
function rawClientFor(client: any, _db: any) {
  return client;
}
