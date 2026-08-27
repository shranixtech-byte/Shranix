import { Injectable, BadRequestException } from '@nestjs/common';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

import { DocumentNumberingService } from './numbering.service';
import { SalesInvoicesService } from './services';

export type ConversionStep = 'order' | 'challan' | 'invoice';

export interface ConvertResult {
  sourceId: string;
  sourceNumber: string;
  completed: ConversionStep[];
  order?: any;
  challan?: any;
  invoice?: any;
  error?: { step: ConversionStep; message: string };
  message: string;
}

/**
 * One-click document conversion engine:
 *   Quotation → Sales Order → Delivery Challan → Invoice
 *
 * Every step copies the header (customer, totals, terms) and the line items
 * (preserving the linking columns orderItemId / challanItemId so the audit trail
 * Quotation → Order → Challan → Invoice stays fully traceable).
 */
@Injectable()
export class DocumentConversionService {
  constructor(
    private readonly database: DatabaseService,
    private readonly numbering: DocumentNumberingService,
    private readonly invoicesService: SalesInvoicesService,
    private readonly audit: AuditService,
  ) {}

  /** Run the full chain in one call. `steps` defaults to all three. */
  async convert(
    quotationId: string,
    userId?: string,
    steps: ConversionStep[] = ['order', 'challan', 'invoice'],
  ) {
    const quote = await this.database.salesQuotations.findById(quotationId);
    if (!quote) {
      throw new BadRequestException('Quotation not found');
    }

    const wanted = Array.from(
      new Set(steps.filter((s) => ['order', 'challan', 'invoice'].includes(s))),
    );
    if (wanted.length === 0) {
      throw new BadRequestException('No conversion steps requested');
    }

    const result: ConvertResult = {
      sourceId: (quote as any).id,
      sourceNumber: (quote as any).quoteNumber,
      completed: [],
      message: '',
    };

    try {
      if (wanted.includes('order')) {
        const r = await this.convertQuotationToOrder(quotationId, userId);
        result.order = r.order;
        result.completed.push('order');
      }
    } catch (e: any) {
      result.error = { step: 'order', message: String(e?.message || e) };
      result.message = `Conversion stopped — ${result.error.message}`;
      return result;
    }

    const orderId = result.order?.id;
    if (wanted.includes('challan') && !orderId) {
      result.error = {
        step: 'challan',
        message: 'No sales order available — enable the Order step first',
      };
      result.message = `Quotation converted to order, but challan needs the Order step — ${result.error.message}`;
      return result;
    }
    try {
      if (wanted.includes('challan')) {
        const r = await this.convertOrderToChallan(orderId as string, userId);
        result.challan = r.challan;
        result.completed.push('challan');
      }
    } catch (e: any) {
      result.error = { step: 'challan', message: String(e?.message || e) };
      result.message = `Order created, but challan conversion failed — ${result.error.message}`;
      return result;
    }

    const challanId = result.challan?.id;
    if (wanted.includes('invoice') && !challanId) {
      result.error = {
        step: 'invoice',
        message: 'No delivery challan available — enable the Challan step first',
      };
      result.message = `Order + challan created, but invoice needs the Challan step — ${result.error.message}`;
      return result;
    }
    try {
      if (wanted.includes('invoice')) {
        const r = await this.convertChallanToInvoice(challanId as string, userId);
        result.invoice = r.invoice;
        result.completed.push('invoice');
      }
    } catch (e: any) {
      result.error = { step: 'invoice', message: String(e?.message || e) };
      result.message = `Challan created, but invoice conversion failed — ${result.error.message}`;
      return result;
    }

    result.message =
      result.completed.length === 3
        ? `Converted ${(quote as any).quoteNumber} → Order → Challan → Invoice in one click`
        : result.completed.length === 2
          ? `Converted ${(quote as any).quoteNumber} to ${result.completed.join(' + ')}`
          : `Converted ${(quote as any).quoteNumber} to ${result.completed[0] || '—'}`;
    return result;
  }

  // ── Step 1: Quotation → Sales Order ─────────────────────────────
  async convertQuotationToOrder(quotationId: string, userId?: string) {
    const quote: any = await this.database.salesQuotations.findById(quotationId);
    if (!quote) {
      throw new BadRequestException('Quotation not found');
    }
    if (quote.convertedToOrder) {
      throw new BadRequestException(
        `Quotation ${quote.quoteNumber} is already converted to sales order ${quote.orderId || ''}`,
      );
    }
    if (['rejected', 'expired', 'lost'].includes(String(quote.status))) {
      throw new BadRequestException(
        `Quotation ${quote.quoteNumber} is ${quote.status} — it cannot be converted to an order`,
      );
    }
    if (['pending', 'under_review'].includes(String(quote.status))) {
      throw new BadRequestException(
        `Quotation ${quote.quoteNumber} is still in the approval workflow (${quote.status}) — convert it after approval`,
      );
    }

    const settings = await this.loadSettings();
    const today = new Date().toISOString().split('T')[0];

    // Number allocated inside the retry loop: the max-seq read-then-write race
    // can hand two concurrent converts the same number → UNIQUE conflict → retry
    // with a fresh number (same pattern as quotations/invoices services).
    const order = await this.createDocNumbered(
      (orderNumber) =>
        this.database.salesOrders.create({
          orderNumber,
          customerId: quote.customerId,
          quotationId: quote.id,
          orderDate: quote.quoteDate || today,
          deliveryDate: quote.validTill || null,
          branchId: quote.branchId || null,
          status: 'confirmed',
          subTotal: Number(quote.subTotal) || 0,
          discountPercent: Number(quote.discountPercent) || 0,
          discountAmount: Number(quote.discountAmount) || 0,
          taxAmount: Number(quote.taxAmount) || 0,
          roundOff: Number(quote.roundOff) || 0,
          grandTotal: Number(quote.grandTotal) || 0,
          notes: `Converted from quotation ${quote.quoteNumber}`,
          terms: quote.terms || null,
          financialYearId: quote.financialYearId || null,
          createdBy: userId || 'system',
        }),
      () =>
        this.numbering.nextOrderNumber(settings || {}, {
          financialYearId: quote.financialYearId || null,
          branchId: quote.branchId || null,
        }),
    );

    // Copy line items — keep the full pricing/tax snapshot from the quotation.
    let itemCount = 0;
    const quoteItems = await this.findAllItems('quotationItems', 'quotationId', quotationId);
    for (const item of quoteItems) {
      await this.database.salesOrderItems.create({
        orderId: order.id,
        itemId: item.itemId,
        variantId: item.variantId || null,
        description: item.description || null,
        quantity: Number(item.quantity) || 1,
        deliveredQuantity: 0,
        reservedQuantity: 0,
        unitId: item.unitId || null,
        rate: Number(item.rate) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        taxableValue: Number(item.taxableValue) || 0,
        gstRate: Number(item.gstRate) || 0,
        igst: Number(item.igst) || 0,
        cgst: Number(item.cgst) || 0,
        sgst: Number(item.sgst) || 0,
        cess: Number(item.cess) || 0,
        totalAmount: Number(item.totalAmount) || 0,
      });
      itemCount += 1;
    }

    await this.database.salesQuotations.update(quotationId, {
      convertedToOrder: true,
      orderId: order.id,
      status: 'converted',
      updatedAt: new Date().toISOString(),
    });

    await this.auditIf(userId, {
      event: 'sales_quotation_converted' as any,
      resource: 'sales_quotation',
      action: 'update',
      entityId: quotationId,
      module: 'sales',
      actionType: 'update',
      oldValues: { status: quote.status, convertedToOrder: false },
      newValues: { status: 'converted', orderId: order.id, orderNumber: order.orderNumber },
      details: {
        quoteNumber: quote.quoteNumber,
        orderNumber: order.orderNumber,
        itemCount,
      },
    });

    return { order, itemCount };
  }

  // ── Step 2: Sales Order → Delivery Challan ──────────────────────
  async convertOrderToChallan(orderId: string, userId?: string) {
    const order: any = await this.database.salesOrders.findById(orderId);
    if (!order) {
      throw new BadRequestException('Sales order not found');
    }

    // Block duplicate FULL dispatches — partial challans remain allowed.
    const existingChallans = await this.database.deliveryChallans.findAll({
      filters: [
        { field: 'orderId', operator: 'eq', value: orderId },
        { field: 'dispatchType', operator: 'eq', value: 'full' },
      ],
      page: 1,
      pageSize: 10,
    } as any);
    if ((existingChallans as any)?.data?.length > 0) {
      const first = (existingChallans as any).data[0];
      throw new BadRequestException(
        `Order ${order.orderNumber} already has a full-dispatch challan (${first?.challanNumber})`,
      );
    }

    const settings = await this.loadSettings();
    const today = new Date().toISOString().split('T')[0];

    const challan = await this.createDocNumbered(
      (challanNumber) =>
        this.database.deliveryChallans.create({
          challanNumber,
          orderId: order.id,
          customerId: order.customerId,
          warehouseId: order.warehouseId || null,
          dispatchDate: today,
          dispatchType: 'full',
          status: 'dispatched',
          notes: `Converted from sales order ${order.orderNumber}`,
          financialYearId: order.financialYearId || null,
          createdBy: userId || 'system',
        }),
      () => this.numbering.nextChallanNumber(settings || {}),
    );

    // Copy line items with the orderItemId link (full dispatch = order quantity).
    let itemCount = 0;
    const orderItems = await this.findAllItems('salesOrderItems', 'orderId', orderId);
    for (const item of orderItems) {
      await this.database.challanItems.create({
        challanId: challan.id,
        orderItemId: item.id,
        itemId: item.itemId,
        variantId: item.variantId || null,
        quantity: Number(item.quantity) || 1,
        deliveredQuantity: Number(item.quantity) || 1,
        rate: Number(item.rate) || 0,
        warehouseId: order.warehouseId || null,
        notes: `From order ${order.orderNumber}`,
      });
      itemCount += 1;
    }

    await this.database.salesOrders.update(orderId, {
      status: 'dispatched',
      updatedAt: new Date().toISOString(),
    });

    await this.auditIf(userId, {
      event: 'sales_order_converted' as any,
      resource: 'sales_order',
      action: 'update',
      entityId: orderId,
      module: 'sales',
      actionType: 'update',
      oldValues: { status: order.status },
      newValues: {
        status: 'dispatched',
        challanId: challan.id,
        challanNumber: challan.challanNumber,
      },
      details: {
        orderNumber: order.orderNumber,
        challanNumber: challan.challanNumber,
        itemCount,
      },
    });

    return { challan, itemCount };
  }

  // ── Step 3: Delivery Challan → Invoice ──────────────────────────
  async convertChallanToInvoice(challanId: string, userId?: string) {
    const challan: any = await this.database.deliveryChallans.findById(challanId);
    if (!challan) {
      throw new BadRequestException('Delivery challan not found');
    }
    if (String(challan.dispatchType) === 'partial') {
      throw new BadRequestException(
        `Challan ${challan.challanNumber} is a partial dispatch — invoice totals need the full order amount. Convert the full challan (or use one-click Convert from the quotation) instead`,
      );
    }

    const existing = await this.database.salesInvoices.findAll({
      filters: [{ field: 'challanId', operator: 'eq', value: challanId }],
      page: 1,
      pageSize: 10,
    } as any);
    if ((existing as any)?.data?.length > 0) {
      const inv = (existing as any).data[0];
      throw new BadRequestException(
        `Challan ${challan.challanNumber} is already invoiced as ${inv?.invoiceNumber}`,
      );
    }

    const order: any = challan.orderId
      ? await this.database.salesOrders.findById(challan.orderId).catch(() => null)
      : null;
    if (!order) {
      throw new BadRequestException('Linked sales order not found — cannot invoice this challan');
    }

    // Payment terms trace: challan → order → quotation (default 'credit' for udhaar flow).
    const paymentTerms = await this.resolvePaymentTerms(order);

    // Delivery challan items (carry the delivered quantity for partial dispatches).
    const challanItems = await this.findAllItems('challanItems', 'challanId', challanId);
    const challanItemByOrderItemId = new Map<string, any>();
    const challanItemByItemId = new Map<string, any>();
    for (const ci of challanItems) {
      if (ci.orderItemId) {
        challanItemByOrderItemId.set(ci.orderItemId, ci);
      }
      challanItemByItemId.set(ci.itemId, ci);
    }

    const isCredit = paymentTerms === 'credit';
    const grandTotal = Number(order.grandTotal) || 0;

    // NOTE: `paymentStatus: 'paid'` for cash conversions only records the sale as
    // counter-settled — GL posting / payment registration is a separate step
    // (POST /sales/invoices/:id/post) and is NOT triggered by conversion.
    const invoice = await this.createDocNumbered(
      (invoiceNumber) =>
        this.database.salesInvoices.create({
          invoiceNumber,
          orderId: order.id,
          challanId: challan.id,
          customerId: order.customerId,
          invoiceDate: challan.dispatchDate,
          dueDate: isCredit ? this.dueDateFrom(order.deliveryDate) : null,
          status: 'draft',
          subTotal: Number(order.subTotal) || 0,
          discountPercent: Number(order.discountPercent) || 0,
          discountAmount: Number(order.discountAmount) || 0,
          freight: 0,
          taxAmount: Number(order.taxAmount) || 0,
          roundOff: Number(order.roundOff) || 0,
          grandTotal,
          paidAmount: isCredit ? 0 : grandTotal,
          balanceAmount: isCredit ? grandTotal : 0,
          paymentStatus: isCredit ? 'unpaid' : 'paid',
          paymentTerms,
          notes: `Converted from challan ${challan.challanNumber} (order ${order.orderNumber})`,
          branchId: order.branchId || null,
          financialYearId: order.financialYearId || null,
          createdBy: userId || 'system',
        }),
      () =>
        this.invoicesService
          .getNextNumber(challan.dispatchDate, isCredit ? 'credit' : 'cash')
          .then((r) => r.invoiceNumber),
    );

    // Invoice items come from the ORDER items (full pricing/tax snapshot),
    // linked back via challanItemId + orderItemId for the audit trail.
    let itemCount = 0;
    const orderItems = await this.findAllItems('salesOrderItems', 'orderId', order.id);
    for (const oi of orderItems) {
      const cItem = challanItemByOrderItemId.get(oi.id) || challanItemByItemId.get(oi.itemId);
      const qty = cItem ? Number(cItem.quantity) || Number(oi.quantity) : Number(oi.quantity) || 1;
      await this.database.invoiceItems.create({
        invoiceId: invoice.id,
        orderItemId: oi.id,
        challanItemId: cItem?.id || null,
        itemId: oi.itemId,
        variantId: oi.variantId || null,
        description: oi.description || null,
        quantity: qty,
        unitId: oi.unitId || null,
        rate: Number(oi.rate) || 0,
        discountPercent: Number(oi.discountPercent) || 0,
        discountAmount: Number(oi.discountAmount) || 0,
        taxableValue: Number(oi.taxableValue) || 0,
        gstRate: Number(oi.gstRate) || 0,
        igst: Number(oi.igst) || 0,
        cgst: Number(oi.cgst) || 0,
        sgst: Number(oi.sgst) || 0,
        cess: Number(oi.cess) || 0,
        totalAmount: Number(oi.totalAmount) || 0,
      });
      itemCount += 1;
    }

    await this.database.deliveryChallans.update(challanId, {
      status: 'invoiced',
      updatedAt: new Date().toISOString(),
    });

    await this.auditIf(userId, {
      event: 'delivery_challan_converted' as any,
      resource: 'delivery_challan',
      action: 'update',
      entityId: challanId,
      module: 'sales',
      actionType: 'update',
      oldValues: { status: challan.status },
      newValues: {
        status: 'invoiced',
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
      details: {
        challanNumber: challan.challanNumber,
        invoiceNumber: invoice.invoiceNumber,
        itemCount,
      },
    });

    return { invoice, itemCount };
  }

  // ── Helpers ─────────────────────────────────────────────────────
  /**
   * Create a numbered document with retry on UNIQUE conflicts: the numbering
   * service reads max-sequence then writes, so concurrent creates can still
   * collide — on conflict we allocate a fresh number and retry (max 5).
   */
  private async createDocNumbered(
    create: (number: string) => Promise<any>,
    next: () => Promise<string>,
  ): Promise<any> {
    for (let attempts = 0; attempts < 5; attempts += 1) {
      try {
        return await create(await next());
      } catch (err: any) {
        const isConflict = /UNIQUE|already exists|constraint/i.test(String(err?.message || ''));
        if (!isConflict || attempts >= 4) {
          throw err;
        }
      }
    }
    throw new BadRequestException('Could not allocate a unique document number');
  }

  private async loadSettings(): Promise<any | null> {
    try {
      const r = await this.database.salesSettings.findAll({ page: 1, pageSize: 1 } as any);
      return (r as any)?.data?.[0] || null;
    } catch {
      return null;
    }
  }

  private async findAllItems(
    repoKey: 'quotationItems' | 'salesOrderItems' | 'challanItems',
    field: 'quotationId' | 'orderId' | 'challanId',
    value: string,
  ): Promise<any[]> {
    // NO silent catch: a failed items read must abort the conversion loudly —
    // otherwise the source document gets marked converted with an item-less
    // copy (permanent data loss). The full-chain `convert()` reports the step
    // error and keeps already-created documents.
    const r = await (this.database[repoKey] as any).findAll({
      filters: [{ field, operator: 'eq', value }],
      page: 1,
      pageSize: 500,
    });
    return (r as any)?.data || [];
  }

  private async resolvePaymentTerms(order: any): Promise<string> {
    let paymentTerms = 'credit';
    try {
      const settings = await this.loadSettings();
      paymentTerms = settings?.defaultPaymentTerms || 'credit';
    } catch {
      /* fall through to credit */
    }
    if (order?.quotationId) {
      try {
        const quote: any = await this.database.salesQuotations.findById(order.quotationId);
        if (quote?.paymentTerms) {
          paymentTerms = quote.paymentTerms;
        }
      } catch {
        /* keep default */
      }
    }
    // Normalize: any term other than explicit 'cash' / 'cod' is credit.
    // Terms like '30 days', '60 days', 'net 30' etc. are all credit terms.
    const normalized = String(paymentTerms || 'credit')
      .toLowerCase()
      .trim();
    return normalized === 'cash' || normalized === 'cod' ? 'cash' : 'credit';
  }

  private dueDateFrom(deliveryDate?: string | null): string | null {
    if (!deliveryDate) {
      return null;
    }
    const base = new Date(deliveryDate);
    if (isNaN(base.getTime())) {
      return null;
    }
    return base.toISOString().split('T')[0];
  }

  private async auditIf(
    userId: string | undefined,
    payload: {
      event: string;
      resource: string;
      action: string;
      entityId: string;
      module: string;
      actionType: string;
      oldValues: any;
      newValues: any;
      details?: any;
    },
  ): Promise<void> {
    if (!userId) {
      return;
    }
    try {
      await this.audit.log(payload as any);
    } catch {
      /* non-fatal: audit should never break a conversion */
    }
  }
}
