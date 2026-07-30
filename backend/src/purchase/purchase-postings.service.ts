import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { TransactionManager, type TransactionContext } from '../automation/transaction.manager';

function generateEntryNumber(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefix}-${ts}${rand}`;
}

@Injectable()
export class PurchasePostingEngineService {
  private readonly logger = new Logger(PurchasePostingEngineService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly transactionManager: TransactionManager,
  ) {}

  /**
   * Post a purchase invoice with full accounting in a single transaction.
   * Creates:
   *   - Supplier ledger entry (Accounts Payable)
   *   - Journal entries (Purchase A/c, Input GST, Supplier)
   *   - GST ledger entries
   *   - Round off handling
   *   - Updates invoice status to 'posted'
   */
  async postInvoice(invoiceId: string, userId: string): Promise<{
    success: boolean;
    message: string;
    errors: string[];
  }> {
    this.logger.log(`Starting purchase invoice posting for invoice ${invoiceId}`);

    // Load invoice
    const invoice = await this.database.purchaseInvoices.findById(invoiceId);
    if (!invoice) throw new NotFoundException('Purchase invoice not found');
    if (invoice.status === 'posted') throw new BadRequestException('Invoice already posted');
    if (invoice.status === 'cancelled') throw new BadRequestException('Cannot post cancelled invoice');

    // Validate: supplier must exist
    const supplier = await this.database.suppliers.findById(invoice.supplierId);
    if (!supplier) throw new BadRequestException('Supplier not found');

    return this.transactionManager.executeInTransaction(async (_ctx: TransactionContext) => {
      const errors: string[] = [];
      const timestamp = new Date().toISOString();
      const db = this.database;
      const entryNumber = generateEntryNumber('PINV');

      // ── 1. UPDATE INVOICE STATUS ──────────────────────
      try {
        await db.purchaseInvoices.update(invoiceId, {
          status: 'posted',
          updatedAt: timestamp,
        });
        this.logger.log('1/7 ✓ Invoice status updated to posted');
      } catch (e: any) {
        errors.push(`Invoice status update failed: ${e.message}`);
        throw new ConflictException(`Invoice status update failed: ${e.message}`);
      }

      // ── 2. SUPPLIER LEDGER (Accounts Payable) ─────────
      try {
        await db.ledgerMaster.create({
          customerId: invoice.supplierId,
          customerName: supplier.name || 'Supplier',
          transactionType: 'purchase_invoice',
          transactionNo: invoice.invoiceNumber,
          transactionDate: invoice.invoiceDate,
          debit: 0,
          credit: invoice.grandTotal || 0,
          runningBalance: -(invoice.grandTotal || 0),
          financialYear: (invoice.invoiceDate || timestamp).slice(0, 7),
          createdAt: timestamp,
        });
        this.logger.log('2/7 ✓ Supplier ledger entry created');
      } catch (e: any) {
        errors.push(`Supplier ledger failed: ${e.message}`);
        throw new ConflictException(`Supplier ledger failed: ${e.message}`);
      }

      // ── 3. JOURNAL ENTRIES ─────────────────────────────
      const journalEntries: Array<{
        accountName: string;
        accountType: 'debit' | 'credit';
        amount: number;
        narration: string;
      }> = [];

      // DEBIT: Purchase Account (subTotal - discount)
      const purchaseAmount = (invoice.subTotal || 0) - (invoice.discountAmount || 0);
      journalEntries.push({
        accountName: 'Purchase Account',
        accountType: 'debit',
        amount: Math.max(0, purchaseAmount),
        narration: `Purchase from ${supplier.name} - ${invoice.invoiceNumber}`,
      });

      // DEBIT: Input GST (split from taxAmount — CGST ~50%, SGST ~50%)
      const gstTotal = invoice.taxAmount || 0;
      const cgstAmount = Math.round(gstTotal * 0.5 * 100) / 100;
      const sgstAmount = gstTotal - cgstAmount;
      if (cgstAmount > 0) {
        journalEntries.push({
          accountName: 'CGST Input Account',
          accountType: 'debit',
          amount: cgstAmount,
          narration: `CGST input on ${invoice.invoiceNumber}`,
        });
      }
      if (sgstAmount > 0) {
        journalEntries.push({
          accountName: 'SGST Input Account',
          accountType: 'debit',
          amount: sgstAmount,
          narration: `SGST input on ${invoice.invoiceNumber}`,
        });
      }

      // CREDIT: Supplier (Accounts Payable)
      const totalDue = invoice.grandTotal || 0;
      journalEntries.push({
        accountName: `${supplier.name} - Sundry Creditor`,
        accountType: 'credit',
        amount: totalDue,
        narration: `Purchase invoice ${invoice.invoiceNumber}`,
      });

      // Round off handling
      const roundOff = invoice.roundOff || 0;
      if (Math.abs(roundOff) > 0.005) {
        journalEntries.push({
          accountName: 'Round Off Account',
          accountType: roundOff > 0 ? 'debit' : 'credit',
          amount: Math.abs(roundOff),
          narration: `Round off - ${invoice.invoiceNumber}`,
        });
      }

      // Verify balanced
      const totalDebit = journalEntries.filter(e => e.accountType === 'debit').reduce((s, e) => s + e.amount, 0);
      const totalCredit = journalEntries.filter(e => e.accountType === 'credit').reduce((s, e) => s + e.amount, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        errors.push(`Journal unbalanced: debit ${totalDebit} vs credit ${totalCredit}`);
        throw new ConflictException(`Journal unbalanced: debit ${totalDebit} vs credit ${totalCredit}`);
      }

      // Persist journal entries
      let journalCount = 0;
      for (const entry of journalEntries) {
        try {
          await db.glEntries.create({
            entryNumber: `${entryNumber}-${String(journalCount + 1).padStart(3, '0')}`,
            entryDate: invoice.invoiceDate,
            accountName: entry.accountName,
            voucherType: 'purchase_invoice',
            voucherNumber: invoice.invoiceNumber,
            debit: entry.accountType === 'debit' ? Math.round(entry.amount * 100) / 100 : 0,
            credit: entry.accountType === 'credit' ? Math.round(entry.amount * 100) / 100 : 0,
            narration: entry.narration,
            partyId: invoice.supplierId,
            createdBy: userId,
            createdAt: timestamp,
          });
          journalCount++;
        } catch (e: any) {
          errors.push(`Journal entry failed for ${entry.accountName}: ${e.message}`);
          throw new ConflictException(`Journal entry failed: ${e.message}`);
        }
      }
      this.logger.log(`3/7 ✓ ${journalCount} journal entries created`);

      // ── 4. GST LEDGER ──────────────────────────────────
      const gstEntries = journalEntries.filter(e =>
        e.accountName.includes('GST') || e.accountName.includes('CESS'),
      );
      for (const gstEntry of gstEntries) {
        try {
          await db.gstLedger.create({
            voucherId: invoiceId,
            voucherType: 'purchase_invoice',
            voucherNumber: invoice.invoiceNumber,
            voucherDate: invoice.invoiceDate,
            accountName: gstEntry.accountName,
            taxableAmount: purchaseAmount,
            taxAmount: gstEntry.amount,
            taxRate: 0,
            transactionType: 'INPUT',
            partyId: invoice.supplierId,
            createdAt: timestamp,
          });
        } catch (e: any) {
          errors.push(`GST entry failed: ${e.message}`);
          throw new ConflictException(`GST entry failed: ${e.message}`);
        }
      }
      this.logger.log(`4/7 ✓ ${gstEntries.length} GST ledger entries created`);

      // ── 5. CASH BOOK ───────────────────────────────────
      try {
        await db.cashBook.create({
          voucherId: invoiceId,
          voucherType: 'purchase_invoice',
          voucherNumber: invoice.invoiceNumber,
          voucherDate: invoice.invoiceDate,
          customerId: invoice.supplierId,
          grandTotal: invoice.grandTotal || 0,
          paidAmount: invoice.paidAmount || 0,
          balanceAmount: (invoice.balanceAmount || 0) || (invoice.grandTotal || 0),
          paymentMode: 'credit',
          createdAt: timestamp,
        });
        this.logger.log('5/7 ✓ Cash book entry created');
      } catch (e: any) {
        errors.push(`Cash book entry failed: ${e.message}`);
        throw new ConflictException(`Cash book entry failed: ${e.message}`);
      }

      // ── 6. AUDIT LOG ───────────────────────────────────
      try {
        await db.auditLogs.create({
          userId,
          event: 'purchase_invoice_posted',
          resource: 'purchase_invoice',
          action: 'post',
          details: JSON.stringify({ invoiceId, invoiceNumber: invoice.invoiceNumber, grandTotal: invoice.grandTotal }),
          ipAddress: '127.0.0.1',
        });
        this.logger.log('6/7 ✓ Audit log created');
      } catch (e: any) {
        errors.push(`Audit log failed: ${e.message}`);
        throw new ConflictException(`Audit log failed: ${e.message}`);
      }

      // ── 7. NOTIFICATION ────────────────────────────────
      try {
        await db.notifications.create({
          type: 'purchase_invoice_posted',
          title: `Purchase Invoice Posted: ${invoice.invoiceNumber}`,
          message: `Invoice ${invoice.invoiceNumber} for ${supplier.name} has been posted. Amount: ${invoice.grandTotal}`,
          recipientId: invoice.supplierId,
          isRead: false,
          createdAt: timestamp,
        });
        this.logger.log('7/7 ✓ Notification created');
      } catch (e: any) {
        // Non-critical
        this.logger.warn(`Notification creation failed: ${(e as Error).message}`);
      }

      return {
        success: errors.length === 0,
        message: `Invoice ${invoice.invoiceNumber} posted successfully with ${journalCount} journal entries`,
        errors,
      };
    });
  }

  /**
   * Get posting preview (validates without persisting).
   */
  async previewPosting(invoiceId: string): Promise<any> {
    const invoice = await this.database.purchaseInvoices.findById(invoiceId);
    if (!invoice) throw new NotFoundException('Purchase invoice not found');

    const supplier = await this.database.suppliers.findById(invoice.supplierId);
    const issues: string[] = [];

    if (invoice.status === 'posted') issues.push('Invoice already posted');
    if (invoice.status === 'cancelled') issues.push('Invoice is cancelled');
    if (!supplier) issues.push('Supplier not found');
    if (!invoice.grandTotal || invoice.grandTotal <= 0) issues.push('Grand total must be positive');

    return {
      canPost: issues.length === 0,
      issues,
      invoice,
      supplier: supplier ? { id: supplier.id, name: supplier.name, gstin: supplier.gstin } : null,
    };
  }
}
