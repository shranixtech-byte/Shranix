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

import { ApprovalEngineService } from './services/approval-engine.service';
import { WorkflowInstancesService } from './services/instances.service';
import { NotificationEngineService } from './services/notification-engine.service';
import {
  StateMachineService,
  DEFAULT_WORKFLOW_STATES,
  DEFAULT_TRANSITIONS,
} from './services/state-machine.service';
import { TaskEngineService } from './services/task-engine.service';

/**
 * H2 — Workflow Approver Verification (real DB + real migrations).
 *
 * The approval actor MUST come from the authenticated session; a client-supplied
 * userId can never impersonate another user, and only the designated approver
 * (user / role / department per the approval matrix) may act on a step.
 */
describe('H2 Workflow Approver Verification (real DB)', () => {
  let dbDir: string;
  let rawClient: any;
  let database: DatabaseService;
  let txn: TransactionManager;
  let stateMachine: StateMachineService;
  let approvalEngine: ApprovalEngineService;
  let taskEngine: TaskEngineService;
  let notificationEngine: NotificationEngineService;
  let instancesService: WorkflowInstancesService;

  // Seed identities
  let designatedUserId: string;
  let otherUserId: string;
  let managerUserId: string;
  let adminUserId: string;
  let employeeUserId: string;
  let deptApproverUserId: string;

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'h2-workflow-'));
    const dbFile = join(dbDir, 'test.db');
    rawClient = createClient({ url: `file:${dbFile}` });
    const drizzleDb = drizzle(rawClient as any);

    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    database = new DatabaseService(drizzleDb as any);
    txn = new TransactionManager(database);
    const auditStub = { log: async () => undefined };
    stateMachine = new StateMachineService();
    approvalEngine = new ApprovalEngineService(database);
    taskEngine = new TaskEngineService(database);
    notificationEngine = new NotificationEngineService(database);
    instancesService = new WorkflowInstancesService(
      database,
      auditStub as any,
      stateMachine,
      approvalEngine,
      taskEngine,
      notificationEngine,
      txn,
    );

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
    // ── Roles ──
    const adminRole = await database.roles.createRole({ name: 'admin', description: 'Admin' });
    const managerRole = await database.roles.createRole({
      name: 'manager',
      description: 'Manager',
    });
    const employeeRole = await database.roles.createRole({
      name: 'employee',
      description: 'Employee',
    });

    // ── Users ──
    const makeUser = async (email: string, firstName: string) =>
      database.users.create({
        email,
        firstName,
        lastName: 'Test',
        passwordHash: 'x',
        isActive: true,
        refreshTokenVersion: 0,
      } as any);

    const designated = await makeUser('designated@test.com', 'Designated');
    const other = await makeUser('other@test.com', 'Other');
    const manager = await makeUser('manager@test.com', 'Manager');
    const admin = await makeUser('admin@test.com', 'Admin');
    const employee = await makeUser('employee@test.com', 'Employee');
    const deptApprover = await makeUser('dept@test.com', 'Dept');

    designatedUserId = (designated as any).id;
    otherUserId = (other as any).id;
    managerUserId = (manager as any).id;
    adminUserId = (admin as any).id;
    employeeUserId = (employee as any).id;
    deptApproverUserId = (deptApprover as any).id;

    // ── user_roles (raw insert — no repo method) ──
    const assignRole = async (userId: string, roleId: string) => {
      await rawClient.execute({
        sql: `INSERT INTO shranix_user_roles (id, user_id, role_id) VALUES (?, ?, ?)`,
        args: [randomUUID(), userId, roleId],
      });
    };
    await assignRole(managerUserId, (managerRole as any).id);
    await assignRole(adminUserId, (adminRole as any).id);
    await assignRole(employeeUserId, (employeeRole as any).id);
    await assignRole(deptApproverUserId, (employeeRole as any).id);

    // ── Employees (department-based approval) ──
    await database.employees.create({
      employeeCode: 'EMP-DEPT-1',
      firstName: 'Dept',
      lastName: 'Approver',
      departmentId: 'dept-finance',
      userId: deptApproverUserId,
      status: 'active',
    } as any);

    // ── Approval matrix ──
    // sales_invoice: L1 = designated user, L2 = manager role
    await database.approvalMatrix.create({
      name: 'Sales Invoice L1',
      module: 'sales',
      documentType: 'sales_invoice',
      level: 1,
      minAmount: 0,
      approvalType: 'user',
      approverUserId: designatedUserId,
      isSequential: true,
      isParallel: false,
      requiredApprovals: 1,
      isActive: true,
    } as any);
    await database.approvalMatrix.create({
      name: 'Sales Invoice L2',
      module: 'sales',
      documentType: 'sales_invoice',
      level: 2,
      minAmount: 0,
      approvalType: 'role',
      approverRole: 'manager',
      isSequential: true,
      isParallel: false,
      requiredApprovals: 1,
      isActive: true,
    } as any);
    // purchase_order: L1 = dept approver (department-based)
    await database.approvalMatrix.create({
      name: 'PO L1',
      module: 'purchase',
      documentType: 'purchase_order',
      level: 1,
      minAmount: 0,
      approvalType: 'department',
      departmentId: 'dept-finance',
      isSequential: true,
      isParallel: false,
      requiredApprovals: 1,
      isActive: true,
    } as any);
    // journal_entry: L1 = user type with NO designated user (missing approver)
    await database.approvalMatrix.create({
      name: 'JE L1 missing',
      module: 'finance',
      documentType: 'journal_entry',
      level: 1,
      minAmount: 0,
      approvalType: 'user',
      approverUserId: null,
      isSequential: true,
      isParallel: false,
      requiredApprovals: 1,
      isActive: true,
    } as any);

    // ── Template ──
    await database.workflowTemplates.create({
      name: 'Sales Invoice Approval',
      code: 'WF-SALES-INV',
      module: 'sales',
      documentType: 'sales_invoice',
      isActive: true,
      initialState: 'draft',
      states: JSON.stringify(DEFAULT_WORKFLOW_STATES),
      transitions: JSON.stringify(DEFAULT_TRANSITIONS),
    } as any);
    await database.workflowTemplates.create({
      name: 'Purchase Order Approval',
      code: 'WF-PO',
      module: 'purchase',
      documentType: 'purchase_order',
      isActive: true,
      initialState: 'draft',
      states: JSON.stringify(DEFAULT_WORKFLOW_STATES),
      transitions: JSON.stringify(DEFAULT_TRANSITIONS),
    } as any);
    await database.workflowTemplates.create({
      name: 'Journal Entry Approval',
      code: 'WF-JE',
      module: 'finance',
      documentType: 'journal_entry',
      isActive: true,
      initialState: 'draft',
      states: JSON.stringify(DEFAULT_WORKFLOW_STATES),
      transitions: JSON.stringify(DEFAULT_TRANSITIONS),
    } as any);

    // Register templates in the in-memory state machine
    stateMachine.registerTemplate('WF-SALES-INV', DEFAULT_WORKFLOW_STATES, DEFAULT_TRANSITIONS);
    stateMachine.registerTemplate('WF-PO', DEFAULT_WORKFLOW_STATES, DEFAULT_TRANSITIONS);
    stateMachine.registerTemplate('WF-JE', DEFAULT_WORKFLOW_STATES, DEFAULT_TRANSITIONS);
  }

  /** Create an instance already in 'under_review' (the state where approvals happen). */
  async function createInstance(overrides: Record<string, any> = {}): Promise<any> {
    return database.workflowInstances.create({
      templateId: overrides.templateId || 'WF-SALES-INV',
      documentId: overrides.documentId || `doc-${randomUUID()}`,
      documentType: overrides.documentType || 'sales_invoice',
      documentNumber: overrides.documentNumber,
      module: overrides.module || 'sales',
      currentState: overrides.currentState || 'under_review',
      previousState: overrides.previousState,
      status: overrides.status || 'active',
      initiatorId: overrides.initiatorId || null,
      assignedToId: overrides.assignedToId || null,
      assignedRole: overrides.assignedRole || null,
      approvalLevel: overrides.approvalLevel ?? 0,
      maxApprovalLevel: overrides.maxApprovalLevel ?? 1,
      amount: overrides.amount || 0,
      departmentId: overrides.departmentId || null,
      createdBy: overrides.createdBy || null,
      updatedBy: null,
    } as any);
  }

  async function approveAs(instanceId: string, actorId: string | undefined, dto: any = {}) {
    return instancesService.executeAction(
      instanceId,
      { action: 'approve', ...dto },
      { id: actorId as any, source: 'user' },
    );
  }

  // ═══════════════════════════════════════════════════════
  // H2.12 TEST MATRIX
  // ═══════════════════════════════════════════════════════

  it('1. Correct designated user approves → SUCCESS', async () => {
    const inst = await createInstance({ maxApprovalLevel: 1 });
    const res = await approveAs((inst as any).id, designatedUserId);
    expect(res.success).toBe(true);
    const fresh = await database.workflowInstances.findById((inst as any).id);
    expect(Number((fresh as any).approvalLevel)).toBe(1);
    expect((fresh as any).currentState).toBe('approved');
    expect((fresh as any).updatedBy).toBe(designatedUserId);
  }, 60000);

  it('2. Wrong user approves → FORBIDDEN', async () => {
    const inst = await createInstance({ maxApprovalLevel: 1 });
    await expect(approveAs((inst as any).id, otherUserId)).rejects.toThrow(ForbiddenException);
    // No state change
    const fresh = await database.workflowInstances.findById((inst as any).id);
    expect(Number((fresh as any).approvalLevel)).toBe(0);
    expect((fresh as any).currentState).toBe('under_review');
  }, 60000);

  it('3. Client userId impersonation → FORBIDDEN', async () => {
    const inst = await createInstance({ maxApprovalLevel: 1 });
    // Authenticated actor = designated user, but the body claims another user
    await expect(
      approveAs((inst as any).id, designatedUserId, { userId: otherUserId }),
    ).rejects.toThrow(ForbiddenException);
  }, 60000);

  it('4. Missing authentication (no actor) → safe denial', async () => {
    const inst = await createInstance({ maxApprovalLevel: 1 });
    await expect(approveAs((inst as any).id, undefined)).rejects.toThrow();
    const fresh = await database.workflowInstances.findById((inst as any).id);
    expect(Number((fresh as any).approvalLevel)).toBe(0);
  }, 60000);

  it('5. Generic workflow permission without designated eligibility → FAIL', async () => {
    // employee user has workflow.create permission in the app but is not the
    // designated approver → must be denied at the approver-eligibility boundary
    const inst = await createInstance({ maxApprovalLevel: 1 });
    await expect(approveAs((inst as any).id, employeeUserId)).rejects.toThrow(ForbiddenException);
  }, 60000);

  it('6. Correct role-based approver → SUCCESS (level 2, manager role)', async () => {
    // Level 1 (designated user) already approved → level 2 (manager) pending
    const inst = await createInstance({ maxApprovalLevel: 2, approvalLevel: 1 });
    const res = await approveAs((inst as any).id, managerUserId);
    expect(res.success).toBe(true);
    const fresh = await database.workflowInstances.findById((inst as any).id);
    expect(Number((fresh as any).approvalLevel)).toBe(2);
  }, 60000);

  it('7. Wrong role → FORBIDDEN', async () => {
    const inst = await createInstance({ maxApprovalLevel: 2, approvalLevel: 1 });
    await expect(approveAs((inst as any).id, employeeUserId)).rejects.toThrow(ForbiddenException);
  }, 60000);

  it('8. Admin without override → FORBIDDEN (no admin bypass exists)', async () => {
    // H2.7: the system has NO explicit admin-override feature, so an admin who
    // is not the designated approver must follow the same rule.
    const inst = await createInstance({ maxApprovalLevel: 1 });
    await expect(approveAs((inst as any).id, adminUserId)).rejects.toThrow(ForbiddenException);
  }, 60000);

  it('10. Already approved step → duplicate approval fails', async () => {
    const inst = await createInstance({ maxApprovalLevel: 1 });
    await approveAs((inst as any).id, designatedUserId);
    // Second approval attempt must fail (transition guard + duplicate guard)
    await expect(approveAs((inst as any).id, designatedUserId)).rejects.toThrow(
      BadRequestException,
    );
  }, 60000);

  it('10b. Duplicate guard: approvalLevel already maxed → FAIL', async () => {
    // Crafted state where the state machine still allows approve but the level
    // is already complete — the duplicate guard must fire.
    const inst = await createInstance({ maxApprovalLevel: 1, approvalLevel: 1 });
    await expect(approveAs((inst as any).id, designatedUserId)).rejects.toThrow(
      /already been fully approved/i,
    );
  }, 60000);

  it('11. Already rejected workflow → approval fails', async () => {
    const inst = await createInstance({ status: 'rejected', maxApprovalLevel: 1 });
    await expect(approveAs((inst as any).id, designatedUserId)).rejects.toThrow(
      BadRequestException,
    );
  }, 60000);

  it('12. Wrong workflow level → FORBIDDEN (level-2 approver cannot skip level 1)', async () => {
    // Level 1 is pending (approvalLevel 0) and designates the designated user;
    // the manager is only eligible at level 2.
    const inst = await createInstance({ maxApprovalLevel: 2, approvalLevel: 0 });
    await expect(approveAs((inst as any).id, managerUserId)).rejects.toThrow(ForbiddenException);
  }, 60000);

  it('13. Out-of-order approval → FORBIDDEN (level-1 approver cannot act at level 2)', async () => {
    // Level 1 approved → level 2 (manager role) now pending. The designated user
    // (only eligible at level 1) must be denied.
    const inst = await createInstance({ maxApprovalLevel: 2, approvalLevel: 1 });
    await expect(approveAs((inst as any).id, designatedUserId)).rejects.toThrow(ForbiddenException);
  }, 60000);

  it('14. Concurrent duplicate approval → exactly one success', async () => {
    // A single SQLite connection cannot interleave two write transactions (both
    // would fail with SQLITE_BUSY). True concurrency is exercised with TWO
    // connections to an ISOLATED db file: SQLite's file locking serializes the
    // two transactions, TransactionManager's bounded SQLITE_BUSY retry lets the
    // loser re-read after the winner commits, and the state guard rejects the
    // second approval. Exactly one transition may ever succeed.
    const raceDir = mkdtempSync(join(tmpdir(), 'h2-race-'));
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
    const database1 = new DatabaseService(d1 as any);
    const database2 = new DatabaseService(drizzle(c2 as any) as any);
    const buildSvc = (databaseX: DatabaseService) =>
      new WorkflowInstancesService(
        databaseX,
        { log: async () => undefined } as any,
        stateMachine,
        new ApprovalEngineService(databaseX),
        new TaskEngineService(databaseX),
        new NotificationEngineService(databaseX),
        new TransactionManager(databaseX),
      );
    const svc1 = buildSvc(database1);
    const svc2 = buildSvc(database2);

    const racer = await database1.users.create({
      email: 'racer@test.com',
      firstName: 'Racer',
      lastName: 'Test',
      passwordHash: 'x',
      isActive: true,
      refreshTokenVersion: 0,
    } as any);
    const racerId = (racer as any).id;
    await database1.approvalMatrix.create({
      name: 'Race L1',
      module: 'sales',
      documentType: 'sales_invoice',
      level: 1,
      minAmount: 0,
      approvalType: 'user',
      approverUserId: racerId,
      isSequential: true,
      isParallel: false,
      requiredApprovals: 1,
      isActive: true,
    } as any);
    const inst = await database1.workflowInstances.create({
      templateId: 'WF-SALES-INV',
      documentId: `doc-${randomUUID()}`,
      documentType: 'sales_invoice',
      module: 'sales',
      currentState: 'under_review',
      status: 'active',
      approvalLevel: 0,
      maxApprovalLevel: 1,
      amount: 0,
    } as any);

    const [r1, r2] = await Promise.allSettled([
      svc1.executeAction((inst as any).id, { action: 'approve' }, { id: racerId, source: 'user' }),
      svc2.executeAction((inst as any).id, { action: 'approve' }, { id: racerId, source: 'user' }),
    ]);
    const successes = [r1, r2].filter((r) => r.status === 'fulfilled').length;
    expect(successes).toBe(1);

    // Assert final state + history via a THIRD fresh connection (immune to any
    // driver-level lock state left on c1/c2 by the serialized race).
    const c3 = createClient({ url: raceFile });
    const database3 = new DatabaseService(drizzle(c3 as any) as any);
    const fresh = await database3.workflowInstances.findById((inst as any).id);
    expect(Number((fresh as any).approvalLevel)).toBe(1);
    expect((fresh as any).currentState).toBe('approved');
    const hist = await database3.workflowHistory.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'instanceId', operator: 'eq', value: (inst as any).id }],
    } as any);
    const approveRows = ((hist as any).data || []).filter((h: any) => h.action === 'approve');
    expect(approveRows.length).toBe(1);
  }, 60000);

  it('15. Audit trail records the authenticated actor', async () => {
    const inst = await createInstance({ maxApprovalLevel: 1 });
    await approveAs((inst as any).id, designatedUserId);
    const hist = await database.workflowHistory.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'instanceId', operator: 'eq', value: (inst as any).id }],
    } as any);
    const approveRows = ((hist as any).data || []).filter((h: any) => h.action === 'approve');
    expect(approveRows.length).toBeGreaterThan(0);
    for (const row of approveRows) {
      expect(row.userId).toBe(designatedUserId);
    }
  }, 60000);

  it('16. Client userId cannot alter the audit actor', async () => {
    const inst = await createInstance({ maxApprovalLevel: 1 });
    // Matching client userId is harmless; the authoritative actor is the session
    await approveAs((inst as any).id, designatedUserId, { userId: designatedUserId });
    const hist = await database.workflowHistory.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'instanceId', operator: 'eq', value: (inst as any).id }],
    } as any);
    const approveRows = ((hist as any).data || []).filter((h: any) => h.action === 'approve');
    expect(approveRows[0].userId).toBe(designatedUserId);
    // Non-matching client userId was already rejected in test 3
  }, 60000);

  it('17. Cross-scope workflow access → denied (approver cannot act outside their scope)', async () => {
    // The designated sales approver is NOT the department approver for POs
    const po = await createInstance({
      templateId: 'WF-PO',
      module: 'purchase',
      documentType: 'purchase_order',
      maxApprovalLevel: 1,
    });
    await expect(approveAs((po as any).id, designatedUserId)).rejects.toThrow(ForbiddenException);
    // The department approver IS eligible for the PO
    const ok = await approveAs((po as any).id, deptApproverUserId);
    expect(ok.success).toBe(true);
  }, 60000);

  it('17b. Department-based approval: non-department user → FORBIDDEN', async () => {
    const po = await createInstance({
      templateId: 'WF-PO',
      module: 'purchase',
      documentType: 'purchase_order',
      maxApprovalLevel: 1,
    });
    await expect(approveAs((po as any).id, managerUserId)).rejects.toThrow(ForbiddenException);
  }, 60000);

  it('18. Invalid workflow ID → safe error', async () => {
    await expect(approveAs('missing-instance-id', designatedUserId)).rejects.toThrow(
      NotFoundException,
    );
  }, 60000);

  it('19. Missing approver (matrix user-type with no designated user) → safe failure', async () => {
    const je = await createInstance({
      templateId: 'WF-JE',
      module: 'finance',
      documentType: 'journal_entry',
      maxApprovalLevel: 1,
    });
    // Nobody is eligible — even the admin and a would-be approver are denied
    await expect(approveAs((je as any).id, designatedUserId)).rejects.toThrow(ForbiddenException);
    await expect(approveAs((je as any).id, adminUserId)).rejects.toThrow(ForbiddenException);
  }, 60000);

  it('20. Failed approval leaves no partial state (transaction rollback)', async () => {
    const inst = await createInstance({ maxApprovalLevel: 1 });
    await expect(approveAs((inst as any).id, employeeUserId)).rejects.toThrow(ForbiddenException);
    const fresh = await database.workflowInstances.findById((inst as any).id);
    expect(Number((fresh as any).approvalLevel)).toBe(0);
    expect((fresh as any).currentState).toBe('under_review');
    expect((fresh as any).status).toBe('active');
    // No history rows for the failed attempt
    const hist = await database.workflowHistory.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'instanceId', operator: 'eq', value: (inst as any).id }],
    } as any);
    expect((hist as any).data.length).toBe(0);
  }, 60000);

  it('Reject: only the designated approver can reject', async () => {
    const inst = await createInstance({ maxApprovalLevel: 1 });
    await expect(
      instancesService.executeAction(
        (inst as any).id,
        { action: 'reject', comment: 'nope' },
        { id: otherUserId, source: 'user' },
      ),
    ).rejects.toThrow(ForbiddenException);
    const res = await instancesService.executeAction(
      (inst as any).id,
      { action: 'reject', comment: 'nope' },
      { id: designatedUserId, source: 'user' },
    );
    expect(res.success).toBe(true);
    const fresh = await database.workflowInstances.findById((inst as any).id);
    expect((fresh as any).status).toBe('rejected');
    expect((fresh as any).currentState).toBe('rejected');
  }, 60000);

  it('Return: only the designated approver can return to draft', async () => {
    const inst = await createInstance({ maxApprovalLevel: 1 });
    await expect(
      instancesService.executeAction(
        (inst as any).id,
        { action: 'return', comment: 'fix it' },
        { id: employeeUserId, source: 'user' },
      ),
    ).rejects.toThrow(ForbiddenException);
    const res = await instancesService.executeAction(
      (inst as any).id,
      { action: 'return', comment: 'fix it' },
      { id: designatedUserId, source: 'user' },
    );
    expect(res.success).toBe(true);
    const fresh = await database.workflowInstances.findById((inst as any).id);
    expect((fresh as any).currentState).toBe('draft');
  }, 60000);

  it('System-triggered transitions (document status changes) still work', async () => {
    const inst = await createInstance({ maxApprovalLevel: 1 });
    const res = await instancesService.executeAction(
      (inst as any).id,
      { action: 'approve', comment: 'auto' },
      { id: 'system', source: 'system' },
    );
    expect(res.success).toBe(true);
    const fresh = await database.workflowInstances.findById((inst as any).id);
    expect(Number((fresh as any).approvalLevel)).toBe(1);
    // The system actor is recorded as the authoritative actor
    const hist = await database.workflowHistory.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'instanceId', operator: 'eq', value: (inst as any).id }],
    } as any);
    const approveRows = ((hist as any).data || []).filter((h: any) => h.action === 'approve');
    expect(approveRows[0].userId).toBe('system');
  }, 60000);

  it("Task completion: non-assignee cannot complete another user's task", async () => {
    const inst = await createInstance({ maxApprovalLevel: 1 });
    const task = await taskEngine.createTask({
      instanceId: (inst as any).id,
      module: 'sales',
      title: 'Approval task',
      taskType: 'approval',
      assignedToId: designatedUserId,
    });
    await expect(taskEngine.completeTask((task as any).id, otherUserId)).rejects.toThrow(
      ForbiddenException,
    );
    const done = await taskEngine.completeTask((task as any).id, designatedUserId);
    expect((done as any).status).toBe('completed');
  }, 60000);

  it('Task delegation: only the assignee (or admin) may delegate', async () => {
    const inst = await createInstance({ maxApprovalLevel: 1 });
    const task = await taskEngine.createTask({
      instanceId: (inst as any).id,
      module: 'sales',
      title: 'Approval task',
      taskType: 'approval',
      assignedToId: designatedUserId,
    });
    await expect(
      taskEngine.delegateTask((task as any).id, otherUserId, managerUserId),
    ).rejects.toThrow(ForbiddenException);
    const delegated = await taskEngine.delegateTask(
      (task as any).id,
      designatedUserId,
      managerUserId,
    );
    expect((delegated as any).status).toBe('delegated');
    expect((delegated as any).assignedToId).toBe(managerUserId);
  }, 60000);
});
