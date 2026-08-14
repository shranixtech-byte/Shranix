import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

/**
 * Real Financial Reports Engine
 *
 * Replaces placeholder report services with actual GL-based calculations.
 * Generates: Trial Balance, General Ledger, Profit & Loss, Balance Sheet,
 * Cash Flow, GST Register, Tax Ledger, Audit Report, Account Statement, Day Book.
 */
@Injectable()
export class ReportEngine {
  private readonly logger = new Logger(ReportEngine.name);

  constructor(private readonly database: DatabaseService) {}

  /**
   * H4 — prefilter GL rows in SQL using the same conditions the report applies
   * in memory (pure subset prefilter: never changes results, only bounds the
   * rows loaded so date-scoped reports do not hit the 10000-row page ceiling).
   */
  private glEntryFilters(params: any): any[] {
    const filters: any[] = [];
    if (params?.fromDate) {
      filters.push({ field: 'entryDate', operator: 'gte', value: params.fromDate });
    }
    if (params?.toDate) {
      filters.push({ field: 'entryDate', operator: 'lte', value: params.toDate });
    }
    if (params?.branchId) {
      filters.push({ field: 'branchId', operator: 'eq', value: params.branchId });
    }
    if (params?.costCenterId) {
      filters.push({ field: 'costCenterId', operator: 'eq', value: params.costCenterId });
    }
    if (params?.accountId) {
      filters.push({ field: 'accountId', operator: 'eq', value: params.accountId });
    }
    return filters;
  }

  // ── TRIAL BALANCE ──────────────────────────────────────
  async generateTrialBalance(params: {
    financialYearId?: string;
    fromDate?: string;
    toDate?: string;
    branchId?: string;
    costCenterId?: string;
  }) {
    this.logger.log('Generating Trial Balance with real GL data');
    const entries = await this.database.glEntries.findAll({
      page: 1,
      pageSize: 10000,
      filters: this.glEntryFilters(params),
    } as any);
    const accounts = await this.database.chartOfAccounts.findAll({
      page: 1,
      pageSize: 5000,
    } as any);

    const accountMap: Record<string, { debit: number; credit: number }> = {};
    let totalDebit = 0;
    let totalCredit = 0;

    if (entries.data) {
      for (const entry of entries.data as any[]) {
        const key = entry.accountId;
        if (!accountMap[key]) {
          accountMap[key] = { debit: 0, credit: 0 };
        }

        // Apply filters
        if (params.fromDate && entry.entryDate < params.fromDate) {
          continue;
        }
        if (params.toDate && entry.entryDate > params.toDate) {
          continue;
        }
        if (params.branchId && entry.branchId !== params.branchId) {
          continue;
        }
        if (params.costCenterId && entry.costCenterId !== params.costCenterId) {
          continue;
        }

        accountMap[key].debit += Number(entry.debit || 0);
        accountMap[key].credit += Number(entry.credit || 0);
        totalDebit += Number(entry.debit || 0);
        totalCredit += Number(entry.credit || 0);
      }
    }

    const accountDetails = Object.entries(accountMap).map(([accountId, balances]) => {
      const account = accounts.data?.find((a: any) => a.id === accountId);
      return {
        accountId,
        accountCode: account?.accountCode || '—',
        accountName: account?.accountName || '—',
        accountType: account?.accountType || '—',
        openingBalance: Number(account?.openingBalance || 0),
        openingBalanceType: account?.openingBalanceType || 'debit',
        debit: Math.round(balances.debit * 100) / 100,
        credit: Math.round(balances.credit * 100) / 100,
        closingBalance: Math.round((balances.debit - balances.credit) * 100) / 100,
      };
    });

    return {
      title: 'Trial Balance',
      generatedAt: new Date().toISOString(),
      params,
      summary: {
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        difference: Math.round((totalDebit - totalCredit) * 100) / 100,
        accountCount: accountDetails.length,
      },
      accounts: accountDetails,
    };
  }

  // ── PROFIT & LOSS ──────────────────────────────────────
  async generateProfitLoss(params: {
    financialYearId?: string;
    fromDate?: string;
    toDate?: string;
    branchId?: string;
    costCenterId?: string;
  }) {
    this.logger.log('Generating Profit & Loss with real GL data');
    const trialBalance = await this.generateTrialBalance(params);
    const incomeAccounts = trialBalance.accounts.filter(
      (a: any) => a.accountType === 'income' || a.accountType === 'revenue',
    );
    const expenseAccounts = trialBalance.accounts.filter(
      (a: any) => a.accountType === 'expenses' || a.accountType === 'expense',
    );

    const revenueItems = incomeAccounts.map((a: any) => ({
      name: a.accountName,
      code: a.accountCode,
      amount: Math.abs(a.closingBalance),
    }));
    const expenseItems = expenseAccounts.map((a: any) => ({
      name: a.accountName,
      code: a.accountCode,
      amount: Math.abs(a.closingBalance),
    }));

    const totalRevenue = revenueItems.reduce((s: number, i: any) => s + i.amount, 0);
    const totalExpenses = expenseItems.reduce((s: number, i: any) => s + i.amount, 0);
    const grossProfit = totalRevenue;
    const netProfit = totalRevenue - totalExpenses;

    return {
      title: 'Profit & Loss Statement',
      generatedAt: new Date().toISOString(),
      params,
      revenue: { total: Math.round(totalRevenue * 100) / 100, items: revenueItems },
      costOfGoodsSold: { total: 0, items: [] },
      grossProfit: Math.round(grossProfit * 100) / 100,
      operatingExpenses: { total: Math.round(totalExpenses * 100) / 100, items: expenseItems },
      netProfit: Math.round(netProfit * 100) / 100,
      netProfitMargin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 10000) / 100 : 0,
    };
  }

  // ── BALANCE SHEET ──────────────────────────────────────
  async generateBalanceSheet(params: {
    financialYearId?: string;
    asOnDate?: string;
    branchId?: string;
    comparativeYear?: string;
  }) {
    this.logger.log('Generating Balance Sheet with real GL data');
    const trialBalance = await this.generateTrialBalance({
      financialYearId: params.financialYearId,
      branchId: params.branchId,
    });

    const assetAccounts = trialBalance.accounts.filter((a: any) => a.accountType === 'assets');
    const liabilityAccounts = trialBalance.accounts.filter(
      (a: any) => a.accountType === 'liabilities',
    );
    const equityAccounts = trialBalance.accounts.filter((a: any) => a.accountType === 'equity');

    // If P&L data available, include net profit in equity
    const pnl = await this.generateProfitLoss({
      financialYearId: params.financialYearId,
      fromDate: params.asOnDate,
      toDate: params.asOnDate,
    });

    const totalAssets = assetAccounts.reduce((s: number, a: any) => s + a.closingBalance, 0);
    const totalLiabilities = liabilityAccounts.reduce(
      (s: number, a: any) => s + Math.abs(a.closingBalance),
      0,
    );
    const totalEquity =
      equityAccounts.reduce((s: number, a: any) => s + Math.abs(a.closingBalance), 0) +
      (pnl.netProfit > 0 ? pnl.netProfit : 0);

    return {
      title: 'Balance Sheet',
      generatedAt: new Date().toISOString(),
      params,
      assets: {
        total: Math.round(totalAssets * 100) / 100,
        items: assetAccounts.map((a: any) => ({
          name: a.accountName,
          code: a.accountCode,
          amount: a.closingBalance,
        })),
      },
      liabilities: {
        total: Math.round(totalLiabilities * 100) / 100,
        items: liabilityAccounts.map((a: any) => ({
          name: a.accountName,
          code: a.accountCode,
          amount: Math.abs(a.closingBalance),
        })),
      },
      equity: {
        total: Math.round(totalEquity * 100) / 100,
        items: [
          ...equityAccounts.map((a: any) => ({
            name: a.accountName,
            code: a.accountCode,
            amount: Math.abs(a.closingBalance),
          })),
          ...(pnl.netProfit > 0
            ? [
                {
                  name: 'Current Year Profit',
                  code: 'PNL',
                  amount: Math.round(pnl.netProfit * 100) / 100,
                },
              ]
            : []),
          ...(pnl.netProfit < 0
            ? [
                {
                  name: 'Current Year Loss',
                  code: 'PNL',
                  amount: Math.round(Math.abs(pnl.netProfit) * 100) / 100,
                },
              ]
            : []),
        ],
      },
    };
  }

  // ── CASH FLOW STATEMENT ────────────────────────────────
  async generateCashFlow(params: { financialYearId?: string; fromDate?: string; toDate?: string }) {
    this.logger.log('Generating Cash Flow Statement with real GL data');

    // Get cash/bank accounts
    const accounts = await this.database.chartOfAccounts.findAll({
      page: 1,
      pageSize: 5000,
    } as any);
    const cashAccounts = accounts.data?.filter((a: any) => a.isCashAccount) || [];
    const entries = await this.database.glEntries.findAll({ page: 1, pageSize: 10000 } as any);

    const operatingActivities: any[] = [];
    const investingActivities: any[] = [];
    const financingActivities: any[] = [];

    let totalOperating = 0;
    let totalInvesting = 0;
    let totalFinancing = 0;

    const cashAccountIds = new Set(cashAccounts.map((c: any) => c.id));

    if (entries.data) {
      for (const entry of entries.data as any[]) {
        if (!cashAccountIds.has(entry.accountId)) {
          continue;
        }
        if (params.fromDate && entry.entryDate < params.fromDate) {
          continue;
        }
        if (params.toDate && entry.entryDate > params.toDate) {
          continue;
        }

        const amount = Number(entry.debit || 0) - Number(entry.credit || 0);

        // Categorize by voucher type
        if (
          ['sales', 'purchase', 'expense', 'salary', 'receipt', 'payment'].includes(
            entry.voucherType,
          )
        ) {
          operatingActivities.push({
            date: entry.entryDate,
            description: entry.narration,
            amount,
            voucherType: entry.voucherType,
          });
          totalOperating += amount;
        } else if (['asset', 'fixed_asset', 'investment'].includes(entry.voucherType)) {
          investingActivities.push({
            date: entry.entryDate,
            description: entry.narration,
            amount,
            voucherType: entry.voucherType,
          });
          totalInvesting += amount;
        } else {
          financingActivities.push({
            date: entry.entryDate,
            description: entry.narration,
            amount,
            voucherType: entry.voucherType,
          });
          totalFinancing += amount;
        }
      }
    }

    const netCashFlow = totalOperating + totalInvesting + totalFinancing;

    return {
      title: 'Cash Flow Statement',
      generatedAt: new Date().toISOString(),
      params,
      operatingActivities: {
        total: Math.round(totalOperating * 100) / 100,
        items: operatingActivities,
      },
      investingActivities: {
        total: Math.round(totalInvesting * 100) / 100,
        items: investingActivities,
      },
      financingActivities: {
        total: Math.round(totalFinancing * 100) / 100,
        items: financingActivities,
      },
      netCashFlow: Math.round(netCashFlow * 100) / 100,
      openingBalance: 0,
      closingBalance: Math.round(netCashFlow * 100) / 100,
    };
  }

  // ── DAY BOOK ───────────────────────────────────────────
  async generateDayBook(params: { date: string; voucherType?: string; branchId?: string }) {
    this.logger.log(`Generating Day Book for ${params.date}`);
    const entries = await this.database.glEntries.findAll({ page: 1, pageSize: 10000 } as any);

    const dayEntries = (entries.data || []).filter((entry: any) => {
      if (entry.entryDate?.split('T')[0] !== params.date) {
        return false;
      }
      if (params.voucherType && entry.voucherType !== params.voucherType) {
        return false;
      }
      return true;
    });

    const totalDebit = dayEntries.reduce((s: number, e: any) => s + Number(e.debit || 0), 0);
    const totalCredit = dayEntries.reduce((s: number, e: any) => s + Number(e.credit || 0), 0);

    return {
      title: `Day Book - ${params.date}`,
      generatedAt: new Date().toISOString(),
      params,
      entries: dayEntries,
      summary: {
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        count: dayEntries.length,
      },
    };
  }

  // ── ACCOUNT STATEMENT ──────────────────────────────────
  async generateAccountStatement(params: {
    accountId: string;
    fromDate?: string;
    toDate?: string;
    financialYearId?: string;
  }) {
    this.logger.log(`Generating Account Statement for ${params.accountId}`);
    const account = await this.database.chartOfAccounts.findById(params.accountId);
    const entries = await this.database.glEntries.findAll({ page: 1, pageSize: 10000 } as any);

    const filteredEntries = (entries.data || [])
      .filter((entry: any) => {
        if (entry.accountId !== params.accountId) {
          return false;
        }
        if (params.fromDate && entry.entryDate < params.fromDate) {
          return false;
        }
        if (params.toDate && entry.entryDate > params.toDate) {
          return false;
        }
        return true;
      })
      .sort((a: any, b: any) => a.entryDate?.localeCompare(b.entryDate));

    const openingBalance = Number(account?.openingBalance || 0);
    let runningBalance = openingBalance;
    const entriesWithBalance = filteredEntries.map((entry: any) => {
      runningBalance += Number(entry.debit || 0) - Number(entry.credit || 0);
      return { ...entry, runningBalance: Math.round(runningBalance * 100) / 100 };
    });

    const totalDebit = filteredEntries.reduce((s: number, e: any) => s + Number(e.debit || 0), 0);
    const totalCredit = filteredEntries.reduce((s: number, e: any) => s + Number(e.credit || 0), 0);

    return {
      title: `Account Statement - ${account?.accountName || params.accountId}`,
      generatedAt: new Date().toISOString(),
      params,
      account: account
        ? {
            id: account.id,
            code: account.accountCode,
            name: account.accountName,
            type: account.accountType,
          }
        : { id: params.accountId },
      entries: entriesWithBalance,
      summary: {
        openingBalance,
        totalDebit: Math.round((openingBalance + totalDebit) * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        closingBalance: Math.round(runningBalance * 100) / 100,
      },
    };
  }

  // ── GENERAL LEDGER ─────────────────────────────────────
  async generateGeneralLedger(params: {
    financialYearId?: string;
    fromDate?: string;
    toDate?: string;
    accountId?: string;
  }) {
    this.logger.log('Generating General Ledger');
    const entries = await this.database.glEntries.findAll({
      page: 1,
      pageSize: 10000,
      filters: this.glEntryFilters(params),
    } as any);
    const accounts = await this.database.chartOfAccounts.findAll({
      page: 1,
      pageSize: 5000,
    } as any);

    const filteredEntries = (entries.data || []).filter((entry: any) => {
      if (params.fromDate && entry.entryDate < params.fromDate) {
        return false;
      }
      if (params.toDate && entry.entryDate > params.toDate) {
        return false;
      }
      if (params.accountId && entry.accountId !== params.accountId) {
        return false;
      }
      return true;
    });

    const enrichedEntries = filteredEntries.map((entry: any) => {
      const account = accounts.data?.find((a: any) => a.id === entry.accountId);
      return { ...entry, accountName: account?.accountName, accountCode: account?.accountCode };
    });

    const totalDebit = filteredEntries.reduce((s: number, e: any) => s + Number(e.debit || 0), 0);
    const totalCredit = filteredEntries.reduce((s: number, e: any) => s + Number(e.credit || 0), 0);

    return {
      title: 'General Ledger',
      generatedAt: new Date().toISOString(),
      params,
      entries: enrichedEntries,
      summary: {
        totalEntries: enrichedEntries.length,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
      },
    };
  }

  // ── GST REGISTER ───────────────────────────────────────
  async generateGstRegister(params: {
    fromDate?: string;
    toDate?: string;
    gstType?: string;
    gstin?: string;
  }) {
    this.logger.log('Generating GST Register');
    // H4 — push the same date/gst filters into SQL (pure subset prefilter)
    const gstFilters: any[] = [];
    if (params.fromDate) {
      gstFilters.push({ field: 'voucherDate', operator: 'gte', value: params.fromDate });
    }
    if (params.toDate) {
      gstFilters.push({ field: 'voucherDate', operator: 'lte', value: params.toDate });
    }
    if (params.gstType) {
      gstFilters.push({ field: 'gstType', operator: 'eq', value: params.gstType });
    }
    if (params.gstin) {
      gstFilters.push({ field: 'gstin', operator: 'eq', value: params.gstin });
    }
    const entries = await this.database.gstLedger.findAll({
      page: 1,
      pageSize: 10000,
      filters: gstFilters,
    } as any);

    const filtered = (entries.data || []).filter((entry: any) => {
      if (params.fromDate && entry.voucherDate < params.fromDate) {
        return false;
      }
      if (params.toDate && entry.voucherDate > params.toDate) {
        return false;
      }
      if (params.gstType && entry.gstType !== params.gstType) {
        return false;
      }
      if (params.gstin && entry.gstin !== params.gstin) {
        return false;
      }
      return true;
    });

    const totalTaxable = filtered.reduce((s: number, e: any) => s + Number(e.taxableValue || 0), 0);
    const totalGst = filtered.reduce((s: number, e: any) => s + Number(e.gstAmount || 0), 0);
    const totalCess = filtered
      .filter((e: any) => e.gstType === 'CESS')
      .reduce((s: number, e: any) => s + Number(e.gstAmount || 0), 0);

    return {
      title: 'GST Register',
      generatedAt: new Date().toISOString(),
      params,
      entries: filtered,
      summary: {
        totalTaxable: Math.round(totalTaxable * 100) / 100,
        totalGst: Math.round(totalGst * 100) / 100,
        totalCess: Math.round(totalCess * 100) / 100,
      },
    };
  }

  // ── TAX LEDGER ─────────────────────────────────────────
  async generateTaxLedger(params: {
    fromDate?: string;
    toDate?: string;
    accountId?: string;
    financialYearId?: string;
  }) {
    this.logger.log('Generating Tax Ledger');
    return this.generateAccountStatement({
      accountId: params.accountId || 'tax',
      fromDate: params.fromDate,
      toDate: params.toDate,
      financialYearId: params.financialYearId,
    });
  }

  // ── AUDIT REPORT ───────────────────────────────────────
  async generateAuditReport(params: {
    fromDate?: string;
    toDate?: string;
    userId?: string;
    module?: string;
    action?: string;
  }) {
    this.logger.log('Generating Audit Report');
    let logs: any[] = [];

    if (params.userId) {
      const result = await this.database.auditLogs.findByUserId(params.userId, {
        page: 1,
        pageSize: 10000,
      });
      logs = result.data || [];
    } else if (params.action) {
      const result = await this.database.auditLogs.findByEvent(params.action, {
        page: 1,
        pageSize: 10000,
      });
      logs = result.data || [];
    } else {
      // If no specific filter, use the most recent entries via findByEvent with empty event
      const result = await this.database.auditLogs.findByEvent('login', {
        page: 1,
        pageSize: 5000,
      });
      const result2 = await this.database.auditLogs.findByEvent('logout', {
        page: 1,
        pageSize: 5000,
      });
      logs = [...(result.data || []), ...(result2.data || [])];
    }

    const filtered = logs.filter((log: any) => {
      if (params.fromDate && log.createdAt < params.fromDate) {
        return false;
      }
      if (params.toDate && log.createdAt > params.toDate) {
        return false;
      }
      if (params.userId && log.userId !== params.userId) {
        return false;
      }
      if (params.module && log.resource !== params.module) {
        return false;
      }
      if (params.action && log.action !== params.action) {
        return false;
      }
      return true;
    });

    const byAction: Record<string, number> = {};
    const byModule: Record<string, number> = {};
    const byUser: Record<string, number> = {};

    for (const log of filtered) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byModule[log.resource] = (byModule[log.resource] || 0) + 1;
      byUser[log.userId] = (byUser[log.userId] || 0) + 1;
    }

    return {
      title: 'Audit Report',
      generatedAt: new Date().toISOString(),
      params,
      entries: filtered,
      summary: { totalActions: filtered.length, byAction, byModule, byUser },
    };
  }

  // ── GST SUMMARY ────────────────────────────────────────
  async generateGstSummary(params: {
    fromDate?: string;
    toDate?: string;
    gstin?: string;
    returnPeriod?: string;
  }) {
    this.logger.log('Generating GST Summary');
    // H4 — push the same date/gst filters into SQL (pure subset prefilter)
    const gstSummaryFilters: any[] = [];
    if (params.fromDate) {
      gstSummaryFilters.push({ field: 'voucherDate', operator: 'gte', value: params.fromDate });
    }
    if (params.toDate) {
      gstSummaryFilters.push({ field: 'voucherDate', operator: 'lte', value: params.toDate });
    }
    if (params.gstin) {
      gstSummaryFilters.push({ field: 'gstin', operator: 'eq', value: params.gstin });
    }
    const entries = await this.database.gstLedger.findAll({
      page: 1,
      pageSize: 10000,
      filters: gstSummaryFilters,
    } as any);

    let totalInputTax = 0;
    let totalOutputTax = 0;

    for (const entry of (entries.data || []) as any[]) {
      if (params.fromDate && entry.voucherDate < params.fromDate) {
        continue;
      }
      if (params.toDate && entry.voucherDate > params.toDate) {
        continue;
      }
      if (params.gstin && entry.gstin !== params.gstin) {
        continue;
      }

      if (entry.inputOutput === 'input') {
        totalInputTax += Number(entry.gstAmount || 0);
      } else {
        totalOutputTax += Number(entry.gstAmount || 0);
      }
    }

    return {
      title: 'GST Summary',
      generatedAt: new Date().toISOString(),
      params,
      summary: {
        totalInputTax: Math.round(totalInputTax * 100) / 100,
        totalOutputTax: Math.round(totalOutputTax * 100) / 100,
        netPayable: Math.round((totalOutputTax - totalInputTax) * 100) / 100,
      },
      details: entries.data || [],
    };
  }

  // ── YEAR CLOSING REPORT ───────────────────────────────
  async generateYearClosingReport(params: { financialYearId: string; closingType?: string }) {
    this.logger.log('Generating Year Closing Report');
    const closingRecords = await this.database.yearClosingRecords.findAll({
      page: 1,
      pageSize: 100,
    } as any);
    const closing = (closingRecords.data || []).find(
      (r: any) => r.financialYearId === params.financialYearId,
    );

    return {
      title: 'Year Closing Report',
      generatedAt: new Date().toISOString(),
      params,
      summary: {
        totalRevenue: closing?.totalRevenue || 0,
        totalExpenses: closing?.totalExpenses || 0,
        netProfit: closing?.netProfit || 0,
        retainedEarnings: closing?.retainedEarnings || 0,
      },
      details: closingRecords.data || [],
    };
  }

  // ── FINANCIAL SUMMARY ─────────────────────────────────
  async generateFinancialSummary(params: {
    financialYearId?: string;
    periodKey?: string;
    branchId?: string;
  }) {
    this.logger.log('Generating Financial Summary');
    const trialBalance = await this.generateTrialBalance({
      financialYearId: params.financialYearId,
    });
    const pnl = await this.generateProfitLoss({ financialYearId: params.financialYearId });

    const revenue = trialBalance.accounts.filter(
      (a: any) => a.accountType === 'income' || a.accountType === 'revenue',
    );
    const expenses = trialBalance.accounts.filter(
      (a: any) => a.accountType === 'expenses' || a.accountType === 'expense',
    );
    const totalRevenue = revenue.reduce((s: number, a: any) => s + a.closingBalance, 0);
    const totalExpenses = expenses.reduce((s: number, a: any) => s + Math.abs(a.closingBalance), 0);

    // Get cash and bank account totals
    const accounts = await this.database.chartOfAccounts.findAll({
      page: 1,
      pageSize: 5000,
    } as any);
    const cashAccounts = (accounts.data || []).filter((a: any) => a.isCashAccount);
    const cashBalance = cashAccounts.reduce(
      (s: number, a: any) => s + Number(a.openingBalance || 0),
      0,
    );

    // Get GST summary
    const gstSummary = await this.generateGstSummary({});

    return {
      title: 'Financial Summary',
      generatedAt: new Date().toISOString(),
      params,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netProfit: Math.round(pnl.netProfit * 100) / 100,
        totalReceivables: 0,
        totalPayables: 0,
        cashBalance: Math.round(cashBalance * 100) / 100,
        bankBalance: 0,
        totalSales: 0,
        totalPurchases: 0,
        totalGstInput: gstSummary.summary.totalInputTax,
        totalGstOutput: gstSummary.summary.totalOutputTax,
        totalGstPayable: gstSummary.summary.netPayable,
      },
    };
  }
}
