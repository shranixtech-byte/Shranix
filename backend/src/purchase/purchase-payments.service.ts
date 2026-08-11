import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

/**
 * ═════════════════════════════════════════════════════════
 * PHASE 3.3 — SUPPLIER PAYMENT COLLECTION (G3)
 * Purchase Invoice → Payment: Cash · UPI · Bank · Cheque · Advance.
 *
 * Flow:
 *  1. Supplier ke due invoices (balance > 0) + advance balance dekho.
 *  2. collect(): ek ya zyada invoices par payment allocate karo (oldest first).
 *     Amount total balance se zyada asta tar → excess AOTO advance ban jata hai
 *     (supplier ke paas credit, agle bill par adjust hoga).
 *     invoiceIds empty asta tar → pura payment advance (invoice-free payment).
 *  3. applyAdvance(): supplier ka advance balance selected invoices par settle.
 *  4. Har payment ka record `purchase_payments` mein (paymentNumber, mode, ref/cheque).
 *     Invoice update: paidAmount += , balanceAmount = , paymentStatus recompute.
 *     Supplier master + ledger: currentBalance reduce.
 *     Supplier ledger: credit entry (payment). GL: cash/bank book receipt.
 * ═════════════════════════════════════════════════════════
 */

export type PurchasePaymentMode = 'cash' | 'upi' | 'bank' | 'cheque' | 'advance';

export interface CollectSupplierPaymentInput {
  supplierId: string;
  paymentDate: string;
  mode: Exclude<PurchasePaymentMode, 'advance'>;
  amount: number;
  referenceNo?: string;
  bankName?: string;
  chequeNo?: string;
  chequeDate?: string;
  notes?: string;
  /** Empty array = pura payment advance. Invoice order = allocation order. */
  invoiceIds?: string[];
}

export interface ApplySupplierAdvanceInput {
  supplierId: string;
  paymentDate?: string;
  invoiceIds: string[];
  amount: number;
  notes?: string;
}

@Injectable()
export class PurchasePaymentsService {
  private readonly logger = new Logger(PurchasePaymentsService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  // ═════════════════════════════════════════════════════════
  // DASHBOARD (summary cards for the Payment Collection page)
  // ═════════════════════════════════════════════════════════
  async getDashboard(): Promise<any> {
    const invoices =
      (await this.database.purchaseInvoices.findAll({ page: 1, pageSize: 10000 } as any))?.data ||
      [];
    const today = new Date().toISOString().split('T')[0];

    const payments =
      (
        await this.database.purchasePayments.findAll({
          filters: [
            { field: 'paymentDate', operator: 'eq', value: today },
            { field: 'status', operator: 'eq', value: 'completed' },
          ],
          page: 1,
          pageSize: 10000,
        } as any)
      )?.data || [];

    // Payable (outstanding) = unpaid invoice balances (draft/cancelled excluded)
    let totalPayable = 0;
    let totalOverdue = 0;
    const suppliersWithDue = new Set<string>();
    const todayStr = today;
    for (const inv of invoices) {
      if (['draft', 'cancelled'].includes(String(inv.status))) {
        continue;
      }
      const bal = Math.round(Number(inv.balanceAmount || 0) * 100) / 100;
      if (bal <= 0) {
        continue;
      }
      totalPayable += bal;
      if (String(inv.dueDate || '') < todayStr) {
        totalOverdue += bal;
      }
      suppliersWithDue.add(inv.supplierId);
    }

    // Advance balance per supplier (paid but not allocated to an invoice)
    const advanceBalance = await this.computeSupplierAdvanceBalances();

    const todayCollection = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    // Recent payments (supplier + invoice name ke saath, latest first)
    const recent =
      (
        await this.database.purchasePayments.findAll({
          page: 1,
          pageSize: 15,
          sortBy: 'createdAt',
          sortDir: 'desc',
        } as any)
      )?.data || [];

    return {
      summary: {
        totalPayable: Math.round(totalPayable * 100) / 100,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
        totalAdvance:
          Math.round([...advanceBalance.values()].reduce((s, v) => s + v, 0) * 100) / 100,
        todayCollection: Math.round(todayCollection * 100) / 100,
        suppliersWithDue: suppliersWithDue.size,
      },
      recent: await this.enrichPayments(recent),
    };
  }

  // ═════════════════════════════════════════════════════════
  // SUPPLIER SUMMARY — due invoices + advance + history
  // ═════════════════════════════════════════════════════════
  async getSupplierSummary(supplierId: string): Promise<any> {
    const supplier = await this.database.suppliers.findById(supplierId).catch(() => null);
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    // Due invoices: balance > 0, not cancelled/draft
    const invoicesRes = await this.database.purchaseInvoices.findAll({
      filters: [
        { field: 'supplierId', operator: 'eq', value: supplierId },
        { field: 'balanceAmount', operator: 'gt', value: 0 },
      ],
      page: 1,
      pageSize: 1000,
    } as any);
    const invoices = (invoicesRes?.data || [])
      .filter((inv: any) => !['draft', 'cancelled'].includes(String(inv.status)))
      .map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        grandTotal: Number(inv.grandTotal) || 0,
        paidAmount: Number(inv.paidAmount) || 0,
        balanceAmount: Number(inv.balanceAmount) || 0,
        paymentStatus: inv.paymentStatus,
      }))
      .sort((a: any, b: any) => String(a.invoiceDate).localeCompare(String(b.invoiceDate)));

    const payments = await this.getSupplierPayments(supplierId);
    const advanceBalance = await this.getAdvanceBalance(supplierId);

    return {
      supplier: {
        id: supplierId,
        name: supplier.name || supplierId,
        code: supplier.code || null,
      },
      profile: {
        outstanding:
          Math.round(invoices.reduce((s: number, inv: any) => s + inv.balanceAmount, 0) * 100) /
          100,
        advanceBalance,
        creditLimit: Number(supplier.creditLimit || 0),
        creditDays: Number(supplier.creditDays || 0),
        lastPaymentDate: payments[0]?.paymentDate || null,
      },
      dueInvoices: invoices,
      totalDue:
        Math.round(invoices.reduce((s: number, inv: any) => s + inv.balanceAmount, 0) * 100) / 100,
      payments,
    };
  }

  // ═════════════════════════════════════════════════════════
  // COLLECT PAYMENT (cash / upi / bank / cheque)
  // ═════════════════════════════════════════════════════════
  async collect(input: CollectSupplierPaymentInput, userId?: string): Promise<any> {
    const supplierId = String(input.supplierId || '').trim();
    const amount = Math.round(Number(input.amount || 0) * 100) / 100;
    if (!supplierId) {
      throw new BadRequestException('Supplier is required');
    }
    if (!(amount > 0)) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }
    const mode = String(input.mode || 'cash').toLowerCase() as PurchasePaymentMode;
    if (!['cash', 'upi', 'bank', 'cheque'].includes(mode)) {
      throw new BadRequestException('Invalid payment mode');
    }

    const supplier = await this.database.suppliers.findById(supplierId).catch(() => null);
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const paymentDate = String(input.paymentDate || new Date().toISOString().split('T')[0]);

    // 1. Resolve target invoices (allocation order: invoice date asc)
    const requestedIds = Array.isArray(input.invoiceIds) ? input.invoiceIds : [];
    const invoices: any[] = [];
    if (requestedIds.length > 0) {
      for (const id of requestedIds) {
        if (!id) {
          continue;
        }
        const inv = await this.database.purchaseInvoices.findById(id).catch(() => null);
        // Draft/cancelled invoices are not payable — skip (STEP 24 business rule)
        if (inv && String(inv.supplierId) === supplierId) {
          if (['draft', 'cancelled'].includes(String(inv.status))) {
            continue;
          }
          invoices.push(inv);
        }
      }
      invoices.sort((a, b) =>
        String(a.invoiceDate || '').localeCompare(String(b.invoiceDate || '')),
      );
    }

    // 2. Allocate: oldest first, per-invoice balance tak. Excess → advance.
    let remaining = amount;
    const allocations: { invoice: any; amount: number }[] = [];
    for (const inv of invoices) {
      if (remaining <= 0) {
        break;
      }
      const balance = Math.round((Number(inv.balanceAmount) || 0) * 100) / 100;
      if (balance <= 0) {
        continue;
      }
      const apply = Math.min(remaining, balance);
      allocations.push({ invoice: inv, amount: Math.round(apply * 100) / 100 });
      remaining = Math.round((remaining - apply) * 100) / 100;
    }
    const advanceAmount = remaining; // invoice-free excess → supplier advance

    if (allocations.length === 0 && advanceAmount <= 0) {
      throw new BadRequestException('No payable invoices selected and no advance portion');
    }

    // 3. Persist payment records + apply to invoices
    const created: any[] = [];
    let settledTotal = 0;
    for (const alloc of allocations) {
      const payment = await this.createPaymentRecord({
        supplierId,
        paymentDate,
        mode,
        amount: alloc.amount,
        invoiceId: alloc.invoice.id,
        isAdvance: false,
        referenceNo: input.referenceNo,
        bankName: input.bankName,
        chequeNo: input.chequeNo,
        chequeDate: input.chequeDate,
        notes: input.notes,
        userId,
      });
      await this.applyToInvoice(alloc.invoice.id, alloc.amount);
      settledTotal += alloc.amount;
      created.push(payment);
      await this.writeBookEntry(
        mode,
        payment,
        supplierId,
        alloc.amount,
        alloc.invoice.invoiceNumber,
      );
    }

    if (advanceAmount > 0) {
      const advance = await this.createPaymentRecord({
        supplierId,
        paymentDate,
        mode,
        amount: advanceAmount,
        invoiceId: null,
        isAdvance: true,
        referenceNo: input.referenceNo,
        bankName: input.bankName,
        chequeNo: input.chequeNo,
        chequeDate: input.chequeDate,
        notes: input.notes ? `${input.notes} (advance)` : 'Advance paid',
        userId,
      });
      created.push(advance);
      await this.writeBookEntry(mode, advance, supplierId, advanceAmount, '');
    }

    // 4. Supplier balance sync: reduce payable (currentBalance) by settled amount
    await this.reduceSupplierBalance(supplierId, settledTotal);

    await this.auditIf(userId, {
      event: 'purchase_payment_collected',
      resource: 'purchase_payment',
      action: 'create',
      entityId: created[0]?.id || supplierId,
      details: {
        supplierId,
        mode,
        amount,
        settledTotal,
        advanceAmount,
        paymentDate,
        paymentNumbers: created.map((p) => p.paymentNumber),
      },
    });

    this.logger.log(
      `Payment made: ₹${amount} (${mode}) to ${supplierId} — settled ₹${settledTotal}, advance ₹${advanceAmount}`,
    );

    return { success: true, payments: created, settledTotal, advanceAmount };
  }

  // ═════════════════════════════════════════════════════════
  // APPLY ADVANCE — supplier ka advance balance invoices par settle
  // ═════════════════════════════════════════════════════════
  async applyAdvance(input: ApplySupplierAdvanceInput, userId?: string): Promise<any> {
    const supplierId = String(input.supplierId || '').trim();
    const amount = Math.round(Number(input.amount || 0) * 100) / 100;
    if (!supplierId || !(amount > 0)) {
      throw new BadRequestException('Supplier and positive amount are required');
    }
    if (!Array.isArray(input.invoiceIds) || input.invoiceIds.length === 0) {
      throw new BadRequestException('Select at least one invoice to apply advance');
    }

    // Advance balance check
    const advanceBalance = await this.getAdvanceBalance(supplierId);
    if (advanceBalance < amount) {
      throw new BadRequestException(
        `Insufficient advance balance — available ₹${advanceBalance.toFixed(2)}, requested ₹${amount.toFixed(2)}`,
      );
    }

    // Resolve + sort invoices
    const invoices: any[] = [];
    for (const id of input.invoiceIds) {
      const inv = await this.database.purchaseInvoices.findById(id).catch(() => null);
      if (inv && String(inv.supplierId) === supplierId) {
        invoices.push(inv);
      }
    }
    invoices.sort((a, b) => String(a.invoiceDate || '').localeCompare(String(b.invoiceDate || '')));

    // Allocate oldest-first; unused portion wapas advance mein hi rehta hai
    let remaining = amount;
    const allocations: { invoice: any; amount: number }[] = [];
    for (const inv of invoices) {
      if (remaining <= 0) {
        break;
      }
      const balance = Math.round((Number(inv.balanceAmount) || 0) * 100) / 100;
      if (balance <= 0) {
        continue;
      }
      const apply = Math.min(remaining, balance);
      allocations.push({ invoice: inv, amount: Math.round(apply * 100) / 100 });
      remaining = Math.round((remaining - apply) * 100) / 100;
    }

    const used = allocations.reduce((s, a) => s + a.amount, 0);
    if (used <= 0) {
      throw new BadRequestException('Selected invoices have no outstanding balance');
    }

    const paymentDate = String(input.paymentDate || new Date().toISOString().split('T')[0]);
    const created: any[] = [];
    for (const alloc of allocations) {
      const payment = await this.createPaymentRecord({
        supplierId,
        paymentDate,
        mode: 'advance',
        amount: alloc.amount,
        invoiceId: alloc.invoice.id,
        isAdvance: false,
        notes: input.notes || 'Advance applied to invoice',
        userId,
      });
      await this.applyToInvoice(alloc.invoice.id, alloc.amount);
      created.push(payment);
    }

    // Supplier balance sync: advance settled amount bhi payable kam karta hai
    await this.reduceSupplierBalance(supplierId, used);

    await this.auditIf(userId, {
      event: 'purchase_advance_applied',
      resource: 'purchase_payment',
      action: 'create',
      entityId: created[0]?.id || supplierId,
      details: {
        supplierId,
        amount: used,
        paymentNumbers: created.map((p) => p.paymentNumber),
      },
    });

    return { success: true, payments: created, applied: used };
  }

  // ═════════════════════════════════════════════════════════
  // PAYMENT LISTS
  // ═════════════════════════════════════════════════════════
  async listPayments(
    params: {
      page?: number;
      pageSize?: number;
      supplierId?: string;
      mode?: string;
      from?: string;
      to?: string;
      search?: string;
    } = {},
  ): Promise<any> {
    const filters: any[] = [];
    if (params.supplierId) {
      filters.push({ field: 'supplierId', operator: 'eq', value: params.supplierId });
    }
    if (params.mode && params.mode !== 'all') {
      filters.push({ field: 'mode', operator: 'eq', value: params.mode });
    }
    if (params.from) {
      filters.push({ field: 'paymentDate', operator: 'gte', value: params.from });
    }
    if (params.to) {
      filters.push({ field: 'paymentDate', operator: 'lte', value: params.to });
    }
    const result = await this.database.purchasePayments.findAll({
      page: params.page || 1,
      pageSize: params.pageSize || 50,
      search: params.search,
      filters: filters.length > 0 ? filters : undefined,
      sortBy: 'paymentDate',
      sortDir: 'desc',
    } as any);
    return { ...result, data: await this.enrichPayments(result?.data || []) };
  }

  async getInvoicePayments(invoiceId: string): Promise<any[]> {
    const result = await this.database.purchasePayments.findAll({
      filters: [{ field: 'invoiceId', operator: 'eq', value: invoiceId }],
      page: 1,
      pageSize: 100,
    } as any);
    return (result?.data || []).map((p: any) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      paymentDate: p.paymentDate,
      mode: p.mode,
      amount: Number(p.amount) || 0,
      referenceNo: p.referenceNo || '',
      chequeNo: p.chequeNo || '',
      bankName: p.bankName || '',
      notes: p.notes || '',
      status: p.status,
    }));
  }

  async getSupplierPayments(supplierId: string): Promise<any[]> {
    const result = await this.database.purchasePayments.findAll({
      filters: [{ field: 'supplierId', operator: 'eq', value: supplierId }],
      page: 1,
      pageSize: 200,
      sortBy: 'paymentDate',
      sortDir: 'desc',
    } as any);
    return (result?.data || []).map((p: any) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      paymentDate: p.paymentDate,
      mode: p.mode,
      amount: Number(p.amount) || 0,
      invoiceId: p.invoiceId,
      referenceNo: p.referenceNo || '',
      chequeNo: p.chequeNo || '',
      bankName: p.bankName || '',
      isAdvance: Boolean(p.isAdvance),
      notes: p.notes || '',
      status: p.status,
    }));
  }

  // ═════════════════════════════════════════════════════════
  // INTERNALS
  // ═════════════════════════════════════════════════════════

  /** Payment number: PAY-YYYY-0001 (yearly sequence). */
  private async nextPaymentNumber(paymentDate: string): Promise<string> {
    const year = new Date(paymentDate).getFullYear();
    if (isNaN(year)) {
      throw new BadRequestException('Invalid payment date');
    }
    const prefix = `PAY-${year}-`;
    const result = await this.database.purchasePayments.findAll({
      filters: [{ field: 'paymentNumber', operator: 'like', value: `${prefix}%` }],
      page: 1,
      pageSize: 10000,
    } as any);
    let max = 0;
    for (const p of result?.data || []) {
      const rest = String(p.paymentNumber || '').slice(prefix.length);
      const m = rest.match(/^(\d+)/);
      if (m) {
        const s = parseInt(m[1], 10);
        if (!isNaN(s) && s > max) {
          max = s;
        }
      }
    }
    return `${prefix}${String(max + 1).padStart(4, '0')}`;
  }

  private async createPaymentRecord(args: {
    supplierId: string;
    paymentDate: string;
    mode: PurchasePaymentMode;
    amount: number;
    invoiceId: string | null;
    isAdvance: boolean;
    referenceNo?: string;
    bankName?: string;
    chequeNo?: string;
    chequeDate?: string;
    notes?: string;
    userId?: string;
  }): Promise<any> {
    const paymentNumber = await this.nextPaymentNumber(args.paymentDate);
    const now = new Date().toISOString();
    return this.database.purchasePayments.create({
      paymentNumber,
      invoiceId: args.invoiceId || null,
      supplierId: args.supplierId,
      paymentDate: args.paymentDate,
      mode: args.mode,
      amount: Math.round(Number(args.amount || 0) * 100) / 100,
      referenceNo: args.referenceNo || null,
      bankName: args.bankName || null,
      chequeNo: args.chequeNo || null,
      chequeDate: args.chequeDate || null,
      notes: args.notes || null,
      status: 'completed',
      isAdvance: args.isAdvance,
      createdBy: args.userId || null,
      updatedBy: args.userId || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Invoice ke paid/balance/status ko update karo. */
  private async applyToInvoice(invoiceId: string, amount: number): Promise<void> {
    const inv: any = await this.database.purchaseInvoices.findById(invoiceId);
    if (!inv) {
      throw new BadRequestException(`Invoice not found: ${invoiceId}`);
    }
    const paid = Math.round((Number(inv.paidAmount || 0) + amount) * 100) / 100;
    const grandTotal = Math.round(Number(inv.grandTotal || 0) * 100) / 100;
    const balance = Math.max(0, Math.round((grandTotal - paid) * 100) / 100);
    const paymentStatus = balance <= 0.005 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
    await this.database.purchaseInvoices.update(invoiceId, {
      paidAmount: paid,
      balanceAmount: balance,
      paymentStatus,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Supplier currentBalance sync (master + ledger mirror) — payment se payable
   * ghatta hai. Best-effort: mirror row astil tar dono update hote hain.
   */
  private async reduceSupplierBalance(supplierId: string, settled: number): Promise<void> {
    if (!(settled > 0)) {
      return;
    }
    try {
      const supplier = await this.database.suppliers.findById(supplierId);
      if (supplier) {
        const cur = Math.max(
          0,
          Math.round((Number(supplier.currentBalance || 0) - settled) * 100) / 100,
        );
        await this.database.suppliers.update(supplierId, {
          currentBalance: cur,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      this.logger.warn(`Supplier balance sync skipped for ${supplierId}: ${String(e)}`);
    }
    try {
      const ledger = await this.database.ledgerMaster.findById(supplierId);
      if (ledger) {
        const cur = Math.max(
          0,
          Math.round((Number((ledger as any).currentBalance || 0) - settled) * 100) / 100,
        );
        await this.database.ledgerMaster.update(supplierId, {
          currentBalance: cur,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      this.logger.warn(`Ledger balance sync skipped for ${supplierId}: ${String(e)}`);
    }
  }

  /** Advance balance = advance payments (isAdvance) minus applied advances. */
  private async getAdvanceBalance(supplierId: string): Promise<number> {
    const result = await this.database.purchasePayments.findAll({
      filters: [
        { field: 'supplierId', operator: 'eq', value: supplierId },
        { field: 'status', operator: 'eq', value: 'completed' },
      ],
      page: 1,
      pageSize: 10000,
    } as any);
    let advance = 0;
    for (const p of result?.data || []) {
      const amt = Number(p.amount || 0);
      if (p.isAdvance) {
        advance += amt;
      } else if (p.mode === 'advance') {
        advance -= amt;
      }
    }
    return Math.max(0, Math.round(advance * 100) / 100);
  }

  /** All suppliers ke advance balances (dashboard ke liye). */
  private async computeSupplierAdvanceBalances(): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    const result = await this.database.purchasePayments
      .findAll({
        filters: [{ field: 'status', operator: 'eq', value: 'completed' }],
        page: 1,
        pageSize: 10000,
      } as any)
      .catch(() => ({ data: [] }));
    for (const p of result?.data || []) {
      const amt = Number(p.amount || 0);
      if (p.isAdvance) {
        map.set(p.supplierId, (map.get(p.supplierId) || 0) + amt);
      } else if (p.mode === 'advance') {
        map.set(p.supplierId, (map.get(p.supplierId) || 0) - amt);
      }
    }
    for (const [k, v] of map) {
      if (v <= 0) {
        map.delete(k);
      }
    }
    return map;
  }

  /**
   * Cash → Cash Book (payment/credit), UPI/Bank/Cheque → Bank Book.
   * Best-effort: default cash/bank account configured astil tar entry write hoti
   * hai; nahi asel tar skip. Same-day (account_id, entry_date) unique index ke
   * chalte existing entry mein credit accumulate hota hai.
   */
  private async writeBookEntry(
    mode: PurchasePaymentMode,
    payment: any,
    supplierId: string,
    amount: number,
    invoiceNumber: string,
  ): Promise<void> {
    try {
      const settingsRes = await this.database.accountingSettings
        .findAll({ page: 1, pageSize: 1 } as any)
        .catch(() => ({ data: [] }));
      const settings = settingsRes?.data?.[0];
      const narration = invoiceNumber
        ? `Payment made for ${invoiceNumber} (${payment.paymentNumber})`
        : `Advance paid (${payment.paymentNumber})`;

      if (mode === 'cash') {
        const cashAccountId = settings?.defaultCashAccountId;
        if (!cashAccountId) {
          return;
        }
        await this.upsertBookEntry({
          table: 'cashBook',
          accountIdField: 'cashAccountId',
          accountId: cashAccountId,
          entryDate: payment.paymentDate,
          payment,
          supplierId,
          amount,
          narration,
          extra: {},
        });
      } else {
        const bankAccountId = settings?.defaultBankAccountId;
        if (!bankAccountId) {
          return;
        }
        await this.upsertBookEntry({
          table: 'bankBook',
          accountIdField: 'bankAccountId',
          accountId: bankAccountId,
          entryDate: payment.paymentDate,
          payment,
          supplierId,
          amount,
          narration,
          extra: {
            chequeNumber: payment.chequeNo || null,
            chequeDate: payment.chequeDate || null,
            utrNumber: mode === 'upi' ? payment.referenceNo || null : null,
            referenceNumber: payment.referenceNo || null,
            reconciliationStatus: mode === 'cheque' ? 'pending' : 'cleared',
          },
        });
      }
    } catch (e) {
      this.logger.warn(`Book entry skipped for ${payment.paymentNumber}: ${String(e)}`);
    }
  }

  /**
   * (account_id, entry_date) unique index ke chalte same-day entry ko update
   * karo — credit accumulate, runningBalance recalc, voucher number narration
   * mein append. Pehli baar ho to create.
   */
  private async upsertBookEntry(args: {
    table: 'cashBook' | 'bankBook';
    accountIdField: string;
    accountId: string;
    entryDate: string;
    payment: any;
    supplierId: string;
    amount: number;
    narration: string;
    extra: Record<string, any>;
  }): Promise<void> {
    const repo = args.table === 'cashBook' ? this.database.cashBook : this.database.bankBook;
    const existing = await repo
      .findAll({
        filters: [
          { field: args.accountIdField, operator: 'eq', value: args.accountId },
          { field: 'entryDate', operator: 'eq', value: args.entryDate },
        ],
        page: 1,
        pageSize: 5,
      } as any)
      .catch(() => ({ data: [] }));
    const row = existing?.data?.[0];
    if (row) {
      const newCredit = Math.round((Number(row.credit || 0) + args.amount) * 100) / 100;
      const newBalance = Math.round((Number(row.runningBalance || 0) - args.amount) * 100) / 100;
      await repo.update(row.id, {
        credit: newCredit,
        runningBalance: newBalance,
        narration: `${row.narration ? `${row.narration} | ` : ''}${args.narration}`,
        updatedAt: new Date().toISOString(),
      });
      this.logger.log(
        `Book entry updated for ${args.entryDate} (₹${args.amount} added — total ₹${newCredit})`,
      );
      return;
    }
    await repo.create({
      [args.accountIdField]: args.accountId,
      entryDate: args.entryDate,
      voucherType: 'payment',
      voucherId: args.payment.id,
      voucherNumber: args.payment.paymentNumber,
      partyId: args.supplierId,
      debit: 0,
      credit: args.amount,
      runningBalance: -args.amount,
      narration: args.narration,
      createdBy: args.payment.createdBy,
      ...args.extra,
    } as any);
  }

  /** Payments list par supplier name + invoice number bharo (best-effort). */
  private async enrichPayments(payments: any[]): Promise<any[]> {
    const supplierCache = new Map<string, string>();
    const invoiceCache = new Map<string, string>();
    const result: any[] = [];
    for (const p of payments) {
      let supplierName = supplierCache.get(p.supplierId) || '';
      if (!supplierName) {
        const s = await this.database.suppliers.findById(p.supplierId).catch(() => null);
        supplierName = s?.name || p.supplierId;
        supplierCache.set(p.supplierId, supplierName);
      }
      let invoiceNumber = '';
      if (p.invoiceId) {
        invoiceNumber =
          invoiceCache.get(p.invoiceId) ||
          (await this.database.purchaseInvoices
            .findById(p.invoiceId)
            .then((i: any) => i?.invoiceNumber || '')
            .catch(() => ''));
        invoiceCache.set(p.invoiceId, invoiceNumber);
      }
      result.push({
        ...p,
        supplierName,
        invoiceNumber,
        modeLabel: this.modeLabel(p.mode),
        amount: Number(p.amount) || 0,
      });
    }
    return result;
  }

  private modeLabel(mode: string): string {
    const map: Record<string, string> = {
      cash: 'Cash',
      upi: 'UPI',
      bank: 'Bank',
      cheque: 'Cheque',
      advance: 'Advance',
    };
    return map[mode] || mode;
  }

  private async auditIf(
    userId: string | undefined,
    payload: {
      event: string;
      resource: string;
      action: string;
      entityId: string;
      details?: any;
    },
  ): Promise<void> {
    if (!userId) {
      return;
    }
    try {
      await this.audit.log({
        userId,
        event: payload.event,
        resource: payload.resource,
        action: payload.action,
        entityId: payload.entityId,
        module: 'purchase',
        actionType: payload.action,
        oldValues: null,
        newValues: null,
        details: payload.details,
      } as any);
    } catch (e) {
      this.logger.warn(`Audit skipped: ${String(e)}`);
    }
  }
}
