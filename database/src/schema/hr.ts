import crypto from 'node:crypto';

import {
  pgTable as pgTableBase,
  text as pgText,
  integer as pgInteger,
  real as pgReal,
  uuid as pgUuid,
  timestamp as pgTimestamp,
  boolean as pgBoolean,
  uniqueIndex as pgUniqueIndex,
  index as pgIndex,
} from 'drizzle-orm/pg-core';
import {
  sqliteTable as sqliteTableBase,
  text as sqliteText,
  integer as sqliteInteger,
  real as sqliteReal,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';

// ── SQLite base ──────────────────────────────────────────
const sqliteBase = {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: sqliteText('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: sqliteText('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString()),
  deletedAt: sqliteText('deleted_at'),
  isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false),
};

// ── PostgreSQL base ──────────────────────────────────────
const pgBase = {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pgTimestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: pgTimestamp('deleted_at', { withTimezone: true }),
  isDeleted: pgBoolean('is_deleted').notNull().default(false),
};

// ═════════════════════════════════════════════════════════
// DEPARTMENTS
// ═════════════════════════════════════════════════════════
export const sqliteDepartments = sqliteTableBase(
  'shranix_departments',
  {
    ...sqliteBase,
    departmentCode: sqliteText('department_code').notNull(),
    departmentName: sqliteText('department_name').notNull(),
    managerId: sqliteText('manager_id'),
    status: sqliteText('status').notNull().default('active'),
    description: sqliteText('description'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    codeIdx: uniqueIndex('hr_dept_code_idx').on(table.departmentCode),
    nameIdx: uniqueIndex('hr_dept_name_idx').on(table.departmentName),
  }),
);

export const pgDepartments = pgTableBase(
  'shranix_departments',
  {
    ...pgBase,
    departmentCode: pgText('department_code').notNull(),
    departmentName: pgText('department_name').notNull(),
    managerId: pgUuid('manager_id'),
    status: pgText('status').notNull().default('active'),
    description: pgText('description'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    codeIdx: pgUniqueIndex('hr_dept_code_idx').on(table.departmentCode),
    nameIdx: pgUniqueIndex('hr_dept_name_idx').on(table.departmentName),
  }),
);

// ═════════════════════════════════════════════════════════
// DESIGNATIONS
// ═════════════════════════════════════════════════════════
export const sqliteDesignations = sqliteTableBase(
  'shranix_designations',
  {
    ...sqliteBase,
    designationCode: sqliteText('designation_code').notNull(),
    designationName: sqliteText('designation_name').notNull(),
    departmentId: sqliteText('department_id'),
    level: sqliteInteger('level').notNull().default(1),
    status: sqliteText('status').notNull().default('active'),
    description: sqliteText('description'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    codeIdx: uniqueIndex('hr_desig_code_idx').on(table.designationCode),
  }),
);

export const pgDesignations = pgTableBase(
  'shranix_designations',
  {
    ...pgBase,
    designationCode: pgText('designation_code').notNull(),
    designationName: pgText('designation_name').notNull(),
    departmentId: pgUuid('department_id'),
    level: pgInteger('level').notNull().default(1),
    status: pgText('status').notNull().default('active'),
    description: pgText('description'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    codeIdx: pgUniqueIndex('hr_desig_code_idx').on(table.designationCode),
  }),
);

// ═════════════════════════════════════════════════════════
// EMPLOYEES
// ═════════════════════════════════════════════════════════
export const sqliteEmployees = sqliteTableBase(
  'shranix_employees',
  {
    ...sqliteBase,
    employeeCode: sqliteText('employee_code').notNull(),
    firstName: sqliteText('first_name').notNull(),
    middleName: sqliteText('middle_name'),
    lastName: sqliteText('last_name'),
    gender: sqliteText('gender'),
    dateOfBirth: sqliteText('date_of_birth'),
    mobile: sqliteText('mobile'),
    altMobile: sqliteText('alt_mobile'),
    email: sqliteText('email'),
    emergencyContact: sqliteText('emergency_contact'),
    permanentAddress: sqliteText('permanent_address'),
    currentAddress: sqliteText('current_address'),
    village: sqliteText('village'),
    taluka: sqliteText('taluka'),
    district: sqliteText('district'),
    state: sqliteText('state'),
    pincode: sqliteText('pincode'),
    departmentId: sqliteText('department_id'),
    designationId: sqliteText('designation_id'),
    reportingManagerId: sqliteText('reporting_manager_id'),
    joiningDate: sqliteText('joining_date'),
    confirmationDate: sqliteText('confirmation_date'),
    employmentType: sqliteText('employment_type').notNull().default('full_time'), // full_time | part_time | contract | temporary | intern
    workLocation: sqliteText('work_location'),
    branchId: sqliteText('branch_id'),
    status: sqliteText('status').notNull().default('active'), // active | inactive | resigned | terminated | retired
    pan: sqliteText('pan'),
    aadhaar: sqliteText('aadhaar'),
    bankAccount: sqliteText('bank_account'),
    ifsc: sqliteText('ifsc'),
    upi: sqliteText('upi'),
    userId: sqliteText('user_id'), // user↔employee mapping
    shiftId: sqliteText('shift_id'),
    notes: sqliteText('notes'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    codeIdx: uniqueIndex('hr_emp_code_idx').on(table.employeeCode),
    deptIdx: index('hr_emp_dept_idx').on(table.departmentId),
    statusIdx: index('hr_emp_status_idx').on(table.status),
    userIdx: index('hr_emp_user_idx').on(table.userId),
  }),
);

export const pgEmployees = pgTableBase(
  'shranix_employees',
  {
    ...pgBase,
    employeeCode: pgText('employee_code').notNull(),
    firstName: pgText('first_name').notNull(),
    middleName: pgText('middle_name'),
    lastName: pgText('last_name'),
    gender: pgText('gender'),
    dateOfBirth: pgTimestamp('date_of_birth', { withTimezone: true }),
    mobile: pgText('mobile'),
    altMobile: pgText('alt_mobile'),
    email: pgText('email'),
    emergencyContact: pgText('emergency_contact'),
    permanentAddress: pgText('permanent_address'),
    currentAddress: pgText('current_address'),
    village: pgText('village'),
    taluka: pgText('taluka'),
    district: pgText('district'),
    state: pgText('state'),
    pincode: pgText('pincode'),
    departmentId: pgUuid('department_id'),
    designationId: pgUuid('designation_id'),
    reportingManagerId: pgUuid('reporting_manager_id'),
    joiningDate: pgTimestamp('joining_date', { withTimezone: true }),
    confirmationDate: pgTimestamp('confirmation_date', { withTimezone: true }),
    employmentType: pgText('employment_type').notNull().default('full_time'),
    workLocation: pgText('work_location'),
    branchId: pgUuid('branch_id'),
    status: pgText('status').notNull().default('active'),
    pan: pgText('pan'),
    aadhaar: pgText('aadhaar'),
    bankAccount: pgText('bank_account'),
    ifsc: pgText('ifsc'),
    upi: pgText('upi'),
    userId: pgUuid('user_id'),
    shiftId: pgUuid('shift_id'),
    notes: pgText('notes'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    codeIdx: pgUniqueIndex('hr_emp_code_idx').on(table.employeeCode),
    deptIdx: pgIndex('hr_emp_dept_idx').on(table.departmentId),
    statusIdx: pgIndex('hr_emp_status_idx').on(table.status),
    userIdx: pgIndex('hr_emp_user_idx').on(table.userId),
  }),
);

// ═════════════════════════════════════════════════════════
// SHIFTS
// ═════════════════════════════════════════════════════════
export const sqliteShifts = sqliteTableBase(
  'shranix_shifts',
  {
    ...sqliteBase,
    shiftName: sqliteText('shift_name').notNull(),
    startTime: sqliteText('start_time').notNull(),
    endTime: sqliteText('end_time').notNull(),
    breakDurationMinutes: sqliteInteger('break_duration_minutes').notNull().default(0),
    gracePeriodMinutes: sqliteInteger('grace_period_minutes').notNull().default(0),
    workingHours: sqliteReal('working_hours').notNull().default(8),
    lateThresholdMinutes: sqliteInteger('late_threshold_minutes').notNull().default(15),
    halfDayThresholdMinutes: sqliteInteger('half_day_threshold_minutes').notNull().default(240),
    overtimeThresholdMinutes: sqliteInteger('overtime_threshold_minutes').notNull().default(540),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => ({
    nameIdx: uniqueIndex('hr_shift_name_idx').on(table.shiftName),
  }),
);

export const pgShifts = pgTableBase(
  'shranix_shifts',
  {
    ...pgBase,
    shiftName: pgText('shift_name').notNull(),
    startTime: pgText('start_time').notNull(),
    endTime: pgText('end_time').notNull(),
    breakDurationMinutes: pgInteger('break_duration_minutes').notNull().default(0),
    gracePeriodMinutes: pgInteger('grace_period_minutes').notNull().default(0),
    workingHours: pgReal('working_hours').notNull().default(8),
    lateThresholdMinutes: pgInteger('late_threshold_minutes').notNull().default(15),
    halfDayThresholdMinutes: pgInteger('half_day_threshold_minutes').notNull().default(240),
    overtimeThresholdMinutes: pgInteger('overtime_threshold_minutes').notNull().default(540),
    isActive: pgBoolean('is_active').notNull().default(true),
  },
  (table) => ({
    nameIdx: pgUniqueIndex('hr_shift_name_idx').on(table.shiftName),
  }),
);

// ═════════════════════════════════════════════════════════
// ATTENDANCE
// ═════════════════════════════════════════════════════════
export const sqliteAttendance = sqliteTableBase(
  'shranix_attendance',
  {
    ...sqliteBase,
    employeeId: sqliteText('employee_id').notNull(),
    attendanceDate: sqliteText('attendance_date').notNull(), // YYYY-MM-DD
    checkIn: sqliteText('check_in'),
    checkOut: sqliteText('check_out'),
    workingHours: sqliteReal('working_hours'),
    overtimeHours: sqliteReal('overtime_hours'),
    status: sqliteText('status').notNull().default('present'), // present | absent | half_day | late | early_exit | work_from_home | holiday | leave
    remarks: sqliteText('remarks'),
    markedBy: sqliteText('marked_by'),
  },
  (table) => ({
    empDateIdx: uniqueIndex('hr_att_emp_date_idx').on(table.employeeId, table.attendanceDate),
    dateIdx: index('hr_att_date_idx').on(table.attendanceDate),
  }),
);

export const pgAttendance = pgTableBase(
  'shranix_attendance',
  {
    ...pgBase,
    employeeId: pgUuid('employee_id').notNull(),
    attendanceDate: pgTimestamp('attendance_date', { withTimezone: true }).notNull(),
    checkIn: pgTimestamp('check_in', { withTimezone: true }),
    checkOut: pgTimestamp('check_out', { withTimezone: true }),
    workingHours: pgReal('working_hours'),
    overtimeHours: pgReal('overtime_hours'),
    status: pgText('status').notNull().default('present'),
    remarks: pgText('remarks'),
    markedBy: pgUuid('marked_by'),
  },
  (table) => ({
    empDateIdx: pgUniqueIndex('hr_att_emp_date_idx').on(table.employeeId, table.attendanceDate),
    dateIdx: pgIndex('hr_att_date_idx').on(table.attendanceDate),
  }),
);

// ═════════════════════════════════════════════════════════
// HOLIDAYS
// ═════════════════════════════════════════════════════════
export const sqliteHolidays = sqliteTableBase(
  'shranix_holidays',
  {
    ...sqliteBase,
    holidayName: sqliteText('holiday_name').notNull(),
    holidayDate: sqliteText('holiday_date').notNull(),
    holidayType: sqliteText('holiday_type').notNull().default('festival'), // national | festival | company | optional
    branchId: sqliteText('branch_id'),
    description: sqliteText('description'),
  },
  (table) => ({
    dateIdx: uniqueIndex('hr_holiday_date_idx').on(table.holidayDate),
  }),
);

export const pgHolidays = pgTableBase(
  'shranix_holidays',
  {
    ...pgBase,
    holidayName: pgText('holiday_name').notNull(),
    holidayDate: pgTimestamp('holiday_date', { withTimezone: true }).notNull(),
    holidayType: pgText('holiday_type').notNull().default('festival'),
    branchId: pgUuid('branch_id'),
    description: pgText('description'),
  },
  (table) => ({
    dateIdx: pgUniqueIndex('hr_holiday_date_idx').on(table.holidayDate),
  }),
);

// ═════════════════════════════════════════════════════════
// LEAVE REQUESTS
// ═════════════════════════════════════════════════════════
export const sqliteLeaveRequests = sqliteTableBase(
  'shranix_leave_requests',
  {
    ...sqliteBase,
    employeeId: sqliteText('employee_id').notNull(),
    leaveType: sqliteText('leave_type').notNull().default('casual'), // casual | sick | earned | paid | unpaid | other
    startDate: sqliteText('start_date').notNull(),
    endDate: sqliteText('end_date').notNull(),
    numberOfDays: sqliteReal('number_of_days').notNull().default(1),
    reason: sqliteText('reason'),
    attachmentRef: sqliteText('attachment_ref'),
    status: sqliteText('status').notNull().default('pending'), // pending | approved | rejected | cancelled
    approvedBy: sqliteText('approved_by'),
    approvalDate: sqliteText('approval_date'),
    remarks: sqliteText('remarks'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    empIdx: index('hr_leave_emp_idx').on(table.employeeId),
    statusIdx: index('hr_leave_status_idx').on(table.status),
  }),
);

export const pgLeaveRequests = pgTableBase(
  'shranix_leave_requests',
  {
    ...pgBase,
    employeeId: pgUuid('employee_id').notNull(),
    leaveType: pgText('leave_type').notNull().default('casual'),
    startDate: pgTimestamp('start_date', { withTimezone: true }).notNull(),
    endDate: pgTimestamp('end_date', { withTimezone: true }).notNull(),
    numberOfDays: pgReal('number_of_days').notNull().default(1),
    reason: pgText('reason'),
    attachmentRef: pgText('attachment_ref'),
    status: pgText('status').notNull().default('pending'),
    approvedBy: pgUuid('approved_by'),
    approvalDate: pgTimestamp('approval_date', { withTimezone: true }),
    remarks: pgText('remarks'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    empIdx: pgIndex('hr_leave_emp_idx').on(table.employeeId),
    statusIdx: pgIndex('hr_leave_status_idx').on(table.status),
  }),
);

// ═════════════════════════════════════════════════════════
// LEAVE BALANCES
// ═════════════════════════════════════════════════════════
export const sqliteLeaveBalances = sqliteTableBase(
  'shranix_leave_balances',
  {
    ...sqliteBase,
    employeeId: sqliteText('employee_id').notNull(),
    leaveType: sqliteText('leave_type').notNull(),
    openingBalance: sqliteReal('opening_balance').notNull().default(0),
    allocated: sqliteReal('allocated').notNull().default(0),
    used: sqliteReal('used').notNull().default(0),
    pending: sqliteReal('pending').notNull().default(0),
    financialYear: sqliteText('financial_year'),
  },
  (table) => ({
    empTypeIdx: uniqueIndex('hr_lb_emp_type_idx').on(table.employeeId, table.leaveType),
  }),
);

export const pgLeaveBalances = pgTableBase(
  'shranix_leave_balances',
  {
    ...pgBase,
    employeeId: pgUuid('employee_id').notNull(),
    leaveType: pgText('leave_type').notNull(),
    openingBalance: pgReal('opening_balance').notNull().default(0),
    allocated: pgReal('allocated').notNull().default(0),
    used: pgReal('used').notNull().default(0),
    pending: pgReal('pending').notNull().default(0),
    financialYear: pgText('financial_year'),
  },
  (table) => ({
    empTypeIdx: pgUniqueIndex('hr_lb_emp_type_idx').on(table.employeeId, table.leaveType),
  }),
);

// ═════════════════════════════════════════════════════════
// SALARY STRUCTURES
// ═════════════════════════════════════════════════════════
export const sqliteSalaryStructures = sqliteTableBase(
  'shranix_salary_structures',
  {
    ...sqliteBase,
    employeeId: sqliteText('employee_id').notNull(),
    effectiveFrom: sqliteText('effective_from'),
    basicSalary: sqliteReal('basic_salary').notNull().default(0),
    hra: sqliteReal('hra').notNull().default(0),
    allowances: sqliteReal('allowances').notNull().default(0),
    bonus: sqliteReal('bonus').notNull().default(0),
    incentives: sqliteReal('incentives').notNull().default(0),
    overtimeRate: sqliteReal('overtime_rate').notNull().default(0),
    otherEarnings: sqliteReal('other_earnings').notNull().default(0),
    pf: sqliteReal('pf').notNull().default(0),
    esi: sqliteReal('esi').notNull().default(0),
    professionalTax: sqliteReal('professional_tax').notNull().default(0),
    tds: sqliteReal('tds').notNull().default(0),
    loanRecovery: sqliteReal('loan_recovery').notNull().default(0),
    otherDeductions: sqliteReal('other_deductions').notNull().default(0),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    empIdx: index('hr_salary_emp_idx').on(table.employeeId),
  }),
);

export const pgSalaryStructures = pgTableBase(
  'shranix_salary_structures',
  {
    ...pgBase,
    employeeId: pgUuid('employee_id').notNull(),
    effectiveFrom: pgTimestamp('effective_from', { withTimezone: true }),
    basicSalary: pgReal('basic_salary').notNull().default(0),
    hra: pgReal('hra').notNull().default(0),
    allowances: pgReal('allowances').notNull().default(0),
    bonus: pgReal('bonus').notNull().default(0),
    incentives: pgReal('incentives').notNull().default(0),
    overtimeRate: pgReal('overtime_rate').notNull().default(0),
    otherEarnings: pgReal('other_earnings').notNull().default(0),
    pf: pgReal('pf').notNull().default(0),
    esi: pgReal('esi').notNull().default(0),
    professionalTax: pgReal('professional_tax').notNull().default(0),
    tds: pgReal('tds').notNull().default(0),
    loanRecovery: pgReal('loan_recovery').notNull().default(0),
    otherDeductions: pgReal('other_deductions').notNull().default(0),
    isActive: pgBoolean('is_active').notNull().default(true),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    empIdx: pgIndex('hr_salary_emp_idx').on(table.employeeId),
  }),
);

// ═════════════════════════════════════════════════════════
// PAYROLL RUNS
// ═════════════════════════════════════════════════════════
export const sqlitePayrollRuns = sqliteTableBase(
  'shranix_payroll_runs',
  {
    ...sqliteBase,
    runNumber: sqliteText('run_number').notNull(),
    payPeriodStart: sqliteText('pay_period_start').notNull(),
    payPeriodEnd: sqliteText('pay_period_end').notNull(),
    employeeCount: sqliteInteger('employee_count').notNull().default(0),
    grossTotal: sqliteReal('gross_total').notNull().default(0),
    deductionTotal: sqliteReal('deduction_total').notNull().default(0),
    netTotal: sqliteReal('net_total').notNull().default(0),
    status: sqliteText('status').notNull().default('draft'), // draft | approved | paid | cancelled
    approvedBy: sqliteText('approved_by'),
    approvedAt: sqliteText('approved_at'),
    paidAt: sqliteText('paid_at'),
    paymentMode: sqliteText('payment_mode'),
    glEntryId: sqliteText('gl_entry_id'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    runNoIdx: uniqueIndex('hr_pr_run_no_idx').on(table.runNumber),
  }),
);

export const pgPayrollRuns = pgTableBase(
  'shranix_payroll_runs',
  {
    ...pgBase,
    runNumber: pgText('run_number').notNull(),
    payPeriodStart: pgTimestamp('pay_period_start', { withTimezone: true }).notNull(),
    payPeriodEnd: pgTimestamp('pay_period_end', { withTimezone: true }).notNull(),
    employeeCount: pgInteger('employee_count').notNull().default(0),
    grossTotal: pgReal('gross_total').notNull().default(0),
    deductionTotal: pgReal('deduction_total').notNull().default(0),
    netTotal: pgReal('net_total').notNull().default(0),
    status: pgText('status').notNull().default('draft'),
    approvedBy: pgUuid('approved_by'),
    approvedAt: pgTimestamp('approved_at', { withTimezone: true }),
    paidAt: pgTimestamp('paid_at', { withTimezone: true }),
    paymentMode: pgText('payment_mode'),
    glEntryId: pgUuid('gl_entry_id'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    runNoIdx: pgUniqueIndex('hr_pr_run_no_idx').on(table.runNumber),
  }),
);

// ═════════════════════════════════════════════════════════
// PAYROLL LINES (per-employee)
// ═════════════════════════════════════════════════════════
export const sqlitePayrollLines = sqliteTableBase(
  'shranix_payroll_lines',
  {
    ...sqliteBase,
    payrollRunId: sqliteText('payroll_run_id').notNull(),
    employeeId: sqliteText('employee_id').notNull(),
    attendanceDays: sqliteReal('attendance_days').notNull().default(0),
    overtimeHours: sqliteReal('overtime_hours').notNull().default(0),
    overtimeAmount: sqliteReal('overtime_amount').notNull().default(0),
    basicSalary: sqliteReal('basic_salary').notNull().default(0),
    hra: sqliteReal('hra').notNull().default(0),
    allowances: sqliteReal('allowances').notNull().default(0),
    bonus: sqliteReal('bonus').notNull().default(0),
    incentives: sqliteReal('incentives').notNull().default(0),
    otherEarnings: sqliteReal('other_earnings').notNull().default(0),
    grossSalary: sqliteReal('gross_salary').notNull().default(0),
    pf: sqliteReal('pf').notNull().default(0),
    esi: sqliteReal('esi').notNull().default(0),
    professionalTax: sqliteReal('professional_tax').notNull().default(0),
    tds: sqliteReal('tds').notNull().default(0),
    loanRecovery: sqliteReal('loan_recovery').notNull().default(0),
    otherDeductions: sqliteReal('other_deductions').notNull().default(0),
    totalDeductions: sqliteReal('total_deductions').notNull().default(0),
    netSalary: sqliteReal('net_salary').notNull().default(0),
  },
  (table) => ({
    runIdx: index('hr_pl_run_idx').on(table.payrollRunId),
    empIdx: index('hr_pl_emp_idx').on(table.employeeId),
  }),
);

export const pgPayrollLines = pgTableBase(
  'shranix_payroll_lines',
  {
    ...pgBase,
    payrollRunId: pgUuid('payroll_run_id').notNull(),
    employeeId: pgUuid('employee_id').notNull(),
    attendanceDays: pgReal('attendance_days').notNull().default(0),
    overtimeHours: pgReal('overtime_hours').notNull().default(0),
    overtimeAmount: pgReal('overtime_amount').notNull().default(0),
    basicSalary: pgReal('basic_salary').notNull().default(0),
    hra: pgReal('hra').notNull().default(0),
    allowances: pgReal('allowances').notNull().default(0),
    bonus: pgReal('bonus').notNull().default(0),
    incentives: pgReal('incentives').notNull().default(0),
    otherEarnings: pgReal('other_earnings').notNull().default(0),
    grossSalary: pgReal('gross_salary').notNull().default(0),
    pf: pgReal('pf').notNull().default(0),
    esi: pgReal('esi').notNull().default(0),
    professionalTax: pgReal('professional_tax').notNull().default(0),
    tds: pgReal('tds').notNull().default(0),
    loanRecovery: pgReal('loan_recovery').notNull().default(0),
    otherDeductions: pgReal('other_deductions').notNull().default(0),
    totalDeductions: pgReal('total_deductions').notNull().default(0),
    netSalary: pgReal('net_salary').notNull().default(0),
  },
  (table) => ({
    runIdx: pgIndex('hr_pl_run_idx').on(table.payrollRunId),
    empIdx: pgIndex('hr_pl_emp_idx').on(table.employeeId),
  }),
);

// ═════════════════════════════════════════════════════════
// EMPLOYEE ADVANCES
// ═════════════════════════════════════════════════════════
export const sqliteEmployeeAdvances = sqliteTableBase(
  'shranix_employee_advances',
  {
    ...sqliteBase,
    advanceNumber: sqliteText('advance_number').notNull(),
    employeeId: sqliteText('employee_id').notNull(),
    amount: sqliteReal('amount').notNull().default(0),
    reason: sqliteText('reason'),
    advanceDate: sqliteText('advance_date'),
    status: sqliteText('status').notNull().default('pending'), // pending | approved | paid | recovered | cancelled
    approvedBy: sqliteText('approved_by'),
    approvalDate: sqliteText('approval_date'),
    recoverySchedule: sqliteText('recovery_schedule'), // JSON: monthly recovery plan
    recoveredAmount: sqliteReal('recovered_amount').notNull().default(0),
    outstandingAmount: sqliteReal('outstanding_amount').notNull().default(0),
    glEntryId: sqliteText('gl_entry_id'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    empIdx: index('hr_adv_emp_idx').on(table.employeeId),
  }),
);

export const pgEmployeeAdvances = pgTableBase(
  'shranix_employee_advances',
  {
    ...pgBase,
    advanceNumber: pgText('advance_number').notNull(),
    employeeId: pgUuid('employee_id').notNull(),
    amount: pgReal('amount').notNull().default(0),
    reason: pgText('reason'),
    advanceDate: pgTimestamp('advance_date', { withTimezone: true }),
    status: pgText('status').notNull().default('pending'),
    approvedBy: pgUuid('approved_by'),
    approvalDate: pgTimestamp('approval_date', { withTimezone: true }),
    recoverySchedule: pgText('recovery_schedule'),
    recoveredAmount: pgReal('recovered_amount').notNull().default(0),
    outstandingAmount: pgReal('outstanding_amount').notNull().default(0),
    glEntryId: pgUuid('gl_entry_id'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    empIdx: pgIndex('hr_adv_emp_idx').on(table.employeeId),
  }),
);

// ═════════════════════════════════════════════════════════
// EMPLOYEE EXPENSES
// ═════════════════════════════════════════════════════════
export const sqliteEmployeeExpenses = sqliteTableBase(
  'shranix_employee_expenses',
  {
    ...sqliteBase,
    expenseNumber: sqliteText('expense_number').notNull(),
    employeeId: sqliteText('employee_id').notNull(),
    expenseDate: sqliteText('expense_date'),
    category: sqliteText('category').notNull().default('travel'),
    amount: sqliteReal('amount').notNull().default(0),
    description: sqliteText('description'),
    attachmentRef: sqliteText('attachment_ref'),
    paymentMode: sqliteText('payment_mode'),
    status: sqliteText('status').notNull().default('draft'), // draft | submitted | approved | rejected | paid
    approvedBy: sqliteText('approved_by'),
    approvalDate: sqliteText('approval_date'),
    glEntryId: sqliteText('gl_entry_id'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    empIdx: index('hr_exp_emp_idx').on(table.employeeId),
    statusIdx: index('hr_exp_status_idx').on(table.status),
  }),
);

export const pgEmployeeExpenses = pgTableBase(
  'shranix_employee_expenses',
  {
    ...pgBase,
    expenseNumber: pgText('expense_number').notNull(),
    employeeId: pgUuid('employee_id').notNull(),
    expenseDate: pgTimestamp('expense_date', { withTimezone: true }),
    category: pgText('category').notNull().default('travel'),
    amount: pgReal('amount').notNull().default(0),
    description: pgText('description'),
    attachmentRef: pgText('attachment_ref'),
    paymentMode: pgText('payment_mode'),
    status: pgText('status').notNull().default('draft'),
    approvedBy: pgUuid('approved_by'),
    approvalDate: pgTimestamp('approval_date', { withTimezone: true }),
    glEntryId: pgUuid('gl_entry_id'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    empIdx: pgIndex('hr_exp_emp_idx').on(table.employeeId),
    statusIdx: pgIndex('hr_exp_status_idx').on(table.status),
  }),
);

// ═════════════════════════════════════════════════════════
// PERFORMANCE REVIEWS
// ═════════════════════════════════════════════════════════
export const sqlitePerformanceReviews = sqliteTableBase(
  'shranix_performance_reviews',
  {
    ...sqliteBase,
    employeeId: sqliteText('employee_id').notNull(),
    reviewPeriod: sqliteText('review_period').notNull(),
    goals: sqliteText('goals'),
    achievements: sqliteText('achievements'),
    rating: sqliteReal('rating'),
    managerComments: sqliteText('manager_comments'),
    employeeComments: sqliteText('employee_comments'),
    status: sqliteText('status').notNull().default('draft'), // draft | submitted | reviewed | closed
    reviewedBy: sqliteText('reviewed_by'),
    reviewedAt: sqliteText('reviewed_at'),
  },
  (table) => ({
    empIdx: index('hr_perf_emp_idx').on(table.employeeId),
  }),
);

export const pgPerformanceReviews = pgTableBase(
  'shranix_performance_reviews',
  {
    ...pgBase,
    employeeId: pgUuid('employee_id').notNull(),
    reviewPeriod: pgText('review_period').notNull(),
    goals: pgText('goals'),
    achievements: pgText('achievements'),
    rating: pgReal('rating'),
    managerComments: pgText('manager_comments'),
    employeeComments: pgText('employee_comments'),
    status: pgText('status').notNull().default('draft'),
    reviewedBy: pgUuid('reviewed_by'),
    reviewedAt: pgTimestamp('reviewed_at', { withTimezone: true }),
  },
  (table) => ({
    empIdx: pgIndex('hr_perf_emp_idx').on(table.employeeId),
  }),
);

// ═════════════════════════════════════════════════════════
// EMPLOYEE TIMELINE
// ═════════════════════════════════════════════════════════
export const sqliteEmployeeTimeline = sqliteTableBase(
  'shranix_employee_timeline',
  {
    ...sqliteBase,
    employeeId: sqliteText('employee_id').notNull(),
    eventType: sqliteText('event_type').notNull(), // joined | department_changed | designation_changed | salary_revised | promoted | transferred | resigned | terminated | retired | confirmed | document_added
    title: sqliteText('title').notNull(),
    description: sqliteText('description'),
    eventDate: sqliteText('event_date'),
    referenceType: sqliteText('reference_type'),
    referenceId: sqliteText('reference_id'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    empIdx: index('hr_tl_emp_idx').on(table.employeeId),
  }),
);

export const pgEmployeeTimeline = pgTableBase(
  'shranix_employee_timeline',
  {
    ...pgBase,
    employeeId: pgUuid('employee_id').notNull(),
    eventType: pgText('event_type').notNull(),
    title: pgText('title').notNull(),
    description: pgText('description'),
    eventDate: pgTimestamp('event_date', { withTimezone: true }),
    referenceType: pgText('reference_type'),
    referenceId: pgUuid('reference_id'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    empIdx: pgIndex('hr_tl_emp_idx').on(table.employeeId),
  }),
);
