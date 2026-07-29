import { Module } from '@nestjs/common';

import {
  CompaniesController, FinancialYearsController, BranchesController,
  WarehousesController, UnitsController, CategoriesController,
  BrandsController, TaxGroupsController, GSTRatesController,
} from './controllers';
import {
  CompaniesService, FinancialYearsService, BranchesService,
  WarehousesService, UnitsService, CategoriesService,
  BrandsService, TaxGroupsService, GSTRatesService,
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
  ],
})
export class MastersModule {}
