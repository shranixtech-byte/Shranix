import { Module } from '@nestjs/common';

import { BankAccountsController } from '../multi-company/controllers/bank-accounts.controller';
import { BankAccountsService } from '../multi-company/services/bank-accounts.service';

import {
  CompaniesController,
  FinancialYearsController,
  BranchesController,
  WarehousesController,
  UnitsController,
  CategoriesController,
  BrandsController,
  TaxGroupsController,
  GSTRatesController,
} from './controllers';
import {
  CompaniesService,
  FinancialYearsService,
  BranchesService,
  WarehousesService,
  UnitsService,
  CategoriesService,
  BrandsService,
  TaxGroupsService,
  GSTRatesService,
} from './services';

@Module({
  controllers: [
    CompaniesController,
    FinancialYearsController,
    BranchesController,
    WarehousesController,
    UnitsController,
    CategoriesController,
    BrandsController,
    TaxGroupsController,
    GSTRatesController,
    BankAccountsController,
  ],
  providers: [
    CompaniesService,
    FinancialYearsService,
    BranchesService,
    WarehousesService,
    UnitsService,
    CategoriesService,
    BrandsService,
    TaxGroupsService,
    GSTRatesService,
    BankAccountsService,
  ],
  exports: [
    CompaniesService,
    FinancialYearsService,
    BranchesService,
    WarehousesService,
    UnitsService,
    CategoriesService,
    BrandsService,
    TaxGroupsService,
    GSTRatesService,
    BankAccountsService,
  ],
})
export class MastersModule {}
