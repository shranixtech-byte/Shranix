import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { TransactionManager, type TransactionContext } from '../automation/transaction.manager';
import { DatabaseService } from '../database/database.service';

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

  /** Purchase Settings → Default Payment Mode (Settings Hub → Purchase). */
  private async loadSettings(): Promise<any> {
    try {
      const r = await this.database.purchaseSettings.findAll({ page: 1, pageSize: 1 } as any);
      return r.data?.[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Post a purchase invoice with full accounting in a single transaction.
   * Creates:
   *   - Supplier ledger entry (Accounts Payable)
   *   - Journal entries (Purchase A/c, Input GST, Supplier)
   *   - GST ledger entries
   *   - Round off handling
   *   - Updates invoice status to 'posted'
   */
  async postInvoice(
    invoiceId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    message: string;
    errors: string[];
  }> {
    this.logger.log(`Starting purchase invoice posting for invoice ${invoiceId}`);

    // Load invoice
    const invoice = await this.database.purchaseInvoices.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Purchase invoice not found');
    }
    if (invoice.status === 'posted') {
      throw new BadRequestException('Invoice already posted');
    }
    if (invoice.status === 'cancelled') {
      throw new BadRequestException('Cannot post cancelled invoice');
    }

    // Validate: supplier must exist
    const supplier = await this.database.suppliers.findById(invoice.supplierId);
    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }

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
      // shranix_ledger_master is a MASTER row (one per supplier, created at
      // supplier creation with id = supplierId). Posting increases the payable
      // currentBalance; payment collection reduces it. Mirrors the sales engine
      // (never writes transaction rows into the master).
      try {
        const payable = Math.round(Number(invoice.grandTotal || 0) * 100) / 100;
        const supplierLedger = await db.ledgerMaster.findById(invoice.supplierId).catch(() => null);
        if (supplierLedger) {
          const newBalance =
            Math.round((Number(supplierLedger.currentBalance || 0) + payable) * 100) / 100;
          await db.ledgerMaster.update(supplierLedger.id, {
            currentBalance: newBalance,
            updatedAt: timestamp,
          });
          this.logger.log(
            `2/7 ✓ Supplier ledger payable updated (₹${payable} → balance ₹${newBalance})`,
          );
        } else {
          // No ledger row (legacy supplier) — create the master row best-effort
          await db.ledgerMaster
            .create({
              id: invoice.supplierId,
              accountId: invoice.supplierId,
              ledgerType: 'supplier',
              partyId: supplier.name || 'Supplier',
              currentBalance: payable,
              openingBalance: 0,
              openingBalanceType: 'credit',
              creditLimit: 0,
              creditDays: 0,
              isActive: true,
              createdAt: timestamp,
              updatedAt: timestamp,
            })
            .catch((e2: any) => {
              this.logger.warn(`Supplier ledger create skipped: ${e2?.message}`);
            });
          this.logger.log('2/7 ✓ Supplier ledger master row created');
        }
      } catch (e: any) {
        errors.push(`Supplier ledger failed: ${e.message}`);
        throw new ConflictException(`Supplier ledger failed: ${e.message}`);
      }

      // ── 2b. LINE-LEVEL GST SPLIT (M1) ────────────────────
      // Invoice items astil tar per-line igst/cgst/sgst/cess aggregate hota hai
      // (supplier-state vs company-state IGST logic line-level pe already applied
      // hota hai create/update ke dauran `computePurchaseLine` mein). Legacy
      // invoices bina items ke → header taxAmount 50/50 CGST/SGST split.
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;
      let cessAmount = 0;
      let gstTaxRate = 0;
      try {
        const itemsRes = await db.purchaseInvoiceItems?.findAll({
          page: 1,
          pageSize: 500,
          fields: ['igst', 'cgst', 'sgst', 'cess', 'gstRate', 'taxableValue'],
          filters: [{ field: 'invoiceId', operator: 'eq', value: invoiceId }],
        } as any);
        const items = itemsRes?.data || [];
        if (items.length > 0) {
          for (const line of items) {
            cgstAmount += Number(line.cgst) || 0;
            sgstAmount += Number(line.sgst) || 0;
            igstAmount += Number(line.igst) || 0;
            cessAmount += Number(line.cess) || 0;
            const taxable = Number(line.taxableValue) || 0;
            const lineTax =
              (Number(line.igst) || 0) + (Number(line.cgst) || 0) + (Number(line.sgst) || 0);
            if (taxable > 0 && lineTax > 0) {
              gstTaxRate = Math.max(gstTaxRate, Math.round((lineTax / taxable) * 10000) / 100);
            }
          }
        }
      } catch {
        /* items repo missing → fall back to header split */
      }
      if (cgstAmount + sgstAmount + igstAmount + cessAmount === 0) {
        const gstTotal = invoice.taxAmount || 0;
        cgstAmount = Math.round(gstTotal * 0.5 * 100) / 100;
        sgstAmount = gstTotal - cgstAmount;
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

      if (igstAmount > 0) {
        journalEntries.push({
          accountName: 'IGST Input Account',
          accountType: 'debit',
          amount: Math.round(igstAmount * 100) / 100,
          narration: `IGST input on ${invoice.invoiceNumber}`,
        });
      }
      if (cgstAmount > 0) {
        journalEntries.push({
          accountName: 'CGST Input Account',
          accountType: 'debit',
          amount: Math.round(cgstAmount * 100) / 100,
          narration: `CGST input on ${invoice.invoiceNumber}`,
        });
      }
      if (sgstAmount > 0) {
        journalEntries.push({
          accountName: 'SGST Input Account',
          accountType: 'debit',
          amount: Math.round(sgstAmount * 100) / 100,
          narration: `SGST input on ${invoice.invoiceNumber}`,
        });
      }
      if (cessAmount > 0) {
        journalEntries.push({
          accountName: 'CESS Input Account',
          accountType: 'debit',
          amount: Math.round(cessAmount * 100) / 100,
          narration: `CESS on ${invoice.invoiceNumber}`,
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
      const totalDebitCalc = journalEntries
        .filter((e) => e.accountType === 'debit')
        .reduce((s, e) => s + e.amount, 0);
      const totalCreditCalc = journalEntries
        .filter((e) => e.accountType === 'credit')
        .reduce((s, e) => s + e.amount, 0);
      if (Math.abs(totalDebitCalc - totalCreditCalc) > 0.01) {
        errors.push(`Journal unbalanced: debit ${totalDebitCalc} vs credit ${totalCreditCalc}`);
        throw new ConflictException(
          `Journal unbalanced: debit ${totalDebitCalc} vs credit ${totalCreditCalc}`,
        );
      }

      // ── 3. GL ENTRIES (one summary row per invoice) ─────
      // shranix_gl_entries: entry_number, entry_date, account_id (NOT NULL),
      // voucher_id/voucher_type/voucher_number, debit, credit, balance,
      // narration, party_id, created_by. gl_voucher_idx is UNIQUE per voucher_id,
      // so we write ONE summary row (mirrors sales posting-engine). When no
      // matching chart-of-accounts row exists we skip gracefully with a warning
      // instead of failing the whole posting.
      let journalCount = 0;
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
          const totalDebit = Math.round(totalDebitCalc * 100) / 100;
          const totalCredit = Math.round(totalCreditCalc * 100) / 100;
          await db.glEntries.create({
            entryNumber: `${entryNumber}-001`,
            entryDate: invoice.invoiceDate,
            accountId: creditor.id,
            voucherId: invoiceId,
            voucherType: 'purchase_invoice',
            voucherNumber: invoice.invoiceNumber,
            debit: totalDebit,
            credit: totalCredit,
            balance: Math.round((totalDebit - totalCredit) * 100) / 100,
            narration: journalEntries.map((e) => e.narration).join(' | '),
            partyId: invoice.supplierId,
            createdBy: userId,
            createdAt: timestamp,
          });
          journalCount = 1;
          this.logger.log(
            `3/7 ✓ GL entry created for ${invoice.invoiceNumber} (Dr ${totalDebit} / Cr ${totalCredit})`,
          );
        } else {
          this.logger.warn(
            `3/7 ⚠ No Sundry Creditor account in chart of accounts — GL entry skipped (invoice still posts)`,
          );
        }
      } catch (e: any) {
        this.logger.warn(`3/7 ⚠ GL entry skipped: ${e.message}`);
      }

      // ── 4. GST LEDGER (one INPUT row per invoice — gst_voucher_idx unique) ─
      // shranix_gst_ledger: voucher_type, voucher_id, voucher_number, voucher_date,
      // gst_type, gst_rate, taxable_value, gst_amount, cess_amount, input_output
      try {
        const gstTotal = Math.round((igstAmount + cgstAmount + sgstAmount) * 100) / 100;
        if (gstTotal > 0 || cessAmount > 0) {
          await db.gstLedger.create({
            voucherType: 'purchase_invoice',
            voucherId: invoiceId,
            voucherNumber: invoice.invoiceNumber,
            voucherDate: invoice.invoiceDate,
            gstType: 'input',
            gstRate: gstTaxRate,
            taxableValue: purchaseAmount,
            gstAmount: gstTotal,
            cessAmount: Math.round(cessAmount * 100) / 100,
            inputOutput: 'input',
            reverseCharge: 'no',
            createdBy: userId,
            createdAt: timestamp,
          });
          this.logger.log(
            `4/7 ✓ GST entry created (taxable ${purchaseAmount}, GST ${gstTotal}, CESS ${cessAmount})`,
          );
        } else {
          this.logger.warn(`4/7 ⚠ No GST amounts — GST entry skipped`);
        }
      } catch (e: any) {
        this.logger.warn(`4/7 ⚠ GST entry skipped: ${e.message}`);
      }

      // ── 5. CASH BOOK (only when a cash account is configured) ──
      // shranix_cash_book: cash_account_id (NOT NULL), entry_date, voucher_type,
      // voucher_id, voucher_number, party_id, debit, credit, running_balance,
      // narration, created_by. Skip gracefully when no cash account exists.
      try {
        const accountsRes = await db.chartOfAccounts.findAll({ page: 1, pageSize: 500 } as any);
        const accounts = accountsRes?.data || [];
        const cashAccount = accounts.find(
          (a: any) =>
            a.isCashAccount === true ||
            a.isCashAccount === 1 ||
            (a.accountName || '').toLowerCase().includes('cash'),
        );
        if (cashAccount) {
          const entryAmount = Math.round(Number(invoice.paidAmount || 0) * 100) / 100;
          await db.cashBook.create({
            cashAccountId: cashAccount.id,
            entryDate: invoice.invoiceDate,
            voucherType: 'purchase_invoice',
            voucherId: invoiceId,
            voucherNumber: invoice.invoiceNumber,
            partyId: invoice.supplierId,
            debit: 0,
            credit:
              entryAmount > 0
                ? entryAmount
                : Math.round(Number(invoice.grandTotal || 0) * 100) / 100,
            runningBalance: -Math.round(Number(invoice.grandTotal || 0) * 100) / 100,
            narration: `Purchase invoice ${invoice.invoiceNumber} - ${supplier.name}`,
            createdBy: userId,
            createdAt: timestamp,
          });
          this.logger.log('5/7 ✓ Cash book entry created');
        } else {
          this.logger.warn(`5/7 ⚠ No cash account configured — cash book entry skipped`);
        }
      } catch (e: any) {
        this.logger.warn(`5/7 ⚠ Cash book entry skipped: ${e.message}`);
      }

      // ── 6. AUDIT LOG ───────────────────────────────────
      try {
        await db.auditLogs.create({
          userId,
          event: 'purchase_invoice_posted',
          resource: 'purchase_invoice',
          action: 'post',
          details: JSON.stringify({
            invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            grandTotal: invoice.grandTotal,
          }),
          ipAddress: '127.0.0.1',
        });
        this.logger.log('6/7 ✓ Audit log created');
      } catch (e: any) {
        errors.push(`Audit log failed: ${e.message}`);
        throw new ConflictException(`Audit log failed: ${e.message}`);
      }

      // ── 7. NOTIFICATION (non-critical) ────────────────
      // shranix_notifications: user_id, title, message, type, module, is_read
      try {
        await db.notifications.create({
          userId: userId || 'system',
          title: `Purchase Invoice Posted: ${invoice.invoiceNumber}`,
          message: `Invoice ${invoice.invoiceNumber} for ${supplier.name} has been posted. Amount: ${invoice.grandTotal}`,
          type: 'purchase_invoice_posted',
          module: 'purchase',
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
    if (!invoice) {
      throw new NotFoundException('Purchase invoice not found');
    }

    const supplier = await this.database.suppliers.findById(invoice.supplierId);
    const issues: string[] = [];

    if (invoice.status === 'posted') {
      issues.push('Invoice already posted');
    }
    if (invoice.status === 'cancelled') {
      issues.push('Invoice is cancelled');
    }
    if (!supplier) {
      issues.push('Supplier not found');
    }
    if (!invoice.grandTotal || invoice.grandTotal <= 0) {
      issues.push('Grand total must be positive');
    }

    return {
      canPost: issues.length === 0,
      issues,
      invoice,
      supplier: supplier ? { id: supplier.id, name: supplier.name, gstin: supplier.gstin } : null,
    };
  }
}
