import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import type { EnterpriseQuery } from '@shranix/database';

import { TransactionManager, type TransactionContext } from '../automation/transaction.manager';
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

// Type-only: DI token 'STOCK_POSTING_SERVICE' resolves the runtime instance.
// Value import would create a cycle services.ts <-> debit-note.service.ts.
import type { StockPostingService } from './services';

function generateEntryNumber(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefix}-${ts}${rand}`;
}

@Injectable()
export class PurchaseDebitNoteService {
  private readonly logger = new Logger(PurchaseDebitNoteService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly transactionManager: TransactionManager,
    private readonly audit: AuditService,
    @Inject('STOCK_POSTING_SERVICE') private readonly stockPostingService: StockPostingService,
  ) {}

  /**
   * Create and post a debit note from a purchase return in a single transaction.
   * This performs:
   *   - Creates the debit note record
   *   - Reverses inventory (stock back to supplier)
   *   - Reverses GST (reverse input credit)
   *   - Adjusts supplier ledger
   *   - Creates reversal journal entries
   *   - Updates return status to 'posted'
   *   - Audit trail
   */
  async createDebitNoteFromReturn(
    returnId: string,
    userId: string,
    debitNoteNumber?: string,
  ): Promise<{
    success: boolean;
    message: string;
    debitNoteId?: string;
    errors: string[];
  }> {
    this.logger.log(`Creating debit note from purchase return ${returnId}`);

    // Load return
    const returnRecord = await this.database.purchaseReturns.findById(returnId);
    if (!returnRecord) {
      throw new NotFoundException('Purchase return not found');
    }
    if (returnRecord.status === 'posted') {
      throw new BadRequestException('Return already posted, debit note already created');
    }
    if (returnRecord.status === 'cancelled') {
      throw new BadRequestException('Cannot process cancelled return');
    }

    // Load return items
    const returnItemsQuery: EnterpriseQuery = {
      page: 1,
      pageSize: 500,
      fields: ['id', 'itemId', 'batchNo', 'warehouseId', 'quantity', 'rate', 'amount', 'reason'],
      filters: [{ field: 'returnId', operator: 'eq', value: returnId }],
    };
    const itemsResult = await this.database.purchaseReturnItems.findAll(returnItemsQuery);
    const returnItems = itemsResult?.data || [];
    if (returnItems.length === 0) {
      throw new BadRequestException('Return has no items');
    }

    // Load supplier
    const supplier = await this.database.suppliers.findById(returnRecord.supplierId);
    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }

    const dnNumber =
      debitNoteNumber || `DN-${returnRecord.returnNumber || Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();

    return this.transactionManager.executeInTransaction(async (_ctx: TransactionContext) => {
      const errors: string[] = [];
      const db = this.database;

      // ── 1. CREATE DEBIT NOTE ──────────────────────────
      let debitNote: any;
      try {
        debitNote = await db.debitNotes.create({
          debitNoteNumber: dnNumber,
          financialYear: (returnRecord.returnDate || now).slice(0, 7),
          customerId: returnRecord.supplierId,
          originalInvoiceId: returnRecord.invoiceId || null,
          originalInvoiceNumber: '',
          debitNoteDate: returnRecord.returnDate,
          debitType: 'purchase_return',
          amount: returnRecord.grandTotal || 0,
          gstAmount: returnRecord.taxAmount || 0,
          narration: `Debit note for purchase return ${returnRecord.returnNumber}`,
          status: 'posted',
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        });
        this.logger.log(`1/7 ✓ Debit note ${dnNumber} created`);
      } catch (e: any) {
        errors.push(`Debit note creation failed: ${e.message}`);
        throw new ConflictException(`Debit note creation failed: ${e.message}`);
      }

      // ── 2. INVENTORY REVERSAL (reduce warehouse stock) ─
      try {
        await this.stockPostingService.reverseFromReturn(returnRecord, userId);
        this.logger.log('2/7 ✓ Inventory reversed');
      } catch (e: any) {
        errors.push(`Inventory reversal failed: ${e.message}`);
        throw new ConflictException(`Inventory reversal failed: ${e.message}`);
      }

      // ── 3. JOURNAL ENTRIES (Reversal) ─────────────────
      const purchaseAmount = (returnRecord.subTotal || 0) - (returnRecord.discountAmount || 0);
      const entryNumber = generateEntryNumber('PDN');
      const journalEntries: Array<{
        accountName: string;
        accountType: 'debit' | 'credit';
        amount: number;
        narration: string;
      }> = [];

      // Reverse Purchase: Credit Purchase Account
      journalEntries.push({
        accountName: 'Purchase Account',
        accountType: 'credit',
        amount: Math.max(0, purchaseAmount),
        narration: `Purchase return reversal - ${returnRecord.returnNumber}`,
      });

      // Reverse Input GST: Credit GST Input accounts
      const gstTotal = returnRecord.taxAmount || 0;
      // Estimate GST split (CGST ~50% of gst total, SGST ~50%)
      const cgstAmount = Math.round(gstTotal * 0.5 * 100) / 100;
      const sgstAmount = gstTotal - cgstAmount;
      if (cgstAmount > 0) {
        journalEntries.push({
          accountName: 'CGST Input Account',
          accountType: 'credit',
          amount: cgstAmount,
          narration: `CGST reversal - ${returnRecord.returnNumber}`,
        });
      }
      if (sgstAmount > 0) {
        journalEntries.push({
          accountName: 'SGST Input Account',
          accountType: 'credit',
          amount: sgstAmount,
          narration: `SGST reversal - ${returnRecord.returnNumber}`,
        });
      }

      // Debit: Supplier (reduces payable)
      const totalAmount = returnRecord.grandTotal || 0;
      journalEntries.push({
        accountName: `${supplier.name} - Sundry Creditor`,
        accountType: 'debit',
        amount: totalAmount,
        narration: `Debit note ${dnNumber} - ${returnRecord.returnNumber}`,
      });

      // Round off
      const roundOff = returnRecord.roundOff || 0;
      if (Math.abs(roundOff) > 0.005) {
        journalEntries.push({
          accountName: 'Round Off Account',
          accountType: roundOff > 0 ? 'credit' : 'debit',
          amount: Math.abs(roundOff),
          narration: `Round off reversal - ${returnRecord.returnNumber}`,
        });
      }

      // Verify balanced
      const totalDebit = journalEntries
        .filter((e) => e.accountType === 'debit')
        .reduce((s, e) => s + e.amount, 0);
      const totalCredit = journalEntries
        .filter((e) => e.accountType === 'credit')
        .reduce((s, e) => s + e.amount, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        errors.push(`Journal unbalanced: debit ${totalDebit} vs credit ${totalCredit}`);
        throw new ConflictException(`Reversal journal unbalanced`);
      }

      try {
        const accountsRes = await db.chartOfAccounts.findAll({ page: 1, pageSize: 500 } as any);
        const accounts = accountsRes?.data || [];
        const creditor = accounts.find(
          (a: any) =>
            (a.accountName || '').toLowerCase().includes('sundry creditor') ||
            (a.accountName || '').toLowerCase().includes('supplier') ||
            a.isControlAccount === true ||
            a.isControlAccount === 1,
        );
        if (creditor) {
          const totalDebit = journalEntries
            .filter((e) => e.accountType === 'debit')
            .reduce((s, e) => s + e.amount, 0);
          const totalCredit = journalEntries
            .filter((e) => e.accountType === 'credit')
            .reduce((s, e) => s + e.amount, 0);
          await db.glEntries.create({
            entryNumber: `${entryNumber}-001`,
            entryDate: returnRecord.returnDate,
            accountId: creditor.id,
            voucherId: debitNote.id,
            voucherType: 'debit_note',
            voucherNumber: dnNumber,
            debit: Math.round(totalDebit * 100) / 100,
            credit: Math.round(totalCredit * 100) / 100,
            balance: Math.round((totalDebit - totalCredit) * 100) / 100,
            narration: journalEntries.map((e) => e.narration).join(' | '),
            partyId: returnRecord.supplierId,
            createdBy: userId,
            createdAt: now,
          });
          this.logger.log(`3/7 ✓ Reversal GL entry created for ${dnNumber}`);
        } else {
          this.logger.warn(`3/7 ⚠ No Sundry Creditor account — GL entry skipped`);
        }
      } catch (e: any) {
        this.logger.warn(`3/7 ⚠ Reversal GL entry skipped: ${e.message}`);
      }

      // ── 4. GST LEDGER REVERSAL (one row — gst_voucher_idx unique) ─
      try {
        const gstTotal = Math.round((cgstAmount + sgstAmount) * 100) / 100;
        if (gstTotal > 0) {
          await db.gstLedger.create({
            voucherId: debitNote.id,
            voucherType: 'debit_note',
            voucherNumber: dnNumber,
            voucherDate: returnRecord.returnDate,
            gstType: 'input',
            gstRate: 0,
            taxableValue: purchaseAmount,
            gstAmount: gstTotal,
            cessAmount: 0,
            inputOutput: 'input',
            reverseCharge: 'no',
            createdBy: userId,
            createdAt: now,
          });
          this.logger.log(`4/7 ✓ GST ledger reversal created (₹${gstTotal})`);
        } else {
          this.logger.warn('4/7 ⚠ No GST amount — GST reversal skipped');
        }
      } catch (e: any) {
        errors.push(`GST ledger reversal failed: ${e.message}`);
        throw new ConflictException(`GST ledger reversal failed: ${e.message}`);
      }

      // ── 5. SUPPLIER LEDGER ADJUSTMENT (reduce payable) ─
      // Debit note = payable kamm; ledger_master currentBalance update karo
      // (mirror of the payment-collection reduceSupplierBalance).
      try {
        const supplierLedger = await db.ledgerMaster
          .findById(returnRecord.supplierId)
          .catch(() => null);
        if (supplierLedger) {
          const newBalance =
            Math.round(
              Math.max(0, Number(supplierLedger.currentBalance || 0) - totalAmount) * 100,
            ) / 100;
          await db.ledgerMaster.update(supplierLedger.id, {
            currentBalance: newBalance,
            updatedAt: now,
          });
          this.logger.log(
            `5/7 ✓ Supplier ledger payable reduced (₹${totalAmount} → balance ₹${newBalance})`,
          );
        } else {
          this.logger.warn('5/7 ⚠ Supplier ledger row missing — balance update skipped');
        }
      } catch (e: any) {
        errors.push(`Supplier ledger adjustment failed: ${e.message}`);
        throw new ConflictException(`Supplier ledger adjustment failed: ${e.message}`);
      }

      // ── 6. UPDATE RETURN STATUS ───────────────────────
      try {
        await db.purchaseReturns.update(returnId, {
          status: 'posted',
          debitNoteId: debitNote.id,
          debitNoteNumber: dnNumber,
          updatedAt: now,
        });
        this.logger.log(`6/7 ✓ Return ${returnRecord.returnNumber} status updated to posted`);
      } catch (e: any) {
        errors.push(`Return status update failed: ${e.message}`);
        throw new ConflictException(`Return status update failed: ${e.message}`);
      }

      // ── 7. AUDIT LOG ──────────────────────────────────
      try {
        await db.auditLogs.create({
          userId,
          event: 'debit_note_created',
          resource: 'debit_note',
          action: 'create',
          details: JSON.stringify({
            debitNoteId: debitNote.id,
            debitNoteNumber: dnNumber,
            returnId,
            returnNumber: returnRecord.returnNumber,
            amount: totalAmount,
          }),
          ipAddress: '127.0.0.1',
        });
        this.logger.log('7/7 ✓ Audit log created');
      } catch (e: any) {
        errors.push(`Audit log failed: ${e.message}`);
        throw new ConflictException(`Audit log failed: ${e.message}`);
      }

      return {
        success: errors.length === 0,
        message: `Debit note ${dnNumber} created and posted successfully for return ${returnRecord.returnNumber}`,
        debitNoteId: debitNote.id,
        errors,
      };
    });
  }

  /**
   * List all debit notes.
   */
  async findAll(page = 1, pageSize = 50): Promise<any> {
    return this.database.debitNotes.findAll({ page, pageSize });
  }

  /**
   * Find a debit note by ID.
   */
  async findById(id: string): Promise<any> {
    return this.database.debitNotes.findById(id);
  }

  /**
   * Cancel a debit note (only if not already posted/in use).
   */
  async cancel(id: string, userId: string, reason?: string): Promise<any> {
    const dn = await this.database.debitNotes.findById(id);
    if (!dn) {
      throw new NotFoundException('Debit note not found');
    }
    if (dn.status !== 'draft') {
      throw new BadRequestException('Only draft debit notes can be cancelled');
    }

    await this.database.debitNotes.update(id, {
      status: 'cancelled',
      cancellationReason: reason || null,
      updatedAt: new Date().toISOString(),
    });

    await this.audit.log({
      userId,
      event: 'debit_note_cancelled',
      resource: 'debit_note',
      action: 'cancel',
      details: { debitNoteId: id, debitNoteNumber: dn.debitNoteNumber, reason },
    });

    return { success: true, message: `Debit note ${dn.debitNoteNumber} cancelled` };
  }
}
