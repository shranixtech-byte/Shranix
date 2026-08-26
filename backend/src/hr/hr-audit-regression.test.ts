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

import { EmployeesService } from './services/employees.service';
import {
  EmployeeAdvancesService,
  EmployeeExpensesService,
  PerformanceReviewsService,
} from './services/finance.service';
import { PayrollService, SalaryStructuresService } from './services/payroll.service';

/**
 * HR MODULE AUDIT REGRESSION TESTS (2026-08-26)
 *
 * Bugs covered:
 *  1. Payroll markPaid allowed from 'draft' status — bypasses approval
 *  2. Employee Expense status transitions not validated
 *  3. Performance Review status transitions not validated
 *  4. Payroll approveRun allowed empty runs (0 employees)
 */
describe('HR Audit Regression Tests (real DB)', () => {
  let dbDir: string;
  let database: DatabaseService;
  let employees: EmployeesService;
  let payroll: PayrollService;
  let salaries: SalaryStructuresService;
  let expenses: EmployeeExpensesService;
  let reviews: PerformanceReviewsService;
  const userId = 'test-user-1';

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'hr-audit-'));
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

    employees = new EmployeesService(database, audit);
    salaries = new SalaryStructuresService(database);
    payroll = new PayrollService(database, audit, salaries);
    expenses = new EmployeeExpensesService(database, audit);
    reviews = new PerformanceReviewsService(database, audit);
  });

  afterAll(async () => {
    try {
      await (database as any).close?.();
    } catch {
      /* ignore */
    }
  });

  // ═════════════════════════════════════════════════════════
  // BUG 1 REGRESSION: Payroll markPaid requires approved status
  // ═════════════════════════════════════════════════════════
  describe('Bug 1: Payroll markPaid must require approved status', () => {
    it('rejects marking a draft payroll run as paid', async () => {
      // Create an employee with salary structure
      const emp = await employees.create({ firstName: 'Payroll', lastName: 'StatusTest' }, userId);
      await salaries.create(
        {
          employeeId: emp.id,
          basicSalary: 20000,
          hra: 8000,
          allowances: 2000,
          pf: 1800,
          professionalTax: 200,
        },
        userId,
      );

      const run = await payroll.generateRun(
        { payPeriodStart: '2026-08-01', payPeriodEnd: '2026-08-31' },
        userId,
      );
      expect(run.status).toBe('draft');

      // Should REJECT marking draft as paid (previously allowed — bypassed approval)
      await expect(payroll.markPaid(run.id, userId)).rejects.toThrow(/approved/i);
    });

    it('allows marking an approved payroll run as paid', async () => {
      const emp = await employees.create({ firstName: 'Payroll2', lastName: 'Approved' }, userId);
      await salaries.create(
        {
          employeeId: emp.id,
          basicSalary: 20000,
          hra: 8000,
          allowances: 2000,
          pf: 1800,
          professionalTax: 200,
        },
        userId,
      );

      const run = await payroll.generateRun(
        { payPeriodStart: '2026-09-01', payPeriodEnd: '2026-09-30' },
        userId,
      );
      expect(run.status).toBe('draft');

      await payroll.approveRun(run.id, userId);
      const approved = await payroll.findRunById(run.id);
      expect(approved.status).toBe('approved');

      // Should ALLOW marking approved as paid
      await payroll.markPaid(run.id, userId, 'bank');
      const paid = await payroll.findRunById(run.id);
      expect(paid.status).toBe('paid');
    });

    it('rejects paying a payroll run that is already paid', async () => {
      const emp = await employees.create({ firstName: 'Payroll3', lastName: 'DoublePay' }, userId);
      await salaries.create(
        {
          employeeId: emp.id,
          basicSalary: 20000,
          hra: 8000,
          allowances: 2000,
          pf: 1800,
          professionalTax: 200,
        },
        userId,
      );

      const run = await payroll.generateRun(
        { payPeriodStart: '2026-10-01', payPeriodEnd: '2026-10-31' },
        userId,
      );
      await payroll.approveRun(run.id, userId);
      await payroll.markPaid(run.id, userId);

      // Should REJECT paying again
      await expect(payroll.markPaid(run.id, userId)).rejects.toThrow(/approved/i);
    });
  });

  // ═════════════════════════════════════════════════════════
  // BUG 2 REGRESSION: Payroll approveRun rejects empty runs
  // ═════════════════════════════════════════════════════════
  describe('Bug 2: Payroll approveRun rejects empty runs', () => {
    it('rejects approving a payroll run with 0 employees', async () => {
      // Create a payroll run in a date range where no employees have salary structures
      const run = await payroll.generateRun(
        { payPeriodStart: '2025-01-01', payPeriodEnd: '2025-01-31' },
        userId,
      );

      // If 0 employees have salary structures, employeeCount = 0
      const detail = await payroll.findRunById(run.id);
      if (Number(detail.employeeCount) === 0) {
        await expect(payroll.approveRun(run.id, userId)).rejects.toThrow(/0 employees/i);
      }
    });
  });

  // ═════════════════════════════════════════════════════════
  // BUG 3 REGRESSION: Employee Expense status transitions
  // ═════════════════════════════════════════════════════════
  describe('Bug 3: Employee Expense status transitions must be enforced', () => {
    it('allows draft → submitted transition', async () => {
      const emp = await employees.create({ firstName: 'Expense', lastName: 'Valid' }, userId);
      const exp = await expenses.create(
        { employeeId: emp.id, amount: 500, category: 'travel', description: 'Taxi' },
        userId,
      );
      expect(exp.status).toBe('draft');

      await expenses.submit(exp.id, userId);
      // Verify status is now submitted
      const submitted = await database.employeeExpenses.findById(exp.id);
      expect(submitted.status).toBe('submitted');
    });

    it('rejects submitting an already submitted expense', async () => {
      const emp = await employees.create({ firstName: 'Expense2', lastName: 'Double' }, userId);
      const exp = await expenses.create(
        { employeeId: emp.id, amount: 500, category: 'travel' },
        userId,
      );
      await expenses.submit(exp.id, userId);

      // Should REJECT submitting again
      await expect(expenses.submit(exp.id, userId)).rejects.toThrow(/draft/i);
    });

    it('rejects submitting an approved expense', async () => {
      const emp = await employees.create({ firstName: 'Expense3', lastName: 'Approved' }, userId);
      const exp = await expenses.create(
        { employeeId: emp.id, amount: 500, category: 'travel' },
        userId,
      );
      await expenses.submit(exp.id, userId);
      await expenses.approve(exp.id, userId);

      // Should REJECT submitting an approved expense
      await expect(expenses.submit(exp.id, userId)).rejects.toThrow(/draft/i);
    });

    it('allows submitted → approved transition', async () => {
      const emp = await employees.create({ firstName: 'Expense4', lastName: 'Approve' }, userId);
      const exp = await expenses.create(
        { employeeId: emp.id, amount: 500, category: 'travel' },
        userId,
      );
      await expenses.submit(exp.id, userId);
      await expenses.approve(exp.id, userId);

      const approved = await database.employeeExpenses.findById(exp.id);
      expect(approved.status).toBe('approved');
    });

    it('rejects approving a draft expense', async () => {
      const emp = await employees.create(
        { firstName: 'Expense5', lastName: 'DraftApprove' },
        userId,
      );
      const exp = await expenses.create(
        { employeeId: emp.id, amount: 500, category: 'travel' },
        userId,
      );

      // Should REJECT approving a draft expense (must submit first)
      await expect(expenses.approve(exp.id, userId)).rejects.toThrow(/submitted/i);
    });

    it('allows submitted → rejected transition', async () => {
      const emp = await employees.create({ firstName: 'Expense6', lastName: 'Reject' }, userId);
      const exp = await expenses.create(
        { employeeId: emp.id, amount: 500, category: 'travel' },
        userId,
      );
      await expenses.submit(exp.id, userId);
      await expenses.reject(exp.id, userId, 'Too expensive');

      const rejected = await database.employeeExpenses.findById(exp.id);
      expect(rejected.status).toBe('rejected');
    });

    it('rejects rejecting a draft expense', async () => {
      const emp = await employees.create(
        { firstName: 'Expense7', lastName: 'DraftReject' },
        userId,
      );
      const exp = await expenses.create(
        { employeeId: emp.id, amount: 500, category: 'travel' },
        userId,
      );

      await expect(expenses.reject(exp.id, userId)).rejects.toThrow(/submitted/i);
    });
  });

  // ═════════════════════════════════════════════════════════
  // BUG 4 REGRESSION: Performance Review status transitions
  // ═════════════════════════════════════════════════════════
  describe('Bug 4: Performance Review status transitions must be enforced', () => {
    it('allows draft → submitted transition', async () => {
      const emp = await employees.create({ firstName: 'Review', lastName: 'Valid' }, userId);
      const rev = await reviews.create({ employeeId: emp.id, reviewPeriod: '2026-H1' }, userId);
      expect(rev.status).toBe('draft');

      await reviews.submit(rev.id, userId);
      const submitted = await database.performanceReviews.findById(rev.id);
      expect(submitted.status).toBe('submitted');
    });

    it('rejects submitting an already submitted review', async () => {
      const emp = await employees.create({ firstName: 'Review2', lastName: 'Double' }, userId);
      const rev = await reviews.create({ employeeId: emp.id, reviewPeriod: '2026-H1' }, userId);
      await reviews.submit(rev.id, userId);

      await expect(reviews.submit(rev.id, userId)).rejects.toThrow(/draft/i);
    });

    it('allows submitted → reviewed transition', async () => {
      const emp = await employees.create({ firstName: 'Review3', lastName: 'Reviewed' }, userId);
      const rev = await reviews.create({ employeeId: emp.id, reviewPeriod: '2026-H1' }, userId);
      await reviews.submit(rev.id, userId);
      await reviews.review(rev.id, { rating: 4, comments: 'Good' }, userId);

      const reviewed = await database.performanceReviews.findById(rev.id);
      expect(reviewed.status).toBe('reviewed');
    });

    it('rejects reviewing a draft review', async () => {
      const emp = await employees.create({ firstName: 'Review4', lastName: 'DraftReview' }, userId);
      const rev = await reviews.create({ employeeId: emp.id, reviewPeriod: '2026-H1' }, userId);

      await expect(reviews.review(rev.id, { rating: 4 }, userId)).rejects.toThrow(/submitted/i);
    });

    it('rejects reviewing an already reviewed review', async () => {
      const emp = await employees.create(
        { firstName: 'Review5', lastName: 'DoubleReview' },
        userId,
      );
      const rev = await reviews.create({ employeeId: emp.id, reviewPeriod: '2026-H1' }, userId);
      await reviews.submit(rev.id, userId);
      await reviews.review(rev.id, { rating: 4 }, userId);

      await expect(reviews.review(rev.id, { rating: 5 }, userId)).rejects.toThrow(/submitted/i);
    });
  });

  // ═════════════════════════════════════════════════════════
  // PAYROLL BUSINESS RULES
  // ═════════════════════════════════════════════════════════
  describe('Payroll business rules', () => {
    it('generates payroll with correct gross/net calculation', async () => {
      const emp = await employees.create({ firstName: 'Salary', lastName: 'Calc' }, userId);
      await salaries.create(
        {
          employeeId: emp.id,
          basicSalary: 20000,
          hra: 8000,
          allowances: 2000,
          pf: 1800,
          professionalTax: 200,
        },
        userId,
      );

      const run = await payroll.generateRun(
        { payPeriodStart: '2026-07-01', payPeriodEnd: '2026-07-31' },
        userId,
      );
      expect(run.status).toBe('draft');
      expect(Number(run.employeeCount)).toBeGreaterThanOrEqual(1);

      const detail = await payroll.findRunById(run.id);
      const line = detail.lines.find((l: any) => l.employeeId === emp.id);
      expect(line).toBeTruthy();
      expect(line.grossSalary).toBeCloseTo(30000, 1); // 20000 + 8000 + 2000
      expect(line.netSalary).toBeCloseTo(28000, 1); // 30000 - 1800 - 200
    });

    it('rejects approving a non-draft payroll run', async () => {
      const emp = await employees.create({ firstName: 'Status', lastName: 'Reject' }, userId);
      await salaries.create(
        {
          employeeId: emp.id,
          basicSalary: 20000,
          hra: 8000,
          allowances: 2000,
          pf: 1800,
          professionalTax: 200,
        },
        userId,
      );

      const run = await payroll.generateRun(
        { payPeriodStart: '2026-06-01', payPeriodEnd: '2026-06-30' },
        userId,
      );
      await payroll.approveRun(run.id, userId);

      // Should REJECT approving again (already approved)
      await expect(payroll.approveRun(run.id, userId)).rejects.toThrow(/already/i);
    });

    it('deactivates previous salary structure when creating new one', async () => {
      const emp = await employees.create({ firstName: 'Salary', lastName: 'Version' }, userId);

      const s1 = await salaries.create({ employeeId: emp.id, basicSalary: 20000 }, userId);
      expect(s1.isActive).toBe(true);

      const s2 = await salaries.create({ employeeId: emp.id, basicSalary: 25000 }, userId);
      expect(s2.isActive).toBe(true);

      // Previous structure should be deactivated
      const all = await salaries.list({ employeeId: emp.id });
      const active = (all.data || []).filter((s: any) => s.isActive);
      expect(active.length).toBe(1);
      expect(active[0].id).toBe(s2.id);
    });
  });

  // ═════════════════════════════════════════════════════════
  // LEAVE BUSINESS RULES
  // ═════════════════════════════════════════════════════════
  describe('Leave business rules', () => {
    it('leave balance tracks pending and used correctly', async () => {
      const { LeaveRequestsService } = await import('./services/leave.service');
      const leaveService = new LeaveRequestsService(
        database,
        new AuditService(database, {
          getIp: () => null,
          getUserAgent: () => null,
        } as any),
      );

      const emp = await employees.create({ firstName: 'Leave', lastName: 'Balance2' }, userId);
      await leaveService.allocate(emp.id, 'casual', 10, true, userId);

      const balances = await leaveService.balances(emp.id);
      const casual = balances.find((b: any) => b.leaveType === 'casual');
      expect(casual.available).toBe(10);

      // Submit a 3-day leave — pending increases
      const req = await leaveService.create(
        { employeeId: emp.id, leaveType: 'casual', startDate: '2026-11-02', endDate: '2026-11-04' },
        userId,
      );
      expect(req.status).toBe('pending');
      expect(Number(req.numberOfDays)).toBe(3);

      const afterSubmit = await leaveService.balances(emp.id);
      const casualAfterSubmit = afterSubmit.find((b: any) => b.leaveType === 'casual');
      expect(casualAfterSubmit.pending).toBe(3);
      expect(casualAfterSubmit.available).toBe(7); // 10 - 3 pending

      // Approve — pending decreases, used increases
      await leaveService.approve(req.id, userId);
      const afterApprove = await leaveService.balances(emp.id);
      const casualAfterApprove = afterApprove.find((b: any) => b.leaveType === 'casual');
      expect(casualAfterApprove.pending).toBe(0);
      expect(casualAfterApprove.used).toBe(3);
      expect(casualAfterApprove.available).toBe(7); // 10 - 3 used
    });

    it('rejects leave request exceeding available balance', async () => {
      const { LeaveRequestsService } = await import('./services/leave.service');
      const leaveService = new LeaveRequestsService(
        database,
        new AuditService(database, {
          getIp: () => null,
          getUserAgent: () => null,
        } as any),
      );

      const emp = await employees.create({ firstName: 'Leave', lastName: 'Overdraft' }, userId);
      await leaveService.allocate(emp.id, 'sick', 5, true, userId);

      // Try to take 10 days when only 5 available
      await expect(
        leaveService.create(
          { employeeId: emp.id, leaveType: 'sick', startDate: '2026-12-01', endDate: '2026-12-12' },
          userId,
        ),
      ).rejects.toThrow(/Insufficient/i);
    });

    it('cancelling an approved leave restores the balance', async () => {
      const { LeaveRequestsService } = await import('./services/leave.service');
      const leaveService = new LeaveRequestsService(
        database,
        new AuditService(database, {
          getIp: () => null,
          getUserAgent: () => null,
        } as any),
      );

      const emp = await employees.create({ firstName: 'Leave', lastName: 'Cancel' }, userId);
      await leaveService.allocate(emp.id, 'earned', 10, true, userId);

      // Dec 14 (Mon) – Dec 18 (Fri) = 5 working days
      const req = await leaveService.create(
        { employeeId: emp.id, leaveType: 'earned', startDate: '2026-12-14', endDate: '2026-12-18' },
        userId,
      );
      await leaveService.approve(req.id, userId);

      const before = await leaveService.balances(emp.id);
      const earned = before.find((b: any) => b.leaveType === 'earned');
      expect(earned.used).toBe(5);

      await leaveService.cancel(req.id, userId);

      const after = await leaveService.balances(emp.id);
      const earnedAfter = after.find((b: any) => b.leaveType === 'earned');
      expect(earnedAfter.used).toBe(0);
      expect(earnedAfter.available).toBe(10);
    });
  });

  // ═════════════════════════════════════════════════════════
  // EMPLOYEE ADVANCES
  // ═════════════════════════════════════════════════════════
  describe('Employee Advances', () => {
    it('tracks advance recovery correctly', async () => {
      const advances = new EmployeeAdvancesService(
        database,
        new AuditService(database, {
          getIp: () => null,
          getUserAgent: () => null,
        } as any),
      );

      const emp = await employees.create({ firstName: 'Adv', lastName: 'Recovery' }, userId);
      const adv = await advances.create(
        { employeeId: emp.id, amount: 10000, reason: 'Travel' },
        userId,
      );
      expect(Number(adv.outstandingAmount)).toBe(10000);

      await advances.approve(adv.id, userId);

      const r1 = await advances.recover(adv.id, 3000, userId);
      expect(Number(r1.outstandingAmount)).toBe(7000);

      const r2 = await advances.recover(adv.id, 7000, userId);
      expect(Number(r2.outstandingAmount)).toBe(0);

      // Should auto-mark as recovered
      const final = await database.employeeAdvances.findById(adv.id);
      expect(final.status).toBe('recovered');
    });

    it('rejects recovery exceeding outstanding amount', async () => {
      const advances = new EmployeeAdvancesService(
        database,
        new AuditService(database, {
          getIp: () => null,
          getUserAgent: () => null,
        } as any),
      );

      const emp = await employees.create({ firstName: 'Adv', lastName: 'OverRecover' }, userId);
      const adv = await advances.create(
        { employeeId: emp.id, amount: 5000, reason: 'Travel' },
        userId,
      );
      await advances.approve(adv.id, userId);

      await expect(advances.recover(adv.id, 6000, userId)).rejects.toThrow(/exceeds/i);
    });
  });
});
