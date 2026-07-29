import { Injectable } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { BaseMasterService } from '../masters/base-master.service';

@Injectable()
export class AccountGroupsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.accountGroups, 'AccountGroup', audit, 'name'); }
}
@Injectable()
export class ChartOfAccountsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.chartOfAccounts, 'ChartOfAccount', audit, 'accountCode'); }
}
@Injectable()
export class LedgerMasterService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.ledgerMaster, 'Ledger', audit); }
}
@Injectable()
export class JournalEntriesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.journalEntries, 'JournalEntry', audit, 'voucherNumber'); }
}
@Injectable()
export class CashBookService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.cashBook, 'CashBook', audit); }
}
@Injectable()
export class BankBookService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.bankBook, 'BankBook', audit); }
}
@Injectable()
export class CostCentersService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.costCenters, 'CostCenter', audit, 'code'); }
}
@Injectable()
export class AccountingSettingsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.accountingSettings, 'AccountingSettings', audit); }
}
