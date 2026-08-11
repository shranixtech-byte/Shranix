import type { DatabaseClient } from '../client/index';
import {
  sqliteDepartments,
  pgDepartments,
  sqliteDesignations,
  pgDesignations,
  sqliteEmployees,
  pgEmployees,
  sqliteShifts,
  pgShifts,
  sqliteAttendance,
  pgAttendance,
  sqliteHolidays,
  pgHolidays,
  sqliteLeaveRequests,
  pgLeaveRequests,
  sqliteLeaveBalances,
  pgLeaveBalances,
  sqliteSalaryStructures,
  pgSalaryStructures,
  sqlitePayrollRuns,
  pgPayrollRuns,
  sqlitePayrollLines,
  pgPayrollLines,
  sqliteEmployeeAdvances,
  pgEmployeeAdvances,
  sqliteEmployeeExpenses,
  pgEmployeeExpenses,
  sqlitePerformanceReviews,
  pgPerformanceReviews,
  sqliteEmployeeTimeline,
  pgEmployeeTimeline,
} from '../schema/hr';

import { MasterDataRepository } from './masters.repository';

export class DepartmentsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteDepartments, pgDepartments, db, isPostgres);
  }
}

export class DesignationsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteDesignations, pgDesignations, db, isPostgres);
  }
}

export class EmployeesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteEmployees, pgEmployees, db, isPostgres);
  }
}

export class ShiftsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteShifts, pgShifts, db, isPostgres);
  }
}

export class AttendanceRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteAttendance, pgAttendance, db, isPostgres);
  }
}

export class HolidaysRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteHolidays, pgHolidays, db, isPostgres);
  }
}

export class LeaveRequestsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteLeaveRequests, pgLeaveRequests, db, isPostgres);
  }
}

export class LeaveBalancesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteLeaveBalances, pgLeaveBalances, db, isPostgres);
  }
}

export class SalaryStructuresRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSalaryStructures, pgSalaryStructures, db, isPostgres);
  }
}

export class PayrollRunsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePayrollRuns, pgPayrollRuns, db, isPostgres);
  }
}

export class PayrollLinesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePayrollLines, pgPayrollLines, db, isPostgres);
  }
}

export class EmployeeAdvancesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteEmployeeAdvances, pgEmployeeAdvances, db, isPostgres);
  }
}

export class EmployeeExpensesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteEmployeeExpenses, pgEmployeeExpenses, db, isPostgres);
  }
}

export class PerformanceReviewsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePerformanceReviews, pgPerformanceReviews, db, isPostgres);
  }
}

export class EmployeeTimelineRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteEmployeeTimeline, pgEmployeeTimeline, db, isPostgres);
  }
}
