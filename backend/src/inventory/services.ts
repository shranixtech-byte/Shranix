import { Injectable } from '@nestjs/common';
import type { EnterpriseQuery } from '@shranix/database';

import { TransactionManager, type TransactionContext } from '../automation/transaction.manager';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { BaseMasterService } from '../masters/base-master.service';

@Injectable()
export class ItemsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.items, 'Item', audit, 'sku');
  }

  async duplicate(id: string, userId?: string) {
    const original = await this.findById(id);
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      deletedAt: _deletedAt,
      isDeleted: _isDeleted,
      createdBy: _createdBy,
      updatedBy: _updatedBy,
      ...data
    } = original as any;
    data.name = `${data.name} (Copy)`;
    data.sku = `${data.sku || 'PROD'}-COPY-${Date.now().toString(36).toUpperCase()}`;
    return this.create(data, userId);
  }
}

@Injectable()
export class ItemVariantsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.itemVariants, 'ItemVariant', audit, 'sku');
  }
}

@Injectable()
export class ItemGroupsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.itemGroups, 'ItemGroup', audit, 'name');
  }
}

@Injectable()
export class ItemPricingService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.itemPricing, 'ItemPricing', audit);
  }
}

@Injectable()
export class ItemBarcodesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.itemBarcodes, 'ItemBarcode', audit, 'barcode');
  }
}

@Injectable()
export class HsnCodesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.hsnCodes, 'HsnCode', audit, 'code');
  }
}

@Injectable()
export class StockOpeningService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.stockOpening, 'StockOpening', audit);
  }
}

@Injectable()
export class ItemImagesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.itemImages, 'ItemImage', audit);
  }
}

@Injectable()
export class InventorySettingsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.inventorySettings, 'InventorySettings', audit);
  }
}

// ── PRM-015B: Batch Management (Enhanced) ──────────────
@Injectable()
export class BatchStockService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super((database as any).batchStock, 'Batch', audit, 'batchNo');
  }

  /** Auto-calculate batch expiry status and available quantity */
  private calcExpiryStatus(expDate?: string): 'fresh' | 'near_expiry' | 'expired' {
    if (!expDate) {
      return 'fresh';
    }
    const now = new Date();
    const expiry = new Date(expDate);
    if (expiry < now) {
      return 'expired';
    }
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 30) {
      return 'near_expiry';
    }
    return 'fresh';
  }

  async create(data: any, userId?: string) {
    data.status = data.status || this.calcExpiryStatus(data.expDate);
    data.availableQuantity = (data.quantity || 0) - (data.reservedQuantity || 0);
    return super.create(data, userId);
  }

  async update(id: string, data: any, userId?: string) {
    const existing = await this.findById(id);
    const merged = { ...existing, ...data } as any;
    data.status = data.status || this.calcExpiryStatus(merged.expDate);
    if (data.quantity !== undefined || data.reservedQuantity !== undefined) {
      data.availableQuantity = (merged.quantity || 0) - (merged.reservedQuantity || 0);
    }
    return super.update(id, data, userId);
  }

  async getLiveStock(itemId?: string, warehouseId?: string) {
    const result = await (this.repository as any).findAll({ page: 1, pageSize: 1000 });
    let batches = (result.data || []) as any[];
    if (itemId) {
      batches = batches.filter((b: any) => b.itemId === itemId);
    }
    if (warehouseId) {
      batches = batches.filter((b: any) => b.warehouseId === warehouseId);
    }
    return {
      totalCurrentStock: batches.reduce((s: number, b: any) => s + (b.quantity || 0), 0),
      totalReserved: batches.reduce((s: number, b: any) => s + (b.reservedQuantity || 0), 0),
      totalAvailable: batches.reduce(
        (s: number, b: any) => s + (b.availableQuantity || b.quantity || 0),
        0,
      ),
      totalDamaged: batches
        .filter((b: any) => b.status === 'damaged')
        .reduce((s: number, b: any) => s + (b.quantity || 0), 0),
      batches,
    };
  }

  async recordEntry(data: any, userId?: string) {
    const entry = await this.create(data, userId);
    await (this.databaseService as any)?.stockMovements?.create({
      itemId: data.itemId,
      batchNo: data.batchNo,
      warehouseId: data.warehouseId,
      movementType: data.entryType || 'opening',
      quantity: data.quantity,
      rate: data.purchaseRate,
      amount: (data.quantity || 0) * (data.purchaseRate || 0),
      afterQuantity: data.quantity,
      referenceType: 'stock_entry',
      referenceId: entry.id,
      reason: data.remarks || `${data.entryType || 'Opening'} stock entry`,
      notes: data.remarks,
    });
    return entry;
  }

  async recordAdjustment(
    id: string,
    data: { type: 'increase' | 'decrease'; quantity: number; reason: string; remarks?: string },
    userId?: string,
  ) {
    const batch = (await this.findById(id)) as any;
    const oldQty = batch.quantity || 0;
    const adjQty = data.type === 'increase' ? data.quantity : -data.quantity;
    const newQty = Math.max(0, oldQty + adjQty);
    const updated = await this.update(
      id,
      {
        quantity: newQty,
        availableQuantity: newQty - (batch.reservedQuantity || 0),
      },
      userId,
    );
    await (this.databaseService as any)?.stockMovements?.create({
      itemId: batch.itemId,
      batchNo: batch.batchNo,
      warehouseId: batch.warehouseId,
      movementType: 'stock_adjustment',
      quantity: data.quantity,
      beforeQuantity: oldQty,
      afterQuantity: newQty,
      referenceType: 'stock_adjustment',
      referenceId: id,
      reason: data.reason,
      notes: data.remarks,
    });
    return updated;
  }

  // Store reference to database for movement tracking
  private databaseService: any;
  setDatabaseService(db: any) {
    this.databaseService = db;
  }
}

// ── PRM-015B: Stock Ledger Service ────────────────────────
@Injectable()
export class StockLedgerService {
  constructor(private readonly database: DatabaseService) {}

  async getLedger(params: {
    page?: number;
    pageSize?: number;
    itemId?: string;
    batchNo?: string;
    movementType?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const movements = (this.database as any).stockMovements;
    if (!movements) {
      return { data: [], total: 0, totalPages: 0 };
    }
    const result = await movements.findAll({
      page: params.page || 1,
      pageSize: params.pageSize || 50,
    });
    let data = (result.data || []) as any[];
    if (params.itemId) {
      data = data.filter((m: any) => m.itemId === params.itemId);
    }
    if (params.batchNo) {
      data = data.filter((m: any) => m.batchNo === params.batchNo);
    }
    if (params.movementType) {
      data = data.filter((m: any) => m.movementType === params.movementType);
    }
    if (params.fromDate) {
      data = data.filter(
        (m: any) => m.createdAt && new Date(m.createdAt) >= new Date(params.fromDate!),
      );
    }
    if (params.toDate) {
      data = data.filter(
        (m: any) => m.createdAt && new Date(m.createdAt) <= new Date(params.toDate!),
      );
    }
    data.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const total = data.length;
    const page = params.page || 1;
    const ps = params.pageSize || 50;
    const start = (page - 1) * ps;
    return { data: data.slice(start, start + ps), total, totalPages: Math.ceil(total / ps) };
  }
}

// ── PRM-015: Stock Movement ─────────────────────────────
@Injectable()
export class StockMovementService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super((database as any).stockMovements, 'StockMovement', audit);
  }
}

// ── PRM-015: Warehouse Location ─────────────────────────
@Injectable()
export class WarehouseLocationService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super((database as any).warehouseLocations, 'WarehouseLocation', audit, 'locationCode');
  }
}

// ── PRM-015: Damage Register ────────────────────────────
@Injectable()
export class DamageRegisterService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super((database as any).damageRegister, 'DamageRegister', audit);
  }
}

// ── PRM-015: Recall Register ────────────────────────────
@Injectable()
export class RecallRegisterService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super((database as any).recallRegister, 'RecallRegister', audit);
  }
}

// ── PRM-015: Distributor Return Queue ───────────────────
@Injectable()
export class DistributorReturnService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super((database as any).distributorReturnQueue, 'DistributorReturn', audit);
  }
}

@Injectable()
export class ReplacementQueueService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super((database as any).replacementQueue, 'ReplacementQueue', audit);
  }
}

// ── PRM-015A: Sub Category ──────────────────────────────
@Injectable()
export class SubCategoriesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super((database as any).subCategories, 'SubCategory', audit, 'name');
  }
}

// ── PRM-015C: Stock Transfer ────────────────────────────
@Injectable()
export class StockTransferService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super((database as any).stockTransfers, 'StockTransfer', audit, 'transferNumber');
  }

  async approve(id: string, userId?: string) {
    return this.update(
      id,
      { status: 'approved', approvedBy: userId, approvedDate: new Date().toISOString() },
      userId,
    );
  }

  async reject(id: string, reason: string, userId?: string) {
    return this.update(id, { status: 'rejected', rejectedReason: reason }, userId);
  }
}

// ── PRM-015C: Warehouse Service ─────────────────────────
@Injectable()
export class WarehouseService {
  constructor(private readonly database: DatabaseService) {}

  async search(query: string) {
    const q = query.toLowerCase();
    const [whResult, locResult, batchResult, transferResult] = await Promise.all([
      (this.database as any).warehouses?.findAll({ page: 1, pageSize: 1000 }) || { data: [] },
      (this.database as any).warehouseLocations?.findAll({ page: 1, pageSize: 1000 }) || {
        data: [],
      },
      (this.database as any).batchStock?.findAll({ page: 1, pageSize: 1000 }) || { data: [] },
      (this.database as any).stockTransfers?.findAll({ page: 1, pageSize: 1000 }) || { data: [] },
    ]);
    const warehouses = (whResult.data || []).filter(
      (w: any) =>
        w.name?.toLowerCase().includes(q) ||
        w.code?.toLowerCase().includes(q) ||
        w.city?.toLowerCase().includes(q) ||
        w.contactPerson?.toLowerCase().includes(q),
    );
    const locations = (locResult.data || []).filter(
      (l: any) =>
        l.godown?.toLowerCase().includes(q) ||
        l.rack?.toLowerCase().includes(q) ||
        l.shelf?.toLowerCase().includes(q) ||
        l.bin?.toLowerCase().includes(q) ||
        l.locationCode?.toLowerCase().includes(q),
    );
    const batches = (batchResult.data || []).filter(
      (b: any) => b.batchNo?.toLowerCase().includes(q) || b.itemId?.toLowerCase().includes(q),
    );
    const transfers = (transferResult.data || []).filter(
      (t: any) =>
        t.transferNumber?.toLowerCase().includes(q) ||
        t.fromLocation?.toLowerCase().includes(q) ||
        t.toLocation?.toLowerCase().includes(q),
    );
    return {
      warehouses,
      locations,
      batches,
      transfers,
      total: warehouses.length + locations.length + batches.length + transfers.length,
    };
  }

  async getDashboard() {
    const warehouses = (await (this.database as any).warehouses?.findAll({
      page: 1,
      pageSize: 1000,
    })) || { data: [] };
    const locations = (await (this.database as any).warehouseLocations?.findAll({
      page: 1,
      pageSize: 1000,
    })) || { data: [] };
    const batches = (await (this.database as any).batchStock?.findAll({
      page: 1,
      pageSize: 1000,
    })) || { data: [] };
    const transfers = (await (this.database as any).stockTransfers?.findAll({
      page: 1,
      pageSize: 1000,
    })) || { data: [] };
    const whData = warehouses.data || [];
    const locData = locations.data || [];
    const batchData = batches.data || [];
    const transferData = transfers.data || [];
    const stockValue = batchData.reduce(
      (sum: number, b: any) => sum + (b.quantity || 0) * (b.purchaseRate || 0),
      0,
    );
    return {
      totalWarehouses: whData.length,
      totalGodowns: locData.filter((l: any) => l.godown).length,
      totalLocations: locData.length,
      totalStockValue: stockValue,
      totalTransfers: transferData.length,
      pendingTransfers: transferData.filter(
        (t: any) => t.status === 'draft' || t.status === 'pending',
      ).length,
      warehouses: whData,
      transfers: transferData.slice(0, 5),
    };
  }

  async getWarehouseStock(warehouseId?: string) {
    const result = (await (this.database as any).batchStock?.findAll({
      page: 1,
      pageSize: 1000,
    })) || { data: [] };
    let batches = (result.data || []) as any[];
    if (warehouseId) {
      batches = batches.filter((b: any) => b.warehouseId === warehouseId);
    }
    return batches.map((b: any) => ({
      warehouseId: b.warehouseId,
      itemId: b.itemId,
      batchNo: b.batchNo,
      currentQty: b.quantity || 0,
      reservedQty: b.reservedQuantity || 0,
      availableQty: (b.availableQuantity || b.quantity || 0) - (b.reservedQuantity || 0),
    }));
  }
}

// ── Step 17-22: Enterprise Inventory Services ──────────
@Injectable()
export class UOMConversionService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.uomConversions, 'UOMConversion', audit);
  }
  async convert(
    fromUnitId: string,
    toUnitId: string,
    quantity: number,
    _itemId?: string,
  ): Promise<number | null> {
    return quantity;
  }
}

@Injectable()
export class ProductAttributeService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.productAttributes, 'ProductAttribute', audit);
  }
  async getAttributesByItem(_itemId: string) {
    return { data: [], total: 0 };
  }
}

@Injectable()
export class ItemPackagingService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.itemPackaging, 'ItemPackaging', audit);
  }
  async getPackagingByItem(_itemId: string) {
    return { data: [], total: 0 };
  }
}

@Injectable()
export class BatchMasterService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.batchMaster, 'BatchMaster', audit, 'batchNo');
  }
  async release(id: string, userId?: string) {
    return this.update(id, { status: 'released' }, userId);
  }
  async block(id: string, reason: string, userId?: string) {
    return this.update(id, { status: 'blocked', remarks: reason }, userId);
  }
  async quarantine(id: string, userId?: string) {
    return this.update(id, { status: 'quarantine' }, userId);
  }
  async selectBatches(itemId: string, warehouseId: string, qty: number, _strategy?: string) {
    return { allocated: [], remaining: qty, fullAllocation: false, strategy: 'fifo' };
  }
  async getExpiryAlerts(_days?: number) {
    return { expired: [], nearExpiry: [], totalBatches: 0 };
  }
}

@Injectable()
export class BatchLotService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.batchLots, 'BatchLot', audit, 'lotCode');
  }
  async splitLot(_id: string, qty: number, code: string) {
    return this.create({ lotCode: code, quantity: qty });
  }
  async mergeLots(_src: string, tgt: string) {
    return this.findById(tgt);
  }
}

@Injectable()
export class BatchTraceabilityService {
  constructor(_database: DatabaseService) {}
  async forwardTrace(_id: string) {
    return { batchId: '', childRelationships: [] };
  }
  async backwardTrace(_id: string) {
    return { batchId: '', parentRelationships: [] };
  }
  async fullGenealogy(_id: string) {
    return { forward: null, backward: null };
  }
}

@Injectable()
export class BatchDashboardService {
  constructor(_database: DatabaseService) {}
  async getDashboard() {
    return {
      totalBatches: 0,
      released: 0,
      quarantine: 0,
      blocked: 0,
      expired: 0,
      nearExpiry: 0,
      pendingInspections: 0,
    };
  }
}

@Injectable()
export class SerialMasterService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.serialMaster, 'Serial', audit, 'serialNo');
  }
  async getSerialDetails(id: string) {
    const s = await this.findById(id);
    if (!s) {
      return null;
    }
    return { serial: s, warranty: [], installation: [], service: [], history: [] };
  }
}

@Injectable()
export class SerialWarrantyService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.serialWarranty, 'SerialWarranty', audit);
  }
}

@Injectable()
export class SerialHistoryService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.serialHistory, 'SerialHistory', audit);
  }
}

@Injectable()
export class SerialRelationshipService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.serialRelationship, 'SerialRelationship', audit);
  }
}

@Injectable()
export class SerialRMAService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.serialRMA, 'SerialRMA', audit);
  }
}

@Injectable()
export class SerialServiceHistoryService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.serialService, 'SerialService', audit);
  }
}

@Injectable()
export class SerialTraceabilityService {
  constructor(_database: DatabaseService) {}
  async findChildren(_id: string) {
    return [];
  }
  async findParents(_id: string) {
    return [];
  }
  async getHistory(_id: string) {
    return { data: [], total: 0 };
  }
}

@Injectable()
export class SerialDashboardService {
  constructor(_database: DatabaseService) {}
  async getDashboard() {
    return {
      totalSerials: 0,
      available: 0,
      installed: 0,
      underWarranty: 0,
      expiredWarranty: 0,
      repair: 0,
      rma: 0,
      scrapped: 0,
    };
  }
}

@Injectable()
export class WarehouseZonesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.warehouseZones, 'WarehouseZone', audit, 'code');
  }
}

@Injectable()
export class WarehouseRacksService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.warehouseRacks, 'WarehouseRack', audit, 'code');
  }
}

@Injectable()
export class WarehouseShelvesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.warehouseShelves, 'WarehouseShelf', audit, 'code');
  }
}

@Injectable()
export class WarehouseBinsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) {
    super(database.warehouseBins, 'WarehouseBin', audit, 'code');
  }
}

// ═════════════════════════════════════════════════════════
// STEP 20: Enterprise Inventory Posting Engine
// ═════════════════════════════════════════════════════════
@Injectable()
export class InventoryPostingEngine {
  private entryCounter = 1;
  constructor(
    private readonly database: DatabaseService,
    private readonly transactionManager: TransactionManager,
    private readonly audit: AuditService,
  ) {}
  private generateEntryNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const seq = String(this.entryCounter++).padStart(4, '0');
    return `INV-${ts}-${seq}`;
  }

  /**
   * Build a UNIQUE reference number for the ledger. `reference_number` carries
   * a UNIQUE index in shranix_inv_stock_ledger, so every entry must have its
   * own value even when the same source document posts multiple lines (e.g. a
   * 5-line adjustment). The caller-facing document reference is preserved in
   * `documentRef` (non-unique).
   */
  private uniqueReference(inputRef?: string): string {
    if (!inputRef) {
      return this.generateEntryNumber();
    }
    return `${inputRef}-${this.entryCounter++}`;
  }

  private async getBalanceRow(warehouseId: string, itemId: string): Promise<any> {
    const res = await this.database.invStockBalance.findAll({
      filters: [
        { field: 'warehouseId', operator: 'eq' as const, value: warehouseId },
        { field: 'itemId', operator: 'eq' as const, value: itemId },
      ],
      pageSize: 1,
    } as any);
    return ((res as any)?.data || [])[0] || null;
  }

  /**
   * Apply a quantity delta to the running balance row and return the row AFTER
   * the change (used to stamp running balanceQuantity/balanceCost on the entry).
   */
  private async applyBalanceDelta(
    warehouseId: string,
    itemId: string,
    direction: string,
    quantity: number,
    unitCost: number,
    seed?: Partial<Record<string, any>>,
  ): Promise<any> {
    const qty = Math.abs(quantity || 0);
    let bal = await this.getBalanceRow(warehouseId, itemId);
    if (!bal) {
      const created = await this.database.invStockBalance.create({
        warehouseId,
        itemId,
        variantId: seed?.variantId || null,
        batchId: seed?.batchId || null,
        batchNo: seed?.batchNo || null,
        zoneId: seed?.zoneId || null,
        rackId: seed?.rackId || null,
        onHand: 0,
        available: 0,
        reserved: 0,
        committed: 0,
        allocated: 0,
        damaged: 0,
        blocked: 0,
        inTransit: 0,
      } as any);
      bal = created;
    }
    const row = bal as Record<string, any>;
    switch (direction) {
      case 'IN':
        row.onHand = (row.onHand || 0) + qty;
        row.available = (row.available || 0) + qty;
        break;
      case 'OUT':
        row.onHand = Math.max(0, (row.onHand || 0) - qty);
        row.available = Math.max(0, (row.available || 0) - qty);
        break;
      case 'RESERVE':
        row.reserved = (row.reserved || 0) + qty;
        row.available = Math.max(0, (row.available || 0) - qty);
        break;
      case 'RELEASE':
        row.reserved = Math.max(0, (row.reserved || 0) - qty);
        row.available = (row.available || 0) + qty;
        break;
      case 'TRANSFER':
        row.inTransit = (row.inTransit || 0) + qty;
        break;
      default:
        break; // REVERSAL entries are posted by reverseMovement with isReversal=true
    }
    await this.database.invStockBalance.update(row.id, row);
    return row;
  }

  async postMovement(input: {
    transactionType: string;
    direction: 'IN' | 'OUT' | 'TRANSFER' | 'RESERVE' | 'RELEASE' | 'REVERSAL';
    itemId: string;
    warehouseId: string;
    quantity: number;
    unitCost?: number;
    batchId?: string;
    batchNo?: string;
    lotNo?: string;
    serialNo?: string;
    variantId?: string;
    zoneId?: string;
    rackId?: string;
    shelfId?: string;
    binId?: string;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    uom?: string;
    referenceNumber?: string;
    documentRef?: string;
    documentType?: string;
    remarks?: string;
    createdBy?: string;
    approvedBy?: string;
  }) {
    return this.transactionManager.executeInTransaction(async (_ctx: TransactionContext) => {
      const entryNumber = this.generateEntryNumber();
      const qty = Math.abs(input.quantity || 0);
      const unitCost = input.unitCost || 0;
      const amount = qty * unitCost;
      const ts = new Date().toISOString();
      const referenceNumber = this.uniqueReference(input.referenceNumber);

      // Balance is only adjusted for real quantity movements; REVERSAL rows are
      // posted by reverseMovement (which restores the balance itself).
      let balance = null;
      if (input.direction !== 'REVERSAL') {
        balance = await this.applyBalanceDelta(
          input.warehouseId,
          input.itemId,
          input.direction,
          qty,
          unitCost,
          input as any,
        );
      }
      const balanceQuantity = balance?.onHand ?? 0;
      const balanceCost = balanceQuantity * unitCost;

      await this.database.invStockLedger.create({
        entryNumber,
        transactionNumber: `TXN-${Date.now().toString(36).toUpperCase()}`,
        referenceNumber,
        transactionType: input.transactionType,
        direction: input.direction,
        transactionDate: ts,
        postingDate: ts,
        itemId: input.itemId,
        variantId: input.variantId,
        batchId: input.batchId,
        batchNo: input.batchNo,
        lotNo: input.lotNo,
        serialNo: input.serialNo,
        warehouseId: input.warehouseId,
        zoneId: input.zoneId,
        rackId: input.rackId,
        shelfId: input.shelfId,
        binId: input.binId,
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        uom: input.uom,
        quantity: qty,
        unitCost,
        amount,
        balanceQuantity,
        balanceCost,
        documentRef: input.documentRef || input.referenceNumber || null,
        documentType: input.documentType,
        remarks: input.remarks,
        createdBy: input.createdBy,
        approvedBy: input.approvedBy,
      } as any);
      await this.audit.log({
        userId: input.createdBy || 'system',
        event: `stock_${input.direction.toLowerCase()}`,
        resource: '',
        details: {
          message: `${input.direction} ${qty} units of ${input.itemId}`,
          entryNumber,
          referenceNumber,
        } as any,
      });
      return { entryNumber, success: true, balanceQuantity };
    });
  }
  async postTransfer(input: {
    itemId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    quantity: number;
    unitCost?: number;
    batchId?: string;
    batchNo?: string;
    lotNo?: string;
    serialNo?: string;
    variantId?: string;
    uom?: string;
    referenceNumber?: string;
    documentRef?: string;
    createdBy?: string;
    remarks?: string;
  }) {
    return this.transactionManager.executeInTransaction(async (_ctx: TransactionContext) => {
      const qty = Math.abs(input.quantity || 0);
      if (qty <= 0) {
        throw new Error('Transfer quantity must be greater than zero');
      }
      const unitCost = input.unitCost || 0;
      const ts = new Date().toISOString();
      const baseRef = input.referenceNumber || input.documentRef || 'TRF';
      const outEntryNumber = this.generateEntryNumber();
      const inEntryNumber = this.generateEntryNumber();
      const docRef = input.documentRef || input.referenceNumber || null;

      // 1) OUT from source warehouse — decrement source onHand/available
      const sourceBalance = await this.applyBalanceDelta(
        input.fromWarehouseId,
        input.itemId,
        'OUT',
        qty,
        unitCost,
        input as any,
      );
      await this.database.invStockLedger.create({
        entryNumber: outEntryNumber,
        transactionNumber: `TXN-${Date.now().toString(36).toUpperCase()}`,
        referenceNumber: `${baseRef}-OUT-${outEntryNumber}`,
        transactionType: 'transfer_out',
        direction: 'OUT',
        transactionDate: ts,
        postingDate: ts,
        itemId: input.itemId,
        variantId: input.variantId,
        batchId: input.batchId,
        batchNo: input.batchNo,
        lotNo: input.lotNo,
        serialNo: input.serialNo,
        warehouseId: input.fromWarehouseId,
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        uom: input.uom,
        quantity: qty,
        unitCost,
        amount: qty * unitCost,
        balanceQuantity: sourceBalance?.onHand ?? 0,
        balanceCost: (sourceBalance?.onHand ?? 0) * unitCost,
        documentRef: docRef,
        documentType: 'stock_transfer',
        remarks: input.remarks || `Transfer OUT from ${input.fromWarehouseId}`,
        createdBy: input.createdBy,
      } as any);

      // 2) IN to destination warehouse — increment destination onHand/available
      const destBalance = await this.applyBalanceDelta(
        input.toWarehouseId,
        input.itemId,
        'IN',
        qty,
        unitCost,
        input as any,
      );
      await this.database.invStockLedger.create({
        entryNumber: inEntryNumber,
        transactionNumber: `TXN-${Date.now().toString(36).toUpperCase()}`,
        referenceNumber: `${baseRef}-IN-${inEntryNumber}`,
        transactionType: 'transfer_in',
        direction: 'IN',
        transactionDate: ts,
        postingDate: ts,
        itemId: input.itemId,
        variantId: input.variantId,
        batchId: input.batchId,
        batchNo: input.batchNo,
        lotNo: input.lotNo,
        serialNo: input.serialNo,
        warehouseId: input.toWarehouseId,
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        uom: input.uom,
        quantity: qty,
        unitCost,
        amount: qty * unitCost,
        balanceQuantity: destBalance?.onHand ?? 0,
        balanceCost: (destBalance?.onHand ?? 0) * unitCost,
        documentRef: docRef,
        documentType: 'stock_transfer',
        remarks: input.remarks || `Transfer IN to ${input.toWarehouseId}`,
        createdBy: input.createdBy,
      } as any);

      await this.audit.log({
        userId: input.createdBy || 'system',
        event: 'stock_transfer',
        resource: '',
        details: {
          message: `Transferred ${qty} units of ${input.itemId} from ${input.fromWarehouseId} to ${input.toWarehouseId}`,
          outEntry: outEntryNumber,
          inEntry: inEntryNumber,
        } as any,
      });
      return { outEntry: { entryNumber: outEntryNumber }, inEntry: { entryNumber: inEntryNumber } };
    });
  }
  async reverseMovement(originalEntryNumber: string, reason: string, userId?: string) {
    return this.transactionManager.executeInTransaction(async (_ctx: TransactionContext) => {
      const res = await this.database.invStockLedger.findAll({
        filters: [{ field: 'entryNumber', operator: 'eq' as const, value: originalEntryNumber }],
        pageSize: 1,
      } as any);
      const original = ((res as any)?.data || [])[0] as Record<string, any> | undefined;
      if (!original) {
        throw new Error(`Stock entry ${originalEntryNumber} not found`);
      }
      if (original.isReversal) {
        throw new Error(
          `Entry ${originalEntryNumber} is already a reversal — cannot reverse it again`,
        );
      }
      // Duplicate-reversal guard: one original may only be reversed once
      const existingReversal = await this.database.invStockLedger.findAll({
        filters: [{ field: 'reversalRefId', operator: 'eq' as const, value: original.id }],
        pageSize: 1,
      } as any);
      if (((existingReversal as any)?.data || []).length > 0) {
        throw new Error(`Entry ${originalEntryNumber} has already been reversed`);
      }

      const qty = Math.abs(original.quantity || 0);
      const unitCost = Number(original.unitCost) || 0;
      const ts = new Date().toISOString();
      const reversalEntryNumber = this.generateEntryNumber();

      // Restore the balance to its pre-entry state (opposite of the original delta)
      const originalDirection = String(original.direction).toUpperCase();
      const reverseDirection =
        originalDirection === 'IN'
          ? 'OUT'
          : originalDirection === 'OUT'
            ? 'IN'
            : originalDirection === 'RESERVE'
              ? 'RELEASE'
              : originalDirection === 'RELEASE'
                ? 'RESERVE'
                : originalDirection;
      const warehouseId = original.warehouseId || original.toWarehouseId;
      if (warehouseId && originalDirection !== 'TRANSFER') {
        await this.applyBalanceDelta(warehouseId, original.itemId, reverseDirection, qty, unitCost);
      }

      const entry = await this.database.invStockLedger.create({
        entryNumber: reversalEntryNumber,
        transactionNumber: `TXN-${Date.now().toString(36).toUpperCase()}`,
        referenceNumber: this.uniqueReference(original.referenceNumber),
        transactionType: `${original.transactionType || 'movement'}_reversal`,
        direction: 'REVERSAL',
        transactionDate: ts,
        postingDate: ts,
        itemId: original.itemId,
        variantId: original.variantId,
        batchId: original.batchId,
        batchNo: original.batchNo,
        lotNo: original.lotNo,
        serialNo: original.serialNo,
        warehouseId,
        fromWarehouseId: original.fromWarehouseId,
        toWarehouseId: original.toWarehouseId,
        uom: original.uom,
        quantity: qty,
        unitCost,
        amount: qty * unitCost,
        balanceQuantity: 0,
        balanceCost: 0,
        reversalRefId: original.id,
        isReversal: true,
        documentRef: original.documentRef || original.referenceNumber || null,
        documentType: original.documentType,
        remarks: `Reversal of ${originalEntryNumber}: ${reason}`,
        createdBy: userId,
      } as any);

      await this.audit.log({
        userId: userId || 'system',
        event: 'stock_reversal',
        resource: '',
        details: {
          message: `Reversed ${originalEntryNumber} (${qty} units)`,
          reason,
          reversalEntryNumber,
        } as any,
      });
      return { reversalEntryNumber, entryId: entry?.id, success: true };
    });
  }
}

@Injectable()
export class StockReservationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly postingEngine: InventoryPostingEngine,
  ) {}
  async reserveStock(input: {
    itemId: string;
    warehouseId: string;
    quantity: number;
    batchId?: string;
    referenceType?: string;
    referenceId?: string;
    createdBy?: string;
    remarks?: string;
  }) {
    return this.database.invStockReservation.create({
      reservationNumber: `RES-${Date.now().toString(36)}`,
      itemId: input.itemId,
      warehouseId: input.warehouseId,
      quantity: input.quantity,
      status: 'active',
      createdBy: input.createdBy || null,
      remarks: input.remarks || null,
    });
  }
  async releaseReservation(reservationId: string, userId?: string) {
    await this.database.invStockReservation.update(reservationId, {
      status: 'released',
      releasedBy: userId,
      releasedAt: new Date().toISOString(),
    });
    return { released: true, reservationNumber: '' };
  }
  async getActiveReservations(itemId: string, warehouseId?: string) {
    const filters: any[] = [
      { field: 'itemId', operator: 'eq' as const, value: itemId },
      { field: 'status', operator: 'eq' as const, value: 'active' },
    ];
    if (warehouseId) {
      filters.push({ field: 'warehouseId', operator: 'eq' as const, value: warehouseId });
    }
    return this.database.invStockReservation.findAll({ filters, pageSize: 1000 } as any);
  }
  async getReservedQuantity(itemId: string, warehouseId?: string): Promise<number> {
    const result = (await this.getActiveReservations(itemId, warehouseId)) as any;
    return ((result?.data || []) as any[]).reduce(
      (sum: number, r: any) => sum + (r.quantity || 0),
      0,
    );
  }
}

@Injectable()
export class StockReversalService {
  constructor(private readonly postingEngine: InventoryPostingEngine) {}
  async reverseMovement(input: { entryNumber: string; reason: string; userId?: string }) {
    return this.postingEngine.reverseMovement(input.entryNumber, input.reason, input.userId);
  }
}

@Injectable()
export class StockLedgerQueryService {
  constructor(private readonly database: DatabaseService) {}
  async queryLedger(query: EnterpriseQuery) {
    return this.database.invStockLedger.findAll({
      ...query,
      pageSize: query.pageSize || 50,
    } as any);
  }
  async getStockCard(itemId: string, warehouseId?: string, fromDate?: string, toDate?: string) {
    const filters: any[] = [{ field: 'itemId', operator: 'eq' as const, value: itemId }];
    if (warehouseId) {
      filters.push({ field: 'warehouseId', operator: 'eq' as const, value: warehouseId });
    }
    if (fromDate) {
      filters.push({ field: 'transactionDate', operator: 'gte' as const, value: fromDate });
    }
    if (toDate) {
      filters.push({ field: 'transactionDate', operator: 'lte' as const, value: toDate });
    }
    return this.database.invStockLedger.findAll({
      filters,
      sorts: [{ field: 'transactionDate', order: 'asc' as const }],
      pageSize: 10000,
    } as any);
  }
  async getStockBalances(warehouseId?: string, itemId?: string) {
    const filters: any[] = [];
    if (warehouseId) {
      filters.push({ field: 'warehouseId', operator: 'eq' as const, value: warehouseId });
    }
    if (itemId) {
      filters.push({ field: 'itemId', operator: 'eq' as const, value: itemId });
    }
    return this.database.invStockBalance.findAll({
      filters: filters.length > 0 ? filters : undefined,
      pageSize: 10000,
    } as any);
  }
  async getMovementReport(params: {
    transactionType?: string;
    direction?: string;
    warehouseId?: string;
    itemId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const filters: any[] = [];
    if (params?.transactionType) {
      filters.push({
        field: 'transactionType',
        operator: 'eq' as const,
        value: params.transactionType,
      });
    }
    if (params?.warehouseId) {
      filters.push({ field: 'warehouseId', operator: 'eq' as const, value: params.warehouseId });
    }
    if (params?.itemId) {
      filters.push({ field: 'itemId', operator: 'eq' as const, value: params.itemId });
    }
    return this.database.invStockLedger.findAll({
      filters,
      sorts: [{ field: 'transactionDate', order: 'desc' as const }],
      page: params?.page || 1,
      pageSize: params?.pageSize || 50,
    } as any);
  }
}

@Injectable()
export class EnterpriseTransferService {
  private transferCounter = 1;
  constructor(
    private readonly database: DatabaseService,
    private readonly postingEngine: InventoryPostingEngine,
    private readonly audit: AuditService,
  ) {}
  private generateTransferNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const seq = String(this.transferCounter++).padStart(4, '0');
    return `TRF-${ts}-${seq}`;
  }
  async createTransfer(input: {
    transferDate?: string;
    transferType?: string;
    priority?: string;
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    sourceZoneId?: string;
    destinationZoneId?: string;
    items: Array<{
      itemId: string;
      variantId?: string;
      batchId?: string;
      batchNo?: string;
      lotNo?: string;
      serialNo?: string;
      uom?: string;
      requestedQty: number;
      unitCost?: number;
      remarks?: string;
    }>;
    notes?: string;
    createdBy?: string;
  }) {
    const transferNumber = this.generateTransferNumber();
    const transferDoc = await this.database.stockTransfers.create({
      transferNumber,
      transferDate: input.transferDate || new Date().toISOString(),
      transferType: input.transferType || 'warehouse',
      priority: input.priority || 'normal',
      sourceWarehouseId: input.sourceWarehouseId,
      destinationWarehouseId: input.destinationWarehouseId,
      sourceZoneId: input.sourceZoneId || null,
      destinationZoneId: input.destinationZoneId || null,
      status: 'draft',
      createdBy: input.createdBy || null,
      notes: input.notes || null,
    });
    for (const item of input.items) {
      await this.database.transferItems.create({
        transferId: (transferDoc as any).id,
        itemId: item.itemId,
        variantId: item.variantId || null,
        batchId: item.batchId || null,
        batchNo: item.batchNo || null,
        lotNo: item.lotNo || null,
        serialNo: item.serialNo || null,
        uom: item.uom || null,
        requestedQty: item.requestedQty,
        approvedQty: 0,
        transferredQty: 0,
        receivedQty: 0,
        rejectedQty: 0,
        unitCost: item.unitCost || 0,
        remarks: item.remarks || null,
        createdBy: input.createdBy || null,
      });
    }
    return this.getTransferDetails((transferDoc as any).id);
  }
  async submitTransfer(id: string, _userId?: string) {
    const doc = (await this.database.stockTransfers.findById(id)) as any;
    if (!doc) {
      throw new Error(`Transfer ${id} not found`);
    }
    await this.database.stockTransfers.update(id, { status: 'pending_approval' });
    return this.getTransferDetails(id);
  }
  async approveTransfer(id: string, approvalNotes?: string, userId?: string) {
    const doc = (await this.database.stockTransfers.findById(id)) as any;
    if (!doc) {
      throw new Error(`Transfer ${id} not found`);
    }
    if (doc.status !== 'pending_approval') {
      throw new Error(`Cannot approve transfer in ${doc.status} status`);
    }
    await this.database.stockTransfers.update(id, {
      status: 'approved',
      approvedBy: userId,
      approvedDate: new Date().toISOString(),
      approvalNotes: approvalNotes || null,
    });
    // Default approval = full requested quantity
    const itemsResult = await this.database.transferItems.findAll({
      filters: [{ field: 'transferId', operator: 'eq' as const, value: id }],
      pageSize: 1000,
    } as any);
    for (const item of (itemsResult as any)?.data || []) {
      await this.database.transferItems.update(item.id, {
        approvedQty: item.requestedQty || 0,
      });
    }
    return this.getTransferDetails(id);
  }
  async receiveTransfer(input: {
    id: string;
    items?: Array<{ itemId: string; batchNo?: string; receivedQty: number; rejectedQty?: number }>;
    userId?: string;
  }) {
    const doc = (await this.database.stockTransfers.findById(input.id)) as any;
    if (!doc) {
      throw new Error(`Transfer ${input.id} not found`);
    }
    if (
      doc.status !== 'approved' &&
      doc.status !== 'in_transit' &&
      doc.status !== 'partially_received'
    ) {
      throw new Error(`Cannot receive transfer in ${doc.status} status`);
    }
    const itemsResult = await this.database.transferItems.findAll({
      filters: [{ field: 'transferId', operator: 'eq' as const, value: input.id }],
      pageSize: 1000,
    } as any);
    const items = ((itemsResult as any)?.data || []) as any[];
    if (items.length === 0) {
      throw new Error(`Transfer ${input.id} has no items to receive`);
    }

    // Map receive quantities by itemId (fall back to approved/requested qty)
    const receiveMap = new Map<string, { receivedQty: number; rejectedQty: number }>();
    for (const r of input.items || []) {
      receiveMap.set(r.itemId, {
        receivedQty: r.receivedQty || 0,
        rejectedQty: r.rejectedQty || 0,
      });
    }

    let anyReceived = false;
    let allReceived = true;
    for (const item of items) {
      const approvedQty = Number(item.approvedQty) || Number(item.requestedQty) || 0;
      const alreadyReceived = Number(item.receivedQty) || 0;
      const remainingQty = Math.max(0, approvedQty - alreadyReceived);
      const incoming = receiveMap.get(item.itemId);
      // Client-supplied quantity wins; otherwise fall back to the REMAINING
      // quantity (approved − already received) so a second partial receive
      // never re-posts previously received stock. Clamp to the remaining
      // approved quantity to prevent over-receipt.
      const requested = incoming ? incoming.receivedQty : remainingQty;
      const receivedQty = Math.min(Math.max(0, requested || 0), remainingQty);
      const rejectedQty = incoming ? incoming.rejectedQty || 0 : 0;
      if (receivedQty <= 0 && rejectedQty <= 0) {
        continue;
      }
      // Post the actual stock movement (OUT at source, IN at destination)
      if (receivedQty > 0) {
        anyReceived = true;
        await this.postingEngine.postTransfer({
          itemId: item.itemId,
          fromWarehouseId: doc.sourceWarehouseId,
          toWarehouseId: doc.destinationWarehouseId,
          quantity: receivedQty,
          unitCost: item.unitCost || 0,
          batchId: item.batchId || undefined,
          batchNo: item.batchNo || undefined,
          lotNo: item.lotNo || undefined,
          serialNo: item.serialNo || undefined,
          variantId: item.variantId || undefined,
          uom: item.uom || undefined,
          referenceNumber: doc.transferNumber,
          documentRef: doc.transferNumber,
          createdBy: input.userId,
          remarks: `Transfer ${doc.transferNumber} receive`,
        });
      }
      // Accumulate across multiple partial receives (never overwrite)
      const newReceivedTotal = alreadyReceived + receivedQty;
      await this.database.transferItems.update(item.id, {
        transferredQty: newReceivedTotal,
        receivedQty: newReceivedTotal,
        rejectedQty: (Number(item.rejectedQty) || 0) + rejectedQty,
      });
      if (newReceivedTotal < approvedQty) {
        allReceived = false;
      }
    }
    if (!anyReceived) {
      throw new Error('No items received on this transfer');
    }

    await this.database.stockTransfers.update(input.id, {
      status: allReceived ? 'received' : 'partially_received',
      receivedDate: new Date().toISOString(),
      receivedBy: input.userId,
    });
    return this.getTransferDetails(input.id);
  }
  async rejectTransfer(id: string, reason: string, _userId?: string) {
    await this.database.stockTransfers.update(id, { status: 'rejected', approvalNotes: reason });
    return this.getTransferDetails(id);
  }
  async cancelTransfer(id: string, reason: string, _userId?: string) {
    await this.database.stockTransfers.update(id, { status: 'cancelled', notes: reason });
    return this.getTransferDetails(id);
  }
  async getTransferDetails(id: string) {
    const doc = await this.database.stockTransfers.findById(id);
    if (!doc) {
      return null;
    }
    const itemsResult = await this.database.transferItems.findAll({
      filters: [{ field: 'transferId', operator: 'eq' as const, value: id }],
      pageSize: 1000,
    } as any);
    return { ...(doc as any), items: (itemsResult as any)?.data || [] };
  }
  async listTransfers(params: { page?: number; pageSize?: number; search?: string }) {
    return this.database.stockTransfers.findAll({
      page: params.page || 1,
      pageSize: params.pageSize || 50,
      search: params.search,
      sorts: [{ field: 'createdAt', order: 'desc' as const }],
    } as any);
  }
  async markInTransit(
    id: string,
    expectedArrival?: string,
    transitNotes?: string,
    _userId?: string,
  ) {
    await this.database.stockTransfers.update(id, {
      status: 'in_transit',
      expectedArrival: expectedArrival || null,
      transitNotes: transitNotes || null,
    });
    return this.getTransferDetails(id);
  }
  async getDashboard() {
    const result = await this.database.stockTransfers.findAll({ pageSize: 10000 } as any);
    const all = (result.data || []) as any[];
    return {
      total: all.length,
      draft: all.filter((t: any) => t.status === 'draft').length,
      pending: all.filter((t: any) => t.status === 'pending_approval').length,
      approved: all.filter((t: any) => t.status === 'approved').length,
      inTransit: all.filter((t: any) => t.status === 'in_transit').length,
      received: all.filter((t: any) => t.status === 'received' || t.status === 'partially_received')
        .length,
      rejected: all.filter((t: any) => t.status === 'rejected').length,
      cancelled: all.filter((t: any) => t.status === 'cancelled').length,
    };
  }
  async getReport(params: {
    status?: string;
    warehouseId?: string;
    sourceWarehouseId?: string;
    destinationWarehouseId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const filters: any[] = [];
    if (params?.status) {
      filters.push({ field: 'status', operator: 'eq' as const, value: params.status });
    }
    return this.database.stockTransfers.findAll({
      filters: filters.length > 0 ? filters : undefined,
      page: params?.page || 1,
      pageSize: params?.pageSize || 50,
      sorts: [{ field: 'createdAt', order: 'desc' as const }],
    } as any);
  }
}

@Injectable()
export class EnterpriseAdjustmentService {
  private adjCounter = 1;
  constructor(
    private readonly database: DatabaseService,
    private readonly postingEngine: InventoryPostingEngine,
    private readonly audit: AuditService,
  ) {}
  private generateAdjustmentNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    return `ADJ-${ts}-${String(this.adjCounter++).padStart(4, '0')}`;
  }
  async createAdjustment(input: {
    adjustmentDate?: string;
    adjustmentType: string;
    reasonCode?: string;
    warehouseId: string;
    zoneId?: string;
    rackId?: string;
    shelfId?: string;
    binId?: string;
    referenceNumber?: string;
    items: Array<{
      itemId: string;
      variantId?: string;
      batchId?: string;
      batchNo?: string;
      lotNo?: string;
      serialNo?: string;
      uom?: string;
      systemQty: number;
      physicalQty: number;
      unitCost?: number;
      reason?: string;
    }>;
    remarks?: string;
    createdBy?: string;
  }) {
    const adjNumber = this.generateAdjustmentNumber();
    const doc = await this.database.stockAdjustments.create({
      adjustmentNumber: adjNumber,
      adjustmentDate: input.adjustmentDate || new Date().toISOString(),
      adjustmentType: input.adjustmentType,
      reasonCode: input.reasonCode || null,
      warehouseId: input.warehouseId,
      zoneId: input.zoneId || null,
      rackId: input.rackId || null,
      shelfId: input.shelfId || null,
      binId: input.binId || null,
      status: 'draft',
      referenceNumber: input.referenceNumber || null,
      createdBy: input.createdBy || null,
      remarks: input.remarks || null,
    });
    for (const item of input.items) {
      const adjQty = item.physicalQty - item.systemQty;
      await this.database.adjustmentItems.create({
        adjustmentId: (doc as any).id,
        itemId: item.itemId,
        variantId: item.variantId || null,
        batchId: item.batchId || null,
        batchNo: item.batchNo || null,
        lotNo: item.lotNo || null,
        serialNo: item.serialNo || null,
        uom: item.uom || null,
        systemQty: item.systemQty,
        physicalQty: item.physicalQty,
        adjustmentQty: adjQty,
        unitCost: item.unitCost || 0,
        amount: adjQty * (item.unitCost || 0),
        reason: item.reason || null,
        createdBy: input.createdBy || null,
      });
    }
    return this.getAdjustmentDetails((doc as any).id);
  }
  async submitAdjustment(id: string, _userId?: string) {
    const doc = (await this.database.stockAdjustments.findById(id)) as any;
    if (!doc) {
      throw new Error(`Adjustment ${id} not found`);
    }
    await this.database.stockAdjustments.update(id, { status: 'pending_approval' });
    return this.getAdjustmentDetails(id);
  }
  async approveAndPostAdjustment(id: string, approvalNotes?: string, userId?: string) {
    const doc = (await this.database.stockAdjustments.findById(id)) as any;
    if (!doc) {
      throw new Error(`Adjustment ${id} not found`);
    }
    if (doc.status !== 'pending_approval' && doc.status !== 'submitted') {
      throw new Error(`Cannot approve adjustment in ${doc.status} status`);
    }
    const itemsResult = await this.database.adjustmentItems.findAll({
      filters: [{ field: 'adjustmentId', operator: 'eq' as const, value: id }],
      pageSize: 1000,
    } as any);
    const items = ((itemsResult as any)?.data || []) as any[];
    for (const item of items) {
      const adjQty = Math.abs(item.adjustmentQty || 0);
      if (adjQty <= 0) {
        continue;
      }
      await this.postingEngine.postMovement({
        transactionType: 'adjustment',
        direction: item.adjustmentQty > 0 ? ('IN' as const) : ('OUT' as const),
        itemId: item.itemId,
        warehouseId: doc.warehouseId,
        quantity: adjQty,
        unitCost: item.unitCost || 0,
        batchId: item.batchId || undefined,
        batchNo: item.batchNo || undefined,
        lotNo: item.lotNo || undefined,
        serialNo: item.serialNo || undefined,
        uom: item.uom || undefined,
        variantId: item.variantId || undefined,
        zoneId: doc.zoneId || undefined,
        rackId: doc.rackId || undefined,
        shelfId: doc.shelfId || undefined,
        binId: doc.binId || undefined,
        referenceNumber: doc.adjustmentNumber,
        documentType: 'stock_adjustment',
        remarks: `Adjustment ${doc.adjustmentNumber}: ${doc.adjustmentType}`,
        createdBy: userId,
      });
    }
    await this.database.stockAdjustments.update(id, {
      status: 'posted',
      approvedBy: userId,
      approvedDate: new Date().toISOString(),
      approvalNotes: approvalNotes || null,
      postedBy: userId,
      postedDate: new Date().toISOString(),
    });
    return this.getAdjustmentDetails(id);
  }
  async rejectAdjustment(id: string, reason: string, _userId?: string) {
    await this.database.stockAdjustments.update(id, { status: 'rejected', approvalNotes: reason });
    return this.getAdjustmentDetails(id);
  }
  async cancelAdjustment(id: string, reason: string, _userId?: string) {
    await this.database.stockAdjustments.update(id, { status: 'cancelled', remarks: reason });
    return this.getAdjustmentDetails(id);
  }
  async reverseAdjustment(id: string, reason: string, userId?: string) {
    const doc = (await this.database.stockAdjustments.findById(id)) as any;
    if (!doc) {
      throw new Error(`Adjustment ${id} not found`);
    }
    if (doc.status !== 'posted') {
      throw new Error(`Can only reverse posted adjustments, not ${doc.status}`);
    }
    const itemsResult = await this.database.adjustmentItems.findAll({
      filters: [{ field: 'adjustmentId', operator: 'eq' as const, value: id }],
      pageSize: 1000,
    } as any);
    const items = ((itemsResult as any)?.data || []) as any[];
    const reversalItems = items.map((item: any) => ({
      itemId: item.itemId,
      variantId: item.variantId,
      batchId: item.batchId,
      batchNo: item.batchNo,
      lotNo: item.lotNo,
      serialNo: item.serialNo,
      uom: item.uom,
      systemQty: item.physicalQty,
      physicalQty: item.systemQty,
      unitCost: item.unitCost,
      reason: `Reversal: ${reason}`,
    }));
    const reversalDoc = await this.createAdjustment({
      adjustmentType: `${doc.adjustmentType}_reversal`,
      reasonCode: 'reversal',
      warehouseId: doc.warehouseId,
      zoneId: doc.zoneId || undefined,
      rackId: doc.rackId || undefined,
      shelfId: doc.shelfId || undefined,
      binId: doc.binId || undefined,
      referenceNumber: doc.adjustmentNumber,
      items: reversalItems,
      remarks: `Reversal of adjustment ${doc.adjustmentNumber}: ${reason}`,
      createdBy: userId,
    });
    const reversalId = (reversalDoc as any)?.id;
    if (reversalId) {
      await this.submitAdjustment(reversalId, userId);
      await this.approveAndPostAdjustment(reversalId, `Auto-posted reversal: ${reason}`, userId);
    }
    await this.database.stockAdjustments.update(id, { status: 'reversed', reversalReason: reason });
    return {
      original: await this.getAdjustmentDetails(id),
      reversal: await this.getAdjustmentDetails(reversalId),
    };
  }
  async getAdjustmentDetails(id: string) {
    const doc = await this.database.stockAdjustments.findById(id);
    if (!doc) {
      return null;
    }
    const itemsResult = await this.database.adjustmentItems.findAll({
      filters: [{ field: 'adjustmentId', operator: 'eq' as const, value: id }],
      pageSize: 1000,
    } as any);
    return { ...(doc as any), items: (itemsResult as any)?.data || [] };
  }
  async listAdjustments(params: { page?: number; pageSize?: number; search?: string }) {
    return this.database.stockAdjustments.findAll({
      page: params.page || 1,
      pageSize: params.pageSize || 50,
      search: params.search,
      sorts: [{ field: 'createdAt', order: 'desc' as const }],
    } as any);
  }
  async getDashboard() {
    const result = await this.database.stockAdjustments.findAll({ pageSize: 10000 } as any);
    const all = (result.data || []) as any[];
    const today = new Date().toISOString().slice(0, 10);
    return {
      todayAdjustments: all.filter((a: any) => a.createdAt?.slice(0, 10) === today).length,
      pendingApproval: all.filter((a: any) => a.status === 'pending_approval').length,
      postedToday: all.filter((a: any) => a.postedDate?.slice(0, 10) === today).length,
      damageValue: 0,
      scrapValue: 0,
      expiryLoss: 0,
      rejected: all.filter((a: any) => a.status === 'rejected').length,
      total: all.length,
    };
  }
  async getReport(params: {
    adjustmentType?: string;
    status?: string;
    warehouseId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const filters: any[] = [];
    if (params?.adjustmentType) {
      filters.push({
        field: 'adjustmentType',
        operator: 'eq' as const,
        value: params.adjustmentType,
      });
    }
    if (params?.status) {
      filters.push({ field: 'status', operator: 'eq' as const, value: params.status });
    }
    if (params?.warehouseId) {
      filters.push({ field: 'warehouseId', operator: 'eq' as const, value: params.warehouseId });
    }
    return this.database.stockAdjustments.findAll({
      filters: filters.length > 0 ? filters : undefined,
      page: params?.page || 1,
      pageSize: params?.pageSize || 50,
    } as any);
  }
}

// ═════════════════════════════════════════════════════════
// STEP 23: Enterprise Physical Count & Cycle Counting Service
// ═════════════════════════════════════════════════════════
@Injectable()
export class PhysicalCountService {
  private countCounter = 1;
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly adjustmentService: EnterpriseAdjustmentService,
  ) {}
  private generateCountNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    return `CNT-${ts}-${String(this.countCounter++).padStart(4, '0')}`;
  }
  private calcVariance(
    systemQty: number,
    countedQty: number,
  ): { variance: number; variancePercent: number } {
    const variance = countedQty - systemQty;
    const variancePercent =
      systemQty !== 0
        ? Math.round((Math.abs(variance) / systemQty) * 10000) / 100
        : variance !== 0
          ? 100
          : 0;
    return { variance, variancePercent };
  }
  async createCount(input: {
    countDate?: string;
    countType?: string;
    warehouseId: string;
    zoneId?: string;
    rackId?: string;
    shelfId?: string;
    binId?: string;
    department?: string;
    priority?: string;
    assignedTo?: string;
    supervisor?: string;
    items: Array<{
      itemId: string;
      variantId?: string;
      batchId?: string;
      batchNo?: string;
      lotNo?: string;
      serialNo?: string;
      uom?: string;
      systemQty: number;
      countedQty?: number;
      remarks?: string;
    }>;
    remarks?: string;
    createdBy?: string;
  }) {
    const countNumber = this.generateCountNumber();
    const doc = await this.database.physicalCountHeaders.create({
      countNumber,
      countDate: input.countDate || new Date().toISOString(),
      countType: input.countType || 'full_warehouse',
      warehouseId: input.warehouseId,
      zoneId: input.zoneId || null,
      rackId: input.rackId || null,
      shelfId: input.shelfId || null,
      binId: input.binId || null,
      department: input.department || null,
      priority: input.priority || 'normal',
      status: 'draft',
      assignedTo: input.assignedTo || null,
      supervisor: input.supervisor || null,
      createdBy: input.createdBy || null,
      remarks: input.remarks || null,
      totalItems: input.items.length,
      totalSystemQty: input.items.reduce((s, i) => s + (i.systemQty || 0), 0),
      totalCountedQty: input.items.reduce((s, i) => s + (i.countedQty || 0), 0),
      totalVariance: 0,
      variancePercent: 0,
    });
    for (const item of input.items) {
      const { variance, variancePercent } = this.calcVariance(item.systemQty, item.countedQty || 0);
      await this.database.physicalCountItems.create({
        countId: (doc as any).id,
        itemId: item.itemId,
        variantId: item.variantId || null,
        batchId: item.batchId || null,
        batchNo: item.batchNo || null,
        lotNo: item.lotNo || null,
        serialNo: item.serialNo || null,
        uom: item.uom || null,
        systemQty: item.systemQty,
        countedQty: item.countedQty || null,
        recountQty: null,
        verifiedQty: null,
        finalQty: null,
        variance,
        variancePercent,
        status: item.countedQty !== undefined ? 'counted' : 'pending',
        counter: input.createdBy || null,
        countMethod: 'manual',
        remarks: item.remarks || null,
        createdBy: input.createdBy || null,
      });
    }
    await this.recalculateTotals((doc as any).id);
    return this.getCountDetails((doc as any).id);
  }
  async listCounts(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    countType?: string;
    warehouseId?: string;
  }) {
    const filters: any[] = [];
    if (params.status) {
      filters.push({ field: 'status', operator: 'eq' as const, value: params.status });
    }
    if (params.countType) {
      filters.push({ field: 'countType', operator: 'eq' as const, value: params.countType });
    }
    if (params.warehouseId) {
      filters.push({ field: 'warehouseId', operator: 'eq' as const, value: params.warehouseId });
    }
    return this.database.physicalCountHeaders.findAll({
      filters: filters.length > 0 ? filters : undefined,
      page: params.page || 1,
      pageSize: params.pageSize || 50,
      search: params.search,
      sorts: [{ field: 'createdAt', order: 'desc' as const }],
    } as any);
  }
  async getCountDetails(id: string) {
    const doc = await this.database.physicalCountHeaders.findById(id);
    if (!doc) {
      return null;
    }
    const itemsResult = await this.database.physicalCountItems.findAll({
      filters: [{ field: 'countId', operator: 'eq' as const, value: id }],
      pageSize: 10000,
    } as any);
    return { ...(doc as any), items: (itemsResult as any)?.data || [] };
  }
  async updateCount(id: string, data: any, _userId?: string) {
    const doc = (await this.database.physicalCountHeaders.findById(id)) as any;
    if (!doc) {
      throw new Error(`Count ${id} not found`);
    }
    if (doc.status !== 'draft') {
      throw new Error(`Cannot update count in ${doc.status} status`);
    }
    await this.database.physicalCountHeaders.update(id, data);
    return this.getCountDetails(id);
  }
  async deleteCount(id: string, _userId?: string) {
    const doc = (await this.database.physicalCountHeaders.findById(id)) as any;
    if (!doc) {
      throw new Error(`Count ${id} not found`);
    }
    if (doc.status !== 'draft') {
      throw new Error(`Cannot delete count in ${doc.status} status`);
    }
    const itemsResult = await this.database.physicalCountItems.findAll({
      filters: [{ field: 'countId', operator: 'eq' as const, value: id }],
      pageSize: 10000,
    } as any);
    for (const item of (itemsResult as any)?.data || []) {
      await this.database.physicalCountItems.softDelete(item.id);
    }
    await this.database.physicalCountHeaders.softDelete(id);
    return { deleted: true };
  }
  async addCountItem(countId: string, input: any, userId?: string) {
    const { variance, variancePercent } = this.calcVariance(input.systemQty, input.countedQty || 0);
    const item = await this.database.physicalCountItems.create({
      countId,
      itemId: input.itemId,
      variantId: input.variantId || null,
      batchId: input.batchId || null,
      batchNo: input.batchNo || null,
      lotNo: input.lotNo || null,
      serialNo: input.serialNo || null,
      uom: input.uom || null,
      systemQty: input.systemQty,
      countedQty: input.countedQty || null,
      variance,
      variancePercent,
      status: input.countedQty !== undefined ? 'counted' : 'pending',
      counter: userId || null,
      countMethod: 'manual',
      remarks: input.remarks || null,
      createdBy: userId || null,
    });
    await this.recalculateTotals(countId);
    return item;
  }
  async updateCountItem(itemId: string, data: any, _userId?: string) {
    const item = (await this.database.physicalCountItems.findById(itemId)) as any;
    if (!item) {
      throw new Error(`Count item ${itemId} not found`);
    }
    if (data.countedQty !== undefined) {
      const { variance, variancePercent } = this.calcVariance(item.systemQty, data.countedQty);
      data.variance = variance;
      data.variancePercent = variancePercent;
      data.status = 'counted';
    }
    await this.database.physicalCountItems.update(itemId, data);
    await this.recalculateTotals(item.countId);
    return this.database.physicalCountItems.findById(itemId);
  }
  async removeCountItem(itemId: string, _userId?: string) {
    await this.database.physicalCountItems.softDelete(itemId);
    return { removed: true };
  }
  private async recalculateTotals(countId: string) {
    const itemsResult = await this.database.physicalCountItems.findAll({
      filters: [{ field: 'countId', operator: 'eq' as const, value: countId }],
      pageSize: 10000,
    } as any);
    const items = (itemsResult as any)?.data || [];
    const totalItems = items.length;
    const totalSystemQty = items.reduce((s: number, i: any) => s + (i.systemQty || 0), 0);
    const totalCountedQty = items.reduce(
      (s: number, i: any) => s + (i.countedQty || i.finalQty || 0),
      0,
    );
    const totalVariance = items.reduce((s: number, i: any) => s + (i.variance || 0), 0);
    const variancePercent =
      totalSystemQty !== 0
        ? Math.round((Math.abs(totalVariance) / totalSystemQty) * 10000) / 100
        : totalVariance !== 0
          ? 100
          : 0;
    await this.database.physicalCountHeaders.update(countId, {
      totalItems,
      totalSystemQty,
      totalCountedQty,
      totalVariance,
      variancePercent,
    });
  }
  async assignCount(id: string, assignedTo: string, _userId?: string) {
    const doc = (await this.database.physicalCountHeaders.findById(id)) as any;
    if (!doc) {
      throw new Error(`Count ${id} not found`);
    }
    if (doc.status !== 'draft') {
      throw new Error(`Cannot assign count in ${doc.status} status`);
    }
    await this.database.physicalCountHeaders.update(id, {
      status: 'assigned',
      assignedTo,
      assignedDate: new Date().toISOString(),
    });
    return this.getCountDetails(id);
  }
  async startCount(id: string, _userId?: string) {
    const doc = (await this.database.physicalCountHeaders.findById(id)) as any;
    if (!doc) {
      throw new Error(`Count ${id} not found`);
    }
    await this.database.physicalCountHeaders.update(id, { status: 'in_progress' });
    return this.getCountDetails(id);
  }
  async submitCount(id: string, _userId?: string) {
    const doc = (await this.database.physicalCountHeaders.findById(id)) as any;
    if (!doc) {
      throw new Error(`Count ${id} not found`);
    }
    if (doc.status !== 'in_progress') {
      throw new Error(`Cannot submit count in ${doc.status} status`);
    }
    await this.database.physicalCountHeaders.update(id, { status: 'submitted' });
    return this.getCountDetails(id);
  }
  async verifyCount(
    id: string,
    input: { verifierId: string; approvalNotes?: string },
    userId?: string,
  ) {
    const doc = (await this.database.physicalCountHeaders.findById(id)) as any;
    if (!doc) {
      throw new Error(`Count ${id} not found`);
    }
    if (doc.status !== 'submitted') {
      throw new Error(`Cannot verify count in ${doc.status} status`);
    }
    const itemsResult = await this.database.physicalCountItems.findAll({
      filters: [{ field: 'countId', operator: 'eq' as const, value: id }],
      pageSize: 10000,
    } as any);
    for (const item of (itemsResult as any)?.data || []) {
      const verifiedQty = item.countedQty || 0;
      const { variance, variancePercent } = this.calcVariance(item.systemQty, verifiedQty);
      await this.database.physicalCountItems.update(item.id, {
        verifiedQty,
        finalQty: verifiedQty,
        variance,
        variancePercent,
        status: 'verified',
      });
    }
    await this.database.physicalCountHeaders.update(id, {
      status: 'verified',
      verifier: input.verifierId,
      verifiedBy: userId,
      verifiedDate: new Date().toISOString(),
    });
    await this.recalculateTotals(id);
    return this.getCountDetails(id);
  }
  async approveCount(
    id: string,
    input: { autoCreateAdjustment?: boolean; approvalNotes?: string },
    userId?: string,
  ) {
    const doc = (await this.database.physicalCountHeaders.findById(id)) as any;
    if (!doc) {
      throw new Error(`Count ${id} not found`);
    }
    if (doc.status !== 'verified') {
      throw new Error(`Cannot approve count in ${doc.status} status`);
    }
    await this.database.physicalCountHeaders.update(id, {
      status: 'approved',
      approvedBy: userId,
      approvedDate: new Date().toISOString(),
    });
    let adjustment = null;
    if (input.autoCreateAdjustment) {
      adjustment = await this.generateAdjustmentFromCount(
        id,
        { postImmediately: true, approvalNotes: input.approvalNotes },
        userId,
      );
    }
    const result = await this.getCountDetails(id);
    return { ...result, adjustment };
  }
  async completeCount(id: string, input: { remarks?: string }, userId?: string) {
    const doc = (await this.database.physicalCountHeaders.findById(id)) as any;
    if (!doc) {
      throw new Error(`Count ${id} not found`);
    }
    if (doc.status !== 'approved') {
      throw new Error(`Cannot complete count in ${doc.status} status`);
    }
    await this.database.physicalCountHeaders.update(id, {
      status: 'completed',
      completedBy: userId,
      completedDate: new Date().toISOString(),
      remarks: input.remarks || doc.remarks,
    });
    return this.getCountDetails(id);
  }
  async rejectCount(id: string, input: { reason: string }, _userId?: string) {
    const doc = (await this.database.physicalCountHeaders.findById(id)) as any;
    if (!doc) {
      throw new Error(`Count ${id} not found`);
    }
    await this.database.physicalCountHeaders.update(id, { status: 'draft', remarks: input.reason });
    return this.getCountDetails(id);
  }
  async cancelCount(id: string, input: { reason: string }, _userId?: string) {
    const doc = (await this.database.physicalCountHeaders.findById(id)) as any;
    if (!doc) {
      throw new Error(`Count ${id} not found`);
    }
    await this.database.physicalCountHeaders.update(id, {
      status: 'cancelled',
      remarks: input.reason,
    });
    return this.getCountDetails(id);
  }
  async generateAdjustmentFromCount(
    countId: string,
    input: { postImmediately?: boolean; approvalNotes?: string },
    userId?: string,
  ) {
    const doc = (await this.database.physicalCountHeaders.findById(countId)) as any;
    if (!doc) {
      throw new Error(`Count ${countId} not found`);
    }
    if (doc.status !== 'verified' && doc.status !== 'approved') {
      throw new Error(
        `Can only generate adjustment from verified/approved counts, not ${doc.status}`,
      );
    }
    const itemsResult = await this.database.physicalCountItems.findAll({
      filters: [{ field: 'countId', operator: 'eq' as const, value: countId }],
      pageSize: 10000,
    } as any);
    const items = (itemsResult as any)?.data || [];
    const varianceItems = items.filter((i: any) => i.variance !== 0 && i.variance !== null);
    if (varianceItems.length === 0) {
      return { message: 'No variances found', adjustment: null };
    }
    const totalVariance = varianceItems.reduce((s: number, i: any) => s + (i.variance || 0), 0);
    const adjustmentItems = varianceItems.map((i: any) => ({
      itemId: i.itemId,
      variantId: i.variantId || undefined,
      batchId: i.batchId || undefined,
      batchNo: i.batchNo || undefined,
      lotNo: i.lotNo || undefined,
      serialNo: i.serialNo || undefined,
      uom: i.uom || undefined,
      systemQty: i.systemQty,
      physicalQty: i.finalQty || i.verifiedQty || i.countedQty || 0,
      unitCost: 0,
      reason: i.remarks || `Count variance: ${Math.abs(i.variance)}`,
    }));
    const adjustment = await this.adjustmentService.createAdjustment({
      adjustmentType: totalVariance > 0 ? 'found' : 'shrinkage',
      reasonCode: 'physical_count_variance',
      warehouseId: doc.warehouseId,
      zoneId: doc.zoneId || undefined,
      rackId: doc.rackId || undefined,
      shelfId: doc.shelfId || undefined,
      binId: doc.binId || undefined,
      referenceNumber: doc.countNumber,
      items: adjustmentItems,
      remarks: `Auto-generated from count ${doc.countNumber}`,
      createdBy: userId,
    });
    if (input.postImmediately) {
      const adjId = (adjustment as any)?.id;
      if (adjId) {
        await this.adjustmentService.submitAdjustment(adjId, userId);
        await this.adjustmentService.approveAndPostAdjustment(
          adjId,
          input.approvalNotes || 'Auto-approved from physical count',
          userId,
        );
      }
    }
    await this.database.physicalCountHeaders.update(countId, {
      adjustmentId: (adjustment as any)?.id || null,
    });
    return { adjustment, countId, varianceItems: varianceItems.length };
  }
  async getDashboard() {
    const result = await this.database.physicalCountHeaders.findAll({ pageSize: 10000 } as any);
    const all = (result.data || []) as any[];
    const today = new Date().toISOString().slice(0, 10);
    return {
      todayCounts: all.filter((c: any) => c.countDate?.slice(0, 10) === today).length,
      pendingVerification: all.filter((c: any) => c.status === 'submitted').length,
      inProgress: all.filter((c: any) => c.status === 'in_progress').length,
      completed: all.filter((c: any) => c.status === 'completed').length,
      approved: all.filter((c: any) => c.status === 'approved').length,
      totalCounts: all.length,
      totalVariance: all.reduce((s: number, c: any) => s + Math.abs(c.totalVariance || 0), 0),
      variancePercent:
        all.length > 0
          ? all.reduce((s: number, c: any) => s + (c.variancePercent || 0), 0) / all.length
          : 0,
      adjustmentsPending: all.filter((c: any) => c.status === 'approved' && !c.adjustmentId).length,
    };
  }
  async getReport(params: {
    status?: string;
    countType?: string;
    warehouseId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const filters: any[] = [];
    if (params?.status) {
      filters.push({ field: 'status', operator: 'eq' as const, value: params.status });
    }
    if (params?.countType) {
      filters.push({ field: 'countType', operator: 'eq' as const, value: params.countType });
    }
    if (params?.warehouseId) {
      filters.push({ field: 'warehouseId', operator: 'eq' as const, value: params.warehouseId });
    }
    return this.database.physicalCountHeaders.findAll({
      filters: filters.length > 0 ? filters : undefined,
      page: params?.page || 1,
      pageSize: params?.pageSize || 50,
    } as any);
  }
  async getVarianceReport(_params: { warehouseId?: string; fromDate?: string; toDate?: string }) {
    const result = await this.database.physicalCountHeaders.findAll({ pageSize: 10000 } as any);
    return {
      totalCounts: (result.data || []).length,
      completedCounts: 0,
      totalItems: 0,
      totalVariance: 0,
      accuracy: 100,
    };
  }
  async getABCReport() {
    return {
      totalABCCounts: 0,
      completed: 0,
      aCategoryCounts: 0,
      bCategoryCounts: 0,
      cCategoryCounts: 0,
      counts: [],
    };
  }
  async getAccuracyReport(_warehouseId?: string) {
    return { accuracy: 100, totalItems: 0, totalCounts: 0, varianceItems: 0, variancePercent: 0 };
  }
}
