import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { InventoryPostingEngine } from '../inventory/services';

import { SalesApprovalEngineService } from './approval-engine.service';

export type ReturnReason =
  | 'damaged'
  | 'expired'
  | 'wrong_item'
  | 'transport_damage'
  | 'customer_cancelled'
  | 'quality_issue'
  | 'duplicate_dispatch'
  | 'price_difference'
  | 'wrong_quantity'
  | 'other';

export type ReturnItemStatus = 'good' | 'damaged' | 'scrap' | 'quarantine';

export interface ReturnItemInput {
  invoiceItemId: string;
  itemId: string;
  variantId?: string;
  quantity: number;
  rate: number;
  taxableValue: number;
  gstRate: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalAmount: number;
  reason: ReturnReason;
  remarks?: string;
  batchNo?: string;
  warehouseId?: string;
  itemStatus: ReturnItemStatus;
}

export interface CreateReturnInput {
  returnNumber: string;
  invoiceId: string;
  customerId: string;
  returnDate: string;
  returnReason: ReturnReason;
  notes?: string;
  items: ReturnItemInput[];
  createdBy: string;
}

export interface CreditNoteInput {
  creditNoteNumber: string;
  financialYear: string;
  customerId: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  referenceDate: string;
  returnAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  narration: string;
  createdBy: string;
}

export interface DebitNoteInput {
  debitNoteNumber: string;
  financialYear: string;
  customerId: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  debitNoteDate: string;
  debitType:
    | 'price_correction'
    | 'short_billing'
    | 'additional_charges'
    | 'tax_adjustment'
    | 'freight'
    | 'handling'
    | 'packing'
    | 'penalty'
    | 'interest';
  amount: number;
  gstAmount: number;
  narration: string;
  createdBy: string;
}

export interface ReturnValidationResult {
  canReturn: boolean;
  errors: string[];
  warnings: string[];
  remainingQtys: Record<string, number>;
}

export interface ReturnReportEntry {
  id: string;
  returnNumber: string;
  invoiceNumber: string;
  customerName: string;
  returnDate: string;
  returnReason: string;
  status: string;
  grandTotal: number;
  itemsCount: number;
  creditNoteNo: string;
  createdBy: string;
  createdAt: string;
}

@Injectable()
export class SalesReturnEngineService {
  private readonly logger = new Logger(SalesReturnEngineService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly approvalEngine: SalesApprovalEngineService,
    private readonly postingEngine?: InventoryPostingEngine,
  ) {}

  // ═════════════════════════════════════════════════════════
  // RETURN REASONS — master list
  // ═════════════════════════════════════════════════════════
  getReturnReasons(): { value: ReturnReason; label: string }[] {
    return [
      { value: 'damaged', label: 'Damaged' },
      { value: 'expired', label: 'Expired' },
      { value: 'wrong_item', label: 'Wrong Item' },
      { value: 'transport_damage', label: 'Transport Damage' },
      { value: 'customer_cancelled', label: 'Customer Cancelled' },
      { value: 'quality_issue', label: 'Quality Issue' },
      { value: 'duplicate_dispatch', label: 'Duplicate Dispatch' },
      { value: 'price_difference', label: 'Price Difference' },
      { value: 'wrong_quantity', label: 'Wrong Quantity' },
      { value: 'other', label: 'Other' },
    ];
  }

  // ═════════════════════════════════════════════════════════
  // VALIDATION
  // ═════════════════════════════════════════════════════════
  async validateReturn(input: ReturnItemInput[], invoice: any): Promise<ReturnValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const remainingQtys: Record<string, number> = {};

    if (!invoice) {
      return { canReturn: false, errors: ['Invoice not found'], warnings: [], remainingQtys: {} };
    }
    if (invoice.status === 'cancelled') {
      errors.push('Cannot return a cancelled invoice');
    }
    if (invoice.status === 'draft') {
      errors.push('Cannot return a draft invoice — it has not been posted');
    }

    // Fetch invoice items
    const invoiceItemsData = await this.database.invoiceItems.findAll({ page: 1, pageSize: 500 });
    const invoiceItems = invoiceItemsData?.data || [];

    for (const retItem of input) {
      const invItem = invoiceItems.find((i: any) => i.id === retItem.invoiceItemId);
      if (!invItem) {
        errors.push(`Invoice item ${retItem.invoiceItemId} not found`);
        continue;
      }
      const soldQty = Number(invItem.quantity || 0);
      if (retItem.quantity <= 0) {
        errors.push(
          `Return quantity for item ${invItem.description || invItem.itemId} must be positive`,
        );
      }
      if (retItem.quantity > soldQty) {
        errors.push(
          `Cannot return ${retItem.quantity} of ${invItem.description || invItem.itemId} — only ${soldQty} sold`,
        );
      }

      // Track remaining return qty
      const alreadyReturned = await this.getReturnedQty(invoice.id, retItem.invoiceItemId);
      const remaining = soldQty - alreadyReturned;
      remainingQtys[retItem.invoiceItemId] = remaining;
      if (retItem.quantity > remaining) {
        errors.push(
          `Only ${remaining} remaining to return for item ${invItem.description || invItem.itemId} — ${alreadyReturned} already returned`,
        );
      }

      // Batch validation
      if (retItem.batchNo) {
        warnings.push(`Batch ${retItem.batchNo} selected for return — verification recommended`);
      }
    }

    if (errors.length === 0 && input.length === 0) {
      errors.push('No items specified for return');
    }

    return {
      canReturn: errors.length === 0,
      errors,
      warnings,
      remainingQtys,
    };
  }

  private async getReturnedQty(invoiceId: string, invoiceItemId: string): Promise<number> {
    try {
      const existingReturns = await this.database.salesReturns.findAll({ page: 1, pageSize: 100 });
      const invoiceReturnIds = (existingReturns?.data || [])
        .filter((r: any) => r.invoiceId === invoiceId && r.status !== 'cancelled')
        .map((r: any) => r.id);
      if (invoiceReturnIds.length === 0) {
        return 0;
      }
      const allItems = await this.database.returnItems.findAll({ page: 1, pageSize: 500 });
      const matched = (allItems?.data || []).filter(
        (i: any) => invoiceReturnIds.includes(i.returnId) && i.invoiceItemId === invoiceItemId,
      );
      return matched.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0);
    } catch {
      return 0;
    }
  }

  // ═════════════════════════════════════════════════════════
  // CREATE SALES RETURN (with validation, items, credit note)
  // ═════════════════════════════════════════════════════════
  async createReturn(input: CreateReturnInput): Promise<any> {
    const invoice = await this.database.salesInvoices.findById(input.invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const validation = await this.validateReturn(input.items, invoice);
    if (!validation.canReturn) {
      throw new BadRequestException(`Return validation failed: ${validation.errors.join('; ')}`);
    }

    const now = new Date().toISOString();

    // 1. Create Return Header
    const returnHeader = await this.database.salesReturns.create({
      returnNumber: input.returnNumber,
      invoiceId: input.invoiceId,
      customerId: input.customerId,
      returnDate: input.returnDate,
      returnReason: input.returnReason,
      status: 'draft',
      subTotal: input.items.reduce((s, i) => s + i.taxableValue, 0),
      taxAmount: input.items.reduce((s, i) => s + i.cgst + i.sgst + i.igst + i.cess, 0),
      grandTotal: input.items.reduce((s, i) => s + i.totalAmount, 0),
      notes: input.notes || null,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create Return Items
    for (const item of input.items) {
      await this.database.returnItems.create({
        returnId: returnHeader.id,
        invoiceItemId: item.invoiceItemId,
        itemId: item.itemId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        rate: item.rate,
        taxableValue: item.taxableValue,
        gstRate: item.gstRate,
        igst: item.igst,
        cgst: item.cgst,
        sgst: item.sgst,
        cess: item.cess,
        totalAmount: item.totalAmount,
        reason: item.reason,
        createdAt: now,
      });
    }

    // 3. Auto-submit for approval if amount exceeds threshold
    const grandTotal = input.items.reduce((s, i) => s + i.totalAmount, 0);
    if (grandTotal > 100000) {
      try {
        await this.approvalEngine.submitForApproval({
          documentType: 'sales_return',
          documentId: returnHeader.id,
          documentNumber: input.returnNumber,
          customerId: input.customerId,
          customerName: invoice.customerName || 'Customer',
          amount: grandTotal,
          discountAmount: 0,
          discountPercent: 0,
          gstAmount: input.items.reduce((s, i) => s + i.cgst + i.sgst + i.igst + i.cess, 0),
          createdBy: input.createdBy,
          createdByName: input.createdBy,
          priority: grandTotal > 500000 ? 'critical' : grandTotal > 200000 ? 'high' : 'medium',
        });
      } catch (e) {
        this.logger.warn(
          `Auto-approval submission failed for return ${input.returnNumber}: ${(e as Error).message}`,
        );
      }
    }

    // 4. Auto-create credit note
    const cgstTotal = input.items.reduce((s, i) => s + i.cgst, 0);
    const sgstTotal = input.items.reduce((s, i) => s + i.sgst, 0);
    const igstTotal = input.items.reduce((s, i) => s + i.igst, 0);
    const cessTotal = input.items.reduce((s, i) => s + i.cess, 0);
    const creditNoteNumber = `CN-${input.returnNumber}`;

    const creditNote = await this.database.salesReturns.create({
      returnNumber: creditNoteNumber,
      invoiceId: input.invoiceId,
      customerId: input.customerId,
      returnDate: input.returnDate,
      returnReason: 'credit_note',
      status: 'draft',
      subTotal: input.items.reduce((s, i) => s + i.taxableValue, 0),
      taxAmount: cgstTotal + sgstTotal + igstTotal + cessTotal,
      grandTotal,
      creditNoteNo: creditNoteNumber,
      creditNoteDate: input.returnDate,
      notes: `Auto-generated credit note for return ${input.returnNumber}: ${input.returnReason}`,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    // 5. Audit log
    await this.audit.log({
      userId: input.createdBy,
      event: 'return_created',
      resource: 'sales_return',
      action: 'create',
      details: {
        returnId: returnHeader.id,
        returnNumber: input.returnNumber,
        invoiceId: input.invoiceId,
        grandTotal,
        itemsCount: input.items.length,
      },
    });

    this.logger.log(
      `Sales return ${input.returnNumber} created with credit note ${creditNoteNumber}`,
    );
    return { ...returnHeader, items: input.items, creditNote };
  }

  // ═════════════════════════════════════════════════════════
  // POST RETURN — inventory reversal + accounting
  // ═════════════════════════════════════════════════════════
  async postReturn(returnId: string, userId: string): Promise<any> {
    const returnRecord = await this.database.salesReturns.findById(returnId);
    if (!returnRecord) {
      throw new NotFoundException('Sales return not found');
    }
    if (returnRecord.status === 'posted') {
      throw new BadRequestException('Return already posted');
    }
    if (returnRecord.status === 'cancelled') {
      throw new BadRequestException('Return has been cancelled');
    }

    const now = new Date().toISOString();
    const itemsData = await this.database.returnItems.findAll({
      page: 1,
      pageSize: 500,
      search: returnId,
    });
    const returnItems = itemsData?.data || [];

    // ── Inventory Reversal: Stock Back (H1 — canonical ledger) ─
    // Fixed: the legacy write used columns that do not exist on shranix_stock_ledger
    // (warehouse/movementType/referenceType/openingQty...) so it silently failed.
    // Now posts to the canonical shranix_inv_stock_ledger as sales_return IN.
    for (const item of returnItems) {
      try {
        if (this.postingEngine) {
          await this.postingEngine.postMovementCore({
            transactionType: 'sales_return',
            direction: 'IN',
            itemId: item.itemId,
            warehouseId: item.warehouse || 'Main',
            batchNo: item.batchNo || null,
            quantity: Number(item.quantity || 0),
            unitCost: Number(item.rate || 0),
            referenceNumber: returnRecord.returnNumber,
            documentRef: returnRecord.returnNumber,
            documentType: 'sales_return',
            remarks: `Sales return ${returnRecord.returnNumber}`,
            createdBy: userId,
          });
        } else {
          this.logger.warn(
            `Inventory reversal skipped for item ${item.itemId}: posting engine unavailable`,
          );
        }
      } catch (e) {
        this.logger.warn(
          `Inventory reversal warning for item ${item.itemId}: ${(e as Error).message}`,
        );
      }
    }

    // ── Accounting: Reverse Journal Entries ──
    // Look up account IDs from Chart of Accounts (accountId is NOT NULL in schema).
    const accountsRes = await this.database.chartOfAccounts
      .findAll({ page: 1, pageSize: 500 } as any)
      .catch(() => ({ data: [] }));
    const accounts = accountsRes?.data || [];

    const findAccount = (patterns: string[]): string | null => {
      for (const pattern of patterns) {
        const match = accounts.find((a: any) =>
          (a.accountName || '').toLowerCase().includes(pattern.toLowerCase()),
        );
        if (match) {
          return match.id;
        }
      }
      return null;
    };

    const salesReturnAccountId = findAccount(['sales return', 'return account']);
    const cgstInputAccountId = findAccount(['cgst input', 'cgst output']);
    const sgstInputAccountId = findAccount(['sgst input', 'sgst output']);
    const igstInputAccountId = findAccount(['igst input', 'igst output']);
    const receivableAccountId = findAccount(['debtor', 'receivable', 'sundry debtor']);

    // Aggregate totals across all return items
    let totalTaxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    for (const item of returnItems) {
      totalTaxableValue += Number(item.taxableValue || 0);
      totalCgst += Number(item.cgst || 0);
      totalSgst += Number(item.sgst || 0);
      totalIgst += Number(item.igst || 0);
    }

    const reversalVoucherId = `REV-SR-${returnRecord.returnNumber}-${Date.now().toString(36)}`;

    // Build balanced reversal entries: Debit Sales Return, Debit GST Input,
    // Credit Customer/Receivable.
    const reversalEntries: Array<{
      accountId: string;
      debit: number;
      credit: number;
      narration: string;
    }> = [];

    // Debit: Sales Return Account (reverses original credit to Sales)
    if (salesReturnAccountId && totalTaxableValue > 0) {
      reversalEntries.push({
        accountId: salesReturnAccountId,
        debit: totalTaxableValue,
        credit: 0,
        narration: `Sales return reversal: ${returnRecord.returnNumber}`,
      });
    }

    // Debit: GST Input accounts (reverses original GST output credit)
    if (totalCgst > 0 && cgstInputAccountId) {
      reversalEntries.push({
        accountId: cgstInputAccountId,
        debit: totalCgst,
        credit: 0,
        narration: `CGST reversal: ${returnRecord.returnNumber}`,
      });
    }
    if (totalSgst > 0 && sgstInputAccountId) {
      reversalEntries.push({
        accountId: sgstInputAccountId,
        debit: totalSgst,
        credit: 0,
        narration: `SGST reversal: ${returnRecord.returnNumber}`,
      });
    }
    if (totalIgst > 0 && igstInputAccountId) {
      reversalEntries.push({
        accountId: igstInputAccountId,
        debit: totalIgst,
        credit: 0,
        narration: `IGST reversal: ${returnRecord.returnNumber}`,
      });
    }

    // Credit: Customer/Receivable (reduces outstanding)
    const grandTotal =
      Math.round((totalTaxableValue + totalCgst + totalSgst + totalIgst) * 100) / 100;
    if (receivableAccountId && grandTotal > 0) {
      reversalEntries.push({
        accountId: receivableAccountId,
        debit: 0,
        credit: grandTotal,
        narration: `Customer credit for return: ${returnRecord.returnNumber}`,
      });
    }

    // Verify balanced before posting
    const totalDr = reversalEntries.reduce((s, e) => s + e.debit, 0);
    const totalCr = reversalEntries.reduce((s, e) => s + e.credit, 0);
    if (Math.abs(totalDr - totalCr) > 0.01) {
      this.logger.warn(
        `Reversal journal unbalanced: Dr ${totalDr} vs Cr ${totalCr} — posting individual lines best-effort`,
      );
    }

    // Post each line to GL (individual rows per account — respects gl_voucher_idx)
    let glIndex = 0;
    for (const entry of reversalEntries) {
      try {
        await this.database.glEntries.create({
          entryNumber: `${reversalVoucherId}-${String(++glIndex).padStart(3, '0')}`,
          entryDate: returnRecord.returnDate || now.slice(0, 10),
          accountId: entry.accountId,
          voucherId: reversalVoucherId,
          voucherType: 'sales_return',
          voucherNumber: returnRecord.returnNumber,
          debit: Math.round(entry.debit * 100) / 100,
          credit: Math.round(entry.credit * 100) / 100,
          balance: Math.round((entry.debit - entry.credit) * 100) / 100,
          narration: entry.narration,
          partyId: returnRecord.customerId,
          createdBy: userId,
        });
      } catch (e) {
        this.logger.warn(`GL entry warning: ${(e as Error).message}`);
      }
    }

    // ── Customer Ledger: Reduce Outstanding (UPDATE existing row, don't create new) ──
    try {
      const customerLedger = await this.database.ledgerMaster
        .findById(returnRecord.customerId)
        .catch(() => null);
      if (customerLedger) {
        const currentBalance = Number(customerLedger.currentBalance || 0);
        // Return reduces receivable: subtract grandTotal from the running balance
        const newBalance = Math.round((currentBalance - grandTotal) * 100) / 100;
        await this.database.ledgerMaster.update(customerLedger.id, {
          currentBalance: newBalance,
          updatedAt: now,
        });
        this.logger.log(
          `Customer ledger updated: balance ${currentBalance} → ${newBalance} (return ${returnRecord.returnNumber})`,
        );
      } else {
        this.logger.warn(
          `Customer ledger row not found for ${returnRecord.customerId} — balance update skipped`,
        );
      }
    } catch (e) {
      this.logger.warn(`Customer ledger warning: ${(e as Error).message}`);
    }

    // ── Update Status ──
    await this.database.salesReturns.update(returnId, {
      status: 'posted',
      updatedAt: now,
      approvedBy: userId,
      approvedAt: now,
    });

    // ── Audit ──
    await this.audit.log({
      userId,
      event: 'return_posted',
      resource: 'sales_return',
      action: 'post',
      details: {
        returnId,
        returnNumber: returnRecord.returnNumber,
        grandTotal,
        itemsCount: returnItems.length,
      },
    });

    this.logger.log(`Sales return ${returnRecord.returnNumber} posted successfully`);
    return {
      success: true,
      message: `Sales return ${returnRecord.returnNumber} posted`,
      returnNumber: returnRecord.returnNumber,
      itemsProcessed: returnItems.length,
    };
  }

  // ═════════════════════════════════════════════════════════
  // CREDIT NOTE MANAGEMENT
  // ═════════════════════════════════════════════════════════
  async createCreditNote(input: CreditNoteInput): Promise<any> {
    const now = new Date().toISOString();
    const cn = await this.database.creditNotes.create({
      creditNoteNumber: input.creditNoteNumber,
      financialYear: input.financialYear,
      customerId: input.customerId,
      originalInvoiceId: input.originalInvoiceId,
      originalInvoiceNumber: input.originalInvoiceNumber,
      referenceDate: input.referenceDate,
      returnAmount: input.returnAmount,
      cgstTotal: input.cgstTotal,
      sgstTotal: input.sgstTotal,
      igstTotal: input.igstTotal,
      cessTotal: input.cessTotal,
      roundOff: input.roundOff,
      narration: input.narration,
      status: 'draft',
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    await this.audit.log({
      userId: input.createdBy,
      event: 'credit_note_created',
      resource: 'credit_note',
      action: 'create',
      details: { creditNoteNumber: input.creditNoteNumber, amount: input.returnAmount },
    });
    return cn;
  }

  async postCreditNote(cnId: string, userId: string): Promise<any> {
    const cn = await this.database.creditNotes.findById(cnId);
    if (!cn) {
      throw new NotFoundException('Credit note not found');
    }
    if (cn.status === 'posted') {
      throw new BadRequestException('Credit note already posted');
    }
    await this.database.creditNotes.update(cnId, {
      status: 'posted',
      updatedAt: new Date().toISOString(),
    });
    await this.audit.log({
      userId,
      event: 'credit_note_posted',
      resource: 'credit_note',
      action: 'post',
      details: { creditNoteNumber: cn.creditNoteNumber, amount: cn.returnAmount },
    });
    return { ...cn, status: 'posted' };
  }

  async findAllCreditNotes(): Promise<any[]> {
    const result = await this.database.creditNotes.findAll({ page: 1, pageSize: 500 });
    const data = result?.data || [];
    return data.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  // ═════════════════════════════════════════════════════════
  // DEBIT NOTE MANAGEMENT
  // ═════════════════════════════════════════════════════════
  async createDebitNote(input: DebitNoteInput): Promise<any> {
    const now = new Date().toISOString();
    const dn = await this.database.debitNotes.create({
      debitNoteNumber: input.debitNoteNumber,
      financialYear: input.financialYear,
      customerId: input.customerId,
      originalInvoiceId: input.originalInvoiceId,
      originalInvoiceNumber: input.originalInvoiceNumber,
      debitNoteDate: input.debitNoteDate,
      debitType: input.debitType,
      amount: input.amount,
      gstAmount: input.gstAmount || 0,
      narration: input.narration,
      status: 'draft',
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    await this.audit.log({
      userId: input.createdBy,
      event: 'debit_note_created',
      resource: 'debit_note',
      action: 'create',
      details: {
        debitNoteNumber: input.debitNoteNumber,
        debitType: input.debitType,
        amount: input.amount,
      },
    });
    return dn;
  }

  async postDebitNote(dnId: string, userId: string): Promise<any> {
    const dn = await this.database.debitNotes.findById(dnId);
    if (!dn) {
      throw new NotFoundException('Debit note not found');
    }
    if (dn.status === 'posted') {
      throw new BadRequestException('Debit note already posted');
    }
    await this.database.debitNotes.update(dnId, {
      status: 'posted',
      updatedAt: new Date().toISOString(),
    });
    await this.audit.log({
      userId,
      event: 'debit_note_posted',
      resource: 'debit_note',
      action: 'post',
      details: { debitNoteNumber: dn.debitNoteNumber, amount: dn.amount },
    });
    return { ...dn, status: 'posted' };
  }

  async findAllDebitNotes(): Promise<any[]> {
    const result = await this.database.debitNotes.findAll({ page: 1, pageSize: 500 });
    const data = result?.data || [];
    return data.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  // ═════════════════════════════════════════════════════════
  // REPORTS
  // ═════════════════════════════════════════════════════════
  async getReturnRegister(
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
    } = {},
  ): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const returns = await this.database.salesReturns.findAll({ page: 1, pageSize: 500 });
    let data = returns?.data || [];
    if (params.search) {
      const q = params.search.toLowerCase();
      data = data.filter(
        (r: any) =>
          r.returnNumber?.toLowerCase().includes(q) || r.creditNoteNo?.toLowerCase().includes(q),
      );
    }
    if (params.status) {
      data = data.filter((r: any) => r.status === params.status);
    }
    const total = data.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const start = (page - 1) * pageSize;
    return { data: data.slice(start, start + pageSize), total, page, pageSize };
  }

  async getReturnSummary(): Promise<any> {
    const all = await this.database.salesReturns.findAll({ page: 1, pageSize: 500 });
    const returns = all?.data || [];
    return {
      totalReturns: returns.length,
      totalReturnAmount: returns.reduce((s: number, r: any) => s + Number(r.grandTotal || 0), 0),
      draftCount: returns.filter((r: any) => r.status === 'draft').length,
      postedCount: returns.filter((r: any) => r.status === 'posted').length,
      cancelledCount: returns.filter((r: any) => r.status === 'cancelled').length,
      byReason: this.groupCount(returns, 'returnReason'),
      byStatus: this.groupCount(returns, 'status'),
    };
  }

  async getReasonAnalysis(): Promise<{ reason: string; count: number; amount: number }[]> {
    const all = await this.database.salesReturns.findAll({ page: 1, pageSize: 500 });
    const returns = all?.data || [];
    const map = new Map<string, { count: number; amount: number }>();
    for (const r of returns) {
      const reason = r.returnReason || 'other';
      const existing = map.get(reason) || { count: 0, amount: 0 };
      existing.count++;
      existing.amount += Number(r.grandTotal || 0);
      map.set(reason, existing);
    }
    return Array.from(map.entries()).map(([reason, data]) => ({ reason, ...data }));
  }

  async getCreditNoteRegister(): Promise<any[]> {
    const all = await this.database.salesReturns.findAll({ page: 1, pageSize: 500 });
    return (all?.data || [])
      .filter((r: any) => r.creditNoteNo)
      .map((r: any) => ({
        creditNoteNo: r.creditNoteNo,
        returnNumber: r.returnNumber,
        customerId: r.customerId,
        invoiceId: r.invoiceId,
        returnDate: r.returnDate,
        amount: r.grandTotal,
        status: r.status,
      }));
  }

  async getDebitNoteRegister(): Promise<any[]> {
    const result = await this.database.debitNotes.findAll({ page: 1, pageSize: 500 });
    return result?.data || [];
  }

  async getCustomerReturnReport(customerId: string): Promise<any> {
    const all = await this.database.salesReturns.findAll({ page: 1, pageSize: 500 });
    const customerReturns = (all?.data || []).filter((r: any) => r.customerId === customerId);
    return {
      customerId,
      totalReturns: customerReturns.length,
      totalAmount: customerReturns.reduce((s: number, r: any) => s + Number(r.grandTotal || 0), 0),
      returns: customerReturns,
    };
  }

  async getBatchReturnReport(batchNo: string): Promise<any> {
    // In-memory batch tracking
    return { batchNo, returns: [] };
  }

  private groupCount(arr: any[], key: string): Record<string, number> {
    return arr.reduce(
      (acc: Record<string, number>, item: any) => {
        const v = String(item[key] || 'unknown');
        acc[v] = (acc[v] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
