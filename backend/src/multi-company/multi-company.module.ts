import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';

// Controllers
import { BranchesController } from './controllers/branches.controller';
import { BusinessUnitsController } from './controllers/business-units.controller';
import { CompaniesController } from './controllers/companies.controller';
import { DepartmentsController } from './controllers/departments.controller';

// Services
import { BranchesService } from './services/branches.service';
import { BusinessUnitsService } from './services/business-units.service';
import { CompaniesService } from './services/companies.service';
import { DepartmentsService } from './services/departments.service';

@Module({
  imports: [CommonModule],
  controllers: [CompaniesController, BranchesController, BusinessUnitsController, DepartmentsController],
  providers: [CompaniesService, BranchesService, BusinessUnitsService, DepartmentsService],
  exports: [CompaniesService, BranchesService, BusinessUnitsService, DepartmentsService],
})
export class MultiCompanyModule {}
