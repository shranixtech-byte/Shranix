import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';

// Controllers
import { BankAccountsController } from './controllers/bank-accounts.controller';
import { BranchesController } from './controllers/branches.controller';
import { BusinessUnitsController } from './controllers/business-units.controller';
import { CompaniesController } from './controllers/companies.controller';
import { DepartmentsController } from './controllers/departments.controller';

// Services
import { BankAccountsService } from './services/bank-accounts.service';
import { BranchesService } from './services/branches.service';
import { BusinessUnitsService } from './services/business-units.service';
import { CompaniesService } from './services/companies.service';
import { DepartmentsService } from './services/departments.service';

@Module({
  imports: [CommonModule],
  controllers: [
    CompaniesController,
    BankAccountsController,
    BranchesController,
    BusinessUnitsController,
    DepartmentsController,
  ],
  providers: [
    CompaniesService,
    BankAccountsService,
    BranchesService,
    BusinessUnitsService,
    DepartmentsService,
  ],
  exports: [
    CompaniesService,
    BankAccountsService,
    BranchesService,
    BusinessUnitsService,
    DepartmentsService,
  ],
})
export class MultiCompanyModule {}
