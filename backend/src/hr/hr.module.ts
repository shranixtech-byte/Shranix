import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';

import { DesignationsController } from './controllers/designations.controller';
import { EmployeesController } from './controllers/employees.controller';
import { LeaveRequestsController } from './controllers/leave-requests.controller';
import { DesignationsService } from './services/designations.service';
import { EmployeesService } from './services/employees.service';
import { LeaveRequestsService } from './services/leave-requests.service';

@Module({
  imports: [CommonModule],
  controllers: [EmployeesController, LeaveRequestsController, DesignationsController],
  providers: [EmployeesService, LeaveRequestsService, DesignationsService],
  exports: [EmployeesService, LeaveRequestsService, DesignationsService],
})
export class HrModule {}
