import { Injectable, BadRequestException } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { BaseMasterService } from '../masters/base-master.service';

import { SalesApprovalEngineService } from './approval-engine.service';
import { DocumentNumberingService } from './numbering.service';

@Injectable()
export class SalesQuotationsService extends BaseMasterService {
  constructor(
    database: DatabaseService,
    audit: AuditService,
    private readonly db: DatabaseService,
    private readonly numbering: DocumentNumberingService,
    private readonly approvalEngine: SalesApprovalEngineService,
  ) {
    super(database.salesQuotations, 'SalesQuotation', audit, 'quoteNumber');
  }

  override async create(data: any, userId?: string) {
    // Race-safety: the maxSeq scan in the numbering service is read-then-write.
    // Two concurrent creates can still allocate the same number → UNIQUE
    // constraint error. Retry with a fresh number (invoice pattern).
    let attempts = 0;
    while (attempts < 5) {
      try {
        return await this.createOnce(data, userId);
      } catch (err: any) {
        const isDuplicate = /UNIQUE|already exists|quote_number|quoteNumber/i.test(
          String(err?.message || ''),
        );
        if (!isDuplicate || attempts >= 4) {
          throw err;
        }
        attempts += 1;
      }
    }
    throw new BadRequestException('Could not allocate a unique quotation number');
  }

  private async createOnce(data: any, userId?: string) {
    const enriched = { ...data };

    let settings: any = null;
    try {
      const r = await this.db.salesSettings.findAll({ page: 1, pageSize: 1 } as any);
      settings = r.data?.[0] || null;
    } catch {
      /* best-effort: settings unavailable → defaults */
    }

    // Quotation Expiry — Settings Hub → Sales: quotationExpiryDays set asta tar
    // validTill na dile quoteDate + expiry days ne auto-fill karo.
    if (!enriched.validTill && settings?.quotationExpiryDays) {
      const expiryDays = Number(settings.quotationExpiryDays);
      if (expiryDays > 0 && enriched.quoteDate) {
        const base = new Date(enriched.quoteDate);
        if (!isNaN(base.getTime())) {
          base.setDate(base.getDate() + expiryDays);
          enriched.validTill = base.toISOString().split('T')[0];
        }
      }
    }

    // ── Credit limit check ───────────────────────────────────────
    // Settings Hub → Sales: enforceCreditLimit ON asel tar customer cha
    // credit profile check karo — blocked ho tar block, outstanding limit
    // peksha jaasta asel tar quotation create kara dela nahi.
    if (settings?.enforceCreditLimit && enriched.customerId) {
      try {
        const profileRes = await this.db.creditProfiles.findAll({
          page: 1,
          pageSize: 1,
          filters: [{ field: 'customerId', operator: 'eq', value: enriched.customerId }],
        } as any);
        const profile = profileRes.data?.[0];
        if (profile) {
          if (profile.isBlocked) {
            throw new BadRequestException('Customer is blocked — quotation cannot be created');
          }
          const limit = Number(profile.creditLimit) || 0;
          const outstanding = Number(profile.outstanding) || 0;
          if (limit > 0 && outstanding > limit) {
            throw new BadRequestException(
              `Credit limit exceeded — outstanding ₹${outstanding.toLocaleString('en-IN')} exceeds limit ₹${limit.toLocaleString('en-IN')}`,
            );
          }
        }
      } catch (e) {
        if (e instanceof BadRequestException) {
          throw e;
        }
        /* best-effort: profile lookup failed → skip check */
      }
    }

    // ── Auto / Manual quotation numbering ─────────────────────────
    // Settings Hub → Sales: autoQuoteNumber on asel tar number aapopap
    // generate hota (prefix [+ FY] [+ branch] + sequence), off asel tar
    // user-la manually quoteNumber bharava lagto.
    const auto = settings ? settings.autoQuoteNumber !== false : true;
    if (auto) {
      let fyId: string | null = enriched.financialYearId || null;
      if (!fyId) {
        try {
          const fy = await this.db.financialYears.findAll({
            filters: [{ field: 'isActive', operator: 'eq', value: true }],
            page: 1,
            pageSize: 1,
          } as any);
          fyId = (fy as any)?.data?.[0]?.id || null;
        } catch {
          /* non-fatal */
        }
      }
      enriched.quoteNumber = await this.numbering.nextQuoteNumber(settings || {}, {
        financialYearId: fyId,
        branchId: enriched.branchId || null,
      });
    } else if (!String(enriched.quoteNumber || '').trim()) {
      throw new BadRequestException('Manual numbering is enabled — a quotation number is required');
    }

    if (!enriched.revision) {
      enriched.revision = 1;
    }

    const { items, ...rest } = enriched;
    const record = await super.create(rest, userId);

    // Persist line items (Product Selection → items array) alongside the quote.
    const createdItems: any[] = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const created = await this.db.quotationItems.create({
          quotationId: (record as any).id,
          itemId: item.itemId,
          variantId: item.variantId || null,
          description: item.description || null,
          quantity: item.quantity || 1,
          unitId: item.unitId || null,
          rate: item.rate || 0,
          discountPercent: item.discountPercent || 0,
          discountAmount: item.discountAmount || 0,
          discountType: item.discountType || null,
          taxableValue: item.taxableValue || 0,
          gstRate: item.gstRate || 0,
          igst: item.igst || 0,
          cgst: item.cgst || 0,
          sgst: item.sgst || 0,
          cess: item.cess || 0,
          totalAmount: item.totalAmount || 0,
          batchNo: item.batchNo || null,
          hsnCode: item.hsnCode || null,
          barcode: item.barcode || null,
          freeQty: item.freeQty || 0,
          remarks: item.remarks || null,
          warehouse: item.warehouse || null,
          expiryDate: item.expiryDate || null,
        });
        createdItems.push(created);
      }
    }

    return { ...record, items: createdItems };
  }

  override async update(id: string, data: any, userId?: string) {
    // Final quotations are locked server-side — only a new revision can change them.
    const existing = (await this.findById(id)) as any;
    if (existing?.status === 'final') {
      throw new BadRequestException(
        'This quotation is final and locked — create a revision instead',
      );
    }

    const { items, ...rest } = data;
    const record = await super.update(id, rest, userId);

    // Items provided → replace the whole line-item set (delete old + insert new).
    if (Array.isArray(items)) {
      try {
        const old = await this.db.quotationItems.findAll({
          filters: [{ field: 'quotationId', operator: 'eq', value: id }],
          page: 1,
          pageSize: 500,
        } as any);
        for (const o of (old as any)?.data || []) {
          await this.db.quotationItems.softDelete(o.id);
        }
      } catch {
        /* non-fatal: keep old items if cleanup fails */
      }

      const newItems: any[] = [];
      for (const item of items) {
        const created = await this.db.quotationItems.create({
          quotationId: id,
          itemId: item.itemId,
          variantId: item.variantId || null,
          description: item.description || null,
          quantity: item.quantity || 1,
          unitId: item.unitId || null,
          rate: item.rate || 0,
          discountPercent: item.discountPercent || 0,
          discountAmount: item.discountAmount || 0,
          discountType: item.discountType || null,
          taxableValue: item.taxableValue || 0,
          gstRate: item.gstRate || 0,
          igst: item.igst || 0,
          cgst: item.cgst || 0,
          sgst: item.sgst || 0,
          cess: item.cess || 0,
          totalAmount: item.totalAmount || 0,
          batchNo: item.batchNo || null,
          hsnCode: item.hsnCode || null,
          barcode: item.barcode || null,
          freeQty: item.freeQty || 0,
          remarks: item.remarks || null,
          warehouse: item.warehouse || null,
          expiryDate: item.expiryDate || null,
        });
        newItems.push(created);
      }
      return { ...record, items: newItems };
    }

    return record;
  }

  /** Attach line items when a single quotation is fetched. */
  override async findById(id: string) {
    const record = await super.findById(id);
    try {
      const items = await this.db.quotationItems.findAll({
        filters: [{ field: 'quotationId', operator: 'eq', value: id }],
        page: 1,
        pageSize: 500,
      } as any);
      return { ...record, items: (items as any)?.data || [] };
    } catch {
      return { ...record, items: [] };
    }
  }

  /**
   * Create a new revision (Rev-N) of an existing quotation. The revision keeps
   * the same base number (e.g. SQ-26-27-0001-Rev-2) and links back to the root
   * quotation via parentQuoteId so the full revision history is traceable.
   */
  async createRevision(id: string, userId?: string) {
    const parent = (await this.findById(id)) as any;
    if (parent?.status === 'final') {
      throw new BadRequestException(
        'A final quotation cannot be revised — create a new quotation instead',
      );
    }
    const base = String(parent?.quoteNumber || '').replace(/-Rev-\d+$/i, '');
    const nextRev = (Number(parent?.revision) || 1) + 1;

    const copy: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(parent || {})) {
      if (
        [
          'id',
          'createdAt',
          'updatedAt',
          'deletedAt',
          'isDeleted',
          'convertedToOrder',
          'orderId',
          'approvedBy',
          'approvedAt',
          'rejectionReason',
        ].includes(k)
      ) {
        continue;
      }
      copy[k] = v;
    }
    copy.quoteNumber = `${base}-Rev-${nextRev}`;
    copy.revision = nextRev;
    copy.parentQuoteId = parent?.parentQuoteId || parent?.id;
    copy.status = 'draft'; // revision hamesha draft mhanun suru hote

    const record = await super.create(copy, userId);

    // Copy line items from the parent so the revision starts with the same products.
    const items: any[] = [];
    try {
      const parentItems = await this.db.quotationItems.findAll({
        filters: [{ field: 'quotationId', operator: 'eq', value: id }],
        page: 1,
        pageSize: 500,
      } as any);
      for (const item of (parentItems as any)?.data || []) {
        const {
          id: _id,
          createdAt: _createdAt,
          updatedAt: _updatedAt,
          deletedAt: _deletedAt,
          isDeleted: _isDeleted,
          quotationId: _quotationId,
          ...rest
        } = item;
        const created = await this.db.quotationItems.create({
          ...rest,
          quotationId: (record as any).id,
        });
        items.push(created);
      }
    } catch {
      /* non-fatal: revision without copied items */
    }

    if (this.audit && userId) {
      await this.audit.log({
        userId,
        event: 'sales_quotation_revision_created' as any,
        resource: 'sales_quotation',
        action: 'create',
        entityId: (record as any).id,
        module: 'sales',
        actionType: 'create',
        oldValues: null,
        newValues: {
          parentQuoteId: copy.parentQuoteId,
          quoteNumber: copy.quoteNumber,
          revision: nextRev,
        },
        details: { parentId: id, revision: nextRev },
      });
    }
    return { ...record, items };
  }

  /** Mark a quotation as Final (locked state — stops further edits/revisions). */
  async finalize(id: string, userId?: string) {
    const quote = (await this.findById(id)) as any;
    const record = await this.repository.update(id, { status: 'final' });
    if (this.audit && userId) {
      await this.audit.log({
        userId,
        event: 'sales_quotation_finalized' as any,
        resource: 'sales_quotation',
        action: 'update',
        entityId: id,
        module: 'sales',
        actionType: 'update',
        oldValues: { status: quote?.status },
        newValues: { status: 'final' },
        details: { quoteNumber: quote?.quoteNumber },
      });
    }
    return record;
  }

  /**
   * Submit a quotation into the approval workflow.
   * Chain: Sales Executive (level 1) → Sales Manager (level 2) → Owner (level 3)
   * → Approved → Send Customer.
   */
  async submitForApproval(id: string, userId: string, userName?: string) {
    const quote = (await this.findById(id)) as any;
    if (quote?.status === 'final') {
      throw new BadRequestException('A final quotation cannot be submitted for approval');
    }
    if (['pending', 'under_review'].includes(quote?.status)) {
      throw new BadRequestException(`Quotation is already in approval workflow (${quote.status})`);
    }
    if (quote?.status === 'approved' || quote?.status === 'sent') {
      throw new BadRequestException(`Quotation is already ${quote.status}`);
    }

    const customerName = await this.resolveCustomerName(quote?.customerId);
    const approval = await this.approvalEngine.submitForApproval({
      documentType: 'sales_quotation',
      documentId: id,
      documentNumber: quote?.quoteNumber || '',
      customerId: quote?.customerId || '',
      customerName,
      amount: Number(quote?.grandTotal) || 0,
      discountAmount: Number(quote?.discountAmount) || 0,
      discountPercent: Number(quote?.discountPercent) || 0,
      gstAmount: Number(quote?.taxAmount) || 0,
      createdBy: userId,
      createdByName: userName || '',
    });

    await this.repository.update(id, {
      status: 'pending',
      updatedAt: new Date().toISOString(),
    });
    return { quoteId: id, approval };
  }

  /** Resolve a display name for the approval record (best-effort). */
  private async resolveCustomerName(customerId?: string): Promise<string> {
    if (!customerId) {
      return '';
    }
    try {
      const c = await this.db.ledgerMaster.findById(customerId);
      return c?.name || c?.code || customerId;
    } catch {
      return customerId;
    }
  }

  /**
   * Final step of the chain: mark the (approved) quotation as sent to the
   * customer. Records sentAt + channel (email / whatsapp / sms / manual).
   */
  async sendToCustomer(id: string, userId?: string, via = 'manual') {
    const quote = (await this.findById(id)) as any;
    if (quote?.status === 'final') {
      throw new BadRequestException('A final quotation cannot be marked as sent');
    }
    if (quote?.status === 'sent') {
      throw new BadRequestException('Quotation is already marked as sent');
    }
    // Workflow chain: ... → Approved → Send Customer. Sirf fully-approved quotes
    // bheje ja sakte hain — draft/pending/under_review/rejected/final sab block.
    if (quote?.status !== 'approved') {
      throw new BadRequestException(
        `Quotation status "${quote?.status}" cannot be sent to customer — it must be fully approved first`,
      );
    }
    const record = await this.repository.update(id, {
      status: 'sent',
      sentAt: new Date().toISOString(),
      sentVia: via,
      updatedAt: new Date().toISOString(),
    });
    if (this.audit && userId) {
      await this.audit.log({
        userId,
        event: 'sales_quotation_sent' as any,
        resource: 'sales_quotation',
        action: 'update',
        entityId: id,
        module: 'sales',
        actionType: 'update',
        oldValues: { status: quote?.status },
        newValues: { status: 'sent', sentVia: via },
        details: { quoteNumber: quote?.quoteNumber },
      });
    }
    return record;
  }
}
@Injectable()
export class SalesOrdersService extends BaseMasterService {
  private readonly db: DatabaseService;
  private readonly orderItemsRepo: any;

  constructor(
    database: DatabaseService,
    audit: AuditService,
    db: DatabaseService,
    private readonly numbering: DocumentNumberingService,
  ) {
    super(database.salesOrders, 'SalesOrder', audit, 'orderNumber');
    this.db = db;
    this.orderItemsRepo = database.salesOrderItems;
  }

  /**
   * Next auto order number (SO-0001) — max-seq scan WITHOUT persisting the
   * counter (preview-safe). Create ke time numbering service counter advance
   * karta hai; preview sirf dikhata hai ki agla number kya hoga.
   */
  async getNextNumber(_dateStr?: string): Promise<{ orderNumber: string }> {
    let prefix = 'SO-';
    try {
      const r = await this.db.salesSettings.findAll({ page: 1, pageSize: 1 } as any);
      const settings = r.data?.[0];
      if (settings?.orderPrefix) {
        prefix = String(settings.orderPrefix);
      }
    } catch {
      /* settings unavailable → default prefix */
    }
    let maxSeq = 0;
    const maxSeqFn = (this.repository as any).findMaxSequenceForPrefix;
    if (typeof maxSeqFn === 'function') {
      maxSeq = await maxSeqFn.call(this.repository, 'orderNumber', prefix);
    } else {
      const result = await this.repository.findAll({
        filters: [{ field: 'orderNumber', operator: 'like', value: `${prefix}%` }],
        page: 1,
        pageSize: 10000,
      });
      for (const ord of result?.data || []) {
        const num = String((ord as any).orderNumber || '');
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
    // Pad 4 digits — numbering service (nextOrderNumber) bhi 4-digit deta hai
    // (SO-0001). 3-digit preview (SO-001) se mismatch hota tha — ab consistent.
    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    return { orderNumber: `${prefix}${nextSeq}` };
  }

  override async create(data: any, userId?: string) {
    // Race-safety: max-seq scan read-then-write hai. Do concurrent creates same
    // number le sakti hain → UNIQUE constraint error. Fresh number ke saath retry.
    let attempts = 0;
    while (attempts < 5) {
      try {
        return await this.createOnce(data, userId);
      } catch (err: any) {
        const isDuplicate = /UNIQUE|already exists|order_number|orderNumber/i.test(
          String(err?.message || ''),
        );
        if (!isDuplicate || attempts >= 4) {
          throw err;
        }
        attempts += 1;
      }
    }
    throw new BadRequestException('Could not allocate a unique order number');
  }

  private async createOnce(data: any, userId?: string) {
    const enriched = { ...data };

    // ── Auto / Manual order numbering ───────────────────
    // Settings Hub → Sales: autoOrderNumber ON asel tar number aapopap generate
    // hota hai (SO-0001), OFF asel tar user-la manual orderNumber bharava lagto.
    let settings: any = null;
    try {
      const r = await this.db.salesSettings.findAll({ page: 1, pageSize: 1 } as any);
      settings = r.data?.[0] || null;
    } catch {
      /* best-effort */
    }
    const auto = settings ? settings.autoOrderNumber !== false : true;
    if (auto) {
      enriched.orderNumber = await this.numbering.nextOrderNumber(settings || {}, {});
    } else if (!String(enriched.orderNumber || '').trim()) {
      throw new BadRequestException('Manual numbering is enabled — an order number is required');
    }
    if (!enriched.status) {
      enriched.status = 'draft';
    }

    const { items, ...rest } = enriched;
    const record = await super.create(rest, userId);

    // Persist line items alongside the order.
    const createdItems: any[] = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const created = await this.orderItemsRepo.create({
          orderId: (record as any).id,
          itemId: item.itemId,
          variantId: item.variantId || null,
          description: item.description || null,
          quantity: item.quantity || 1,
          deliveredQuantity: item.deliveredQuantity || 0,
          reservedQuantity: item.reservedQuantity || 0,
          unitId: item.unitId || null,
          rate: item.rate || 0,
          discountPercent: item.discountPercent || 0,
          discountAmount: item.discountAmount || 0,
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

    return { ...record, items: createdItems };
  }

  /** Attach line items when a single order is fetched. */
  override async findById(id: string) {
    const record = await super.findById(id);
    try {
      const items = await this.orderItemsRepo.findAll({
        filters: [{ field: 'orderId', operator: 'eq', value: id }],
        page: 1,
        pageSize: 500,
      } as any);
      return { ...record, items: (items as any)?.data || [] };
    } catch {
      return record;
    }
  }

  /**
   * Update order — items provided → replace the whole line-item set.
   *
   * GUARD: delivered/dispatched orders lock hoti hain item changes ke liye —
   * challan items purane orderItemId se linked hote hain; items replace karne par
   * delivered-quantity tracking (syncOrderDispatchState) toot jata hai. Header
   * changes (notes/status/address) allowed rehte hain.
   */
  override async update(id: string, data: any, userId?: string) {
    const existing = (await super.findById(id)) as any;
    const { items, ...rest } = data;

    if (Array.isArray(items) && items.length >= 0) {
      const hasChallans = await this.db.deliveryChallans
        .findAll({
          filters: [{ field: 'orderId', operator: 'eq', value: id }],
          page: 1,
          pageSize: 10,
        } as any)
        .catch(() => ({ data: [] }));
      const challenged =
        (hasChallans as any)?.data?.length > 0 ||
        ['dispatched', 'partial', 'completed'].includes(String(existing?.status));
      if (challenged) {
        throw new BadRequestException(
          'This order already has deliveries/challans — line items cannot be edited. Header changes are still allowed, or create a new order.',
        );
      }
    }

    const record = await super.update(id, rest, userId);

    if (Array.isArray(items)) {
      try {
        const old = await this.orderItemsRepo.findAll({
          filters: [{ field: 'orderId', operator: 'eq', value: id }],
          page: 1,
          pageSize: 500,
        } as any);
        for (const o of (old as any)?.data || []) {
          await this.orderItemsRepo.softDelete(o.id);
        }
      } catch {
        /* non-fatal: keep old items if cleanup fails */
      }

      const newItems: any[] = [];
      for (const item of items) {
        const created = await this.orderItemsRepo.create({
          orderId: id,
          itemId: item.itemId,
          variantId: item.variantId || null,
          description: item.description || null,
          quantity: item.quantity || 1,
          deliveredQuantity: item.deliveredQuantity || 0,
          reservedQuantity: item.reservedQuantity || 0,
          unitId: item.unitId || null,
          rate: item.rate || 0,
          discountPercent: item.discountPercent || 0,
          discountAmount: item.discountAmount || 0,
          taxableValue: item.taxableValue || 0,
          gstRate: item.gstRate || 0,
          igst: item.igst || 0,
          cgst: item.cgst || 0,
          sgst: item.sgst || 0,
          cess: item.cess || 0,
          totalAmount: item.totalAmount || 0,
        });
        newItems.push(created);
      }
      return { ...record, items: newItems };
    }

    return record;
  }
}
@Injectable()
export class DeliveryChallansService extends BaseMasterService {
  private readonly db: DatabaseService;
  private readonly challanItemsRepo: any;

  constructor(
    database: DatabaseService,
    audit: AuditService,
    db: DatabaseService,
    private readonly numbering: DocumentNumberingService,
  ) {
    super(database.deliveryChallans, 'DeliveryChallan', audit, 'challanNumber');
    this.db = db;
    this.challanItemsRepo = database.challanItems;
  }

  /**
   * Next auto delivery-challan number (DC-0001) — max-seq scan WITHOUT persisting
   * the counter (preview-safe). Create ke time numbering service counter advance
   * karta hai.
   */
  async getNextNumber(_dateStr?: string): Promise<{ challanNumber: string }> {
    let prefix = 'DC-';
    try {
      const r = await this.db.salesSettings.findAll({ page: 1, pageSize: 1 } as any);
      const settings = r.data?.[0];
      if (settings?.challanPrefix) {
        prefix = String(settings.challanPrefix);
      }
    } catch {
      /* settings unavailable → default prefix */
    }
    let maxSeq = 0;
    const maxSeqFn = (this.repository as any).findMaxSequenceForPrefix;
    if (typeof maxSeqFn === 'function') {
      maxSeq = await maxSeqFn.call(this.repository, 'challanNumber', prefix);
    } else {
      const result = await this.repository.findAll({
        filters: [{ field: 'challanNumber', operator: 'like', value: `${prefix}%` }],
        page: 1,
        pageSize: 10000,
      });
      for (const dc of result?.data || []) {
        const num = String((dc as any).challanNumber || '');
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
    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    return { challanNumber: `${prefix}${nextSeq}` };
  }

  override async create(data: any, userId?: string) {
    let attempts = 0;
    while (attempts < 5) {
      try {
        return await this.createOnce(data, userId);
      } catch (err: any) {
        const isDuplicate = /UNIQUE|already exists|challan_number|challanNumber/i.test(
          String(err?.message || ''),
        );
        if (!isDuplicate || attempts >= 4) {
          throw err;
        }
        attempts += 1;
      }
    }
    throw new BadRequestException('Could not allocate a unique challan number');
  }

  private async createOnce(data: any, userId?: string) {
    const enriched = { ...data };

    // ── Auto / Manual DC numbering ───────────────────
    let settings: any = null;
    try {
      const r = await this.db.salesSettings.findAll({ page: 1, pageSize: 1 } as any);
      settings = r.data?.[0] || null;
    } catch {
      /* best-effort */
    }
    const auto = settings ? settings.autoChallanNumber !== false : true;
    if (auto || !String(enriched.challanNumber || '').trim()) {
      enriched.challanNumber = await this.numbering.nextChallanNumber(settings || {});
    }

    // ── Multiple DC per order (Partial Delivery Phase 2) ──
    // Rule: sirf ek FULL-dispatch challan per order ban sakta hai; partial challans
    // unlimited hain. Full dispatch ka matlab order ke saare items fully deliver.
    if (enriched.orderId) {
      const existing = await this.db.deliveryChallans.findAll({
        filters: [
          { field: 'orderId', operator: 'eq', value: enriched.orderId },
          { field: 'dispatchType', operator: 'eq', value: 'full' },
        ],
        page: 1,
        pageSize: 10,
      } as any);
      if ((existing as any)?.data?.length > 0) {
        const first = (existing as any).data[0];
        throw new BadRequestException(
          `Order already has a full-dispatch challan (${first?.challanNumber}) — create a partial dispatch instead`,
        );
      }
    }

    // ── Partial delivery validation ──────────────────
    // Har DC item ki quantity order item ke remaining quantity se zyada nahi ho
    // sakti (already-delivered + is challan). Item ke bina orderItemId ho tab bhi
    // itemId se match karo.
    const { items, ...rest } = enriched;
    const orderItems: any[] = [];
    if (enriched.orderId) {
      try {
        const oiRes = await this.db.salesOrderItems.findAll({
          filters: [{ field: 'orderId', operator: 'eq', value: enriched.orderId }],
          page: 1,
          pageSize: 500,
        } as any);
        orderItems.push(...((oiRes as any)?.data || []));
      } catch {
        /* order items unavailable → skip validation */
      }
    }
    const deliveredSoFar = new Map<string, number>();
    if (enriched.orderId && orderItems.length > 0) {
      try {
        const chRes = await this.db.challanItems.findAll({
          filters: [{ field: 'challanId', operator: 'ne', value: '__none__' }],
          page: 1,
          pageSize: 10000,
        } as any);
        const challans = await this.db.deliveryChallans.findAll({
          filters: [{ field: 'orderId', operator: 'eq', value: enriched.orderId }],
          page: 1,
          pageSize: 100,
        } as any);
        const challanIds = new Set((challans as any)?.data?.map((c: any) => c.id) || []);
        for (const ci of (chRes as any)?.data || []) {
          if (challanIds.has(ci.challanId) && ci.orderItemId) {
            deliveredSoFar.set(
              ci.orderItemId,
              (deliveredSoFar.get(ci.orderItemId) || 0) + Number(ci.quantity || 0),
            );
          }
        }
      } catch {
        /* best-effort: skip already-delivered computation */
      }
    }

    let totalQty = 0;
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const qty = Number(item.quantity) || 0;
        totalQty += qty;
        if (!enriched.orderId) {
          continue;
        }
        const orderItem =
          orderItems.find((oi) => oi.id === item.orderItemId) ||
          orderItems.find((oi) => oi.itemId === item.itemId);
        if (orderItem) {
          const orderQty = Number(orderItem.quantity) || 0;
          const alreadyDelivered = deliveredSoFar.get(orderItem.id) || 0;
          if (alreadyDelivered + qty > orderQty + 0.0001) {
            throw new BadRequestException(
              `Partial delivery exceeds order quantity for ${item.description || orderItem.description || item.itemId} — remaining ${Math.max(0, orderQty - alreadyDelivered)}, requested ${qty}`,
            );
          }
        }
      }
    }

    if (!rest.status) {
      rest.status = 'pending';
    }
    const record = await super.create(
      { ...rest, totalQty: Number(rest.totalQty ?? totalQty) },
      userId,
    );

    // Persist line items alongside the challan.
    const createdItems: any[] = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const created = await this.challanItemsRepo.create({
          challanId: (record as any).id,
          orderItemId: item.orderItemId || null,
          itemId: item.itemId,
          variantId: item.variantId || null,
          description: item.description || null,
          unitId: item.unitId || null,
          quantity: item.quantity || 0,
          deliveredQuantity: item.deliveredQuantity || item.quantity || 0,
          rate: item.rate || 0,
          batchNo: item.batchNo || null,
          serialNumbers: item.serialNumbers || null,
          mfgDate: item.mfgDate || null,
          expDate: item.expDate || null,
          warehouseId: item.warehouseId || null,
          notes: item.notes || null,
        });
        createdItems.push(created);
      }
    }

    // ── Dispatch status sync (order) ────────────────
    // DC create hote hi order ko sync karo: sab items fully delivered → dispatched,
    // otherwise → partial.
    await this.syncOrderDispatchState(enriched.orderId);

    return { ...record, items: createdItems };
  }

  /** Attach line items when a single challan is fetched. */
  override async findById(id: string) {
    const record = await super.findById(id);
    try {
      const items = await this.challanItemsRepo.findAll({
        filters: [{ field: 'challanId', operator: 'eq', value: id }],
        page: 1,
        pageSize: 500,
      } as any);
      return { ...record, items: (items as any)?.data || [] };
    } catch {
      return { ...record, items: [] };
    }
  }

  /** Update challan — items provided → replace the whole line-item set. */
  override async update(id: string, data: any, userId?: string) {
    const existing = (await super.findById(id)) as any;
    if (existing?.status === 'invoiced') {
      throw new BadRequestException(
        `Challan ${existing.challanNumber} is already invoiced — it is locked`,
      );
    }

    const { items, ...rest } = data;
    const record = await super.update(id, rest, userId);

    if (Array.isArray(items)) {
      try {
        const old = await this.challanItemsRepo.findAll({
          filters: [{ field: 'challanId', operator: 'eq', value: id }],
          page: 1,
          pageSize: 500,
        } as any);
        for (const o of (old as any)?.data || []) {
          await this.challanItemsRepo.softDelete(o.id);
        }
      } catch {
        /* non-fatal: keep old items if cleanup fails */
      }

      const newItems: any[] = [];
      for (const item of items) {
        const created = await this.challanItemsRepo.create({
          challanId: id,
          orderItemId: item.orderItemId || null,
          itemId: item.itemId,
          variantId: item.variantId || null,
          description: item.description || null,
          unitId: item.unitId || null,
          quantity: item.quantity || 0,
          deliveredQuantity: item.deliveredQuantity || item.quantity || 0,
          rate: item.rate || 0,
          batchNo: item.batchNo || null,
          serialNumbers: item.serialNumbers || null,
          mfgDate: item.mfgDate || null,
          expDate: item.expDate || null,
          warehouseId: item.warehouseId || null,
          notes: item.notes || null,
        });
        newItems.push(created);
      }
      return { ...record, items: newItems };
    }

    return record;
  }

  /**
   * Order dispatch state sync: after challan create/update, re-read the order
   * items' delivered quantities (sum of all challan item quantities) and set the
   * order status — all delivered → 'dispatched', partially → 'partial'.
   */
  private async syncOrderDispatchState(orderId?: string | null): Promise<void> {
    if (!orderId) {
      return;
    }
    try {
      const orderItems = await this.db.salesOrderItems.findAll({
        filters: [{ field: 'orderId', operator: 'eq', value: orderId }],
        page: 1,
        pageSize: 500,
      } as any);
      const oiList = (orderItems as any)?.data || [];
      if (oiList.length === 0) {
        return;
      }
      const challans = await this.db.deliveryChallans.findAll({
        filters: [{ field: 'orderId', operator: 'eq', value: orderId }],
        page: 1,
        pageSize: 100,
      } as any);
      const challanIds = new Set((challans as any)?.data?.map((c: any) => c.id) || []);
      if (challanIds.size === 0) {
        return;
      }
      const allItems = await this.db.challanItems.findAll({
        filters: [{ field: 'challanId', operator: 'ne', value: '__none__' }],
        page: 1,
        pageSize: 10000,
      } as any);
      const deliveredByOrderItem = new Map<string, number>();
      for (const ci of (allItems as any)?.data || []) {
        if (challanIds.has(ci.challanId) && ci.orderItemId) {
          deliveredByOrderItem.set(
            ci.orderItemId,
            (deliveredByOrderItem.get(ci.orderItemId) || 0) + Number(ci.quantity || 0),
          );
        }
      }

      let allDelivered = true;
      let anyDelivered = false;
      for (const oi of oiList) {
        const delivered = deliveredByOrderItem.get(oi.id) || 0;
        if (delivered >= (Number(oi.quantity) || 0) - 0.0001) {
          anyDelivered = true;
        } else if (delivered > 0) {
          anyDelivered = true;
          allDelivered = false;
        } else {
          allDelivered = false;
        }
      }
      if (allDelivered) {
        await this.db.salesOrders.update(orderId, {
          status: 'dispatched',
          updatedAt: new Date().toISOString(),
        });
      } else if (anyDelivered) {
        await this.db.salesOrders.update(orderId, {
          status: 'partial',
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      /* non-fatal: order sync is best-effort */
    }
  }
}
@Injectable()
export class SalesInvoicesService extends BaseMasterService {
  private readonly invoiceItemsRepo: any;
  private readonly settingsRepo: any;
  private readonly db: DatabaseService;

  constructor(database: DatabaseService, audit: AuditService) {
    super(database.salesInvoices, 'SalesInvoice', audit, 'invoiceNumber');
    this.invoiceItemsRepo = database.invoiceItems;
    this.settingsRepo = database.salesSettings;
    this.db = database;
  }

  /** Attach line items when a single invoice is fetched (PDF/share/print flow). */
  override async findById(id: string) {
    const record = await super.findById(id);
    try {
      const items = await this.invoiceItemsRepo.findAll({
        filters: [{ field: 'invoiceId', operator: 'eq', value: id }],
        page: 1,
        pageSize: 1000,
      } as any);
      return { ...record, items: (items as any)?.data || [] };
    } catch {
      return { ...record, items: [] };
    }
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

    // Product Master business rules — blocked/inactive products cannot be sold
    const itemRows = Array.isArray(data?.items) ? data.items : [];
    if (itemRows.length > 0) {
      const itemIds = [...new Set(itemRows.map((i: any) => i?.itemId).filter(Boolean))] as string[];
      for (const pid of itemIds) {
        try {
          const prod = (await this.db.items.findById(pid)) as any;
          if (prod && String(prod.status) === 'blocked') {
            throw new BadRequestException(`Product "${prod.name}" is blocked — cannot be sold`);
          }
          if (prod && String(prod.status) === 'discontinued') {
            throw new BadRequestException(
              `Product "${prod.name}" is discontinued — cannot be sold`,
            );
          }
          if (prod && String(prod.status) === 'inactive') {
            throw new BadRequestException(
              `Product "${prod.name}" is inactive — cannot be used in new transactions`,
            );
          }
        } catch (e) {
          if (e instanceof BadRequestException) {
            throw e;
          }
          /* product master missing → legacy item, allow */
        }
      }
    }

    // 1) Separate items from invoice data
    // NOTE: invoiceData `let` hona zaroori hai — retry loop mein fresh invoiceNumber
    // ke saath reassign hota hai (UNIQUE conflict par). `items` kabhi reassign nahi
    // hota isliye const (prefer-const lint).
    const { items, ...invoiceDataRest } = data;
    let invoiceData = invoiceDataRest;

    // Ensure balanceAmount defaults to grandTotal for new invoices.
    // Without this, directly-created invoices get balanceAmount=0 which
    // prevents payment allocation (the payment goes to advance instead).
    if (invoiceData.balanceAmount === undefined || invoiceData.balanceAmount === null) {
      invoiceData.balanceAmount = Number(invoiceData.grandTotal) || 0;
    }
    if (invoiceData.paymentStatus === undefined && Number(invoiceData.grandTotal) > 0) {
      invoiceData.paymentStatus = 'unpaid';
    }

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
