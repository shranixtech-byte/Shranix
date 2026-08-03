import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditService } from '../common/services/audit.service';
import { roundAmount, roundTotals, type RoundingRule } from '../common/utils/rounding.util';
import { DatabaseService } from '../database/database.service';
import { BaseMasterService } from '../masters/base-master.service';

// Settings page password — ek key-value row ke roop mein stored hai (shranix_gst_audit_settings
// ek generic settings store hai: settingKey/settingValue). Naya table/migration nahi chahiye.
const SETTINGS_PASSWORD_KEY = 'settings_password';
const SETTINGS_PASSWORD_GROUP = 'security';

// NOTE: AccountingSettingsService sabse PEHLE define hai kyunki ChartOfAccountsService aur
// JournalEntriesService dono ise inject karte hain (runtime class ref → TDZ error se bachta hai).
@Injectable()
export class AccountingSettingsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.accountingSettings, 'AccountingSettings', audit);
  }
}

@Injectable()
export class AccountGroupsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.accountGroups, 'AccountGroup', audit, 'name');
  }
}
@Injectable()
export class ChartOfAccountsService extends BaseMasterService {
  constructor(
    database: DatabaseService,
    audit: AuditService,
    private readonly settings: AccountingSettingsService,
  ) {
    super(database.chartOfAccounts, 'ChartOfAccount', audit, 'accountCode');
    this.database = database;
  }

  private readonly database: DatabaseService;

  /** Opening Balance Lock — FY start ke baad opening balances freeze */
  private async assertOpeningBalanceEditable(data: any): Promise<void> {
    const touchesOpening =
      data?.openingBalance !== undefined || data?.openingBalanceType !== undefined;
    if (!touchesOpening) {
      return;
    }
    const [settings] = (await this.settings.findAll(1, 1)).data as any[];
    if (settings?.openingBalanceLock) {
      throw new ConflictException(
        'Opening balances are locked — disable Opening Balance Lock to change them',
      );
    }
  }

  override async update(id: string, data: any, userId?: string) {
    await this.assertOpeningBalanceEditable(data);
    return super.update(id, data, userId);
  }
}
@Injectable()
export class LedgerMasterService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.ledgerMaster, 'Ledger', audit);
  }
}

@Injectable()
export class JournalEntriesService extends BaseMasterService {
  constructor(
    database: DatabaseService,
    audit: AuditService,
    private readonly settings: AccountingSettingsService,
  ) {
    super(database.journalEntries, 'JournalEntry', audit, 'voucherNumber');
    this.database = database;
  }

  private readonly database: DatabaseService;

  /**
   * Financial Settings ke locks enforce karte hain (Settings Hub → Financial):
   *  - Closing Date      → us date se pehle ka koi voucher nahi
   *  - Period Lock       → periodLockDate ke baad ka koi voucher nahi
   *  - Fiscal Year Lock  → active FY ki end-date ke baad koi voucher nahi
   *  - Voucher Lock      → posted vouchers edit nahi ho sakte
   */
  private async loadSettings(): Promise<any> {
    const [settings] = (await this.settings.findAll(1, 1)).data as any[];
    return settings ?? null;
  }

  // Date-only string compare (YYYY-MM-DD) — timezone/UTC offset issues se bachta hai.
  private static dateKey(d: string): string {
    const normalized = String(d || '').slice(0, 10);
    return normalized.replace(/[TZ]/g, '').replace(/\+.*$/, '');
  }

  private async assertDateAllowed(voucherDate?: string, settings?: any): Promise<void> {
    if (!voucherDate) {
      return;
    }
    const key = JournalEntriesService.dateKey(voucherDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      return;
    }
    const st = settings ?? (await this.loadSettings());
    if (!st) {
      return;
    }

    if (st.closingDate && key < JournalEntriesService.dateKey(st.closingDate)) {
      throw new ConflictException(
        `Entries before closing date ${JournalEntriesService.dateKey(st.closingDate)} are locked`,
      );
    }
    if (
      st.periodLock &&
      st.periodLockDate &&
      key > JournalEntriesService.dateKey(st.periodLockDate)
    ) {
      throw new ConflictException(
        `Entries after period lock date ${JournalEntriesService.dateKey(st.periodLockDate)} are locked`,
      );
    }
    if (st.fiscalYearLock) {
      const activeFy = await this.database.financialYears.findAll({
        filters: [{ field: 'isActive', operator: 'eq', value: true }],
        page: 1,
        pageSize: 1,
      } as any);
      const fy = activeFy.data[0] as any;
      if (fy?.endDate && key > JournalEntriesService.dateKey(fy.endDate)) {
        throw new ConflictException(
          `Entries after financial year end (${JournalEntriesService.dateKey(fy.endDate)}) are locked`,
        );
      }
    }
  }

  private async assertVoucherEditable(id: string, settings?: any): Promise<void> {
    const st = settings ?? (await this.loadSettings());
    if (st?.voucherLock) {
      const existing = await this.repository.findById(id);
      if (existing && (existing as any).isPosted) {
        throw new ConflictException('Posted vouchers are locked — disable Voucher Lock to edit');
      }
    }
  }

  /** Financial Settings → Rounding Rules: totals ko settings ke hisaab se round karo. */
  private applyRounding(data: any, settings?: any): any {
    const st = settings ?? null;
    const decimals = Number(st?.roundOffDecimals ?? 2);
    const rule = (st?.roundingRule || 'nearest') as RoundingRule;

    if (data?.totalDebit === undefined && data?.totalCredit === undefined) {
      return data;
    }

    const out = { ...data };
    if (out.totalDebit !== undefined && out.totalCredit !== undefined) {
      const { totalDebit, totalCredit } = roundTotals(
        Number(out.totalDebit) || 0,
        Number(out.totalCredit) || 0,
        decimals,
        rule,
      );
      out.totalDebit = totalDebit;
      out.totalCredit = totalCredit;
    } else if (out.totalDebit !== undefined) {
      out.totalDebit = roundAmount(Number(out.totalDebit) || 0, decimals, rule);
    } else if (out.totalCredit !== undefined) {
      out.totalCredit = roundAmount(Number(out.totalCredit) || 0, decimals, rule);
    }
    return out;
  }

  override async create(data: any, userId?: string) {
    const settings = await this.loadSettings();
    await this.assertDateAllowed(data?.voucherDate, settings);
    return super.create(this.applyRounding(data, settings), userId);
  }

  override async update(id: string, data: any, userId?: string) {
    const settings = await this.loadSettings();
    await this.assertVoucherEditable(id, settings);
    await this.assertDateAllowed(data?.voucherDate, settings);
    return super.update(id, this.applyRounding(data, settings), userId);
  }
}
@Injectable()
export class CashBookService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.cashBook, 'CashBook', audit);
  }
}
@Injectable()
export class BankBookService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.bankBook, 'BankBook', audit);
  }
}
@Injectable()
export class CostCentersService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.costCenters, 'CostCenter', audit, 'code');
  }
}
/**
 * Settings page ka password gate — password ka argon2 hash ek key-value row
 * (shranix_gst_audit_settings, settingKey='settings_password') mein store hota hai.
 * Isliye page kholne par password maanga ja sakta hai bina naye DB table ke.
 */
@Injectable()
export class SettingsSecurityService {
  constructor(private readonly database: DatabaseService) {}

  private async findPasswordRow(): Promise<any> {
    const result = await this.database.gstAuditSettings.findAll({
      filters: [{ field: 'settingKey', operator: 'eq', value: SETTINGS_PASSWORD_KEY }],
      page: 1,
      pageSize: 1,
    });
    return result.data[0] || null;
  }

  async isConfigured(): Promise<boolean> {
    return (await this.findPasswordRow()) !== null;
  }

  async setPassword(password: string): Promise<void> {
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 1,
      parallelism: 1,
    });
    const row = await this.findPasswordRow();
    if (row) {
      await this.database.gstAuditSettings.update(row.id, { settingValue: hash });
    } else {
      await this.database.gstAuditSettings.create({
        settingKey: SETTINGS_PASSWORD_KEY,
        settingValue: hash,
        settingGroup: SETTINGS_PASSWORD_GROUP,
        description: 'Password required to open the Settings page',
        dataType: 'text',
      });
    }
  }

  async verifyPassword(password: string): Promise<boolean> {
    const row = await this.findPasswordRow();
    if (!row?.settingValue) {
      return false;
    }
    try {
      return await argon2.verify(row.settingValue, password);
    } catch {
      return false;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!(await this.verifyPassword(currentPassword))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.setPassword(newPassword);
  }
}
