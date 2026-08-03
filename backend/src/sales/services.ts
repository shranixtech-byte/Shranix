import { Injectable, BadRequestException } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { BaseMasterService } from '../masters/base-master.service';

@Injectable()
export class SalesQuotationsService extends BaseMasterService {
  constructor(
    database: DatabaseService,
    audit: AuditService,
    private readonly db: DatabaseService,
  ) {
    super(database.salesQuotations, 'SalesQuotation', audit, 'quoteNumber');
  }

  override async create(data: any, userId?: string) {
    const enriched = { ...data };
    // Quotation Expiry — Settings Hub → Sales: quotationExpiryDays set asta tar
    // validTill na dile quoteDate + expiry days ne auto-fill karo.
    if (!enriched.validTill) {
      try {
        const r = await this.db.salesSettings.findAll({ page: 1, pageSize: 1 } as any);
        const settings = r.data?.[0];
        const expiryDays = Number(settings?.quotationExpiryDays);
        if (expiryDays > 0 && enriched.quoteDate) {
          const base = new Date(enriched.quoteDate);
          if (!isNaN(base.getTime())) {
            base.setDate(base.getDate() + expiryDays);
            enriched.validTill = base.toISOString().split('T')[0];
          }
        }
      } catch {
        /* best-effort: settings unavailable → leave validTill empty */
      }
    }
    return super.create(enriched, userId);
  }
}
@Injectable()
export class SalesOrdersService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.salesOrders, 'SalesOrder', audit, 'orderNumber');
  }
}
@Injectable()
export class DeliveryChallansService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.deliveryChallans, 'DeliveryChallan', audit, 'challanNumber');
  }
}
@Injectable()
export class SalesInvoicesService extends BaseMasterService {
  private readonly invoiceItemsRepo: any;
  private readonly settingsRepo: any;

  constructor(database: DatabaseService, audit: AuditService) {
    super(database.salesInvoices, 'SalesInvoice', audit, 'invoiceNumber');
    this.invoiceItemsRepo = database.invoiceItems;
    this.settingsRepo = database.salesSettings;
  }

  /**
   * Generate the next invoice number.
   * Format: SL<CA|CR><YY>-<seq>  e.g. SLCA26-001 (cash), SLCR26-001 (credit)
   * - SL = Sale prefix
   * - CA = cash payment / CR = credit payment
   * - YY = calendar year ke last 2 digits (2026 → 26)
   * Sequence resets to 001 at the start of each calendar year, per payment type.
   */
  async getNextNumber(
    dateStr?: string,
    paymentType?: string,
  ): Promise<{ invoiceNumber: string; financialYear: string }> {
    const date = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    const fyStart = month >= 4 ? year : year - 1;
    const financialYear = `${fyStart}-${String(fyStart + 1).slice(-2)}`; // e.g. 2026-27

    // Payment type → CA (cash) / CR (credit) + calendar year ke last 2 digits
    const typeCode = paymentType === 'credit' ? 'CR' : 'CA';
    const yy = String(year).slice(-2);

    // Invoice Settings (Settings Hub) se prefix/suffix/auto-number lo.
    // Default: SL prefix + CA/CR + YY → SLCA26-001 (purana format preserved).
    let invoicePrefix = 'SL';
    let invoiceSuffix = '';
    let autoNumber = true;
    let startNumber = 0;
    try {
      const settings = (await this.settingsRepo.findAll({ page: 1, pageSize: 1 }))
        ?.data?.[0] as any;
      if (settings) {
        const p = settings.invoicePrefix ? String(settings.invoicePrefix).trim() : '';
        if (p) {
          invoicePrefix = p;
        }
        invoiceSuffix = settings.invoiceSuffix ? String(settings.invoiceSuffix) : '';
        autoNumber = settings.autoInvoiceNumber !== false;
        if (!autoNumber && settings.invoiceNextNumber) {
          startNumber = Number(settings.invoiceNextNumber) || 0;
        }
      }
    } catch {
      // Settings load na ho → defaults use karo
    }
    const prefix = `${invoicePrefix}${typeCode}${yy}-`;

    // Max sequence nikaalo — INCLUDING soft-deleted rows. `invoice_number` ka UNIQUE
    // index soft-deleted rows ko bhi block karta hai; agar sirf non-deleted count
    // karein toh deleted invoice ka number dobara generate ho sakta hai →
    // SQLITE_CONSTRAINT_UNIQUE 500 error (bug fix: saari invoices deleted hone par
    // yeh hamesha SLCA26-001 return karta tha).
    // Auto-number OFF par fixed invoiceNextNumber se sequence start hota hai
    // (invoiceNextNumber = pehla number).
    let maxSeq = startNumber > 0 ? startNumber - 1 : 0;
    const maxSeqFn = (this.repository as any).findMaxSequenceForPrefix;
    if (autoNumber && typeof maxSeqFn === 'function') {
      maxSeq = await maxSeqFn.call(this.repository, prefix);
    } else if (autoNumber) {
      // Fallback (purana database package): sirf non-deleted rows count karo
      const result = await this.repository.findAll({
        filters: [{ field: 'invoiceNumber', operator: 'like', value: prefix }],
        page: 1,
        pageSize: 10000,
      });
      for (const inv of result?.data || []) {
        const num = String((inv as any).invoiceNumber || '');
        // Prefix strip karke leading digits parse karo (suffix-safe)
        const rest = num.startsWith(prefix) ? num.slice(prefix.length) : num;
        const match = rest.match(/^(\d+)/);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    return { invoiceNumber: `${prefix}${nextSeq}${invoiceSuffix}`, financialYear };
  }

  /**
   * Override create to handle invoice + items in one call.
   *
   * Race-safety: "Save & Print" double-click / F5+F6 / stale number scenarios mein
   * do requests ek hi invoiceNumber le sakti hain. BaseMasterService ka unique check
   * read-then-write race hai — isliye yahan DB ke UNIQUE constraint failure par
   * fresh number generate karke retry karte hain (max 5 attempts).
   */
  async create(data: any, userId?: string) {
    // Salesman Mandatory — Settings Hub → Sales: salesmanMandatory on asta tar
    // invoice create karte waqt salesPerson zaroori (validation, DB column nahi).
    try {
      const r = await this.settingsRepo.findAll({ page: 1, pageSize: 1 } as any);
      const settings = r.data?.[0];
      if (settings?.salesmanMandatory && !String(data?.salesPerson || '').trim()) {
        throw new BadRequestException(
          'Salesman is mandatory — select a sales person before saving the invoice',
        );
      }
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      // settings load fail → enforcement skip (best-effort)
    }

    // 1) Separate items from invoice data
    // NOTE: invoiceData `let` hona zaroori hai — retry loop mein fresh invoiceNumber
    // ke saath reassign hota hai (UNIQUE conflict par). `items` kabhi reassign nahi
    // hota isliye const (prefer-const lint).
    const { items, ...invoiceDataRest } = data;
    let invoiceData = invoiceDataRest;

    // 2) Create the invoice record with retry on UNIQUE-invoice_number conflict
    let invoice: any = null;
    let attempts = 0;
    while (attempts < 5) {
      try {
        invoice = await super.create(invoiceData, userId);
        break;
      } catch (err: any) {
        const isDuplicateNumber = /UNIQUE|already exists|invoice_number|invoiceNumber/i.test(
          String(err?.message || ''),
        );
        if (!isDuplicateNumber || attempts >= 4) {
          throw err;
        }
        // Duplicate invoice number → next number generate karke dobara try karo
        attempts += 1;
        this.logger.warn(
          `Invoice number conflict on attempt ${attempts} — generating fresh number (${err?.message})`,
        );
        const next = await this.getNextNumber(
          invoiceData.invoiceDate,
          invoiceData.paymentTerms === 'credit' ? 'credit' : 'cash',
        );
        invoiceData = { ...invoiceData, invoiceNumber: next.invoiceNumber };
      }
    }

    // 3) Create invoice items if provided
    const createdItems: any[] = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const created = await this.invoiceItemsRepo.create({
          invoiceId: invoice.id,
          itemId: item.itemId,
          variantId: item.variantId || null,
          description: item.description || null,
          quantity: item.quantity || 1,
          unitId: item.unitId || null,
          rate: item.rate || 0,
          discountPercent: item.discountPercent || 0,
          discountAmount: item.discountAmount || 0,
          batchNo: item.batchNo || null,
          warehouse: item.warehouse || null,
          expiryDate: item.expiryDate || null,
          taxableValue: item.taxableValue || 0,
          gstRate: item.gstRate || 0,
          igst: item.igst || 0,
          cgst: item.cgst || 0,
          sgst: item.sgst || 0,
          cess: item.cess || 0,
          totalAmount: item.totalAmount || 0,
        });
        createdItems.push(created);
      }
    }

    // 4) Return invoice with items
    return {
      ...invoice,
      items: createdItems,
    };
  }
}
@Injectable()
export class SalesReturnsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.salesReturns, 'SalesReturn', audit, 'returnNumber');
  }
}
@Injectable()
export class CustomerPriceListService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.customerPriceList, 'CustomerPrice', audit);
  }
}
@Injectable()
export class SalesApprovalsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.salesApprovals, 'SalesApproval', audit);
  }
}
@Injectable()
export class SalesSettingsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.salesSettings, 'SalesSettings', audit);
  }

  /** Dukandar ka UPI ID — flat 'upiId' column mein save hota hai (single settings row) */
  async getUpiId(): Promise<{ upiId: string }> {
    const r = await this.repository.findAll({ page: 1, pageSize: 1 } as any);
    return { upiId: ((r as any)?.data?.[0]?.upiId as string) || '' };
  }

  /** UPI ID save/upsert karo (single settings row par) */
  async setUpiId(upiId: string, userId?: string): Promise<{ upiId: string }> {
    const clean = (upiId || '').trim();
    const r = await this.repository.findAll({ page: 1, pageSize: 1 } as any);
    const existing = (r as any)?.data?.[0];
    if (existing?.id) {
      await this.repository.update(existing.id, { upiId: clean } as any);
    } else {
      await this.repository.create({ upiId: clean } as any);
    }
    if (this.audit && userId) {
      await this.audit.log({
        userId,
        event: 'upi_settings_updated' as any,
        resource: 'sales_settings',
        action: 'update',
        details: { upiId: clean },
      });
    }
    return { upiId: clean };
  }
}
