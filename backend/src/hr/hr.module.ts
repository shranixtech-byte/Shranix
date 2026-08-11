import { Module } from '@nestjs/common';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

import { AttendanceController } from './controllers/attendance.controller';
import { EmployeesController } from './controllers/employees.controller';
import {
  EmployeeAdvancesController,
  EmployeeExpensesController,
  PerformanceReviewsController,
} from './controllers/finance.controller';
import { LeaveRequestsController } from './controllers/leave-requests.controller';
import {
  DepartmentsController,
  DesignationsController,
  HolidaysController,
  ShiftsController,
} from './controllers/organization.controller';
import { PayrollController } from './controllers/payroll.controller';
import { AttendanceService } from './services/attendance.service';
import { EmployeesService } from './services/employees.service';
import {
  EmployeeAdvancesService,
  EmployeeExpensesService,
  PerformanceReviewsService,
} from './services/finance.service';
import { LeaveRequestsService } from './services/leave.service';
import {
  DepartmentsService,
  DesignationsService,
  HolidaysService,
  ShiftsService,
} from './services/organization.service';
import { PayrollService, SalaryStructuresService } from './services/payroll.service';

@Module({
  controllers: [
    EmployeesController,
    LeaveRequestsController,
    AttendanceController,
    DepartmentsController,
    DesignationsController,
    ShiftsController,
    HolidaysController,
    PayrollController,
    EmployeeAdvancesController,
    EmployeeExpensesController,
    PerformanceReviewsController,
  ],
  providers: [
    DatabaseService,
    AuditService,
    EmployeesService,
    LeaveRequestsService,
    AttendanceService,
    DepartmentsService,
    DesignationsService,
    ShiftsService,
    HolidaysService,
    SalaryStructuresService,
    PayrollService,
    EmployeeAdvancesService,
    EmployeeExpensesService,
    PerformanceReviewsService,
  ],
  exports: [EmployeesService, LeaveRequestsService, PayrollService],
})
export class HrModule {}
