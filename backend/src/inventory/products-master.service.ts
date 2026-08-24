import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

// ═════════════════════════════════════════════════════════
// PHASE 3.2 — PRODUCT MASTER (Enterprise facade over shranix_items)
//
// Single source of truth for products used by Sales, Purchase, Inventory,
// Billing and Reports. Duplicate-detection (code/SKU/barcode/name), price
// history trail (product_price_history), documents (product_documents),
// stock/batch views, import/export, status workflow + business-rule guards.
// ═════════════════════════════════════════════════════════

export const PRODUCT_STATUSES = ['active', 'inactive', 'blocked', 'discontinued'];

const PRODUCT_TYPES = [
  'goods',
  'service',
  'fertilizer',
  'seed',
  'pesticide',
  'insecticide',
  'herbicide',
  'fungicide',
  'bio_product',
  'agricultural_equipment',
  'tools',
  'other',
];

const PRICE_FIELDS: { key: string; label: string }[] = [
  { key: 'mrp', label: 'MRP' },
  { key: 'purchaseRate', label: 'Purchase Price' },
  { key: 'salesRate', label: 'Selling Price' },
  { key: 'wholesalePrice', label: 'Wholesale Price' },
  { key: 'dealerPrice', label: 'Dealer Price' },
  { key: 'minSellingPrice', label: 'Minimum Selling Price' },
];

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const cleanStr = (v: unknown): string => String(v ?? '').trim();

@Injectable()
export class ProductsMasterService {
  private readonly logger = new Logger(ProductsMasterService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  // ═════════════════════════════════════════════════════════
  // CODE GENERATION
  // ═════════════════════════════════════════════════════════
  private async generateProductCode(): Promise<string> {
    let max = 0;
    try {
      // maxFieldValue scans the raw table WITHOUT soft-delete filtering,
      // so deleted codes are counted and never reused.
      const maxVal = await this.database.items.maxFieldValue('productCode');
      if (maxVal) {
        const m = /PRD-(\d+)/i.exec(cleanStr(String(maxVal)));
        if (m) {
          max = parseInt(m[1], 10);
        }
      }
    } catch {
      /* best-effort */
    }
    return `PRD-${String(max + 1).padStart(4, '0')}`;
  }

  // ═════════════════════════════════════════════════════════
  // DUPLICATE DETECTION — code / SKU / barcode / name
  // ═════════════════════════════════════════════════════════
  private async findDuplicate(
    field: 'productCode' | 'sku' | 'barcode' | 'name',
    value: string,
    excludeId?: string,
  ): Promise<any | null> {
    if (!value) {
      return null;
    }
    const res = (await this.database.items.findAll({
      page: 1,
      pageSize: 5,
      filters: [{ field, operator: 'eq', value }],
    } as any)) as any;
    const rows: any[] = res?.data || [];
    const hit = rows.find((r) => !excludeId || r.id !== excludeId);
    return hit || null;
  }

  private async assertUnique(payload: Record<string, any>, excludeId?: string) {
    const checks: { field: 'productCode' | 'sku' | 'barcode' | 'name'; value: string }[] = [];
    if (payload.productCode) {
      checks.push({ field: 'productCode', value: cleanStr(payload.productCode) });
    }
    if (payload.sku) {
      checks.push({ field: 'sku', value: cleanStr(payload.sku) });
    }
    if (payload.barcode) {
      checks.push({ field: 'barcode', value: cleanStr(payload.barcode) });
    }
    if (payload.name) {
      checks.push({ field: 'name', value: cleanStr(payload.name) });
    }
    for (const c of checks) {
      const dup = await this.findDuplicate(c.field, c.value, excludeId);
      if (dup) {
        const label = {
          productCode: 'Product Code',
          sku: 'SKU',
          barcode: 'Barcode',
          name: 'Product Name',
        }[c.field];
        throw new BadRequestException(
          `Duplicate ${label} "${c.value}" already exists (${dup.productCode || dup.sku || dup.id})`,
        );
      }
    }
  }

  // ═════════════════════════════════════════════════════════
  // PRICE VALIDATION + HISTORY
  // ═════════════════════════════════════════════════════════
  private validatePrices(p: Record<string, any>) {
    const mrp = num(p.mrp);
    const sales = num(p.salesRate);
    const minSell = num(p.minSellingPrice);
    const wholesale = num(p.wholesalePrice);
    const dealer = num(p.dealerPrice);
    if (sales > 0 && mrp > 0 && sales > mrp) {
      throw new BadRequestException('MRP must be >= Selling Price');
    }
    if (minSell > 0 && sales > 0 && sales < minSell) {
      throw new BadRequestException('Selling Price must be >= Minimum Selling Price');
    }
    if (wholesale > 0 && sales > 0 && wholesale > sales) {
      throw new BadRequestException('Wholesale Price must be <= Selling Price');
    }
    if (dealer > 0 && sales > 0 && dealer > sales) {
      throw new BadRequestException('Dealer Price must be <= Selling Price');
    }
  }

  private async recordPriceHistory(
    productId: string,
    oldRow: Record<string, any> | null,
    newRow: Record<string, any>,
    userId?: string,
  ) {
    for (const pf of PRICE_FIELDS) {
      const oldVal = oldRow ? num(oldRow[pf.key]) : undefined;
      const newVal = num(newRow[pf.key]);
      if (oldRow && oldVal !== undefined && Math.abs(oldVal - newVal) > 0.001) {
        await this.database.productPriceHistory.create({
          productId,
          priceType: pf.key,
          oldValue: oldVal,
          newValue: newVal,
          changedBy: userId || null,
          changedAt: new Date().toISOString(),
          remarks: `Changed by user ${userId || 'system'}`,
        });
      } else if (!oldRow && newVal > 0) {
        // Initial price record — keeps the trail complete from day one.
        await this.database.productPriceHistory.create({
          productId,
          priceType: pf.key,
          oldValue: 0,
          newValue: newVal,
          changedBy: userId || null,
          changedAt: new Date().toISOString(),
          remarks: 'Initial price',
        });
      }
    }
  }

  // ═════════════════════════════════════════════════════════
  // ENRICHMENT (category / brand / unit / gst / supplier names)
  // ═════════════════════════════════════════════════════════
  private async enrichProducts(products: any[]): Promise<any[]> {
    if (products.length === 0) {
      return [];
    }
    const [catsRes, subsRes, brandsRes, unitsRes, gstRes, suppliersRes] = await Promise.all([
      this.database.categories
        .findAll({ page: 1, pageSize: 10000 } as any)
        .catch(() => ({ data: [] })),
      (this.database as any).subCategories
        ?.findAll?.({ page: 1, pageSize: 10000 } as any)
        .catch(() => ({ data: [] })) || Promise.resolve({ data: [] }),
      this.database.brands.findAll({ page: 1, pageSize: 10000 } as any).catch(() => ({ data: [] })),
      this.database.units.findAll({ page: 1, pageSize: 10000 } as any).catch(() => ({ data: [] })),
      this.database.gstRates
        .findAll({ page: 1, pageSize: 10000 } as any)
        .catch(() => ({ data: [] })),
      this.database.suppliers
        .findAll({ page: 1, pageSize: 10000 } as any)
        .catch(() => ({ data: [] })),
    ]);
    const catMap = new Map<string, any>((catsRes as any)?.data?.map((c: any) => [c.id, c]) || []);
    const subMap = new Map<string, any>((subsRes as any)?.data?.map((c: any) => [c.id, c]) || []);
    const brandMap = new Map<string, any>(
      (brandsRes as any)?.data?.map((b: any) => [b.id, b]) || [],
    );
    const unitMap = new Map<string, any>((unitsRes as any)?.data?.map((u: any) => [u.id, u]) || []);
    const gstMap = new Map<string, any>((gstRes as any)?.data?.map((g: any) => [g.id, g]) || []);
    const supMap = new Map<string, any>(
      (suppliersRes as any)?.data?.map((s: any) => [s.id, s]) || [],
    );

    return products.map((p) => ({
      ...p,
      categoryName: catMap.get(p.categoryId)?.name || null,
      subCategoryName: subMap.get(p.subCategoryId)?.name || null,
      brandName: brandMap.get(p.brandId)?.name || null,
      unitName: unitMap.get(p.unitId)?.shortName || unitMap.get(p.unitId)?.name || null,
      purchaseUnitName:
        unitMap.get(p.purchaseUnitId)?.shortName || unitMap.get(p.purchaseUnitId)?.name || null,
      salesUnitName:
        unitMap.get(p.salesUnitId)?.shortName || unitMap.get(p.salesUnitId)?.name || null,
      gstRate: gstMap.get(p.gstRateId) ? num(gstMap.get(p.gstRateId).rate) : null,
      preferredSupplierName: supMap.get(p.preferredSupplierId)?.name || null,
      stockStatus:
        num(p.currentStock) <= 0
          ? 'out_of_stock'
          : num(p.currentStock) <= num(p.minStock)
            ? 'low_stock'
            : 'in_stock',
    }));
  }

  // ═════════════════════════════════════════════════════════
  // CRUD
  // ═════════════════════════════════════════════════════════
  async findAll(
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      categoryId?: string;
      subCategoryId?: string;
      brandId?: string;
      type?: string;
      status?: string;
      sortBy?: string;
      sortDir?: string;
    } = {},
  ) {
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 50;
    const filters: any[] = [];
    if (params.categoryId) {
      filters.push({ field: 'categoryId', operator: 'eq', value: params.categoryId });
    }
    if (params.subCategoryId) {
      filters.push({ field: 'subCategoryId', operator: 'eq', value: params.subCategoryId });
    }
    if (params.brandId) {
      filters.push({ field: 'brandId', operator: 'eq', value: params.brandId });
    }
    if (params.type) {
      filters.push({ field: 'type', operator: 'eq', value: params.type });
    }
    if (params.status) {
      filters.push({ field: 'status', operator: 'eq', value: params.status });
    }

    const res = (await this.database.items.findAll({
      page,
      pageSize,
      search: params.search || undefined,
      searchFields: params.search
        ? [
            'name',
            'sku',
            'productCode',
            'barcode',
            'shortName',
            'hsnCode',
            'manufacturer',
            'description',
          ]
        : undefined,
      filters: filters.length ? filters : undefined,
      sorts: params.sortBy
        ? [{ field: params.sortBy, order: (params.sortDir as 'asc' | 'desc') || 'asc' }]
        : [{ field: 'createdAt', order: 'desc' as const }],
    } as any)) as any;

    const data = await this.enrichProducts(res?.data || []);
    return { data, total: res?.total || 0, totalPages: res?.totalPages || 1, page, pageSize };
  }

  async findById(id: string) {
    const product = await this.database.items.findById(id);
    if (!product || product.isDeleted) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    const enriched = (await this.enrichProducts([product]))[0];
    // Attach documents + price history + batches
    const [docs, history, batches, balances] = await Promise.all([
      this.database.productDocuments
        .findAll({
          page: 1,
          pageSize: 100,
          filters: [{ field: 'productId', operator: 'eq', value: id }],
        } as any)
        .catch(() => ({ data: [] })),
      this.database.productPriceHistory
        .findAll({
          page: 1,
          pageSize: 100,
          filters: [{ field: 'productId', operator: 'eq', value: id }],
          sorts: [{ field: 'changedAt', order: 'desc' as const }],
        } as any)
        .catch(() => ({ data: [] })),
      this.database.batchMaster
        .findAll({
          page: 1,
          pageSize: 200,
          filters: [{ field: 'itemId', operator: 'eq', value: id }],
        } as any)
        .catch(() => ({ data: [] })),
      this.database.invStockBalance
        .findAll({
          page: 1,
          pageSize: 500,
          filters: [{ field: 'itemId', operator: 'eq', value: id }],
        } as any)
        .catch(() => ({ data: [] })),
    ]);
    const warehouseBalance =
      (balances as any)?.data?.reduce((s: number, b: any) => s + num(b.onHand), 0) || 0;
    return {
      ...enriched,
      documents: (docs as any)?.data || [],
      priceHistory: (history as any)?.data || [],
      batches: (batches as any)?.data || [],
      totalWarehouseStock: warehouseBalance,
      stock: {
        onHand: warehouseBalance || num(enriched.currentStock),
        lowStock:
          num(enriched.currentStock) <= num(enriched.minStock) && num(enriched.minStock) > 0,
      },
    };
  }

  async create(data: any, userId?: string) {
    const payload: Record<string, any> = { ...data };
    if (!payload.name) {
      throw new BadRequestException('Product Name is required');
    }
    if (payload.type && !PRODUCT_TYPES.includes(payload.type)) {
      throw new BadRequestException(
        `Invalid product type — must be one of: ${PRODUCT_TYPES.join(', ')}`,
      );
    }
    if (payload.status && !PRODUCT_STATUSES.includes(payload.status)) {
      throw new BadRequestException('Status must be active, inactive, blocked or discontinued');
    }
    payload.sku = cleanStr(payload.sku || payload.name).toUpperCase();
    if (!payload.productCode) {
      payload.productCode = await this.generateProductCode();
    }
    this.validatePrices(payload);

    await this.assertUnique(payload);
    if (payload.altSupplierIds) {
      delete payload.altSupplierIds;
    } // alt suppliers — not a column; keep clean

    const created = await this.database.items.create({
      ...payload,
      status: payload.status || 'active',
      isActive:
        payload.isActive ??
        (payload.status ? !['inactive', 'blocked', 'discontinued'].includes(payload.status) : true),
      openingRate: num(payload.openingRate),
      openingValue: num(payload.openingStock) * num(payload.openingRate),
      currentStock: num(payload.openingStock),
      createdBy: userId || null,
      updatedBy: userId || null,
    });

    // Documents
    if (Array.isArray(data.documents)) {
      for (const d of data.documents) {
        if (d?.fileName) {
          await this.database.productDocuments.create({
            productId: created.id,
            docType: d.docType || 'other',
            fileName: d.fileName,
            fileUrl: d.fileUrl || null,
            fileSize: num(d.fileSize),
            mimeType: d.mimeType || null,
            notes: d.notes || null,
            createdBy: userId || null,
            updatedBy: userId || null,
          });
        }
      }
    }

    await this.recordPriceHistory(created.id, null, payload, userId);
    await this.auditLog({
      userId,
      event: 'product_created',
      action: 'create',
      entityId: created.id,
      newValues: { name: created.name, productCode: created.productCode, sku: created.sku },
      details: { id: created.id, name: created.name, productCode: created.productCode },
    });
    this.logger.log(`Product created: ${created.productCode} (${created.name})`);
    return this.findById(created.id);
  }

  async update(id: string, data: any, userId?: string) {
    const existing = await this.database.items.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    // Product code immutable after creation
    if (data.productCode && cleanStr(data.productCode) !== cleanStr(existing.productCode)) {
      throw new BadRequestException('Product Code cannot be changed');
    }
    const payload: Record<string, any> = { ...data };
    if (payload.type && !PRODUCT_TYPES.includes(payload.type)) {
      throw new BadRequestException(
        `Invalid product type — must be one of: ${PRODUCT_TYPES.join(', ')}`,
      );
    }
    if (payload.status && !PRODUCT_STATUSES.includes(payload.status)) {
      throw new BadRequestException('Status must be active, inactive, blocked or discontinued');
    }
    delete payload.productCode;
    if (payload.altSupplierIds) {
      delete payload.altSupplierIds;
    }
    if (payload.name) {
      payload.name = cleanStr(payload.name);
    }
    if (payload.sku) {
      payload.sku = cleanStr(payload.sku).toUpperCase();
    }

    // Name uniqueness — skip when unchanged
    if (payload.name && cleanStr(existing.name).toLowerCase() === payload.name.toLowerCase()) {
      delete payload.name;
    }
    this.validatePrices({ ...existing, ...payload });

    const merged = { ...existing, ...payload };
    await this.assertUnique(merged, id);

    // Status side-effects
    if (payload.status && payload.status !== existing.status) {
      payload.isActive = !['inactive', 'blocked', 'discontinued'].includes(payload.status);
    }
    if (payload.openingRate !== undefined) {
      payload.openingValue =
        num(payload.openingRate) * num(merged.openingStock ?? payload.openingStock ?? 0);
    }

    await this.database.items.update(id, {
      ...payload,
      updatedBy: userId || null,
      updatedAt: new Date().toISOString(),
    });

    // Documents — replace if provided (soft-delete existing, then re-create)
    if (Array.isArray(data.documents)) {
      const existingDocs = (await this.database.productDocuments
        .findAll({
          page: 1,
          pageSize: 200,
          filters: [{ field: 'productId', operator: 'eq', value: id }],
        } as any)
        .catch(() => ({ data: [] }))) as any;
      for (const d of existingDocs?.data || []) {
        await this.database.productDocuments.softDelete(d.id).catch(() => {});
      }
      for (const d of data.documents) {
        if (d?.fileName) {
          await this.database.productDocuments.create({
            productId: id,
            docType: d.docType || 'other',
            fileName: d.fileName,
            fileUrl: d.fileUrl || null,
            fileSize: num(d.fileSize),
            mimeType: d.mimeType || null,
            notes: d.notes || null,
            createdBy: userId || null,
            updatedBy: userId || null,
          });
        }
      }
    }

    await this.recordPriceHistory(id, existing, merged, userId);
    await this.auditLog({
      userId,
      event: 'product_updated',
      action: 'update',
      entityId: id,
      oldValues: { name: existing.name, status: existing.status },
      newValues: { name: merged.name, status: merged.status },
      details: { id, changedFields: Object.keys(payload) },
    });
    this.logger.log(`Product ${id} updated`);
    return this.findById(id);
  }

  /** Soft-delete with transaction-history guard. */
  async delete(id: string, userId?: string) {
    const existing = await this.database.items.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    const guard = await this.checkTransactionHistory(id);
    if (!guard.canDelete) {
      throw new BadRequestException(
        'Product cannot be deleted because transaction history exists (sales, purchase, stock, invoices or returns).',
      );
    }
    await this.database.items.softDelete(id);
    await this.auditLog({
      userId,
      event: 'product_deleted',
      action: 'delete',
      entityId: id,
      oldValues: { name: existing.name, productCode: existing.productCode },
      details: { id, name: existing.name },
    });
    this.logger.log(`Product ${id} soft-deleted`);
    return { id, message: 'Product deleted' };
  }

  /** Business-rule guard: any sales/purchase/stock/return reference blocks delete. */
  async checkTransactionHistory(id: string) {
    const checks: { label: string; rows: number }[] = [];
    const safeCount = async (repo: any, field: string) => {
      try {
        const res = await repo.findAll({
          page: 1,
          pageSize: 1,
          filters: [{ field, operator: 'eq', value: id }],
        } as any);
        return (res as any)?.total ?? (res as any)?.data?.length ?? 0;
      } catch {
        return 0;
      }
    };
    const counts = await Promise.all([
      safeCount(this.database.invoiceItems, 'itemId'),
      safeCount(this.database.poItems, 'itemId'),
      safeCount(this.database.grnItems, 'itemId'),
      safeCount(this.database.returnItems, 'itemId'),
      safeCount(this.database.purchaseReturnItems, 'itemId'),
      safeCount(this.database.invStockLedger, 'itemId'),
      safeCount(this.database.salesOrderItems, 'itemId'),
      safeCount(this.database.quotationItems, 'itemId'),
      safeCount(this.database.challanItems, 'itemId'),
      safeCount(this.database.stockOpening, 'itemId'),
    ]);
    const [invoices, pos, grns, returns, purchaseReturns, stock, so, quotes, challans, openings] =
      counts;
    checks.push(
      { label: 'Sales Invoices', rows: invoices },
      { label: 'Purchase Orders', rows: pos },
      { label: 'GRNs', rows: grns },
      { label: 'Sales Returns', rows: returns },
      { label: 'Purchase Returns', rows: purchaseReturns },
      { label: 'Stock Transactions', rows: stock },
      { label: 'Sales Orders', rows: so },
      { label: 'Quotations', rows: quotes },
      { label: 'Delivery Challans', rows: challans },
      { label: 'Opening Stock', rows: openings },
    );
    const blocking = checks.filter((c) => c.rows > 0);
    return {
      canDelete: blocking.length === 0,
      blocking,
      checks,
    };
  }

  // ═════════════════════════════════════════════════════════
  // STATUS
  // ═════════════════════════════════════════════════════════
  async setStatus(id: string, status: string, userId?: string) {
    if (!PRODUCT_STATUSES.includes(status)) {
      throw new BadRequestException('Status must be active, inactive, blocked or discontinued');
    }
    const existing = await this.database.items.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    const oldStatus = existing.status || (existing.isActive ? 'active' : 'inactive');
    await this.database.items.update(id, {
      status,
      isActive: status !== 'inactive' && status !== 'blocked' && status !== 'discontinued',
      updatedAt: new Date().toISOString(),
      ...(userId ? { updatedBy: userId } : {}),
    });
    await this.auditLog({
      userId,
      event: 'product_status_changed',
      action: 'status_change',
      entityId: id,
      oldValues: { status: oldStatus },
      newValues: { status },
      details: { id, from: oldStatus, to: status },
    });
    this.logger.log(`Product ${id} status → ${status}`);
    return { id, status, message: `Product status updated to "${status}"` };
  }

  async bulkStatus(ids: string[], status: string, userId?: string) {
    if (!PRODUCT_STATUSES.includes(status)) {
      throw new BadRequestException('Status must be active, inactive, blocked or discontinued');
    }
    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        await this.setStatus(id, status, userId);
        results.push({ id, ok: true });
      } catch (err) {
        results.push({ id, ok: false, error: (err as Error).message });
      }
    }
    const updated = results.filter((r) => r.ok).length;
    await this.auditLog({
      userId,
      event: 'product_bulk_status',
      action: 'bulk_status',
      entityId: 'bulk',
      details: { ids, status, updated },
    });
    return { updated, failed: results.length - updated, results };
  }

  async bulkDelete(ids: string[], userId?: string) {
    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        await this.delete(id, userId);
        results.push({ id, ok: true });
      } catch (err) {
        results.push({ id, ok: false, error: (err as Error).message });
      }
    }
    const deleted = results.filter((r) => r.ok).length;
    await this.auditLog({
      userId,
      event: 'product_bulk_delete',
      action: 'bulk_delete',
      entityId: 'bulk',
      details: { ids, deleted },
    });
    return { deleted, failed: results.length - deleted, results };
  }

  // ═════════════════════════════════════════════════════════
  // SEARCH (fast indexed quick-search)
  // ═════════════════════════════════════════════════════════
  async searchProducts(
    params: { q?: string; page?: number; pageSize?: number; status?: string } = {},
  ) {
    const q = cleanStr(params.q);
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 50;
    const filters: any[] = [];
    if (params.status) {
      filters.push({ field: 'status', operator: 'eq', value: params.status });
    }
    const res = (await this.database.items.findAll({
      page,
      pageSize,
      search: q || undefined,
      searchFields: q
        ? ['name', 'sku', 'productCode', 'barcode', 'shortName', 'hsnCode', 'manufacturer']
        : undefined,
      filters: filters.length ? filters : undefined,
    } as any)) as any;
    const data = await this.enrichProducts(res?.data || []);
    return { data, total: res?.total || 0, totalPages: res?.totalPages || 1, page, pageSize };
  }

  // ═════════════════════════════════════════════════════════
  // DASHBOARD
  // ═════════════════════════════════════════════════════════
  async getDashboard(): Promise<any> {
    const res = (await this.database.items.findAll({ page: 1, pageSize: 10000 } as any)) as any;
    const products: any[] = res?.data || [];
    const today = new Date().toISOString().split('T')[0];
    const todayStr = (d?: string) => String(d || '').slice(0, 10);

    const active = products.filter(
      (p) => p.status === 'active' || (p.status === null && p.isActive !== false),
    );
    const inactive = products.filter((p) => p.status === 'inactive');
    const blocked = products.filter((p) => p.status === 'blocked');
    const discontinued = products.filter((p) => p.status === 'discontinued');
    const lowStock = products.filter(
      (p) => num(p.currentStock) <= num(p.minStock) && num(p.minStock) > 0,
    );
    const outOfStock = products.filter((p) => num(p.currentStock) <= 0);
    const batchProducts = products.filter((p) => p.hasBatch || p.hasExpiry);
    const todayNew = products.filter((p) => todayStr(p.createdAt) === today);

    // Expiry analysis from batch master
    let nearExpiry = 0;
    let expired = 0;
    try {
      const batchRes = (await this.database.batchMaster.findAll({
        page: 1,
        pageSize: 10000,
      } as any)) as any;
      const batches: any[] = batchRes?.data || [];
      const now = Date.now();
      for (const b of batches) {
        if (!b.expDate) {
          continue;
        }
        const diff = new Date(b.expDate).getTime() - now;
        const days = diff / 86400000;
        if (days < 0) {
          expired += 1;
        } else if (days <= 90) {
          nearExpiry += 1;
        }
      }
    } catch {
      /* batch table may be missing in old DBs */
    }

    const sorted = [...products].sort(
      (a, b) => num(b.currentStock) * num(b.salesRate) - num(a.currentStock) * num(a.salesRate),
    );
    const topSelling = await this.enrichProducts(sorted.slice(0, 5));
    const recentAdded = await this.enrichProducts(
      [...products]
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 5),
    );
    const recentUpdated = await this.enrichProducts(
      [...products]
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
        .slice(0, 5),
    );

    return {
      summary: {
        totalProducts: products.length,
        activeProducts: active.length,
        inactiveProducts: inactive.length,
        blockedProducts: blocked.length,
        discontinuedProducts: discontinued.length,
        lowStockProducts: lowStock.length,
        outOfStock: outOfStock.length,
        batchProducts: batchProducts.length,
        expiryNearProducts: nearExpiry,
        expiredProducts: expired,
        todayNewProducts: todayNew.length,
      },
      topSelling,
      recentlyAdded: recentAdded,
      recentlyUpdated: recentUpdated,
    };
  }

  // ═════════════════════════════════════════════════════════
  // STOCK / PRICES / BATCHES / HISTORY (product-detail views)
  // ═════════════════════════════════════════════════════════
  async getStock(id: string) {
    await this.ensureProduct(id);
    const [balances, ledger, batches] = await Promise.all([
      this.database.invStockBalance
        .findAll({
          page: 1,
          pageSize: 1000,
          filters: [{ field: 'itemId', operator: 'eq', value: id }],
        } as any)
        .catch(() => ({ data: [] })),
      this.database.invStockLedger
        .findAll({
          page: 1,
          pageSize: 200,
          filters: [{ field: 'itemId', operator: 'eq', value: id }],
          sorts: [{ field: 'createdAt', order: 'desc' as const }],
        } as any)
        .catch(() => ({ data: [] })),
      this.database.batchMaster
        .findAll({
          page: 1,
          pageSize: 500,
          filters: [{ field: 'itemId', operator: 'eq', value: id }],
        } as any)
        .catch(() => ({ data: [] })),
    ]);
    const whRes = await this.database.warehouses
      .findAll({ page: 1, pageSize: 1000 } as any)
      .catch(() => ({ data: [] }));
    const whMap = new Map(((whRes as any)?.data || []).map((w: any) => [w.id, w.name]));

    const warehouseBreakdown = ((balances as any)?.data || []).map((b: any) => ({
      warehouseId: b.warehouseId,
      warehouseName: whMap.get(b.warehouseId) || b.warehouseId,
      onHand: num(b.onHand),
      available: num(b.available),
      reserved: num(b.reserved),
    }));
    return {
      productId: id,
      totalOnHand: warehouseBreakdown.reduce((s: number, b: any) => s + b.onHand, 0),
      warehouseBreakdown,
      recentLedger: ((ledger as any)?.data || []).slice(0, 50),
      batches: ((batches as any)?.data || []).map((b: any) => ({
        id: b.id,
        batchNo: b.batchNo,
        mfgDate: b.mfgDate,
        expDate: b.expDate,
        quantity: num(b.quantity),
        availableQuantity: num(b.availableQuantity),
        status: b.status,
        purchaseRate: num(b.purchaseRate),
      })),
    };
  }

  async getPrices(id: string) {
    await this.ensureProduct(id);
    const [product, history] = await Promise.all([
      this.database.items.findById(id),
      this.database.productPriceHistory
        .findAll({
          page: 1,
          pageSize: 200,
          filters: [{ field: 'productId', operator: 'eq', value: id }],
          sorts: [{ field: 'changedAt', order: 'desc' as const }],
        } as any)
        .catch(() => ({ data: [] })),
    ]);
    return {
      current: {
        mrp: num(product.mrp),
        purchaseRate: num(product.purchaseRate),
        salesRate: num(product.salesRate),
        wholesalePrice: num(product.wholesalePrice),
        dealerPrice: num(product.dealerPrice),
        minSellingPrice: num(product.minSellingPrice),
        maxDiscountPercent: num(product.maxDiscountPercent),
      },
      history: (history as any)?.data || [],
    };
  }

  async getBatches(id: string) {
    await this.ensureProduct(id);
    const res = (await this.database.batchMaster.findAll({
      page: 1,
      pageSize: 500,
      filters: [{ field: 'itemId', operator: 'eq', value: id }],
    } as any)) as any;
    return { productId: id, batches: res?.data || [] };
  }

  async getHistory(id: string) {
    await this.ensureProduct(id);
    const [priceHistory, stockLedger, purchase, sales] = await Promise.all([
      this.database.productPriceHistory
        .findAll({
          page: 1,
          pageSize: 100,
          filters: [{ field: 'productId', operator: 'eq', value: id }],
          sorts: [{ field: 'changedAt', order: 'desc' as const }],
        } as any)
        .catch(() => ({ data: [] })),
      this.database.invStockLedger
        .findAll({
          page: 1,
          pageSize: 200,
          filters: [{ field: 'itemId', operator: 'eq', value: id }],
          sorts: [{ field: 'createdAt', order: 'desc' as const }],
        } as any)
        .catch(() => ({ data: [] })),
      this.database.poItems
        .findAll({
          page: 1,
          pageSize: 50,
          filters: [{ field: 'itemId', operator: 'eq', value: id }],
        } as any)
        .catch(() => ({ data: [] })),
      this.database.invoiceItems
        .findAll({
          page: 1,
          pageSize: 50,
          filters: [{ field: 'itemId', operator: 'eq', value: id }],
        } as any)
        .catch(() => ({ data: [] })),
    ]);
    return {
      priceHistory: (priceHistory as any)?.data || [],
      stockHistory: (stockLedger as any)?.data || [],
      purchaseHistory: (purchase as any)?.data || [],
      salesHistory: (sales as any)?.data || [],
    };
  }

  // ═════════════════════════════════════════════════════════
  // DOCUMENTS
  // ═════════════════════════════════════════════════════════
  async addDocument(data: any, userId?: string) {
    await this.ensureProduct(data.productId);
    const doc = await this.database.productDocuments.create({
      productId: data.productId,
      docType: data.docType || 'other',
      fileName: data.fileName,
      fileUrl: data.fileUrl || null,
      fileSize: num(data.fileSize),
      mimeType: data.mimeType || null,
      notes: data.notes || null,
      createdBy: userId || null,
      updatedBy: userId || null,
    });
    await this.auditLog({
      userId,
      event: 'product_document_added',
      action: 'document_add',
      entityId: data.productId,
      details: { docId: doc.id, fileName: data.fileName, docType: data.docType },
    });
    return doc;
  }

  async removeDocument(docId: string, userId?: string) {
    const doc = await this.database.productDocuments.findById(docId);
    if (!doc) {
      throw new NotFoundException(`Document "${docId}" not found`);
    }
    await this.database.productDocuments.softDelete(docId);
    await this.auditLog({
      userId,
      event: 'product_document_removed',
      action: 'document_remove',
      entityId: doc.productId,
      details: { docId, fileName: doc.fileName },
    });
    return { id: docId, message: 'Document removed' };
  }

  // ═════════════════════════════════════════════════════════
  // EXPORT / IMPORT
  // ═════════════════════════════════════════════════════════
  private buildCsv(rows: Record<string, unknown>[]): Buffer {
    if (rows.length === 0) {
      return Buffer.from('\uFEFF', 'utf8');
    }
    const headers = Object.keys(rows[0]);
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))];
    return Buffer.from(`\uFEFF${lines.join('\r\n')}`, 'utf8');
  }

  private toExportRows(products: any[]): Record<string, unknown>[] {
    return products.map((p) => ({
      'Product Code': p.productCode || '',
      SKU: p.sku || '',
      'Product Name': p.name || '',
      Category: p.categoryName || '',
      'Sub Category': p.subCategoryName || '',
      Brand: p.brandName || '',
      Type: p.type || '',
      HSN: p.hsnCode || '',
      GST: p.gstRate ?? '',
      Unit: p.unitName || '',
      MRP: p.mrp ?? 0,
      'Purchase Price': p.purchaseRate ?? 0,
      'Selling Price': p.salesRate ?? 0,
      Wholesale: p.wholesalePrice ?? 0,
      Dealer: p.dealerPrice ?? 0,
      Stock: p.currentStock ?? 0,
      'Min Stock': p.minStock ?? 0,
      Status: p.status || (p.isActive ? 'active' : 'inactive'),
      Barcode: p.barcode || '',
      Manufacturer: p.manufacturer || '',
    }));
  }

  /** GET /products/export?format=csv|xlsx|json */
  async exportProducts(
    format = 'csv',
  ): Promise<{ fileName: string; buffer: Buffer; mime: string }> {
    const fmt = String(format).toLowerCase();
    if (!['csv', 'xlsx', 'json'].includes(fmt)) {
      throw new BadRequestException('Format must be csv, xlsx or json');
    }
    const res = (await this.database.items.findAll({ page: 1, pageSize: 10000 } as any)) as any;
    const enriched = await this.enrichProducts(res?.data || []);
    const rows = this.toExportRows(enriched);
    const ts = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
    if (fmt === 'json') {
      return {
        fileName: `products-${ts}.json`,
        buffer: Buffer.from(JSON.stringify(rows, null, 2), 'utf8'),
        mime: 'application/json',
      };
    }
    if (fmt === 'csv') {
      return {
        fileName: `products-${ts}.csv`,
        buffer: this.buildCsv(rows),
        mime: 'text/csv; charset=utf-8',
      };
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map((h) => ({
      wch: Math.min(Math.max(h.length + 2, 12), 32),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return {
      fileName: `products-${ts}.xlsx`,
      buffer: Buffer.from(buffer),
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  /** POST /products/import — Excel/CSV/JSON with duplicate detection. */
  async importProducts(
    file: { originalname?: string; buffer?: Buffer },
    mode: 'insert' | 'upsert',
    userId?: string,
  ): Promise<any> {
    if (!file?.buffer) {
      throw new BadRequestException('No file provided');
    }
    const m = mode === 'upsert' ? 'upsert' : 'insert';
    const ext =
      String(file.originalname || '')
        .split('.')
        .pop()
        ?.toLowerCase() || '';

    let rows: Record<string, unknown>[];
    try {
      if (ext === 'json') {
        const parsed = JSON.parse(file.buffer.toString('utf8'));
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        const wb = XLSX.read(file.buffer, { type: 'buffer' });
        const first = wb.SheetNames[0];
        if (!first) {
          throw new BadRequestException('Spreadsheet contains no sheets');
        }
        rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[first], { defval: '' });
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException(`Could not read file: ${(err as Error).message}`);
    }
    if (rows.length > 5000) {
      throw new BadRequestException('File is too large — maximum 5,000 rows per import');
    }

    const findRow = (row: Record<string, unknown>, ...keys: string[]): unknown => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return row[k];
        }
        const snake = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = Object.keys(row).find(
          (rk) => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === snake,
        );
        if (found) {
          return row[found];
        }
      }
      return undefined;
    };

    const result = {
      entity: 'products',
      mode: m,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number; message: string }[],
    };

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        const name = cleanStr(findRow(row, 'Product Name', 'name'));
        if (!name) {
          throw new Error('"Product Name" is required');
        }
        const payload: Record<string, unknown> = {
          name,
          productCode: cleanStr(findRow(row, 'Product Code')).toUpperCase() || undefined,
          sku: cleanStr(findRow(row, 'SKU')).toUpperCase() || undefined,
          barcode: cleanStr(findRow(row, 'Barcode')),
          categoryId: cleanStr(findRow(row, 'Category ID')),
          subCategoryId: cleanStr(findRow(row, 'Sub Category ID')),
          brandId: cleanStr(findRow(row, 'Brand ID')),
          type: cleanStr(findRow(row, 'Type', 'Product Type')) || 'goods',
          hsnCode: cleanStr(findRow(row, 'HSN')),
          unitId: cleanStr(findRow(row, 'Unit ID')),
          mrp: num(findRow(row, 'MRP')),
          purchaseRate: num(findRow(row, 'Purchase Price', 'Purchase Rate')),
          salesRate: num(findRow(row, 'Selling Price', 'Sales Rate')),
          wholesalePrice: num(findRow(row, 'Wholesale')),
          dealerPrice: num(findRow(row, 'Dealer')),
          openingStock: num(findRow(row, 'Opening Stock')),
          minStock: num(findRow(row, 'Min Stock')),
          maxStock: num(findRow(row, 'Max Stock')),
          reorderLevel: num(findRow(row, 'Reorder Level')),
          manufacturer: cleanStr(findRow(row, 'Manufacturer')),
          notes: cleanStr(findRow(row, 'Remarks', 'Notes')),
          status: cleanStr(findRow(row, 'Status')).toLowerCase() || 'active',
        };

        // Duplicate lookup for upsert mode
        let existing: any = null;
        if (payload.productCode) {
          existing = await this.findDuplicate('productCode', payload.productCode as string);
        }
        if (!existing && payload.sku) {
          existing = await this.findDuplicate('sku', payload.sku as string);
        }
        if (!existing && payload.barcode) {
          existing = await this.findDuplicate('barcode', payload.barcode as string);
        }

        if (existing && m === 'upsert') {
          await this.update(existing.id, payload, userId);
          result.updated += 1;
        } else if (existing) {
          result.skipped += 1;
        } else {
          await this.create(payload, userId);
          result.imported += 1;
        }
      } catch (err) {
        result.errors.push({ row: i + 2, message: (err as Error).message });
      }
    }

    await this.auditLog({
      userId,
      event: 'product_import',
      action: 'import',
      entityId: 'bulk',
      details: {
        mode: m,
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors.length,
      },
    });
    return result;
  }

  // ═════════════════════════════════════════════════════════
  // REPORTS
  // ═════════════════════════════════════════════════════════
  async getReports(report: string) {
    const res = (await this.database.items.findAll({ page: 1, pageSize: 10000 } as any)) as any;
    const all = await this.enrichProducts(res?.data || []);

    switch (report) {
      case 'low-stock': {
        const rows = all.filter(
          (p) => num(p.currentStock) <= num(p.minStock) && num(p.minStock) > 0,
        );
        return { report, count: rows.length, rows };
      }
      case 'out-of-stock': {
        const rows = all.filter((p) => num(p.currentStock) <= 0);
        return { report, count: rows.length, rows };
      }
      case 'expiry': {
        const batchRes = (await this.database.batchMaster.findAll({
          page: 1,
          pageSize: 10000,
        } as any)) as any;
        const now = Date.now();
        const rows = ((batchRes?.data || []) as any[])
          .filter((b) => b.expDate)
          .map((b) => {
            const days = (new Date(b.expDate).getTime() - now) / 86400000;
            return {
              ...b,
              daysToExpiry: Math.round(days),
              status: days < 0 ? 'expired' : days <= 90 ? 'near_expiry' : 'ok',
            };
          })
          .filter((b) => b.status !== 'ok');
        return { report, count: rows.length, rows };
      }
      case 'price': {
        const rows = all.map((p) => ({
          id: p.id,
          productCode: p.productCode,
          name: p.name,
          sku: p.sku,
          mrp: num(p.mrp),
          salesRate: num(p.salesRate),
          wholesalePrice: num(p.wholesalePrice),
          dealerPrice: num(p.dealerPrice),
          purchaseRate: num(p.purchaseRate),
        }));
        return { report, count: rows.length, rows };
      }
      case 'master':
      default: {
        return { report: 'master', count: all.length, rows: all };
      }
    }
  }

  // ═════════════════════════════════════════════════════════
  // MASTER LOOKUPS (categories/brands/units for forms)
  // ═════════════════════════════════════════════════════════
  async getFormMasters() {
    const [categories, subCategories, brands, units, gstRates, productTypes, suppliers] =
      await Promise.all([
        this.database.categories
          .findAll({ page: 1, pageSize: 10000 } as any)
          .catch(() => ({ data: [] })),
        (this.database as any).subCategories
          ?.findAll?.({ page: 1, pageSize: 10000 } as any)
          .catch(() => ({ data: [] })) || Promise.resolve({ data: [] }),
        this.database.brands
          .findAll({ page: 1, pageSize: 10000 } as any)
          .catch(() => ({ data: [] })),
        this.database.units
          .findAll({ page: 1, pageSize: 10000 } as any)
          .catch(() => ({ data: [] })),
        this.database.gstRates
          .findAll({ page: 1, pageSize: 10000 } as any)
          .catch(() => ({ data: [] })),
        Promise.resolve(
          PRODUCT_TYPES.map((t) => ({
            value: t,
            label: t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          })),
        ),
        this.database.suppliers
          .findAll({ page: 1, pageSize: 10000 } as any)
          .catch(() => ({ data: [] })),
      ]);
    return {
      categories: (categories as any)?.data || [],
      subCategories: (subCategories as any)?.data || [],
      brands: (brands as any)?.data || [],
      units: (units as any)?.data || [],
      gstRates: (gstRates as any)?.data || [],
      productTypes,
      suppliers: (suppliers as any)?.data || [],
    };
  }

  // ═════════════════════════════════════════════════════════
  // HELPERS
  // ═════════════════════════════════════════════════════════
  private async ensureProduct(id: string) {
    const product = await this.database.items.findById(id);
    if (!product || product.isDeleted) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    return product;
  }

  private async auditLog(params: {
    userId?: string;
    event: string;
    action: string;
    entityId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    details?: Record<string, unknown>;
  }) {
    if (!this.audit) {
      return;
    }
    try {
      await this.audit.log({
        userId: params.userId || 'system',
        event: params.event,
        resource: 'Product',
        action: params.action,
        entityId: params.entityId || null,
        oldValues: (params.oldValues as any) || null,
        newValues: (params.newValues as any) || null,
        details: (params.details as any) || null,
        module: 'Inventory',
      });
    } catch (err) {
      this.logger.error(`Audit log failed: ${(err as Error).message}`);
    }
  }
}
