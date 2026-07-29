import { Injectable } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

import { BaseMasterService } from './base-master.service';

@Injectable()
export class CompaniesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.companies, 'Company', audit, 'name'); }
}

@Injectable()
export class FinancialYearsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.financialYears, 'FinancialYear', audit, 'name'); }
}

@Injectable()
export class BranchesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.branches, 'Branch', audit, 'code'); }
}

@Injectable()
export class WarehousesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.warehouses, 'Warehouse', audit, 'code'); }
}

@Injectable()
export class UnitsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.units, 'Unit', audit, 'name'); }
}

@Injectable()
export class CategoriesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.categories, 'Category', audit, 'name'); }
}

@Injectable()
export class BrandsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.brands, 'Brand', audit, 'name'); }
}

@Injectable()
export class TaxGroupsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.taxGroups, 'TaxGroup', audit, 'name'); }
}

@Injectable()
export class GSTRatesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.gstRates, 'GSTRate', audit, 'name'); }
}
