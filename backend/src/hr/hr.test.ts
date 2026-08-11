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

import { AttendanceService } from './services/attendance.service';
import { EmployeesService } from './services/employees.service';
import { EmployeeAdvancesService } from './services/finance.service';
import { LeaveRequestsService } from './services/leave.service';
import { DepartmentsService, DesignationsService } from './services/organization.service';
import { PayrollService, SalaryStructuresService } from './services/payroll.service';

/**
 * REAL-DB integration tests for the Phase-8 HR module.
 *
 * Verifies: auto employee codes, employee CRUD + timeline, department
 * duplicate prevention, attendance upsert (duplicate prevention), leave
 * balance + approval, payroll run generation with salary calc, advances.
 */
describe('HR module (real DB)', () => {
  let database: DatabaseService;
  let employees: EmployeesService;
  let departments: DepartmentsService;
  let designations: DesignationsService;
  let attendance: AttendanceService;
  let leave: LeaveRequestsService;
  let payroll: PayrollService;
  let salaries: SalaryStructuresService;
  let advances: EmployeeAdvancesService;

  const userId = 'user-hr-1';

  beforeAll(async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'hr-'));
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
    departments = new DepartmentsService(database, audit);
    designations = new DesignationsService(database, audit);
    attendance = new AttendanceService(database, audit);
    leave = new LeaveRequestsService(database, audit);
    salaries = new SalaryStructuresService(database);
    payroll = new PayrollService(database, audit, salaries);
    advances = new EmployeeAdvancesService(database, audit);
  });

  afterAll(async () => {
    await database.onModuleDestroy?.().catch(() => undefined);
  });

  it('auto-generates sequential employee codes and records a joined timeline event', async () => {
    const e1 = await employees.create(
      { firstName: 'Rahul', lastName: 'Patil', mobile: '9822011122' },
      userId,
    );
    expect(e1.employeeCode).toBe('EMP-000001');
    const e2 = await employees.create({ firstName: 'Suresh', lastName: 'Deshmukh' }, userId);
    expect(e2.employeeCode).toBe('EMP-000002');
    const detail = await employees.findById(e1.id);
    expect(detail.timeline.some((t: any) => t.eventType === 'joined')).toBe(true);
  });

  it('creates departments and prevents duplicate names', async () => {
    const d = await departments.create({ departmentName: 'Sales' }, userId);
    expect(d.departmentName).toBe('Sales');
    await expect(departments.create({ departmentName: 'Sales' }, userId)).rejects.toThrow();
  });

  it('creates designations linked to a department', async () => {
    const dept = await departments.create({ departmentName: 'Accounts' }, userId);
    const desig = await designations.create(
      { designationName: 'Accountant', departmentId: dept.id },
      userId,
    );
    expect(desig.designationName).toBe('Accountant');
  });

  it('marks attendance and prevents duplicate records per employee+date', async () => {
    const emp = await employees.create({ firstName: 'Attendance', lastName: 'Test' }, userId);
    const a1 = await attendance.mark(
      {
        employeeId: emp.id,
        attendanceDate: '2026-08-01',
        status: 'present',
        checkIn: '09:00',
        checkOut: '18:00',
      },
      userId,
    );
    expect(a1.status).toBe('present');
    // Same employee + date → upsert (update, not new row)
    const a2 = await attendance.mark(
      {
        employeeId: emp.id,
        attendanceDate: '2026-08-01',
        status: 'late',
        checkIn: '10:00',
        checkOut: '18:00',
      },
      userId,
    );
    expect(a2.id).toBe(a1.id);
    expect(a2.status).toBe('late');
    const all = await attendance.findAll({ employeeId: emp.id });
    expect((all as any).total).toBe(1);
  });

  it('computes leave balances and enforces the negative-balance guard', async () => {
    const emp = await employees.create({ firstName: 'Leave', lastName: 'Balance' }, userId);
    await leave.allocate(emp.id, 'casual', 12, true, userId);
    const balances = await leave.balances(emp.id);
    const casual = balances.find((b) => b.leaveType === 'casual');
    expect(casual?.available).toBe(12);

    // 5 working-day leave (Mon–Fri 2026-09-07 → 2026-09-11)
    const req = await leave.create(
      { employeeId: emp.id, leaveType: 'casual', startDate: '2026-09-07', endDate: '2026-09-11' },
      userId,
    );
    expect(req.status).toBe('pending');
    expect(Number(req.numberOfDays)).toBe(5);

    // 20-day leave exceeds available (12) → rejected
    await expect(
      leave.create(
        { employeeId: emp.id, leaveType: 'casual', startDate: '2026-10-05', endDate: '2026-10-30' },
        userId,
      ),
    ).rejects.toThrow();

    // Approve → pending moves to used
    await leave.approve(req.id, userId);
    const after = await leave.balances(emp.id);
    const casualAfter = after.find((b) => b.leaveType === 'casual');
    expect(Number(casualAfter?.used)).toBeGreaterThanOrEqual(5);
  });

  it('generates a payroll run with correct gross/net and payslips', async () => {
    const emp = await employees.create({ firstName: 'Payroll', lastName: 'Test' }, userId);
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
    expect(Number(run.employeeCount)).toBeGreaterThanOrEqual(1);
    expect(Number(run.netTotal)).toBeGreaterThan(0);

    const detail = await payroll.findRunById(run.id);
    const line = detail.lines.find((l: any) => l.employeeId === emp.id);
    expect(line).toBeTruthy();
    expect(line.grossSalary).toBeCloseTo(30000, 1); // 20000 + 8000 + 2000
    expect(line.netSalary).toBeCloseTo(28000, 1); // 30000 - 1800 - 200

    const payslip = await payroll.payslip(emp.id, run.id);
    expect(payslip).toBeTruthy();
    expect(payslip.line.netSalary).toBeCloseTo(28000, 1);
  });

  it('tracks advances with approval and recovery', async () => {
    const emp = await employees.create({ firstName: 'Advance', lastName: 'Test' }, userId);
    const adv = await advances.create(
      { employeeId: emp.id, amount: 5000, reason: 'Travel' },
      userId,
    );
    expect(adv.advanceNumber).toMatch(/^ADV-/);
    expect(Number(adv.outstandingAmount)).toBe(5000);
    await advances.approve(adv.id, userId);
    const rec = await advances.recover(adv.id, 2000, userId);
    expect(Number(rec.outstandingAmount)).toBe(3000);
  });

  it('computes the HR dashboard KPIs without crashing', async () => {
    const dash = await employees.dashboard();
    expect(dash.totalEmployees).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(dash.departmentDistribution)).toBe(true);
  });
});
