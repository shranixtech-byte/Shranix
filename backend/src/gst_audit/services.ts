import { Injectable, Logger, BadRequestException } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ReportEngine } from '../automation/report-engine';
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { BaseMasterService } from '../masters/base-master.service';

// ═══════════════════════════════════════════════════════════════
// CRUD SERVICES
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class GstRegistrationsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.gstRegistrations, 'GstRegistration', audit, 'gstin');
  }
}

@Injectable()
export class GstLedgerService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.gstLedger, 'GstLedger', audit);
  }
}

@Injectable()
export class GstReturnsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.gstReturns, 'GstReturn', audit);
  }
}

@Injectable()
export class TaxPostingsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.taxPostings, 'TaxPosting', audit);
  }
}

@Injectable()
export class YearClosingRecordsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.yearClosingRecords, 'YearClosing', audit, 'closingNumber');
  }
}

@Injectable()
export class PeriodLocksService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.periodLocks, 'PeriodLock', audit);
  }
}

@Injectable()
export class OpeningBalanceTransfersService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.openingBalanceTransfers, 'OpeningBalanceTransfer', audit, 'transferNumber');
  }
}

@Injectable()
export class YearEndEntriesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.yearEndEntries, 'YearEndEntry', audit, 'entryNumber');
  }
}

@Injectable()
export class AuditDetailsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.auditDetails, 'AuditDetail', audit);
  }
}

@Injectable()
export class NumberSeriesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.numberSeries, 'NumberSeries', audit, 'seriesName');
  }
}

@Injectable()
export class VoucherApprovalsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.voucherApprovals, 'VoucherApproval', audit, 'approvalNumber');
  }
}

@Injectable()
export class FinanceAnalyticsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.financeAnalytics, 'FinanceAnalytics', audit);
  }
}

@Injectable()
export class GstAuditSettingsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.gstAuditSettings, 'GstAuditSetting', audit, 'settingKey');
  }
}

/**
 * GST Configuration — Settings Hub → GST tab.
 */
@Injectable()
export class GstConfigService {
  private readonly GROUP = 'gst_config';
  private readonly ALLOWED_KEYS = [
    'gstType',
    'hsnLength',
    'gstReturn',
    'eWayBill',
    'eInvoice',
    'gstRounding',
    'taxMode',
  ];
  constructor(private readonly database: DatabaseService) {}

  private parseValue(raw: unknown, dataType: string): unknown {
    const v = String(raw ?? '');
    if (dataType === 'boolean') {
      return v === 'true' || v === '1';
    }
    if (dataType === 'number') {
      return Number(v);
    }
    return v;
  }

  async getConfig(): Promise<Record<string, unknown>> {
    const rows = await this.database.gstAuditSettings.findAll({
      filters: [{ field: 'settingGroup', operator: 'eq', value: this.GROUP }],
      pageSize: 100,
    } as any);
    const out: Record<string, unknown> = {};
    for (const r of rows?.data || []) {
      const row = r as any;
      out[String(row.settingKey)] = this.parseValue(
        row.settingValue,
        String(row.dataType || 'text'),
      );
    }
    return out;
  }

  async updateConfig(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    for (const [key, value] of Object.entries(payload || {})) {
      if (!this.ALLOWED_KEYS.includes(key)) {
        continue;
      }
      const existing = await this.database.gstAuditSettings.findAll({
        filters: [{ field: 'settingKey', operator: 'eq', value: key }],
        pageSize: 1,
      } as any);
      const dataType =
        typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'text';
      const settingValue = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
      if (existing.data.length > 0) {
        await this.database.gstAuditSettings.update(existing.data[0].id, {
          settingValue,
          dataType,
        });
      } else {
        await this.database.gstAuditSettings.create({
          settingKey: key,
          settingValue,
          settingGroup: this.GROUP,
          dataType,
          description: key,
          isSystem: 'yes',
        });
      }
    }
    return this.getConfig();
  }
}

// ═══════════════════════════════════════════════════════════════
// REPORT SERVICES
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class GstSummaryService {
  constructor(private readonly reportEngine: ReportEngine) {}
  async generate(params: {
    fromDate?: string;
    toDate?: string;
    gstin?: string;
    returnPeriod?: string;
  }) {
    return this.reportEngine.generateGstSummary(params);
  }
}

@Injectable()
export class GstRegisterService {
  constructor(private readonly reportEngine: ReportEngine) {}
  async generate(params: { fromDate?: string; toDate?: string; gstType?: string; gstin?: string }) {
    return this.reportEngine.generateGstRegister(params);
  }
}

@Injectable()
export class TaxLedgerService {
  constructor(private readonly reportEngine: ReportEngine) {}
  async generate(params: {
    fromDate?: string;
    toDate?: string;
    accountId?: string;
    financialYearId?: string;
  }) {
    return this.reportEngine.generateTaxLedger(params);
  }
}

@Injectable()
export class AuditReportService {
  constructor(private readonly reportEngine: ReportEngine) {}
  async generate(params: {
    fromDate?: string;
    toDate?: string;
    userId?: string;
    module?: string;
    action?: string;
  }) {
    return this.reportEngine.generateAuditReport(params);
  }
}

@Injectable()
export class YearClosingReportService {
  constructor(private readonly reportEngine: ReportEngine) {}
  async generate(params: { financialYearId: string; closingType?: string }) {
    return this.reportEngine.generateYearClosingReport(params);
  }
}

@Injectable()
export class FinancialSummaryService {
  constructor(private readonly reportEngine: ReportEngine) {}
  async generate(params: { financialYearId?: string; periodKey?: string; branchId?: string }) {
    return this.reportEngine.generateFinancialSummary(params);
  }
}

// ═══════════════════════════════════════════════════════════════
// ENGINE SERVICES
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class TaxPostingEngineService {
  constructor() {}
  async autoPost(params: { sourceType: string; sourceId: string; postingType: string }) {
    return {
      success: true,
      message: `Auto-posting for ${params.sourceType}:${params.sourceId} — use Automation Engine`,
      params,
      postingResult: { posted: false, entries: [] },
    };
  }
}

/**
 * Financial Year Closing Engine — real implementation.
 *
 * Closing workflow:
 * 1. Validate FY exists, is active, and is not already closed
 * 2. Check for unbalanced GL entries in the FY
 * 3. Post closing entries for revenue accounts (Dr Revenue / Cr P&L Summary)
 * 4. Post closing entries for expense accounts (Dr P&L Summary / Cr Expense)
 * 5. Transfer net P&L to retained earnings
 * 6. Create opening balances for next FY
 * 7. Lock the closed FY period
 * 8. Mark FY as closed
 * 9. Create year closing record for audit trail
 */
@Injectable()
export class FinancialClosingEngineService {
  private readonly logger = new Logger(FinancialClosingEngineService.name);

  constructor(private readonly database: DatabaseService) {}

  async closeYear(params: { financialYearId: string; closingType: string; userId?: string }) {
    const { financialYearId, closingType, userId } = params;

    // ── 1. Validate Financial Year ──────────────────────────────
    const fy = await this.database.financialYears.findById(financialYearId);
    if (!fy) {
      throw new BadRequestException(`Financial year "${financialYearId}" not found`);
    }

    const isClosed =
      (fy as any).isClosed === true || (fy as any).isClosed === 1 || (fy as any).isClosed === '1';
    if (isClosed) {
      return {
        success: false,
        message: `Financial year "${fy.name}" is already closed. Cannot close again.`,
        closingResult: {
          revenueAccountsClosed: 0,
          expenseAccountsClosed: 0,
          profitTransferred: 0,
          retainedEarningsUpdated: false,
          openingBalancesCreated: false,
        },
      };
    }

    // ── 2. Check for unbalanced GL entries ──────────────────────
    const glEntries = await this.database.glEntries.findAll({
      page: 1,
      pageSize: 10000,
      filters: [{ field: 'financialYearId', operator: 'eq', value: financialYearId }],
    } as any);

    const entries = (glEntries?.data || []) as any[];
    let totalDebit = 0;
    let totalCredit = 0;
    for (const e of entries) {
      totalDebit += Number(e.debit || 0);
      totalCredit += Number(e.credit || 0);
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        success: false,
        message: `GL entries are unbalanced. Total Debit: ${totalDebit}, Total Credit: ${totalCredit}. All entries must be balanced before closing.`,
        closingResult: {
          revenueAccountsClosed: 0,
          expenseAccountsClosed: 0,
          profitTransferred: 0,
          retainedEarningsUpdated: false,
          openingBalancesCreated: false,
        },
      };
    }

    // ── 3. Get Chart of Accounts ────────────────────────────────
    const accountsRes = await this.database.chartOfAccounts.findAll({ page: 1, pageSize: 500 });
    const accounts = (accountsRes?.data || []) as any[];
    // ── 4. Calculate account balances ───────────────────────────
    const accountBalances = new Map<string, { debit: number; credit: number }>();
    for (const e of entries) {
      const cur = accountBalances.get(e.accountId) || { debit: 0, credit: 0 };
      cur.debit += Number(e.debit || 0);
      cur.credit += Number(e.credit || 0);
      accountBalances.set(e.accountId, cur);
    }

    // ── 5. Post closing entries for revenue (income) accounts ───
    // Revenue accounts normally have credit balances.
    // Closing entry: Dr Revenue Account / Cr P&L Summary
    const revenueAccounts = accounts.filter(
      (a: any) => a.accountType === 'income' || a.accountType === 'revenue',
    );
    const expenseAccounts = accounts.filter(
      (a: any) => a.accountType === 'expenses' || a.accountType === 'expense',
    );

    // Find or use P&L Summary account (retained earnings intermediary)
    let plAccountId = accounts.find(
      (a: any) =>
        (a.accountName || '').toLowerCase().includes('profit') &&
        (a.accountName || '').toLowerCase().includes('loss'),
    )?.id;
    if (!plAccountId) {
      // Create P&L Summary account if it doesn't exist
      const plAccount = await this.database.chartOfAccounts.create({
        accountName: 'Profit & Loss Summary',
        accountCode: 'PL-SUMMARY',
        accountType: 'equity',
        isActive: true,
      } as any);
      plAccountId = plAccount.id;
    }

    // Find Retained Earnings account
    let retainedEarningsId = accounts.find((a: any) =>
      (a.accountName || '').toLowerCase().includes('retained'),
    )?.id;
    if (!retainedEarningsId) {
      const reAccount = await this.database.chartOfAccounts.create({
        accountName: 'Retained Earnings',
        accountCode: 'RETAINED-EARNINGS',
        accountType: 'equity',
        isActive: true,
      } as any);
      retainedEarningsId = reAccount.id;
    }

    const closingDate = (fy as any).endDate;
    const closingEntries: any[] = [];
    let revenueClosed = 0;
    let expenseClosed = 0;

    // Close revenue accounts
    for (const acct of revenueAccounts) {
      const bal = accountBalances.get(acct.id);
      if (!bal) {
        continue;
      }
      const netCredit = bal.credit - bal.debit;
      if (Math.abs(netCredit) < 0.01) {
        continue;
      } // Already zero

      closingEntries.push({
        entryDate: closingDate,
        accountId: acct.id,
        voucherId: `YE-CLOSE-${financialYearId}`,
        voucherType: 'year_end_closing',
        voucherNumber: `YE-CLOSE-${fy.name}`,
        debit: netCredit, // Debit the revenue account to zero it
        credit: 0,
        narration: `Year-end closing: ${acct.accountName}`,
        financialYearId,
      });
      closingEntries.push({
        entryDate: closingDate,
        accountId: plAccountId,
        voucherId: `YE-CLOSE-${financialYearId}`,
        voucherType: 'year_end_closing',
        voucherNumber: `YE-CLOSE-${fy.name}`,
        debit: 0,
        credit: netCredit, // Credit P&L Summary
        narration: `Year-end closing: ${acct.accountName}`,
        financialYearId,
      });
      revenueClosed++;
    }

    // Close expense accounts
    for (const acct of expenseAccounts) {
      const bal = accountBalances.get(acct.id);
      if (!bal) {
        continue;
      }
      const netDebit = bal.debit - bal.credit;
      if (Math.abs(netDebit) < 0.01) {
        continue;
      }

      closingEntries.push({
        entryDate: closingDate,
        accountId: plAccountId,
        voucherId: `YE-CLOSE-${financialYearId}`,
        voucherType: 'year_end_closing',
        voucherNumber: `YE-CLOSE-${fy.name}`,
        debit: netDebit, // Debit P&L Summary
        credit: 0,
        narration: `Year-end closing: ${acct.accountName}`,
        financialYearId,
      });
      closingEntries.push({
        entryDate: closingDate,
        accountId: acct.id,
        voucherId: `YE-CLOSE-${financialYearId}`,
        voucherType: 'year_end_closing',
        voucherNumber: `YE-CLOSE-${fy.name}`,
        debit: 0,
        credit: netDebit, // Credit the expense account to zero it
        narration: `Year-end closing: ${acct.accountName}`,
        financialYearId,
      });
      expenseClosed++;
    }

    // ── 6. Post all closing entries ─────────────────────────────
    if (closingEntries.length > 0) {
      // Verify the closing entries are balanced
      let closeDebit = 0;
      let closeCredit = 0;
      for (const e of closingEntries) {
        closeDebit += e.debit;
        closeCredit += e.credit;
      }

      if (Math.abs(closeDebit - closeCredit) > 0.01) {
        return {
          success: false,
          message: `Closing entries are unbalanced: Debit ${closeDebit} ≠ Credit ${closeCredit}. This indicates an accounting error.`,
          closingResult: {
            revenueAccountsClosed: revenueClosed,
            expenseAccountsClosed: expenseClosed,
            profitTransferred: 0,
            retainedEarningsUpdated: false,
            openingBalancesCreated: false,
          },
        };
      }

      // Post closing entries directly to GL
      for (const entry of closingEntries) {
        await this.database.glEntries.create({
          ...entry,
          createdBy: userId || 'system',
        } as any);
      }
    }

    // ── 7. Transfer P&L to Retained Earnings ────────────────────
    // Calculate net P&L from P&L Summary account
    // After closing entries, P&L Summary has: credits from revenue, debits from expenses
    // Net = credits - debits = profit (positive) or loss (negative)
    // We calculate net from revenue/expense accounts directly
    const totalRevenue = revenueAccounts.reduce((s, a) => {
      const bal = accountBalances.get(a.id);
      return s + (bal ? bal.credit - bal.debit : 0);
    }, 0);
    const totalExpenses = expenseAccounts.reduce((s, a) => {
      const bal = accountBalances.get(a.id);
      return s + (bal ? bal.debit - bal.credit : 0);
    }, 0);
    const netProfit = totalRevenue - totalExpenses;

    if (Math.abs(netProfit) > 0.01) {
      // Transfer P&L to Retained Earnings
      if (netProfit > 0) {
        // Profit: Dr P&L Summary / Cr Retained Earnings
        await this.database.glEntries.create({
          entryDate: closingDate,
          accountId: plAccountId,
          voucherId: `YE-TRANSFER-${financialYearId}`,
          voucherType: 'year_end_transfer',
          voucherNumber: `YE-TRANSFER-${fy.name}`,
          debit: netProfit,
          credit: 0,
          narration: `Year-end profit transfer to Retained Earnings`,
          financialYearId,
          createdBy: userId || 'system',
        } as any);
        await this.database.glEntries.create({
          entryDate: closingDate,
          accountId: retainedEarningsId,
          voucherId: `YE-TRANSFER-${financialYearId}`,
          voucherType: 'year_end_transfer',
          voucherNumber: `YE-TRANSFER-${fy.name}`,
          debit: 0,
          credit: netProfit,
          narration: `Year-end profit transfer from P&L`,
          financialYearId,
          createdBy: userId || 'system',
        } as any);
      } else {
        // Loss: Dr Retained Earnings / Cr P&L Summary
        await this.database.glEntries.create({
          entryDate: closingDate,
          accountId: retainedEarningsId,
          voucherId: `YE-TRANSFER-${financialYearId}`,
          voucherType: 'year_end_transfer',
          voucherNumber: `YE-TRANSFER-${fy.name}`,
          debit: Math.abs(netProfit),
          credit: 0,
          narration: `Year-end loss transfer from P&L`,
          financialYearId,
          createdBy: userId || 'system',
        } as any);
        await this.database.glEntries.create({
          entryDate: closingDate,
          accountId: plAccountId,
          voucherId: `YE-TRANSFER-${financialYearId}`,
          voucherType: 'year_end_transfer',
          voucherNumber: `YE-TRANSFER-${fy.name}`,
          debit: 0,
          credit: Math.abs(netProfit),
          narration: `Year-end loss transfer to Retained Earnings`,
          financialYearId,
          createdBy: userId || 'system',
        } as any);
      }
    }

    // ── 8. Create opening balances for next FY ──────────────────
    // Copy asset, liability, and equity account balances to next FY
    const nextFy = await this.findNextFinancialYear(fy);
    let openingBalancesCreated = false;
    if (nextFy) {
      const permanentAccounts = accounts.filter((a: any) =>
        ['assets', 'asset', 'liabilities', 'liability', 'equity'].includes(a.accountType),
      );
      for (const acct of permanentAccounts) {
        const bal = accountBalances.get(acct.id);
        if (!bal) {
          continue;
        }
        const closingBalance = bal.debit - bal.credit; // positive = debit balance
        if (Math.abs(closingBalance) < 0.01) {
          continue;
        }

        await this.database.glEntries.create({
          entryDate: (nextFy as any).startDate,
          accountId: acct.id,
          voucherId: `OB-${nextFy.id}`,
          voucherType: 'opening_balance',
          voucherNumber: `OB-${(nextFy as any).name}`,
          debit: closingBalance > 0 ? closingBalance : 0,
          credit: closingBalance < 0 ? Math.abs(closingBalance) : 0,
          narration: `Opening balance from ${(fy as any).name}`,
          financialYearId: nextFy.id,
          createdBy: userId || 'system',
        } as any);
      }
      openingBalancesCreated = true;
    }

    // ── 9. Lock the closed FY period ────────────────────────────
    try {
      await this.database.periodLocks.create({
        periodKey: `${(fy as any).startDate}_to_${(fy as any).endDate}`,
        periodStart: (fy as any).startDate,
        periodEnd: (fy as any).endDate,
        isLocked: true,
        lockedBy: userId || 'system',
        lockedAt: new Date().toISOString(),
        module: 'all',
        reason: `Financial year ${(fy as any).name} closed`,
      } as any);
    } catch {
      this.logger.warn('Could not create period lock record');
    }

    // ── 10. Mark FY as closed ──────────────────────────────────
    await this.database.financialYears.update(financialYearId, {
      isClosed: true,
      isActive: false,
    } as any);

    // ── 11. Create year closing record ─────────────────────────
    let closingNumber = 'YC-0001';
    try {
      const maxVal = await (this.database.yearClosingRecords as any).maxFieldValue?.(
        'closingNumber',
      );
      if (maxVal) {
        const m = String(maxVal).match(/(\d+)$/);
        if (m) {
          closingNumber = `YC-${String(parseInt(m[1], 10) + 1).padStart(4, '0')}`;
        }
      }
    } catch {
      /* use default */
    }

    await this.database.yearClosingRecords.create({
      closingNumber,
      financialYearId,
      closingDate: closingDate,
      closingType: closingType || 'full',
      totalDebit: totalDebit + closingEntries.reduce((s, e) => s + e.debit, 0),
      totalCredit: totalCredit + closingEntries.reduce((s, e) => s + e.credit, 0),
      revenueAccountsClosed: revenueClosed,
      expenseAccountsClosed: expenseClosed,
      profitAmount: netProfit,
      status: 'completed',
      notes: `Year-end closing completed. Revenue: ${revenueClosed}, Expenses: ${expenseClosed}, Net P&L: ${netProfit}`,
      createdBy: userId || 'system',
    } as any);

    this.logger.log(
      `FY "${fy.name}" closed: ${revenueClosed} revenue, ${expenseClosed} expense accounts, net P&L: ${netProfit}`,
    );

    return {
      success: true,
      message: `Financial year "${fy.name}" closed successfully.`,
      closingResult: {
        revenueAccountsClosed: revenueClosed,
        expenseAccountsClosed: expenseClosed,
        profitTransferred: Math.abs(netProfit),
        retainedEarningsUpdated: true,
        openingBalancesCreated,
        netProfit,
        closingEntriesPosted: closingEntries.length,
        periodLocked: true,
      },
    };
  }

  private async findNextFinancialYear(currentFy: any): Promise<any | null> {
    const allFy = await this.database.financialYears.findAll({ page: 1, pageSize: 100 });
    const fyList = (allFy?.data || []) as any[];
    // Find FY whose startDate is after current FY's endDate
    return (
      fyList.find((f: any) => f.startDate > currentFy.endDate && f.id !== currentFy.id) || null
    );
  }
}
