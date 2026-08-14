import { Injectable, Logger } from '@nestjs/common';
import { isUniqueConstraintError } from '@shranix/database';

import { DatabaseService } from '../database/database.service';

import { TransactionManager } from './transaction.manager';

export interface PostingEntry {
  entryNumber: string;
  entryDate: string;
  accountId: string;
  ledgerId?: string;
  voucherId: string;
  voucherType: string;
  voucherNumber: string;
  debit: number;
  credit: number;
  narration?: string;
  partyId?: string;
  costCenterId?: string;
  branchId?: string;
  financialYearId?: string;
}

export interface PostingResult {
  success: boolean;
  message: string;
  entriesCreated: number;
  entries: PostingEntry[];
  error?: string;
}

@Injectable()
export class GlPostingEngine {
  private readonly logger = new Logger(GlPostingEngine.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly transactionManager: TransactionManager,
  ) {}

  async postEntries(
    entries: Omit<PostingEntry, 'entryNumber'>[],
    options: {
      userId?: string;
      financialYearId?: string;
      validatePeriod?: boolean;
    } = {},
  ): Promise<PostingResult> {
    try {
      return await this.postEntriesInTransaction(entries, options);
    } catch (err: any) {
      // Any thrown error (e.g. duplicate posting mid-batch) has already rolled
      // back the entire transaction — surface it as a clean result.
      return {
        success: false,
        message: 'Posting failed — all changes rolled back',
        entriesCreated: 0,
        entries: [],
        error: String(err?.message || err),
      };
    }
  }

  private async postEntriesInTransaction(
    entries: Omit<PostingEntry, 'entryNumber'>[],
    options: {
      userId?: string;
      financialYearId?: string;
      validatePeriod?: boolean;
    } = {},
  ): Promise<PostingResult> {
    return this.transactionManager.executeInTransaction(async (_context) => {
      const errors: string[] = [];

      for (const entry of entries) {
        const validationErrors = await this.validateEntry(entry, options);
        errors.push(...validationErrors);
      }

      if (errors.length > 0) {
        return {
          success: false,
          message: 'Validation failed',
          entriesCreated: 0,
          entries: [],
          error: errors.join('; '),
        };
      }

      // Pre-empt duplicates BEFORE inserting anything: (voucher_id, account_id)
      // is unique. Rejecting here keeps the batch atomic — no partial lines.
      const dupError = await this.findDuplicateLines(entries);
      if (dupError) {
        return dupError;
      }

      const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return {
          success: false,
          message: 'Debit and Credit totals must be equal',
          entriesCreated: 0,
          entries: [],
          error: `Total Debit: ${totalDebit}, Total Credit: ${totalCredit}`,
        };
      }

      if (options.financialYearId && options.validatePeriod !== false) {
        const periodLock = await this.checkPeriodLock(
          options.financialYearId,
          entries[0]?.entryDate,
        );
        if (periodLock) {
          return {
            success: false,
            message: 'Period is locked',
            entriesCreated: 0,
            entries: [],
            error: `Period ${periodLock.periodKey} is locked for module ${periodLock.module}`,
          };
        }
      }

      const entryNumber = await this.generateEntryNumber(options.financialYearId);
      const postedEntries: PostingEntry[] = [];
      let index = 0;

      for (const entry of entries) {
        const glEntry: PostingEntry = {
          entryNumber: `${entryNumber}-${String(index + 1).padStart(3, '0')}`,
          entryDate: entry.entryDate,
          accountId: entry.accountId,
          ledgerId: entry.ledgerId,
          voucherId: entry.voucherId,
          voucherType: entry.voucherType,
          voucherNumber: entry.voucherNumber,
          debit: entry.debit || 0,
          credit: entry.credit || 0,
          narration: entry.narration,
          partyId: entry.partyId,
          costCenterId: entry.costCenterId,
          branchId: entry.branchId,
          financialYearId: entry.financialYearId,
        };

        glEntry.entryNumber = `${entryNumber}-${String(index + 1).padStart(3, '0')}`;

        // Defensive: a unique-constraint error mid-batch must abort the whole
        // transaction (the throw rolls back every line, never a partial batch).
        try {
          await this.database.glEntries.create({ ...glEntry, createdBy: options.userId } as any);
        } catch (err: any) {
          if (isUniqueConstraintError(err)) {
            throw new Error(
              `Duplicate posting for voucher ${glEntry.voucherId} account ${glEntry.accountId}: ${err.message}`,
            );
          }
          throw err;
        }
        postedEntries.push(glEntry);
        index++;
      }

      this.logger.log(`Posted ${postedEntries.length} GL entries (${entryNumber})`);
      return {
        success: true,
        message: `Successfully posted ${postedEntries.length} GL entries`,
        entriesCreated: postedEntries.length,
        entries: postedEntries,
      };
    });
  }

  async previewEntries(entries: Omit<PostingEntry, 'entryNumber'>[]) {
    const errors: string[] = [];
    const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
    const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

    if (!balanced) {
      errors.push(`Debit (${totalDebit}) != Credit (${totalCredit})`);
    }

    for (const entry of entries) {
      const account = await this.database.chartOfAccounts.findById(entry.accountId);
      if (!account) {
        errors.push(`Account ${entry.accountId} not found`);
      }
      if (entry.debit < 0 || entry.credit < 0) {
        errors.push('Negative amounts not allowed');
      }
    }

    return {
      valid: errors.length === 0 && balanced,
      totalDebit,
      totalCredit,
      balanced,
      errors,
      previewEntries: entries.map((e, i) => ({ ...e, entryNumber: `PREVIEW-${i + 1}` })),
    };
  }

  async reverseEntries(
    originalVoucherId: string,
    options: { userId?: string; reason?: string },
  ): Promise<PostingResult> {
    // Filter by voucherId explicitly — the legacy `search` param is a no-op
    // without searchFields and would return EVERY gl row (not just this voucher).
    const originalEntries = await this.database.glEntries.findAll({
      page: 1,
      pageSize: 1000,
      filters: [{ field: 'voucherId', operator: 'eq', value: originalVoucherId }],
    } as any);
    if (!originalEntries.data || originalEntries.data.length === 0) {
      return {
        success: false,
        message: 'No original entries found',
        entriesCreated: 0,
        entries: [],
        error: `No entries found for voucher ${originalVoucherId}`,
      };
    }

    // A reversal is a NEW voucher: it must NOT reuse the original voucherId
    // (gl_voucher_idx is unique on (voucher_id, account_id) — a reversal row
    // with the original voucherId would collide with the original entry).
    const reversalVoucherId = `REV-${originalVoucherId}-${Date.now().toString(36)}`;
    const reversalEntries = originalEntries.data.map((entry: any) => ({
      entryDate: new Date().toISOString().split('T')[0],
      accountId: entry.accountId,
      ledgerId: entry.ledgerId,
      voucherId: reversalVoucherId,
      voucherType: 'reversal',
      voucherNumber: `REV-${entry.voucherNumber}`,
      debit: entry.credit || 0,
      credit: entry.debit || 0,
      narration: `Reversal of ${entry.entryNumber}: ${options.reason || 'No reason provided'}`,
      partyId: entry.partyId,
      costCenterId: entry.costCenterId,
      branchId: entry.branchId,
      financialYearId: entry.financialYearId,
    }));

    return this.postEntries(reversalEntries, { userId: options.userId });
  }

  async createRecurringEntries(
    template: Omit<PostingEntry, 'entryNumber'>[],
    schedule: { frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'; count: number },
    _options?: { userId?: string; financialYearId?: string },
  ): Promise<PostingResult[]> {
    const results: PostingResult[] = [];
    const now = new Date();

    for (let i = 0; i < schedule.count; i++) {
      const date = new Date(now);
      switch (schedule.frequency) {
        case 'daily':
          date.setDate(date.getDate() + i);
          break;
        case 'weekly':
          date.setDate(date.getDate() + i * 7);
          break;
        case 'monthly':
          date.setMonth(date.getMonth() + i);
          break;
        case 'yearly':
          date.setFullYear(date.getFullYear() + i);
          break;
      }
      const entries = template.map((e) => ({ ...e, entryDate: date.toISOString().split('T')[0] }));
      const result = await this.postEntries(entries, {
        userId: _options?.userId,
        financialYearId: _options?.financialYearId,
      });
      results.push(result);
      if (!result.success) {
        break;
      }
    }
    return results;
  }

  // ── Private Helpers ─────────────────────────────────────

  /**
   * Reject a journal whose batch already has the same (voucherId, accountId)
   * on the DB — a genuine double-post of the same account within one voucher.
   * Runs BEFORE any insert so a rejected batch never leaves partial lines.
   */
  private async findDuplicateLines(
    entries: Omit<PostingEntry, 'entryNumber'>[],
  ): Promise<PostingResult | null> {
    const seen = new Set<string>();
    for (const entry of entries) {
      const key = `${entry.voucherId}::${entry.accountId}`;
      if (seen.has(key)) {
        return {
          success: false,
          message: 'Duplicate GL entry rejected',
          entriesCreated: 0,
          entries: [],
          error: `Duplicate posting for voucher ${entry.voucherId} account ${entry.accountId} — each account may appear only once per voucher`,
        };
      }
      seen.add(key);
    }
    // Also check against already-posted rows (idempotency: same voucher+account)
    const first = entries[0];
    if (first?.voucherId) {
      const existing = await this.database.glEntries.findAll({
        page: 1,
        pageSize: 1000,
        filters: [{ field: 'voucherId', operator: 'eq', value: first.voucherId }],
      } as any);
      for (const row of existing.data || []) {
        for (const entry of entries) {
          if (entry.accountId === row.accountId) {
            return {
              success: false,
              message: 'Duplicate GL entry rejected',
              entriesCreated: 0,
              entries: [],
              error: `Voucher ${entry.voucherId} has already been posted to account ${entry.accountId}`,
            };
          }
        }
      }
    }
    return null;
  }

  private async validateEntry(
    entry: Omit<PostingEntry, 'entryNumber'>,
    _options?: { financialYearId?: string },
  ): Promise<string[]> {
    const errors: string[] = [];
    if (!entry.accountId) {
      errors.push('Account ID is required');
    }
    if (!entry.voucherId) {
      errors.push('Voucher ID is required');
    }
    if (!entry.voucherType) {
      errors.push('Voucher type is required');
    }
    if (!entry.voucherNumber) {
      errors.push('Voucher number is required');
    }
    if (!entry.entryDate) {
      errors.push('Entry date is required');
    }
    if (entry.debit && entry.credit) {
      errors.push('Entry cannot have both debit and credit');
    }
    if (!entry.debit && !entry.credit) {
      errors.push('Entry must have either debit or credit');
    }
    if ((entry.debit || 0) < 0 || (entry.credit || 0) < 0) {
      errors.push('Negative amounts not allowed');
    }

    if (entry.accountId) {
      const account = await this.database.chartOfAccounts.findById(entry.accountId);
      if (!account) {
        errors.push(`Account ${entry.accountId} not found in Chart of Accounts`);
      } else if (account.isActive === false || account.isActive === 0 || account.isActive === '0') {
        errors.push(`Account ${entry.accountId} is inactive`);
      }
    }
    return errors;
  }

  private async generateEntryNumber(_financialYearId?: string): Promise<string> {
    const now = new Date();
    const prefix = `GL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`;
    const count = await this.database.glEntries.count();
    return `${prefix}${String(count + 1).padStart(6, '0')}`;
  }

  private async checkPeriodLock(
    _financialYearId: string,
    entryDate: string,
  ): Promise<{ periodKey: string; module: string } | null> {
    const locks = await this.database.periodLocks.findAll({ page: 1, pageSize: 100 } as any);
    if (locks.data) {
      for (const lock of locks.data as any[]) {
        if (lock.isLocked === true || lock.isLocked === 1 || lock.isLocked === '1') {
          const periodStart = lock.periodStart || lock.periodKey;
          const periodEnd = lock.periodEnd || lock.periodKey;
          if (entryDate >= periodStart && entryDate <= periodEnd) {
            return { periodKey: lock.periodKey, module: lock.module || 'finance' };
          }
        }
      }
    }
    return null;
  }

  async applyPostingRules(
    voucher: {
      id: string;
      type: string;
      number: string;
      date: string;
      amount: number;
      accountId?: string;
      partyId?: string;
      financialYearId?: string;
      branchId?: string;
      costCenterId?: string;
    },
    _options?: { userId?: string },
  ): Promise<PostingResult> {
    const rules = await this.database.postingRules.findAll({
      page: 1,
      pageSize: 100,
      search: voucher.type,
    } as any);
    if (!rules.data || rules.data.length === 0) {
      return {
        success: false,
        message: `No posting rules found for voucher type: ${voucher.type}`,
        entriesCreated: 0,
        entries: [],
      };
    }

    const entries: Omit<PostingEntry, 'entryNumber'>[] = [];

    for (const rule of rules.data as any[]) {
      if (rule.isActive === false || rule.isActive === 0 || rule.isActive === '0') {
        continue;
      }
      if (rule.condition) {
        try {
          const condition = JSON.parse(rule.condition);
          if (!this.evaluateCondition(condition, voucher)) {
            continue;
          }
        } catch {
          this.logger.warn(`Invalid condition for rule ${rule.ruleName}: ${rule.condition}`);
        }
      }
      if (rule.debitAccountId) {
        entries.push({
          entryDate: voucher.date,
          accountId: rule.debitAccountId,
          voucherId: voucher.id,
          voucherType: voucher.type,
          voucherNumber: voucher.number,
          debit: voucher.amount,
          credit: 0,
          narration: `Auto-post: ${rule.ruleName}`,
          partyId: voucher.partyId,
          branchId: voucher.branchId,
          costCenterId: voucher.costCenterId,
          financialYearId: voucher.financialYearId,
        });
      }
      if (rule.creditAccountId) {
        entries.push({
          entryDate: voucher.date,
          accountId: rule.creditAccountId,
          voucherId: voucher.id,
          voucherType: voucher.type,
          voucherNumber: voucher.number,
          debit: 0,
          credit: voucher.amount,
          narration: `Auto-post: ${rule.ruleName}`,
          partyId: voucher.partyId,
          branchId: voucher.branchId,
          costCenterId: voucher.costCenterId,
          financialYearId: voucher.financialYearId,
        });
      }
    }

    if (entries.length === 0) {
      return {
        success: false,
        message: 'No matching rules produced entries',
        entriesCreated: 0,
        entries: [],
      };
    }
    return this.postEntries(entries, { userId: _options?.userId });
  }

  private evaluateCondition(condition: Record<string, any>, voucher: any): boolean {
    for (const [key, value] of Object.entries(condition)) {
      if (voucher[key] === undefined || voucher[key] === null) {
        return false;
      }
      if (Array.isArray(value)) {
        if (!value.includes(voucher[key])) {
          return false;
        }
      } else if (voucher[key] !== value) {
        return false;
      }
    }
    return true;
  }
}
