import { Injectable } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { BaseMasterService } from '../masters/base-master.service';

@Injectable()
export class ItemsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.items, 'Item', audit, 'sku'); }

  async duplicate(id: string, userId?: string) {
    const original = await this.findById(id);
    const { id: _id, createdAt, updatedAt, deletedAt, isDeleted, createdBy, updatedBy, ...data } = original as any;
    data.name = `${data.name} (Copy)`;
    data.sku = `${data.sku || 'PROD'}-COPY-${Date.now().toString(36).toUpperCase()}`;
    return this.create(data, userId);
  }
}

@Injectable()
export class ItemVariantsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.itemVariants, 'ItemVariant', audit, 'sku'); }
}

@Injectable()
export class ItemGroupsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.itemGroups, 'ItemGroup', audit, 'name'); }
}

@Injectable()
export class ItemPricingService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.itemPricing, 'ItemPricing', audit); }
}

@Injectable()
export class ItemBarcodesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.itemBarcodes, 'ItemBarcode', audit, 'barcode'); }
}

@Injectable()
export class HsnCodesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.hsnCodes, 'HsnCode', audit, 'code'); }
}

@Injectable()
export class StockOpeningService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.stockOpening, 'StockOpening', audit); }
}

@Injectable()
export class ItemImagesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.itemImages, 'ItemImage', audit); }
}

@Injectable()
export class InventorySettingsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.inventorySettings, 'InventorySettings', audit); }
}

// ── PRM-015B: Batch Management (Enhanced) ──────────────
@Injectable()
export class BatchStockService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super((database as any).batchStock, 'Batch', audit, 'batchNo'); }

  /** Auto-calculate batch expiry status and available quantity */
  private calcExpiryStatus(expDate?: string): 'fresh' | 'near_expiry' | 'expired' {
    if (!expDate) {return 'fresh';}
    const now = new Date();
    const expiry = new Date(expDate);
    if (expiry < now) {return 'expired';}
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 30) {return 'near_expiry';}
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
    if (itemId) {batches = batches.filter((b: any) => b.itemId === itemId);}
    if (warehouseId) {batches = batches.filter((b: any) => b.warehouseId === warehouseId);}
    return {
      totalCurrentStock: batches.reduce((s: number, b: any) => s + (b.quantity || 0), 0),
      totalReserved: batches.reduce((s: number, b: any) => s + (b.reservedQuantity || 0), 0),
      totalAvailable: batches.reduce((s: number, b: any) => s + (b.availableQuantity || b.quantity || 0), 0),
      totalDamaged: batches.filter((b: any) => b.status === 'damaged').reduce((s: number, b: any) => s + (b.quantity || 0), 0),
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

  async recordAdjustment(id: string, data: { type: 'increase' | 'decrease'; quantity: number; reason: string; remarks?: string }, userId?: string) {
    const batch = await this.findById(id) as any;
    const oldQty = batch.quantity || 0;
    const adjQty = data.type === 'increase' ? data.quantity : -data.quantity;
    const newQty = Math.max(0, oldQty + adjQty);
    const updated = await this.update(id, {
      quantity: newQty,
      availableQuantity: newQty - (batch.reservedQuantity || 0),
    }, userId);
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
  setDatabaseService(db: any) { this.databaseService = db; }
}

// ── PRM-015B: Stock Ledger Service ────────────────────────
@Injectable()
export class StockLedgerService {
  constructor(private readonly database: DatabaseService) {}

  async getLedger(params: { page?: number; pageSize?: number; itemId?: string; batchNo?: string; movementType?: string; fromDate?: string; toDate?: string }) {
    const movements = (this.database as any).stockMovements;
    if (!movements) {return { data: [], total: 0, totalPages: 0 };}
    const result = await movements.findAll({ page: params.page || 1, pageSize: params.pageSize || 50 });
    let data = (result.data || []) as any[];
    if (params.itemId) {data = data.filter((m: any) => m.itemId === params.itemId);}
    if (params.batchNo) {data = data.filter((m: any) => m.batchNo === params.batchNo);}
    if (params.movementType) {data = data.filter((m: any) => m.movementType === params.movementType);}
    if (params.fromDate) {data = data.filter((m: any) => m.createdAt && new Date(m.createdAt) >= new Date(params.fromDate!));}
    if (params.toDate) {data = data.filter((m: any) => m.createdAt && new Date(m.createdAt) <= new Date(params.toDate!));}
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
  constructor(database: DatabaseService, audit: AuditService) { super((database as any).stockMovements, 'StockMovement', audit); }
}

// ── PRM-015: Warehouse Location ─────────────────────────
@Injectable()
export class WarehouseLocationService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super((database as any).warehouseLocations, 'WarehouseLocation', audit, 'locationCode'); }
}

// ── PRM-015: Damage Register ────────────────────────────
@Injectable()
export class DamageRegisterService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super((database as any).damageRegister, 'DamageRegister', audit); }
}

// ── PRM-015: Recall Register ────────────────────────────
@Injectable()
export class RecallRegisterService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super((database as any).recallRegister, 'RecallRegister', audit); }
}

// ── PRM-015: Distributor Return Queue ───────────────────
@Injectable()
export class DistributorReturnService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super((database as any).distributorReturnQueue, 'DistributorReturn', audit); }
}

@Injectable()
export class ReplacementQueueService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super((database as any).replacementQueue, 'ReplacementQueue', audit); }
}

// ── PRM-015A: Sub Category ──────────────────────────────
@Injectable()
export class SubCategoriesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super((database as any).subCategories, 'SubCategory', audit, 'name'); }
}

// ── PRM-015C: Stock Transfer ────────────────────────────
@Injectable()
export class StockTransferService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super((database as any).stockTransfers, 'StockTransfer', audit, 'transferNumber'); }

  async approve(id: string, userId?: string) {
    return this.update(id, { status: 'approved', approvedBy: userId, approvedDate: new Date().toISOString() }, userId);
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
      (this.database as any).warehouseLocations?.findAll({ page: 1, pageSize: 1000 }) || { data: [] },
      (this.database as any).batchStock?.findAll({ page: 1, pageSize: 1000 }) || { data: [] },
      (this.database as any).stockTransfers?.findAll({ page: 1, pageSize: 1000 }) || { data: [] },
    ]);
    const warehouses = (whResult.data || []).filter((w: any) =>
      w.name?.toLowerCase().includes(q) || w.code?.toLowerCase().includes(q) ||
      w.city?.toLowerCase().includes(q) || w.contactPerson?.toLowerCase().includes(q)
    );
    const locations = (locResult.data || []).filter((l: any) =>
      l.godown?.toLowerCase().includes(q) || l.rack?.toLowerCase().includes(q) ||
      l.shelf?.toLowerCase().includes(q) || l.bin?.toLowerCase().includes(q) ||
      l.locationCode?.toLowerCase().includes(q)
    );
    const batches = (batchResult.data || []).filter((b: any) =>
      b.batchNo?.toLowerCase().includes(q) || b.itemId?.toLowerCase().includes(q)
    );
    const transfers = (transferResult.data || []).filter((t: any) =>
      t.transferNumber?.toLowerCase().includes(q) ||
      t.fromLocation?.toLowerCase().includes(q) || t.toLocation?.toLowerCase().includes(q)
    );
    return { warehouses, locations, batches, transfers, total: warehouses.length + locations.length + batches.length + transfers.length };
  }

  async getDashboard() {
    const warehouses = await (this.database as any).warehouses?.findAll({ page: 1, pageSize: 1000 }) || { data: [] };
    const locations = await (this.database as any).warehouseLocations?.findAll({ page: 1, pageSize: 1000 }) || { data: [] };
    const batches = await (this.database as any).batchStock?.findAll({ page: 1, pageSize: 1000 }) || { data: [] };
    const transfers = await (this.database as any).stockTransfers?.findAll({ page: 1, pageSize: 1000 }) || { data: [] };
    const whData = warehouses.data || [];
    const locData = locations.data || [];
    const batchData = batches.data || [];
    const transferData = transfers.data || [];
    const stockValue = batchData.reduce((sum: number, b: any) => sum + (b.quantity || 0) * (b.purchaseRate || 0), 0);
    return {
      totalWarehouses: whData.length,
      totalGodowns: locData.filter((l: any) => l.godown).length,
      totalLocations: locData.length,
      totalStockValue: stockValue,
      totalTransfers: transferData.length,
      pendingTransfers: transferData.filter((t: any) => t.status === 'draft' || t.status === 'pending').length,
      warehouses: whData,
      transfers: transferData.slice(0, 5),
    };
  }

  async getWarehouseStock(warehouseId?: string) {
    const result = await (this.database as any).batchStock?.findAll({ page: 1, pageSize: 1000 }) || { data: [] };
    let batches = (result.data || []) as any[];
    if (warehouseId) {batches = batches.filter((b: any) => b.warehouseId === warehouseId);}
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
