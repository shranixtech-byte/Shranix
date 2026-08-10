import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

/**
 * ═════════════════════════════════════════════════════════
 * PHASE 4 — PAYMENT COLLECTION
 * Invoice → Payment: Cash · UPI · Bank · Cheque · Advance.
 *
 * Flow:
 *  1. Customer ke due invoices (balance > 0) + advance balance dekho.
 *  2. collect(): ek ya zyada invoices par payment allocate karo (oldest first).
 *     Amount total balance se zyada asta tar → excess AOTO advance ban jata hai
 *     (customer ke paas credit, agle bill par adjust hoga).
 *     invoiceIds empty asta tar → pura payment advance (invoice-free receipt).
 *  3. applyAdvance(): customer ka advance balance selected invoices par settle.
 *  4. Har payment ka record `sales_payments` mein (paymentNumber, mode, ref/cheque).
 *     Invoice update: paidAmount += , balanceAmount = , paymentStatus recompute.
 *     Credit profile: outstanding -= settled, advanceBalance += / -=.
 *     Cash → Cash Book (receipt), UPI/Bank/Cheque → Bank Book (receipt) —
 *     default cash/bank accounts configured astil tar (best-effort).
 * ═════════════════════════════════════════════════════════
 */

export type PaymentMode = 'cash' | 'upi' | 'bank' | 'cheque' | 'advance';

export interface CollectPaymentInput {
  customerId: string;
  paymentDate: string;
  mode: Exclude<PaymentMode, 'advance'>;
  amount: number;
  referenceNo?: string;
  bankName?: string;
  chequeNo?: string;
  chequeDate?: string;
  notes?: string;
  /** Empty array = pura payment advance. Invoice order = allocation order. */
  invoiceIds?: string[];
}

export interface ApplyAdvanceInput {
  customerId: string;
  paymentDate?: string;
  invoiceIds: string[];
  amount: number;
  notes?: string;
}

@Injectable()
export class SalesPaymentCollectionService {
  private readonly logger = new Logger(SalesPaymentCollectionService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  // ═════════════════════════════════════════════════════════
  // DASHBOARD (summary cards for the Payment Collection page)
  // ═════════════════════════════════════════════════════════
  async getDashboard(): Promise<any> {
    const profiles =
      (await this.database.creditProfiles.findAll({ page: 1, pageSize: 10000 }))?.data || [];
    const today = new Date().toISOString().split('T')[0];

    const payments =
      (
        await this.database.salesPayments.findAll({
          filters: [
            { field: 'paymentDate', operator: 'eq', value: today },
            { field: 'status', operator: 'eq', value: 'completed' },
          ],
          page: 1,
          pageSize: 10000,
        } as any)
      )?.data || [];

    const totalOutstanding = profiles.reduce(
      (s: number, p: any) => s + Number(p.outstanding || 0),
      0,
    );
    const totalOverdue = profiles.reduce(
      (s: number, p: any) => s + Number(p.overdueAmount || 0),
      0,
    );
    const totalAdvance = profiles.reduce(
      (s: number, p: any) => s + Number(p.advanceBalance || 0),
      0,
    );
    const todayCollection = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    // Recent payments (customer + invoice name ke saath, latest first)
    const recent =
      (
        await this.database.salesPayments.findAll({
          page: 1,
          pageSize: 15,
          sortBy: 'createdAt',
          sortDir: 'desc',
        } as any)
      )?.data || [];

    return {
      summary: {
        totalOutstanding,
        totalOverdue,
        totalAdvance,
        todayCollection,
        customersWithDue: profiles.filter((p: any) => Number(p.outstanding || 0) > 0).length,
      },
      recent: await this.enrichPayments(recent),
    };
  }

  // ═════════════════════════════════════════════════════════
  // CUSTOMER SUMMARY — due invoices + advance + profile
  // ═════════════════════════════════════════════════════════
  async getCustomerSummary(customerId: string): Promise<any> {
    const customer = await this.database.ledgerMaster.findById(customerId).catch(() => null);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    let profile: any = null;
    try {
      const res = await this.database.creditProfiles.findAll({
        filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        page: 1,
        pageSize: 1,
      } as any);
      profile = res?.data?.[0] || null;
    } catch {
      /* profile missing → zeros */
    }

    // Due invoices: balance > 0, not cancelled/draft
    const invoicesRes = await this.database.salesInvoices.findAll({
      filters: [
        { field: 'customerId', operator: 'eq', value: customerId },
        { field: 'balanceAmount', operator: 'gt', value: 0 },
      ],
      page: 1,
      pageSize: 1000,
    } as any);
    const invoices = (invoicesRes?.data || [])
      .filter((inv: any) => inv.status !== 'cancelled' && inv.status !== 'draft')
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

    const payments = await this.getCustomerPayments(customerId);

    return {
      customer: {
        id: customerId,
        name: (customer as any).partyId || customerId,
      },
      profile: {
        creditLimit: Number(profile?.creditLimit || 0),
        outstanding: Number(profile?.outstanding || 0),
        advanceBalance: Number(profile?.advanceBalance || 0),
        overdueAmount: Number(profile?.overdueAmount || 0),
        lastPaymentDate: profile?.lastPaymentDate || null,
      },
      dueInvoices: invoices,
      totalDue: invoices.reduce((s: number, inv: any) => s + inv.balanceAmount, 0),
      payments,
    };
  }

  // ═════════════════════════════════════════════════════════
  // COLLECT PAYMENT (cash / upi / bank / cheque)
  // ═════════════════════════════════════════════════════════
  async collect(input: CollectPaymentInput, userId?: string): Promise<any> {
    const customerId = String(input.customerId || '').trim();
    const amount = Math.round(Number(input.amount || 0) * 100) / 100;
    if (!customerId) {
      throw new BadRequestException('Customer is required');
    }
    if (!(amount > 0)) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }
    const mode = String(input.mode || 'cash').toLowerCase() as PaymentMode;
    if (!['cash', 'upi', 'bank', 'cheque'].includes(mode)) {
      throw new BadRequestException('Invalid payment mode');
    }

    const customer = await this.database.ledgerMaster.findById(customerId).catch(() => null);
    if (!customer) {
      throw new NotFoundException('Customer not found');
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
        const inv = await this.database.salesInvoices.findById(id).catch(() => null);
        if (inv && String(inv.customerId) === customerId) {
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
    const advanceAmount = remaining; // invoice-free excess → customer advance

    if (allocations.length === 0 && advanceAmount <= 0) {
      throw new BadRequestException('No payable invoices selected and no advance portion');
    }

    // 3. Persist payment records + apply to invoices
    const created: any[] = [];
    let settledTotal = 0;
    for (const alloc of allocations) {
      const payment = await this.createPaymentRecord({
        customerId,
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
        customerId,
        alloc.amount,
        alloc.invoice.invoiceNumber,
      );
    }

    if (advanceAmount > 0) {
      const advance = await this.createPaymentRecord({
        customerId,
        paymentDate,
        mode,
        amount: advanceAmount,
        invoiceId: null,
        isAdvance: true,
        referenceNo: input.referenceNo,
        bankName: input.bankName,
        chequeNo: input.chequeNo,
        chequeDate: input.chequeDate,
        notes: input.notes ? `${input.notes} (advance)` : 'Advance received',
        userId,
      });
      created.push(advance);
      await this.writeBookEntry(mode, advance, customerId, advanceAmount, '');
    }

    // 4. Credit profile: outstanding reduce + advance balance + last payment
    await this.updateCreditProfile(customerId, {
      settled: settledTotal,
      advanceDelta: advanceAmount,
      paymentDate,
    });

    await this.auditIf(userId, {
      event: 'payment_collected',
      resource: 'sales_payment',
      action: 'create',
      entityId: created[0]?.id || customerId,
      details: {
        customerId,
        mode,
        amount,
        settledTotal,
        advanceAmount,
        paymentDate,
        paymentNumbers: created.map((p) => p.paymentNumber),
      },
    });

    this.logger.log(
      `Payment collected: ₹${amount} (${mode}) from ${customerId} — settled ₹${settledTotal}, advance ₹${advanceAmount}`,
    );

    return { success: true, payments: created, settledTotal, advanceAmount };
  }

  // ═════════════════════════════════════════════════════════
  // APPLY ADVANCE — customer ka advance balance invoices par settle
  // ═════════════════════════════════════════════════════════
  async applyAdvance(input: ApplyAdvanceInput, userId?: string): Promise<any> {
    const customerId = String(input.customerId || '').trim();
    const amount = Math.round(Number(input.amount || 0) * 100) / 100;
    if (!customerId || !(amount > 0)) {
      throw new BadRequestException('Customer and positive amount are required');
    }
    if (!Array.isArray(input.invoiceIds) || input.invoiceIds.length === 0) {
      throw new BadRequestException('Select at least one invoice to apply advance');
    }

    // Advance balance check
    const profileRes = await this.database.creditProfiles
      .findAll({
        filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        page: 1,
        pageSize: 1,
      } as any)
      .catch(() => ({ data: [] }));
    const profile = profileRes?.data?.[0];
    const advanceBalance = Math.round(Number(profile?.advanceBalance || 0) * 100) / 100;
    if (advanceBalance < amount) {
      throw new BadRequestException(
        `Insufficient advance balance — available ₹${advanceBalance.toFixed(2)}, requested ₹${amount.toFixed(2)}`,
      );
    }

    // Resolve + sort invoices
    const invoices: any[] = [];
    for (const id of input.invoiceIds) {
      const inv = await this.database.salesInvoices.findById(id).catch(() => null);
      if (inv && String(inv.customerId) === customerId) {
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
        customerId,
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

    // Profile: advance balance reduce + outstanding reduce
    await this.updateCreditProfile(customerId, {
      settled: used,
      advanceDelta: -used,
      paymentDate,
    });

    await this.auditIf(userId, {
      event: 'advance_applied',
      resource: 'sales_payment',
      action: 'create',
      entityId: created[0]?.id || customerId,
      details: {
        customerId,
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
      customerId?: string;
      mode?: string;
      from?: string;
      to?: string;
      search?: string;
    } = {},
  ): Promise<any> {
    const filters: any[] = [];
    if (params.customerId) {
      filters.push({ field: 'customerId', operator: 'eq', value: params.customerId });
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
    const result = await this.database.salesPayments.findAll({
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
    const result = await this.database.salesPayments.findAll({
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

  async getCustomerPayments(customerId: string): Promise<any[]> {
    const result = await this.database.salesPayments.findAll({
      filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
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

  /** Payment number: RCP-YYYY-0001 (yearly sequence). */
  private async nextPaymentNumber(paymentDate: string): Promise<string> {
    const year = new Date(paymentDate).getFullYear();
    if (isNaN(year)) {
      throw new BadRequestException('Invalid payment date');
    }
    const prefix = `RCP-${year}-`;
    const result = await this.database.salesPayments.findAll({
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
    customerId: string;
    paymentDate: string;
    mode: PaymentMode;
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
    return this.database.salesPayments.create({
      paymentNumber,
      invoiceId: args.invoiceId || null,
      customerId: args.customerId,
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
    const inv: any = await this.database.salesInvoices.findById(invoiceId);
    if (!inv) {
      throw new BadRequestException(`Invoice not found: ${invoiceId}`);
    }
    const paid = Math.round((Number(inv.paidAmount || 0) + amount) * 100) / 100;
    const grandTotal = Math.round(Number(inv.grandTotal || 0) * 100) / 100;
    const balance = Math.max(0, Math.round((grandTotal - paid) * 100) / 100);
    const paymentStatus = balance <= 0.005 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
    await this.database.salesInvoices.update(invoiceId, {
      paidAmount: paid,
      balanceAmount: balance,
      paymentStatus,
      updatedAt: new Date().toISOString(),
    });
  }

  /** Credit profile: outstanding / advanceBalance / lastPaymentDate sync. */
  private async updateCreditProfile(
    customerId: string,
    opts: { settled: number; advanceDelta: number; paymentDate: string },
  ): Promise<void> {
    try {
      const res = await this.database.creditProfiles.findAll({
        filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        page: 1,
        pageSize: 1,
      } as any);
      const profile = res?.data?.[0];
      if (!profile) {
        return;
      }
      const outstanding = Math.max(
        0,
        Math.round((Number(profile.outstanding || 0) - opts.settled) * 100) / 100,
      );
      const advanceBalance = Math.max(
        0,
        Math.round((Number(profile.advanceBalance || 0) + opts.advanceDelta) * 100) / 100,
      );
      const creditLimit = Number(profile.creditLimit || 0);
      await this.database.creditProfiles.update(profile.id, {
        outstanding,
        advanceBalance,
        availableCredit: Math.max(0, creditLimit - outstanding),
        lastPaymentDate: opts.paymentDate,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      this.logger.warn(`Credit profile update skipped for ${customerId}: ${String(e)}`);
    }
  }

  /**
   * Cash → Cash Book (receipt), UPI/Bank/Cheque → Bank Book (receipt).
   * Best-effort: default cash/bank account configured astil tar entry write hoti
   * hai; nahi asel tar skip (posting engine jaisa behavior). Advance book entry
   * tab hoti hai jab advance receive hota hai (applyAdvance mein cash movement
   * nahi hoti — isliye wahan book entry nahi).
   *
   * NOTE: cash_book/bank_book par (account_id, entry_date) unique index hai —
   * usi din ki entry already astil tar debit add karke update hoti hai (create
   * nahi), taaki same-day multiple receipts book mein nahi ghumti.
   */
  private async writeBookEntry(
    mode: PaymentMode,
    payment: any,
    customerId: string,
    amount: number,
    invoiceNumber: string,
  ): Promise<void> {
    try {
      const settingsRes = await this.database.accountingSettings
        .findAll({ page: 1, pageSize: 1 } as any)
        .catch(() => ({ data: [] }));
      const settings = settingsRes?.data?.[0];
      const narration = invoiceNumber
        ? `Payment received for ${invoiceNumber} (${payment.paymentNumber})`
        : `Advance received (${payment.paymentNumber})`;

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
          customerId,
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
          customerId,
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
   * karo — debit accumulate, runningBalance recalc, voucher number narration
   * mein append. Pehli baar ho to create.
   */
  private async upsertBookEntry(args: {
    table: 'cashBook' | 'bankBook';
    accountIdField: string;
    accountId: string;
    entryDate: string;
    payment: any;
    customerId: string;
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
      const newDebit = Math.round((Number(row.debit || 0) + args.amount) * 100) / 100;
      const newBalance = Math.round((Number(row.runningBalance || 0) + args.amount) * 100) / 100;
      await repo.update(row.id, {
        debit: newDebit,
        runningBalance: newBalance,
        narration: `${row.narration ? `${row.narration} | ` : ''}${args.narration}`,
        updatedAt: new Date().toISOString(),
      });
      this.logger.log(
        `Book entry updated for ${args.entryDate} (₹${args.amount} added — total ₹${newDebit})`,
      );
      return;
    }
    await repo.create({
      [args.accountIdField]: args.accountId,
      entryDate: args.entryDate,
      voucherType: 'receipt',
      voucherId: args.payment.id,
      voucherNumber: args.payment.paymentNumber,
      partyId: args.customerId,
      debit: args.amount,
      credit: 0,
      runningBalance: args.amount,
      narration: args.narration,
      createdBy: args.payment.createdBy,
      ...args.extra,
    } as any);
  }

  /** Payments list par customer name + invoice number bharo (best-effort). */
  private async enrichPayments(payments: any[]): Promise<any[]> {
    const customerCache = new Map<string, string>();
    const invoiceCache = new Map<string, string>();
    const result: any[] = [];
    for (const p of payments) {
      let customerName = customerCache.get(p.customerId) || '';
      if (!customerName) {
        const c = await this.database.ledgerMaster.findById(p.customerId).catch(() => null);
        customerName = c?.partyId || p.customerId;
        customerCache.set(p.customerId, customerName);
      }
      let invoiceNumber = '';
      if (p.invoiceId) {
        invoiceNumber =
          invoiceCache.get(p.invoiceId) ||
          (await this.database.salesInvoices
            .findById(p.invoiceId)
            .then((i: any) => i?.invoiceNumber || '')
            .catch(() => ''));
        invoiceCache.set(p.invoiceId, invoiceNumber);
      }
      result.push({
        ...p,
        customerName,
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
        module: 'sales',
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
