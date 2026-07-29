import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

import { GlPostingEngine, PostingEntry } from './gl-posting.engine';
import { GstCalculationEngine, GstPostingInput } from './gst-calculation.engine';

/**
 * Module → Finance Integration Services
 *
 * Automatically generates accounting entries when business transactions occur.
 * Sales → Finance, Purchase → Finance, Inventory → Finance,
 * Payroll → Finance, Expense → Finance, Bank → Finance
 */

// ── Shared Result Type ─────────────────────────────────────
export interface IntegrationResult {
  success: boolean;
  message: string;
  glEntries: number;
  gstEntries: number;
  error?: string;
}

// ── SALES → FINANCE INTEGRATION ─────────────────────────
@Injectable()
export class SalesFinanceIntegration {
  private readonly logger = new Logger(SalesFinanceIntegration.name);

  constructor(
    private readonly glPosting: GlPostingEngine,
    private readonly gstCalc: GstCalculationEngine,
    private readonly database: DatabaseService,
  ) {}

  async postSalesInvoice(invoiceId: string, userId?: string): Promise<IntegrationResult> {
    const invoice = await this.database.salesInvoices.findById(invoiceId);
    if (!invoice) {return { success: false, message: 'Invoice not found', glEntries: 0, gstEntries: 0, error: `Invoice ${invoiceId} not found` };}

    const customer = await this.database.ledgerMaster.findById(invoice.customerId);
    const items = await this.database.invoiceItems.findAll({ page: 1, pageSize: 1000, search: invoiceId } as any);
    const settings = await this.database.accountingSettings.findAll({ page: 1, pageSize: 1 } as any);
    const defaultSalesAccount = settings.data?.[0]?.defaultSalesAccountId || invoice.salesAccountId;

    // Build GST posting input
    const gstInput: GstPostingInput = {
      voucherId: invoiceId,
      voucherType: 'sales',
      voucherNumber: invoice.invoiceNumber || invoice.documentNumber,
      voucherDate: invoice.invoiceDate || invoice.createdAt,
      partyId: invoice.customerId,
      financialYearId: invoice.financialYearId,
      items: [],
    };

    let totalTaxableValue = 0;
    let totalGstAmount = 0;
    let totalInvoiceAmount = 0;

    if (items.data) {
      for (const item of items.data as any[]) {
        totalTaxableValue += Number(item.taxableValue || item.amount || 0);
        totalGstAmount += Number(item.gstAmount || 0);
        totalInvoiceAmount += Number(item.totalAmount || item.amount || 0);

        gstInput.items.push({
          taxableValue: Number(item.taxableValue || item.amount || 0),
          gstRate: Number(item.gstRate || 0),
          supplyType: invoice.isInterState ? 'inter-state' : 'intra-state',
          hsnSacCode: item.hsnCode || item.hsnSacCode,
        });
      }
    }

    // Create GL entries
    const glEntries: Omit<PostingEntry, 'entryNumber'>[] = [];

    // Debit: Customer/Receivable account
    glEntries.push({
      entryDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
      accountId: customer?.accountId || invoice.customerId,
      voucherId: invoiceId,
      voucherType: 'sales_invoice',
      voucherNumber: invoice.invoiceNumber || invoice.documentNumber,
      debit: totalInvoiceAmount || Number(invoice.grandTotal || invoice.totalAmount || 0),
      credit: 0,
      narration: `Sales invoice: ${invoice.invoiceNumber || invoice.documentNumber}`,
      partyId: invoice.customerId,
      financialYearId: invoice.financialYearId,
    });

    // Credit: Sales account
    glEntries.push({
      entryDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
      accountId: defaultSalesAccount || invoice.salesAccountId,
      voucherId: invoiceId,
      voucherType: 'sales_invoice',
      voucherNumber: invoice.invoiceNumber || invoice.documentNumber,
      debit: 0,
      credit: totalTaxableValue,
      narration: `Sales invoice: ${invoice.invoiceNumber || invoice.documentNumber}`,
      partyId: invoice.customerId,
      financialYearId: invoice.financialYearId,
    });

    // Credit: GST Output account
    if (totalGstAmount > 0) {
      const taxAccountId = settings.data?.[0]?.defaultTaxAccountId || invoice.taxAccountId;
      glEntries.push({
        entryDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
        accountId: taxAccountId,
        voucherId: invoiceId,
        voucherType: 'sales_invoice',
        voucherNumber: invoice.invoiceNumber || invoice.documentNumber,
        debit: 0,
        credit: totalGstAmount,
        narration: `GST on sales invoice: ${invoice.invoiceNumber || invoice.documentNumber}`,
        partyId: invoice.customerId,
        financialYearId: invoice.financialYearId,
      });
    }

    // Post GL entries within transaction manager
    const glResult = await this.glPosting.postEntries(glEntries, { userId, financialYearId: invoice.financialYearId });
    if (!glResult.success) {
      return { success: false, message: 'GL posting failed', glEntries: 0, gstEntries: 0, error: glResult.error };
    }

    // Post GST entries (separate transaction)
    const gstResult = await this.gstCalc.postGstEntries(gstInput, userId);

    this.logger.log(`Sales invoice ${invoiceId} posted: ${glResult.entriesCreated} GL entries, ${gstResult.postedEntries} GST entries`);
    return { success: true, message: `Sales invoice ${invoice.invoiceNumber} posted successfully`, glEntries: glResult.entriesCreated, gstEntries: gstResult.postedEntries };
  }

  async postSalesReturn(returnId: string, userId?: string): Promise<IntegrationResult> {
    const returnRecord = await this.database.salesReturns.findById(returnId);
    if (!returnRecord) {return { success: false, message: 'Return not found', glEntries: 0, gstEntries: 0, error: `Sales return ${returnId} not found` };}

    const items = await this.database.returnItems.findAll({ page: 1, pageSize: 1000, search: returnId } as any);

    let totalAmount = 0;
    const gstInput: GstPostingInput = {
      voucherId: returnId,
      voucherType: 'sales_return',
      voucherNumber: returnRecord.returnNumber || returnRecord.documentNumber,
      voucherDate: returnRecord.returnDate || returnRecord.createdAt,
      partyId: returnRecord.customerId,
      financialYearId: returnRecord.financialYearId,
      items: [],
    };

    if (items.data) {
      for (const item of items.data as any[]) {
        totalAmount += Number(item.amount || 0);
        gstInput.items.push({
          taxableValue: Number(item.taxableValue || item.amount || 0),
          gstRate: Number(item.gstRate || 0),
          supplyType: returnRecord.isInterState ? 'inter-state' : 'intra-state',
        });
      }
    }

    // Reverse entries (credit customer, debit sales)
    const glEntries: Omit<PostingEntry, 'entryNumber'>[] = [
      {
        entryDate: returnRecord.returnDate || new Date().toISOString().split('T')[0],
        accountId: returnRecord.customerId,
        voucherId: returnId,
        voucherType: 'sales_return',
        voucherNumber: returnRecord.returnNumber || returnRecord.documentNumber,
        debit: 0,
        credit: totalAmount,
        narration: `Sales return: ${returnRecord.returnNumber}`,
        partyId: returnRecord.customerId,
        financialYearId: returnRecord.financialYearId,
      },
      {
        entryDate: returnRecord.returnDate || new Date().toISOString().split('T')[0],
        accountId: returnRecord.salesAccountId,
        voucherId: returnId,
        voucherType: 'sales_return',
        voucherNumber: returnRecord.returnNumber || returnRecord.documentNumber,
        debit: totalAmount,
        credit: 0,
        narration: `Sales return reversal: ${returnRecord.returnNumber}`,
        partyId: returnRecord.customerId,
        financialYearId: returnRecord.financialYearId,
      },
    ];

    const glResult = await this.glPosting.postEntries(glEntries, { userId, financialYearId: returnRecord.financialYearId });
    if (!glResult.success) {
      return { success: false, message: 'GL posting for return failed', glEntries: 0, gstEntries: 0, error: glResult.error };
    }

    const gstResult = await this.gstCalc.postGstEntries(gstInput, userId);
    return { success: true, message: `Sales return ${returnRecord.returnNumber} posted`, glEntries: glResult.entriesCreated, gstEntries: gstResult.postedEntries };
  }
}

// ── PURCHASE → FINANCE INTEGRATION ─────────────────────
@Injectable()
export class PurchaseFinanceIntegration {
  constructor(
    private readonly glPosting: GlPostingEngine,
    private readonly gstCalc: GstCalculationEngine,
    private readonly database: DatabaseService,
  ) {}

  async postPurchaseInvoice(invoiceId: string, userId?: string): Promise<IntegrationResult> {
    const invoice = await this.database.purchaseInvoices.findById(invoiceId);
    if (!invoice) {return { success: false, message: 'Invoice not found', glEntries: 0, gstEntries: 0, error: `Purchase invoice ${invoiceId} not found` };}

    const supplier = await this.database.ledgerMaster.findById(invoice.supplierId);
    const items = await this.database.poItems.findAll({ page: 1, pageSize: 1000, search: invoiceId } as any);
    const settings = await this.database.accountingSettings.findAll({ page: 1, pageSize: 1 } as any);
    const defaultPurchaseAccount = settings.data?.[0]?.defaultPurchaseAccountId || invoice.purchaseAccountId;

    let totalTaxableValue = 0;
    let totalGstAmount = 0;
    let totalInvoiceAmount = 0;

    const gstInput: GstPostingInput = {
      voucherId: invoiceId,
      voucherType: 'purchase',
      voucherNumber: invoice.invoiceNumber || invoice.documentNumber,
      voucherDate: invoice.invoiceDate || invoice.createdAt,
      partyId: invoice.supplierId,
      financialYearId: invoice.financialYearId,
      items: [],
    };

    if (items.data) {
      for (const item of items.data as any[]) {
        totalTaxableValue += Number(item.taxableValue || item.amount || 0);
        totalGstAmount += Number(item.gstAmount || 0);
        totalInvoiceAmount += Number(item.totalAmount || item.amount || 0);
        gstInput.items.push({
          taxableValue: Number(item.taxableValue || item.amount || 0),
          gstRate: Number(item.gstRate || 0),
          supplyType: invoice.isInterState ? 'inter-state' : 'intra-state',
        });
      }
    }

    const glEntries: Omit<PostingEntry, 'entryNumber'>[] = [
      {
        entryDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
        accountId: defaultPurchaseAccount || invoice.purchaseAccountId,
        voucherId: invoiceId,
        voucherType: 'purchase_invoice',
        voucherNumber: invoice.invoiceNumber || invoice.documentNumber,
        debit: totalTaxableValue,
        credit: 0,
        narration: `Purchase invoice: ${invoice.invoiceNumber}`,
        partyId: invoice.supplierId,
        financialYearId: invoice.financialYearId,
      },
      {
        entryDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
        accountId: settings.data?.[0]?.defaultTaxAccountId || invoice.taxAccountId,
        voucherId: invoiceId,
        voucherType: 'purchase_invoice',
        voucherNumber: invoice.invoiceNumber || invoice.documentNumber,
        debit: totalGstAmount,
        credit: 0,
        narration: `GST input on purchase: ${invoice.invoiceNumber}`,
        partyId: invoice.supplierId,
        financialYearId: invoice.financialYearId,
      },
      {
        entryDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
        accountId: supplier?.accountId || invoice.supplierId,
        voucherId: invoiceId,
        voucherType: 'purchase_invoice',
        voucherNumber: invoice.invoiceNumber || invoice.documentNumber,
        debit: 0,
        credit: totalInvoiceAmount || Number(invoice.grandTotal || invoice.totalAmount || 0),
        narration: `Purchase invoice: ${invoice.invoiceNumber}`,
        partyId: invoice.supplierId,
        financialYearId: invoice.financialYearId,
      },
    ];

    const glResult = await this.glPosting.postEntries(glEntries, { userId, financialYearId: invoice.financialYearId });
    if (!glResult.success) {
      return { success: false, message: 'GL posting failed', glEntries: 0, gstEntries: 0, error: glResult.error };
    }

    const gstResult = await this.gstCalc.postGstEntries(gstInput, userId);
    return { success: true, message: `Purchase invoice ${invoice.invoiceNumber} posted`, glEntries: glResult.entriesCreated, gstEntries: gstResult.postedEntries };
  }

  async postPurchaseReturn(returnId: string, userId?: string): Promise<IntegrationResult> {
    const returnRecord = await this.database.purchaseReturns.findById(returnId);
    if (!returnRecord) {return { success: false, message: 'Return not found', glEntries: 0, gstEntries: 0, error: `Purchase return ${returnId} not found` };}

    const glEntries: Omit<PostingEntry, 'entryNumber'>[] = [
      {
        entryDate: returnRecord.returnDate || new Date().toISOString().split('T')[0],
        accountId: returnRecord.supplierId,
        voucherId: returnId,
        voucherType: 'purchase_return',
        voucherNumber: returnRecord.returnNumber || returnRecord.documentNumber,
        debit: Number(returnRecord.totalAmount || returnRecord.amount || 0),
        credit: 0,
        narration: `Purchase return: ${returnRecord.returnNumber}`,
        partyId: returnRecord.supplierId,
        financialYearId: returnRecord.financialYearId,
      },
      {
        entryDate: returnRecord.returnDate || new Date().toISOString().split('T')[0],
        accountId: returnRecord.purchaseAccountId,
        voucherId: returnId,
        voucherType: 'purchase_return',
        voucherNumber: returnRecord.returnNumber || returnRecord.documentNumber,
        debit: 0,
        credit: Number(returnRecord.totalAmount || returnRecord.amount || 0),
        narration: `Purchase return reversal: ${returnRecord.returnNumber}`,
        partyId: returnRecord.supplierId,
        financialYearId: returnRecord.financialYearId,
      },
    ];

    const glResult = await this.glPosting.postEntries(glEntries, { userId, financialYearId: returnRecord.financialYearId });
    return { success: true, message: `Purchase return ${returnRecord.returnNumber} posted`, glEntries: glResult.entriesCreated, gstEntries: 0 };
  }
}

// ── INVENTORY → FINANCE INTEGRATION ────────────────────
@Injectable()
export class InventoryFinanceIntegration {
  constructor(
    private readonly glPosting: GlPostingEngine,
    private readonly database: DatabaseService,
  ) {}

  async postGoodsReceipt(grnId: string, userId?: string): Promise<IntegrationResult> {
    const grn = await this.database.grn.findById(grnId);
    if (!grn) {return { success: false, message: 'GRN not found', glEntries: 0, gstEntries: 0, error: `GRN ${grnId} not found` };}

    const items = await this.database.grnItems.findAll({ page: 1, pageSize: 1000, search: grnId } as any);
    let totalAmount = 0;
    if (items.data) {for (const item of items.data as any[]) {totalAmount += Number(item.amount || 0);}}

    const glEntries: Omit<PostingEntry, 'entryNumber'>[] = [
      {
        entryDate: grn.grnDate || new Date().toISOString().split('T')[0],
        accountId: grn.inventoryAccountId || 'inventory',
        voucherId: grnId,
        voucherType: 'goods_receipt',
        voucherNumber: grn.grnNumber || grn.documentNumber,
        debit: totalAmount,
        credit: 0,
        narration: `Goods receipt: ${grn.grnNumber}`,
        partyId: grn.supplierId,
        financialYearId: grn.financialYearId,
      },
      {
        entryDate: grn.grnDate || new Date().toISOString().split('T')[0],
        accountId: grn.purchaseAccountId || 'purchase',
        voucherId: grnId,
        voucherType: 'goods_receipt',
        voucherNumber: grn.grnNumber || grn.documentNumber,
        debit: 0,
        credit: totalAmount,
        narration: `GRN accrual: ${grn.grnNumber}`,
        partyId: grn.supplierId,
        financialYearId: grn.financialYearId,
      },
    ];

    const result = await this.glPosting.postEntries(glEntries, { userId, financialYearId: grn.financialYearId });
    return { success: result.success, message: result.message, glEntries: result.entriesCreated, gstEntries: 0 };
  }

  async postGoodsIssue(issueId: string, userId?: string): Promise<IntegrationResult> {
    // Goods issue (stock out) — debit COGS, credit Inventory
    const issue = await this.database.items.findById(issueId);
    if (!issue) {return { success: false, message: 'Issue record not found', glEntries: 0, gstEntries: 0, error: `Issue ${issueId} not found` };}

    const glEntries: Omit<PostingEntry, 'entryNumber'>[] = [
      {
        entryDate: new Date().toISOString().split('T')[0],
        accountId: issue.cogsAccountId || 'cogs',
        voucherId: issueId,
        voucherType: 'goods_issue',
        voucherNumber: `ISSUE-${issueId.slice(0, 8)}`,
        debit: Number(issue.costPrice || 0),
        credit: 0,
        narration: `Goods issue: ${issue.name || issue.itemName || issueId}`,
        financialYearId: issue.financialYearId,
      },
      {
        entryDate: new Date().toISOString().split('T')[0],
        accountId: issue.inventoryAccountId || 'inventory',
        voucherId: issueId,
        voucherType: 'goods_issue',
        voucherNumber: `ISSUE-${issueId.slice(0, 8)}`,
        debit: 0,
        credit: Number(issue.costPrice || 0),
        narration: `Inventory reduction: ${issue.name || issue.itemName || issueId}`,
        financialYearId: issue.financialYearId,
      },
    ];

    const result = await this.glPosting.postEntries(glEntries, { userId });
    return { success: result.success, message: result.message, glEntries: result.entriesCreated, gstEntries: 0 };
  }
}

// ── PAYROLL → FINANCE INTEGRATION ──────────────────────
@Injectable()
export class PayrollFinanceIntegration {
  constructor(
    private readonly glPosting: GlPostingEngine,
    private readonly database: DatabaseService,
  ) {}

  async postSalary(salaryEntry: {
    id: string;
    employeeId: string;
    salaryDate: string;
    grossSalary: number;
    deductions: number;
    netSalary: number;
    employeeAccountId?: string;
    expenseAccountId?: string;
    payableAccountId?: string;
    financialYearId?: string;
  }, userId?: string): Promise<IntegrationResult> {
    const settings = await this.database.accountingSettings.findAll({ page: 1, pageSize: 1 } as any);

    const glEntries: Omit<PostingEntry, 'entryNumber'>[] = [
      {
        entryDate: salaryEntry.salaryDate,
        accountId: salaryEntry.expenseAccountId || settings.data?.[0]?.defaultPurchaseAccountId || 'salary_expense',
        voucherId: salaryEntry.id,
        voucherType: 'salary',
        voucherNumber: `SAL-${salaryEntry.employeeId.slice(0, 8)}`,
        debit: salaryEntry.grossSalary,
        credit: 0,
        narration: `Salary: employee ${salaryEntry.employeeId}`,
        partyId: salaryEntry.employeeId,
        financialYearId: salaryEntry.financialYearId,
      },
      {
        entryDate: salaryEntry.salaryDate,
        accountId: salaryEntry.payableAccountId || 'salary_payable',
        voucherId: salaryEntry.id,
        voucherType: 'salary',
        voucherNumber: `SAL-${salaryEntry.employeeId.slice(0, 8)}`,
        debit: 0,
        credit: salaryEntry.netSalary,
        narration: `Salary payable: employee ${salaryEntry.employeeId}`,
        partyId: salaryEntry.employeeId,
        financialYearId: salaryEntry.financialYearId,
      },
    ];

    if (salaryEntry.deductions > 0) {
      glEntries.push({
        entryDate: salaryEntry.salaryDate,
        accountId: salaryEntry.employeeAccountId || 'deductions_payable',
        voucherId: salaryEntry.id,
        voucherType: 'salary',
        voucherNumber: `SAL-${salaryEntry.employeeId.slice(0, 8)}`,
        debit: 0,
        credit: salaryEntry.deductions,
        narration: `Salary deductions: employee ${salaryEntry.employeeId}`,
        partyId: salaryEntry.employeeId,
        financialYearId: salaryEntry.financialYearId,
      });
    }

    const result = await this.glPosting.postEntries(glEntries, { userId, financialYearId: salaryEntry.financialYearId });
    return { success: result.success, message: result.message, glEntries: result.entriesCreated, gstEntries: 0 };
  }
}

// ── EXPENSE → FINANCE INTEGRATION ──────────────────────
@Injectable()
export class ExpenseFinanceIntegration {
  constructor(
    private readonly glPosting: GlPostingEngine,
    private readonly database: DatabaseService,
  ) {}

  async postExpenseVoucher(voucherId: string, userId?: string): Promise<IntegrationResult> {
    const voucher = await this.database.journalEntries.findById(voucherId);
    if (!voucher) {return { success: false, message: 'Voucher not found', glEntries: 0, gstEntries: 0, error: `Expense voucher ${voucherId} not found` };}

    // Fetch line items
    const items = await this.database.journalEntryItems.findAll({ page: 1, pageSize: 1000, search: voucherId } as any);

    const glEntries: Omit<PostingEntry, 'entryNumber'>[] = [];

    if (items.data) {
      for (const item of items.data as any[]) {
        if (Number(item.debit) > 0) {
          glEntries.push({
            entryDate: voucher.voucherDate || new Date().toISOString().split('T')[0],
            accountId: item.accountId,
            voucherId: voucherId,
            voucherType: 'expense',
            voucherNumber: voucher.voucherNumber,
            debit: Number(item.debit),
            credit: 0,
            narration: item.narration || voucher.narration || 'Expense entry',
            costCenterId: item.costCenterId || voucher.costCenterId,
            partyId: item.partyId,
            financialYearId: voucher.financialYearId,
          });
        }
        if (Number(item.credit) > 0) {
          glEntries.push({
            entryDate: voucher.voucherDate || new Date().toISOString().split('T')[0],
            accountId: item.accountId,
            voucherId: voucherId,
            voucherType: 'expense',
            voucherNumber: voucher.voucherNumber,
            debit: 0,
            credit: Number(item.credit),
            narration: item.narration || voucher.narration || 'Expense credit',
            costCenterId: item.costCenterId || voucher.costCenterId,
            partyId: item.partyId,
            financialYearId: voucher.financialYearId,
          });
        }
      }
    }

    if (glEntries.length === 0) {
      return { success: false, message: 'No expense items found', glEntries: 0, gstEntries: 0 };
    }

    const result = await this.glPosting.postEntries(glEntries, { userId, financialYearId: voucher.financialYearId });
    return { success: result.success, message: result.message, glEntries: result.entriesCreated, gstEntries: 0 };
  }
}

// ── BANK → FINANCE INTEGRATION ─────────────────────────
@Injectable()
export class BankFinanceIntegration {
  constructor(
    private readonly glPosting: GlPostingEngine,
  ) {}

  async postBankTransaction(
    bankEntry: {
      id: string;
      bankAccountId: string;
      entryDate: string;
      voucherType: string;
      amount: number;
      narration?: string;
      partyId?: string;
      financialYearId?: string;
      referenceNumber?: string;
    },
    userId?: string,
  ): Promise<IntegrationResult> {
    const isReceipt = bankEntry.voucherType === 'receipt';

    const glEntries: Omit<PostingEntry, 'entryNumber'>[] = [
      {
        entryDate: bankEntry.entryDate,
        accountId: bankEntry.bankAccountId,
        voucherId: bankEntry.id,
        voucherType: 'bank',
        voucherNumber: `BANK-${bankEntry.id.slice(0, 8)}`,
        debit: isReceipt ? bankEntry.amount : 0,
        credit: isReceipt ? 0 : bankEntry.amount,
        narration: bankEntry.narration || `Bank ${bankEntry.voucherType}`,
        partyId: bankEntry.partyId,
        financialYearId: bankEntry.financialYearId,
      },
      {
        entryDate: bankEntry.entryDate,
        accountId: bankEntry.partyId || (isReceipt ? 'receivables' : 'payables'),
        voucherId: bankEntry.id,
        voucherType: 'bank',
        voucherNumber: `BANK-${bankEntry.id.slice(0, 8)}`,
        debit: isReceipt ? 0 : bankEntry.amount,
        credit: isReceipt ? bankEntry.amount : 0,
        narration: `Counter entry for bank ${bankEntry.voucherType}`,
        partyId: bankEntry.partyId,
        financialYearId: bankEntry.financialYearId,
      },
    ];

    const result = await this.glPosting.postEntries(glEntries, { userId, financialYearId: bankEntry.financialYearId });
    return { success: result.success, message: result.message, glEntries: result.entriesCreated, gstEntries: 0 };
  }
}
