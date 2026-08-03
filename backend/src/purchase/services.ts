import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { EnterpriseQuery } from '@shranix/database';

import { TransactionManager, type TransactionContext } from '../automation/transaction.manager';
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { BaseMasterService } from '../masters/base-master.service';

import { PurchaseDebitNoteService } from './debit-note.service';

@Injectable()
export class PurchaseQuotationsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.purchaseQuotations, 'PurchaseQuotation', audit, 'quoteNumber');
  }
}

// ── StockPostingService (must be defined before GrnService and PurchaseReturnsService that depend on it) ──

@Injectable()
export class StockPostingService {
  protected readonly logger = new Logger(StockPostingService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly transactionManager: TransactionManager,
  ) {}

  async postFromGrn(grn: any, userId?: string) {
    this.logger.log(`Auto-posting stock for GRN: ${grn.grnNumber} (${grn.id})`);

    return this.transactionManager.executeInTransaction(async (_ctx: TransactionContext) => {
      let items: any[] = [];
      try {
        const grnItemsQuery: EnterpriseQuery = {
          page: 1,
          pageSize: 500,
          fields: [
            'id',
            'itemId',
            'poItemId',
            'acceptedQuantity',
            'receivedQuantity',
            'warehouseId',
            'batchNo',
            'mfgDate',
            'expDate',
            'rate',
            'purchaseRate',
          ],
          filters: [{ field: 'grnId', operator: 'eq', value: grn.id }],
        };
        const itemsResult = await this.database.grnItems.findAll(grnItemsQuery);
        items = itemsResult.data || [];
      } catch (e) {
        this.logger.warn(`Could not fetch GRN items: ${(e as Error).message}`);
      }

      for (const item of items) {
        const acceptedQty = item.acceptedQuantity || item.receivedQuantity || 0;
        if (acceptedQty <= 0) {
          continue;
        }

        const warehouseId = item.warehouseId || grn.warehouseId;
        if (!warehouseId) {
          this.logger.warn(`No warehouse for GRN item ${item.id}, skipping`);
          continue;
        }

        const batchNo = item.batchNo || `BATCH-${Date.now().toString(36).toUpperCase()}`;

        // Batch stock update
        const batchStock = (this.database as unknown as Record<string, unknown>)['batchStock'] as {
          findAll: (p: any) => Promise<{ data: any[] }>;
          update: (id: string, d: any) => Promise<any>;
          create: (d: any) => Promise<any>;
        };
        const existingBatchResult = await batchStock?.findAll({
          page: 1,
          pageSize: 1,
          search: batchNo,
        });
        const existingBatches = existingBatchResult?.data || [];
        const existingBatch = existingBatches.find(
          (b: any) => b.batchNo === batchNo && b.itemId === item.itemId,
        );
        if (existingBatch) {
          await batchStock?.update(existingBatch.id, {
            quantity: (existingBatch.quantity || 0) + acceptedQty,
          });
        } else {
          await batchStock?.create({
            itemId: item.itemId,
            batchNo,
            mfgDate: item.mfgDate || null,
            expDate: item.expDate || null,
            quantity: acceptedQty,
            rate: item.rate || 0,
            warehouseId,
            isActive: true,
          });
        }

        // Warehouse stock update
        const existingStockResult = await this.database.warehouseStock?.findAll({
          page: 1,
          pageSize: 100,
        });
        const existingStocks = existingStockResult?.data || [];
        const existingStock = existingStocks.find(
          (s: any) => s.warehouseId === warehouseId && s.itemId === item.itemId,
        );
        if (existingStock) {
          await this.database.warehouseStock?.update(existingStock.id, {
            quantity: (existingStock.quantity || 0) + acceptedQty,
          });
        } else {
          await this.database.warehouseStock?.create({
            itemId: item.itemId,
            batchNo,
            warehouseId,
            quantity: acceptedQty,
            reservedQuantity: 0,
          });
        }

        // Stock ledger
        await this.database.stockLedger?.create({
          itemId: item.itemId,
          batchNo,
          warehouseId,
          transactionType: 'purchase_receipt',
          documentRef: grn.grnNumber,
          documentType: 'grn',
          quantity: acceptedQty,
          beforeQty: 0,
          afterQty: acceptedQty,
          rate: item.rate || 0,
          amount: (item.rate || 0) * acceptedQty,
          createdBy: userId,
          remarks: `Auto-posted from GRN ${grn.grnNumber}`,
        });

        // PO item received quantity update
        if (item.poItemId) {
          const poItem = await this.database.poItems?.findById(item.poItemId);
          if (poItem) {
            await this.database.poItems?.update(item.poItemId, {
              receivedQuantity: (poItem.receivedQuantity || 0) + acceptedQty,
            });
          }
        }
      }

      if (this.audit && userId) {
        await this.audit.log({
          userId,
          event: 'stock_posted',
          resource: 'grn',
          action: 'stock_posting',
          details: { grnId: grn.id, grnNumber: grn.grnNumber },
        });
      }

      this.logger.log(`Stock posting complete for GRN: ${grn.grnNumber}`);
      return { success: true, message: `Stock posted for GRN ${grn.grnNumber}` };
    });
  }

  async reverseFromReturn(returnRecord: any, userId?: string) {
    this.logger.log(`Reversing stock for Return: ${returnRecord.returnNumber}`);

    return this.transactionManager.executeInTransaction(async (_ctx: TransactionContext) => {
      let items: any[] = [];
      try {
        const returnItemsQuery: EnterpriseQuery = {
          page: 1,
          pageSize: 500,
          fields: ['id', 'itemId', 'batchNo', 'warehouseId', 'quantity', 'rate', 'amount'],
          filters: [{ field: 'returnId', operator: 'eq', value: returnRecord.id }],
        };
        const res = await this.database.purchaseReturnItems?.findAll(returnItemsQuery);
        items = res?.data || [];
      } catch (e) {
        this.logger.warn(`Could not fetch return items: ${(e as Error).message}`);
      }

      for (const item of items) {
        const qty = item.quantity || 0;
        if (qty <= 0 || !item.warehouseId) {
          continue;
        }

        const existingStockResult = await this.database.warehouseStock?.findAll({
          page: 1,
          pageSize: 100,
        });
        const existingStocks = existingStockResult?.data || [];
        const existingStock = existingStocks.find(
          (s: any) => s.warehouseId === item.warehouseId && s.itemId === item.itemId,
        );
        if (existingStock) {
          await this.database.warehouseStock?.update(existingStock.id, {
            quantity: Math.max(0, (existingStock.quantity || 0) - qty),
          });
        }

        await this.database.stockLedger?.create({
          itemId: item.itemId,
          batchNo: item.batchNo,
          warehouseId: item.warehouseId,
          transactionType: 'purchase_return',
          documentRef: returnRecord.returnNumber,
          documentType: 'purchase_return',
          quantity: -qty,
          beforeQty: 0,
          afterQty: -qty,
          rate: item.rate || 0,
          amount: -(item.rate || 0) * qty,
          createdBy: userId,
          remarks: `Auto-reversed from Return ${returnRecord.returnNumber}`,
        });
      }

      this.logger.log(`Stock reversal complete for Return: ${returnRecord.returnNumber}`);
      return { success: true, message: `Stock reversed for Return ${returnRecord.returnNumber}` };
    });
  }
}

@Injectable()
export class GrnService extends BaseMasterService {
  constructor(
    database: DatabaseService,
    audit: AuditService,
    private readonly db: DatabaseService,
    private readonly stockPostingService?: StockPostingService,
  ) {
    super(database.grn, 'GRN', audit, 'grnNumber');
  }

  async create(data: any, userId?: string) {
    const { items, ...header } = data;

    // Business rule: Check GRN does not exceed ordered quantity
    if (header.poId && items && Array.isArray(items)) {
      try {
        const poItemsQuery: EnterpriseQuery = {
          page: 1,
          pageSize: 500,
          fields: ['id', 'itemId', 'poId', 'quantity', 'rate', 'description'],
          filters: [{ field: 'poId', operator: 'eq', value: header.poId }],
        };
        const poItems = await this.db.poItems.findAll(poItemsQuery);
        for (const item of items) {
          const poItem = (poItems.data || []).find((pi: any) => pi.itemId === item.itemId);
          if (poItem && item.receivedQuantity > poItem.quantity) {
            throw new BadRequestException(
              `GRN quantity ${item.receivedQuantity} exceeds ordered quantity ${poItem.quantity} for item ${item.itemId}`,
            );
          }
        }
      } catch (e) {
        if (e instanceof BadRequestException) {
          throw e;
        }
      }
    }

    // Check duplicate supplier invoice number
    if (header.invoiceNumber) {
      try {
        const existingGrns = await this.repository.findAll({ page: 1, pageSize: 100 });
        const dupInvoice = (existingGrns.data || []).find(
          (g: any) =>
            g.invoiceNumber === header.invoiceNumber &&
            g.supplierId === header.supplierId &&
            !g.isDeleted,
        );
        if (dupInvoice) {
          throw new BadRequestException(
            `Duplicate supplier invoice number: ${header.invoiceNumber}`,
          );
        }
      } catch (e) {
        if (e instanceof BadRequestException) {
          throw e;
        }
      }
    }

    const grn = await super.create(header, userId);

    // Save GRN items
    if (items && Array.isArray(items) && this.db.grnItems) {
      for (const item of items) {
        try {
          await this.db.grnItems.create({
            grnId: grn.id,
            poItemId: item.poItemId || null,
            itemId: item.itemId,
            orderedQuantity: item.orderedQuantity || item.receivedQuantity || 0,
            receivedQuantity: item.receivedQuantity || 0,
            acceptedQuantity: item.acceptedQuantity || item.receivedQuantity || 0,
            rejectedQuantity: item.rejectedQuantity || 0,
            rate: item.purchaseRate || item.rate || 0,
            batchNo: item.batchNo || null,
            mfgDate: item.mfgDate || null,
            expDate: item.expDate || null,
            warehouseId: item.warehouseId || header.warehouseId || null,
            remarks: item.remarks || null,
          });
        } catch {
          /* best-effort: continue with remaining items */
        }
      }
    }

    return grn;
  }

  async approve(id: string, userId?: string) {
    const grn = await this.findById(id);
    if (!grn) {
      throw new NotFoundException('GRN not found');
    }
    if (grn.status === 'posted') {
      throw new BadRequestException('GRN already posted');
    }

    await this.update(
      id,
      { status: 'posted', approvedBy: userId, approvedAt: new Date().toISOString() },
      userId,
    );

    // Auto Stock Posting
    if (this.stockPostingService) {
      await this.stockPostingService.postFromGrn(grn, userId);
    }

    return this.findById(id);
  }
}

// ⚠️ Class order matters: PurchaseOrdersService must stay AFTER GrnService.
// emitDecoratorMetadata emits design:paramtypes eagerly at module load, so any
// same-file class reference must point at an already-initialized binding, else
// the backend crashes with 'Cannot access X before initialization' (TDZ).
@Injectable()
export class PurchaseOrdersService extends BaseMasterService {
  constructor(
    database: DatabaseService,
    audit: AuditService,
    private readonly db: DatabaseService,
    @Optional()
    @Inject(forwardRef(() => GrnService))
    private readonly grnService?: GrnService,
  ) {
    super(database.purchaseOrders, 'PurchaseOrder', audit, 'poNumber');
  }

  /** Purchase Settings → defaults (Default Warehouse, Payment Terms, Payment Mode). */
  private async loadSettings(): Promise<any> {
    const r = await this.db.purchaseSettings.findAll({ page: 1, pageSize: 1 } as any);
    return r.data?.[0] || null;
  }

  override async create(data: any, userId?: string) {
    const settings = await this.loadSettings();
    const enriched = { ...data };
    // NOTE: paymentMode purchase_orders table var nahi (schema check) — default
    // payment mode posting engine (cash book) mein lagta hai, yahan nahi.
    if (!enriched.warehouseId && settings?.defaultWarehouseId) {
      enriched.warehouseId = settings.defaultWarehouseId;
    }
    if (!enriched.paymentTerms && settings?.defaultPaymentTerms) {
      enriched.paymentTerms = settings.defaultPaymentTerms;
    }
    return super.create(enriched, userId);
  }

  override async update(id: string, data: any, userId?: string) {
    const existing = await this.repository.findById(id);
    const updated = await super.update(id, data, userId);
    // Auto GRN — PO approved hote hi GRN auto-create (settings.autoGrn) kar do
    if (data?.status === 'approved' && existing?.status !== 'approved' && this.grnService) {
      try {
        const settings = await this.loadSettings();
        if (settings?.autoGrn) {
          await this.autoCreateGrn(id, settings, userId);
        }
      } catch (e) {
        // PO already approved — GRN failure non-fatal, log & continue
        this.logger.warn(`Auto GRN failed for PO ${id}: ${(e as Error).message}`);
      }
    }
    return updated;
  }

  /** PO items se ek pending GRN banao (grnPrefix + grnNextNumber ke saath). */
  private async autoCreateGrn(poId: string, settings: any, userId?: string): Promise<any> {
    const po = await this.db.purchaseOrders.findById(poId);
    if (!po) {
      return null;
    }
    // Already auto-GRN'd? Don't duplicate (filters-based, search nahi)
    const existingGrns = await this.db.grn.findAll({
      page: 1,
      pageSize: 50,
      filters: [{ field: 'poId', operator: 'eq', value: poId }],
    } as any);
    const dup = (existingGrns.data || []).find((g: any) => !g.isDeleted);
    if (dup) {
      return null;
    }

    const poItems = await this.db.poItems.findAll({
      page: 1,
      pageSize: 500,
      filters: [{ field: 'poId', operator: 'eq', value: poId }],
    } as any);
    const items = (poItems.data || [])
      .filter((i: any) => i.poId === poId)
      .map((i: any) => ({
        poItemId: i.id,
        itemId: i.itemId,
        orderedQuantity: i.quantity || 0,
        receivedQuantity: i.quantity || 0,
        acceptedQuantity: i.quantity || 0,
        rejectedQuantity: 0,
        purchaseRate: i.rate || 0,
        warehouseId: po.warehouseId || settings?.defaultWarehouseId || null,
      }));
    // PO item nahi mile to empty GRN mat banao
    if (items.length === 0) {
      this.logger.warn(`Auto GRN skipped for PO ${po.poNumber}: no PO items found`);
      return null;
    }

    const grnNumber = `${settings?.grnPrefix || 'GRN-'}${settings?.grnNextNumber || 1}`;
    const grn = await this.grnService!.create(
      {
        grnNumber,
        poId,
        supplierId: po.supplierId,
        warehouseId: po.warehouseId || settings?.defaultWarehouseId || null,
        receivedDate: new Date().toISOString().split('T')[0],
        receiptType: 'full',
        status: 'pending',
        notes: `Auto-generated from approved PO ${po.poNumber}`,
        items,
      },
      userId,
    );

    // Bump GRN next number
    const grnNext = settings?.grnNextNumber;
    if (typeof grnNext === 'number') {
      await this.db.purchaseSettings.update(settings.id, { grnNextNumber: grnNext + 1 });
    }
    this.logger.log(`Auto GRN ${grnNumber} created for approved PO ${po.poNumber}`);
    return grn;
  }
}

@Injectable()
export class PurchaseInvoicesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.purchaseInvoices, 'PurchaseInvoice', audit, 'invoiceNumber');
  }
}

@Injectable()
export class PurchaseReturnsService extends BaseMasterService {
  constructor(
    database: DatabaseService,
    audit: AuditService,
    private readonly db: DatabaseService,
    private readonly stockPostingService?: StockPostingService,
    @Inject(forwardRef(() => PurchaseDebitNoteService))
    private readonly debitNoteService?: PurchaseDebitNoteService,
  ) {
    super(database.purchaseReturns, 'PurchaseReturn', audit, 'returnNumber');
  }

  async create(data: any, userId?: string) {
    const { items, ...header } = data;
    const ret = await super.create(header, userId);

    // Save return items
    if (items && Array.isArray(items) && this.db.purchaseReturnItems) {
      for (const item of items) {
        try {
          await this.db.purchaseReturnItems.create({
            returnId: ret.id,
            itemId: item.itemId,
            batchId: item.batchId || null,
            batchNo: item.batchNo || null,
            quantity: item.quantity,
            rate: item.rate || 0,
            amount: (item.rate || 0) * item.quantity,
            reason: item.reason || header.returnReason || null,
            warehouseId: item.warehouseId || null,
            remarks: item.remarks || null,
          });
        } catch {
          /* best-effort: continue with remaining items */
        }
      }
    }

    return ret;
  }

  async approve(id: string, userId?: string) {
    const ret = await this.findById(id);
    if (!ret) {
      throw new NotFoundException('Purchase return not found');
    }
    if (ret.status === 'approved') {
      throw new BadRequestException('Return already approved');
    }

    // Auto-create debit note (which includes stock reversal + accounting + GST reversal)
    if (this.debitNoteService && userId) {
      const dnResult = await this.debitNoteService.createDebitNoteFromReturn(id, userId);
      const updatedReturn = await this.findById(id);
      return { ...dnResult, returnRecord: updatedReturn };
    }

    // Fallback: legacy mode — just approve + stock reversal
    await this.update(
      id,
      { status: 'approved', approvedBy: userId, approvedAt: new Date().toISOString() },
      userId,
    );
    if (this.stockPostingService) {
      await this.stockPostingService.reverseFromReturn(ret, userId);
    }
    return this.findById(id);
  }
}

@Injectable()
export class SupplierPriceListService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.supplierPriceList, 'SupplierPrice', audit);
  }
}

@Injectable()
export class PurchaseApprovalsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.purchaseApprovals, 'PurchaseApproval', audit);
  }
}

@Injectable()
export class PurchaseSettingsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.purchaseSettings, 'PurchaseSettings', audit);
  }
}

// ═════════════════════════════════════════════════════════
// PRM-016 NEW SERVICES
// ═════════════════════════════════════════════════════════

@Injectable()
export class SuppliersService extends BaseMasterService {
  constructor(
    database: DatabaseService,
    audit: AuditService,
    private readonly db: DatabaseService,
  ) {
    super(database.suppliers, 'Supplier', audit, 'code');
  }

  override async create(data: any, userId?: string) {
    // Purchase Settings → Supplier Credit Days: naya supplier creditDays na de to default apply
    const enriched = { ...data };
    if (enriched.creditDays === undefined || enriched.creditDays === null) {
      try {
        const r = await this.db.purchaseSettings.findAll({ page: 1, pageSize: 1 } as any);
        const settings = r.data?.[0];
        if (typeof settings?.supplierCreditDays === 'number') {
          enriched.creditDays = settings.supplierCreditDays;
        }
      } catch {
        /* best-effort default */
      }
    }
    return super.create(enriched, userId);
  }
}

@Injectable()
export class PurchaseRequisitionsService extends BaseMasterService {
  constructor(
    database: DatabaseService,
    audit: AuditService,
    private readonly db: DatabaseService,
  ) {
    super(database.purchaseRequisitions, 'PurchaseRequisition', audit, 'prNumber');
  }

  async create(data: any, userId?: string) {
    const { items, ...header } = data;
    const req = await super.create(header, userId);
    if (items && Array.isArray(items) && this.db.purchaseRequisitionItems) {
      for (const item of items) {
        try {
          await this.db.purchaseRequisitionItems.create({
            prId: req.id,
            itemId: item.itemId,
            variantId: item.variantId || null,
            description: item.description || null,
            quantity: item.quantity,
            estimatedRate: item.estimatedRate || 0,
            estimatedAmount: item.estimatedAmount || (item.estimatedRate || 0) * item.quantity,
            remarks: item.remarks || null,
          });
        } catch {
          /* best-effort: continue with remaining items */
        }
      }
    }
    return req;
  }
}

@Injectable()
export class PurchaseDashboardService {
  constructor(private readonly database: DatabaseService) {}

  async getDashboardData() {
    // ── Pending POs (DB-level status filter) ──
    const pendingQuery: EnterpriseQuery = {
      page: 1,
      pageSize: 1,
      fields: ['id'],
      filters: [
        {
          field: 'status',
          operator: 'in',
          value: ['draft', 'submitted', 'approved', 'partially_received'],
        },
      ],
    };
    const pendingPosResult = await this.database.purchaseOrders
      .findAll(pendingQuery)
      .catch(() => ({ total: 0 }));
    const pendingPos = pendingPosResult.total || 0;

    // ── Pending GRNs (DB-level status filter) ──
    const pendingGrnsQuery: EnterpriseQuery = {
      page: 1,
      pageSize: 1,
      fields: ['id'],
      filters: [{ field: 'status', operator: 'eq', value: 'pending' }],
    };
    const pendingGrnsResult = await this.database.grn
      .findAll(pendingGrnsQuery)
      .catch(() => ({ total: 0 }));
    const pendingGrns = pendingGrnsResult.total || 0;

    // ── Today's Receipts (DB-level date filter) ──
    const today = new Date().toISOString().split('T')[0];
    const todayReceiptsQuery: EnterpriseQuery = {
      page: 1,
      pageSize: 1,
      fields: ['id'],
      filters: [{ field: 'receivedDate', operator: 'startsWith', value: today }],
    };
    const todayReceiptsResult = await this.database.grn
      .findAll(todayReceiptsQuery)
      .catch(() => ({ total: 0 }));
    const todayReceipts = todayReceiptsResult.total || 0;

    // ── Monthly Purchase Value (DB-level date range) ──
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthPosQuery: EnterpriseQuery = {
      page: 1,
      pageSize: 100,
      fields: ['id', 'grandTotal', 'orderDate', 'supplierId', 'poNumber', 'status', 'createdAt'],
      filters: [{ field: 'orderDate', operator: 'gte', value: monthStartStr }],
    };
    let allPosData: any[] = [];
    let monthValue = 0;
    try {
      const monthPosResult = await this.database.purchaseOrders.findAll(monthPosQuery);
      allPosData = monthPosResult.data || [];
      monthValue = allPosData.reduce((sum: number, po: any) => sum + (po.grandTotal || 0), 0);
    } catch {
      /* best-effort: fall back to defaults */
    }

    // ── Top Suppliers (from the monthly data set) ──
    const supplierCounts = new Map<string, { count: number; amount: number; name: string }>();
    for (const po of allPosData) {
      const sid = po.supplierId;
      const existing = supplierCounts.get(sid) || { count: 0, amount: 0, name: sid };
      existing.count++;
      existing.amount += po.grandTotal || 0;
      supplierCounts.set(sid, existing);
    }
    const topSuppliers = Array.from(supplierCounts.entries())
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 5)
      .map(([id, data]) => ({ id, name: data.name, count: data.count, amount: data.amount }));

    // ── Recent Purchases (DB-level sort + limit 10) ──
    const recentQuery: EnterpriseQuery = {
      page: 1,
      pageSize: 10,
      fields: ['id', 'poNumber', 'supplierId', 'orderDate', 'grandTotal', 'status', 'createdAt'],
      sorts: [{ field: 'createdAt', order: 'desc' }],
      filters: [],
    };
    const recentResult = await this.database.purchaseOrders
      .findAll(recentQuery)
      .catch(() => ({ data: [] }));
    const recentPurchases = (recentResult.data || []).map((po: any) => ({
      id: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      orderDate: po.orderDate,
      grandTotal: po.grandTotal,
      status: po.status,
    }));

    return {
      pendingPos,
      pendingGrns,
      todayReceipts,
      purchaseValue: monthValue,
      supplierOutstanding: 0,
      topSuppliers,
      recentPurchases,
    };
  }
}

@Injectable()
export class PurchaseReportsService {
  constructor(private readonly database: DatabaseService) {}

  async getPurchaseRegister(page = 1, pageSize = 50, search?: string) {
    return this.database.purchaseOrders.findAll({ page, pageSize, search });
  }

  async getGrnRegister(page = 1, pageSize = 50, search?: string) {
    return this.database.grn.findAll({ page, pageSize, search });
  }

  async getSupplierWisePurchase(supplierId: string, page = 1, pageSize = 50) {
    const query: EnterpriseQuery = {
      page,
      pageSize,
      filters: [{ field: 'supplierId', operator: 'eq', value: supplierId }],
    };
    return this.database.purchaseOrders.findAll(query);
  }

  async getItemWisePurchase(itemId: string, page = 1, pageSize = 50) {
    const query: EnterpriseQuery = {
      page,
      pageSize,
      filters: [{ field: 'itemId', operator: 'eq', value: itemId }],
    };
    return this.database.poItems.findAll(query);
  }

  async getPendingPOs(page = 1, pageSize = 50) {
    const query: EnterpriseQuery = {
      page,
      pageSize,
      filters: [
        {
          field: 'status',
          operator: 'in',
          value: ['draft', 'submitted', 'approved', 'partially_received'],
        },
      ],
    };
    return this.database.purchaseOrders.findAll(query);
  }

  async getPurchaseReturnReport(page = 1, pageSize = 50) {
    return this.database.purchaseReturns
      .findAll({ page, pageSize })
      .catch(() => ({ data: [], total: 0, totalPages: 0 }));
  }

  async getGstPurchaseReport(page = 1, pageSize = 50) {
    return this.database.purchaseOrders
      .findAll({ page, pageSize })
      .catch(() => ({ data: [], total: 0, totalPages: 0 }));
  }
}

@Injectable()
export class PurchaseSearchService {
  constructor(private readonly database: DatabaseService) {}

  async search(query: string, page = 1, pageSize = 50) {
    const results: any[] = [];
    const perRepoLimit = Math.min(20, pageSize);

    const searchFns: Array<{
      repo: any;
      type: string;
      labelFn: (r: any) => string;
      fields: string[];
    }> = [
      {
        repo: this.database.purchaseOrders,
        type: 'purchase_order',
        labelFn: (r: any) => `PO: ${r.poNumber}`,
        fields: ['id', 'poNumber', 'supplierId', 'grandTotal', 'status'],
      },
      {
        repo: this.database.grn,
        type: 'grn',
        labelFn: (r: any) => `GRN: ${r.grnNumber}`,
        fields: ['id', 'grnNumber', 'supplierId', 'status'],
      },
      {
        repo: this.database.suppliers,
        type: 'supplier',
        labelFn: (r: any) => `Supplier: ${r.name}`,
        fields: ['id', 'name', 'gstin', 'mobile', 'city'],
      },
      {
        repo: this.database.purchaseReturns,
        type: 'purchase_return',
        labelFn: (r: any) => `Return: ${r.returnNumber}`,
        fields: ['id', 'returnNumber', 'supplierId', 'grandTotal', 'status'],
      },
      {
        repo: this.database.purchaseRequisitions,
        type: 'purchase_requisition',
        labelFn: (r: any) => `PR: ${r.prNumber}`,
        fields: ['id', 'prNumber', 'department', 'status'],
      },
      {
        repo: this.database.purchaseInvoices,
        type: 'purchase_invoice',
        labelFn: (r: any) => `Invoice: ${r.invoiceNumber}`,
        fields: ['id', 'invoiceNumber', 'supplierId', 'grandTotal', 'status'],
      },
    ];

    for (const sf of searchFns) {
      try {
        if (sf.repo) {
          const searchQuery: EnterpriseQuery = {
            page: 1,
            pageSize: perRepoLimit,
            search: query,
            searchFields: sf.fields,
            fields: sf.fields,
          };
          const result = await sf.repo.findAll(searchQuery);
          if (result.data) {
            results.push(
              ...result.data.map((r: any) => ({ ...r, _type: sf.type, _label: sf.labelFn(r) })),
            );
          }
        }
      } catch {
        /* best-effort: skip failed search */
      }
    }

    // Sort by relevance: exact match first, then partial
    const ql = query.toLowerCase();
    results.sort((a: any, b: any) => {
      const aMatch = (a._label || '').toLowerCase().includes(ql) ? 1 : 0;
      const bMatch = (b._label || '').toLowerCase().includes(ql) ? 1 : 0;
      return bMatch - aMatch;
    });

    const total = results.length;
    const start = (page - 1) * pageSize;
    return {
      data: results.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
