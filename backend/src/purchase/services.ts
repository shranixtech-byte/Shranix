import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { BaseMasterService } from '../masters/base-master.service';

@Injectable()
export class PurchaseOrdersService extends BaseMasterService {    constructor(
    database: DatabaseService,
    audit: AuditService,
  ) { super(database.purchaseOrders, 'PurchaseOrder', audit, 'poNumber'); }
}

@Injectable()
export class PurchaseQuotationsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.purchaseQuotations, 'PurchaseQuotation', audit, 'quoteNumber'); }
}

// ── StockPostingService (must be defined before GrnService and PurchaseReturnsService that depend on it) ──

@Injectable()
export class StockPostingService {
  protected readonly logger = new Logger(StockPostingService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async postFromGrn(grn: any, userId?: string) {
    this.logger.log(`Auto-posting stock for GRN: ${grn.grnNumber} (${grn.id})`);

    let items: any[] = [];
    try {
      const itemsResult = await this.database.grnItems.findAll({ page: 1, pageSize: 1000 });
      items = (itemsResult.data || []).filter((i: any) => i.grnId === grn.id);
    } catch (e) {
      this.logger.warn(`Could not fetch GRN items: ${(e as Error).message}`);
    }

    for (const item of items) {
      const acceptedQty = item.acceptedQuantity || item.receivedQuantity || 0;
      if (acceptedQty <= 0) continue;

      const warehouseId = item.warehouseId || grn.warehouseId;
      if (!warehouseId) {
        this.logger.warn(`No warehouse for GRN item ${item.id}, skipping`);
        continue;
      }

      const batchNo = item.batchNo || `BATCH-${Date.now().toString(36).toUpperCase()}`;

      try {
        const dbAny = this.database as any;
        const existingBatchResult = await dbAny.batchStock?.findAll({ page: 1, pageSize: 1, search: batchNo });
        const existingBatches = existingBatchResult?.data || [];
        const existingBatch = existingBatches.find((b: any) => b.batchNo === batchNo && b.itemId === item.itemId);
        if (existingBatch) {
          await dbAny.batchStock?.update(existingBatch.id, { quantity: (existingBatch.quantity || 0) + acceptedQty });
        } else {
          await dbAny.batchStock?.create({
            itemId: item.itemId, batchNo, mfgDate: item.mfgDate || null, expDate: item.expDate || null,
            quantity: acceptedQty, rate: item.rate || 0, warehouseId, isActive: true,
          });
        }
      } catch (e) { this.logger.warn(`Batch issue: ${(e as Error).message}`); }

      try {
        const existingStockResult = await this.database.warehouseStock?.findAll({ page: 1, pageSize: 100 });
        const existingStocks = existingStockResult?.data || [];
        const existingStock = existingStocks.find((s: any) => s.warehouseId === warehouseId && s.itemId === item.itemId);
        if (existingStock) {
          await this.database.warehouseStock?.update(existingStock.id, { quantity: (existingStock.quantity || 0) + acceptedQty });
        } else {
          await this.database.warehouseStock?.create({ itemId: item.itemId, batchNo, warehouseId, quantity: acceptedQty, reservedQuantity: 0 });
        }
      } catch (e) { this.logger.warn(`Stock update issue: ${(e as Error).message}`); }

      try {
        await this.database.stockLedger?.create({
          itemId: item.itemId, batchNo, warehouseId, transactionType: 'purchase_receipt',
          documentRef: grn.grnNumber, documentType: 'grn', quantity: acceptedQty,
          beforeQty: 0, afterQty: acceptedQty, rate: item.rate || 0,
          amount: (item.rate || 0) * acceptedQty, createdBy: userId,
          remarks: `Auto-posted from GRN ${grn.grnNumber}`,
        });
      } catch (e) { this.logger.warn(`Ledger issue: ${(e as Error).message}`); }

      if (item.poItemId) {
        try {
          const poItem = await this.database.poItems?.findById(item.poItemId);
          if (poItem) await this.database.poItems?.update(item.poItemId, { receivedQuantity: (poItem.receivedQuantity || 0) + acceptedQty });
        } catch (e) { this.logger.warn(`PO item update issue: ${(e as Error).message}`); }
      }
    }

    if (this.audit && userId) await this.audit.log({
      userId, event: 'stock_posted' as any, resource: 'grn',
      action: 'stock_posting', details: { grnId: grn.id, grnNumber: grn.grnNumber },
    });

    this.logger.log(`Stock posting complete for GRN: ${grn.grnNumber}`);
  }

  async reverseFromReturn(returnRecord: any, userId?: string) {
    this.logger.log(`Reversing stock for Return: ${returnRecord.returnNumber}`);
    let items: any[] = [];
    try {
      const res = await this.database.purchaseReturnItems?.findAll({ page: 1, pageSize: 1000 });
      items = (res?.data || []).filter((i: any) => i.returnId === returnRecord.id);
    } catch {}

    for (const item of items) {
      const qty = item.quantity || 0;
      if (qty <= 0 || !item.warehouseId) continue;

      try {
        const existingStockResult = await this.database.warehouseStock?.findAll({ page: 1, pageSize: 100 });
        const existingStocks = existingStockResult?.data || [];
        const existingStock = existingStocks.find((s: any) => s.warehouseId === item.warehouseId && s.itemId === item.itemId);
        if (existingStock) await this.database.warehouseStock?.update(existingStock.id, { quantity: Math.max(0, (existingStock.quantity || 0) - qty) });
      } catch {}

      try {
        await this.database.stockLedger?.create({
          itemId: item.itemId, batchNo: item.batchNo, warehouseId: item.warehouseId,
          transactionType: 'purchase_return', documentRef: returnRecord.returnNumber, documentType: 'purchase_return',
          quantity: -qty, beforeQty: 0, afterQty: -qty, rate: item.rate || 0,
          amount: -(item.rate || 0) * qty, createdBy: userId,
          remarks: `Auto-reversed from Return ${returnRecord.returnNumber}`,
        });
      } catch {}
    }
    this.logger.log(`Stock reversal complete for Return: ${returnRecord.returnNumber}`);
  }
}

@Injectable()
export class GrnService extends BaseMasterService {
  constructor(
    database: DatabaseService,
    audit: AuditService,
    private readonly db: DatabaseService,
    private readonly stockPostingService?: StockPostingService,
  ) { super(database.grn, 'GRN', audit, 'grnNumber'); }

  async create(data: any, userId?: string) {
    const { items, ...header } = data;

    // Business rule: Check GRN does not exceed ordered quantity
    if (header.poId && items && Array.isArray(items)) {
      try {
        const poItems = await this.db.poItems.findAll({ page: 1, pageSize: 1000 });
        for (const item of items) {
          const poItem = (poItems.data || []).find((pi: any) => pi.poId === header.poId && pi.itemId === item.itemId);
          if (poItem && item.receivedQuantity > poItem.quantity) {
            throw new BadRequestException(
              `GRN quantity ${item.receivedQuantity} exceeds ordered quantity ${poItem.quantity} for item ${item.itemId}`
            );
          }
        }
      } catch (e) {
        if (e instanceof BadRequestException) {throw e;}
      }
    }

    // Check duplicate supplier invoice number
    if (header.invoiceNumber) {
      try {
        const existingGrns = await this.repository.findAll({ page: 1, pageSize: 100 });
        const dupInvoice = (existingGrns.data || []).find(
          (g: any) => g.invoiceNumber === header.invoiceNumber && g.supplierId === header.supplierId && !g.isDeleted
        );
        if (dupInvoice) {
          throw new BadRequestException(`Duplicate supplier invoice number: ${header.invoiceNumber}`);
        }
      } catch (e) {
        if (e instanceof BadRequestException) {throw e;}
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
        } catch {}
      }
    }

    return grn;
  }

  async approve(id: string, userId?: string) {
    const grn = await this.findById(id);
    if (!grn) {throw new NotFoundException('GRN not found');}
    if (grn.status === 'posted') {throw new BadRequestException('GRN already posted');}

    await this.update(id, { status: 'posted', approvedBy: userId, approvedAt: new Date().toISOString() }, userId);

    // Auto Stock Posting
    if (this.stockPostingService) {
      await this.stockPostingService.postFromGrn(grn, userId);
    }

    return this.findById(id);
  }
}

@Injectable()
export class PurchaseInvoicesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.purchaseInvoices, 'PurchaseInvoice', audit, 'invoiceNumber'); }
}

@Injectable()
export class PurchaseReturnsService extends BaseMasterService {
  constructor(
    database: DatabaseService,
    audit: AuditService,
    private readonly db: DatabaseService,
    private readonly stockPostingService?: StockPostingService,
  ) { super(database.purchaseReturns, 'PurchaseReturn', audit, 'returnNumber'); }

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
        } catch {}
      }
    }

    return ret;
  }

  async approve(id: string, userId?: string) {
    const ret = await this.findById(id);
    if (!ret) {throw new NotFoundException('Purchase return not found');}
    if (ret.status === 'approved') {throw new BadRequestException('Return already approved');}

    await this.update(id, { status: 'approved', approvedBy: userId, approvedAt: new Date().toISOString() }, userId);

    // Auto reverse stock
    if (this.stockPostingService) {
      await this.stockPostingService.reverseFromReturn(ret, userId);
    }

    return this.findById(id);
  }
}

@Injectable()
export class SupplierPriceListService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.supplierPriceList, 'SupplierPrice', audit); }
}

@Injectable()
export class PurchaseApprovalsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.purchaseApprovals, 'PurchaseApproval', audit); }
}

@Injectable()
export class PurchaseSettingsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.purchaseSettings, 'PurchaseSettings', audit); }
}

// ═════════════════════════════════════════════════════════
// PRM-016 NEW SERVICES
// ═════════════════════════════════════════════════════════

@Injectable()
export class SuppliersService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.suppliers, 'Supplier', audit, 'code'); }
}

@Injectable()
export class PurchaseRequisitionsService extends BaseMasterService {
  constructor(
    database: DatabaseService,
    audit: AuditService,
) { super(database.purchaseRequisitions, 'PurchaseRequisition', audit, 'prNumber'); }

  async create(data: any, userId?: string) {
    const { items, ...header } = data;
    const req = await super.create(header, userId);
    if (items && Array.isArray(items)) {
      const db = (this.repository as any).db;
      if (db) {
        for (const item of items) {
          try {
            const prItem = {
              prId: req.id,
              itemId: item.itemId,
              variantId: item.variantId || null,
              description: item.description || null,
              quantity: item.quantity,
              estimatedRate: item.estimatedRate || 0,
              estimatedAmount: item.estimatedAmount || (item.estimatedRate || 0) * item.quantity,
              remarks: item.remarks || null,
            };
            await db.insert('shranix_pr_items').values(prItem);
          } catch {}
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
    let pendingPos = 0, pendingGrns = 0, todayReceipts = 0, monthValue = 0;
    let allPosData: any[] = [];
    let allGrnData: any[] = [];

    try {
      const posResult = await this.database.purchaseOrders.findAll({ page: 1, pageSize: 1000 });
      allPosData = posResult.data || [];
      pendingPos = allPosData.filter((po: any) => ['draft', 'submitted', 'approved', 'partially_received'].includes(po.status)).length;

      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      monthValue = allPosData
        .filter((po: any) => po.orderDate && po.orderDate >= monthStartStr)
        .reduce((sum: number, po: any) => sum + (po.grandTotal || 0), 0);
    } catch {}

    try {
      const grnResult = await this.database.grn.findAll({ page: 1, pageSize: 1000 });
      allGrnData = grnResult.data || [];
      pendingGrns = allGrnData.filter((g: any) => g.status === 'pending').length;

      const today = new Date().toISOString().split('T')[0];
      todayReceipts = allGrnData.filter((g: any) => g.receivedDate && g.receivedDate.startsWith(today)).length;
    } catch {}

    // Top Suppliers
    const supplierCounts = new Map<string, { count: number; amount: number; name: string }>();
    for (const po of allPosData) {
      const sid = po.supplierId;
      const existing = supplierCounts.get(sid) || { count: 0, amount: 0, name: sid };
      existing.count++;
      existing.amount += po.grandTotal || 0;
      supplierCounts.set(sid, existing);
    }
    const topSuppliers = Array.from(supplierCounts.entries())
      .sort((a, b) => b[1].amount - a[1].amount).slice(0, 5)
      .map(([id, data]) => ({ id, name: data.name, count: data.count, amount: data.amount }));

    // Recent Purchases
    const recentPurchases = allPosData
      .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 10)
      .map((po: any) => ({
        id: po.id, poNumber: po.poNumber, supplierId: po.supplierId,
        orderDate: po.orderDate, grandTotal: po.grandTotal, status: po.status,
      }));

    return {
      pendingPos, pendingGrns, todayReceipts, purchaseValue: monthValue,
      supplierOutstanding: 0, topSuppliers, recentPurchases,
    };
  }
}

@Injectable()
export class PurchaseReportsService {
  constructor(private readonly database: DatabaseService) {}

  async getPurchaseRegister(page = 1, pageSize = 50, search?: string) { return this.database.purchaseOrders.findAll({ page, pageSize, search }); }
  async getGrnRegister(page = 1, pageSize = 50, search?: string) { return this.database.grn.findAll({ page, pageSize, search }); }

  async getSupplierWisePurchase(supplierId: string, page = 1, pageSize = 50) {
    const allPos = await this.database.purchaseOrders.findAll({ page: 1, pageSize: 1000 }).catch(() => ({ data: [] }));
    const filtered = (allPos.data || []).filter((po: any) => po.supplierId === supplierId);
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return { data: filtered.slice(start, start + pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getItemWisePurchase(itemId: string, page = 1, pageSize = 50) {
    const allItems = await this.database.poItems.findAll({ page: 1, pageSize: 1000 }).catch(() => ({ data: [] }));
    const filtered = (allItems.data || []).filter((i: any) => i.itemId === itemId);
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return { data: filtered.slice(start, start + pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getPendingPOs(page = 1, pageSize = 50) {
    const allPos = await this.database.purchaseOrders.findAll({ page: 1, pageSize: 1000 }).catch(() => ({ data: [] }));
    const pending = (allPos.data || []).filter((po: any) => ['draft', 'submitted', 'approved', 'partially_received'].includes(po.status));
    const total = pending.length;
    const start = (page - 1) * pageSize;
    return { data: pending.slice(start, start + pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getPurchaseReturnReport(page = 1, pageSize = 50) { return this.database.purchaseReturns.findAll({ page, pageSize }).catch(() => ({ data: [], total: 0, totalPages: 0 })); }
  async getGstPurchaseReport(page = 1, pageSize = 50) { return this.database.purchaseOrders.findAll({ page, pageSize }).catch(() => ({ data: [], total: 0, totalPages: 0 })); }
}

@Injectable()
export class PurchaseSearchService {
  constructor(private readonly database: DatabaseService) {}

  async search(query: string, page = 1, pageSize = 50) {
    const results: any[] = [];

    const searchFns = [
      { repo: this.database.purchaseOrders, type: 'purchase_order', labelFn: (r: any) => `PO: ${r.poNumber}` },
      { repo: this.database.grn, type: 'grn', labelFn: (r: any) => `GRN: ${r.grnNumber}` },
      { repo: this.database.suppliers, type: 'supplier', labelFn: (r: any) => `Supplier: ${r.name}` },
      { repo: this.database.purchaseReturns, type: 'purchase_return', labelFn: (r: any) => `Return: ${r.returnNumber}` },
      { repo: this.database.purchaseRequisitions, type: 'purchase_requisition', labelFn: (r: any) => `PR: ${r.prNumber}` },
      { repo: this.database.purchaseInvoices, type: 'purchase_invoice', labelFn: (r: any) => `Invoice: ${r.invoiceNumber}` },
    ];

    for (const sf of searchFns) {
      try {
        if (sf.repo) {
          const result = await sf.repo.findAll({ page: 1, pageSize: 20, search: query });
          if (result.data) {
            results.push(...result.data.map((r: any) => ({ ...r, _type: sf.type, _label: sf.labelFn(r) })));
          }
        }
      } catch {}
    }

    const total = results.length;
    const start = (page - 1) * pageSize;
    return { data: results.slice(start, start + pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
