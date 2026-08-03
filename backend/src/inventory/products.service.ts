import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

/**
 * Lightweight billing-screen product record (mirrors the frontend ProductRecord).
 */
export interface ProductRecord {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  hsn?: string;
  unitId?: string;
  unitName?: string;
  gstRate?: number;
  purchaseRate: number;
  salesRate: number;
  mrp?: number;
  currentStock: number;
  warehouseStocks?: { warehouse: string; qty: number }[];
  description?: string;
  company?: string;
  manufacturer?: string;
  isActive?: boolean;
  isBlocked?: boolean;
  batches: never[];
}

interface SearchParams {
  search?: string;
  searchField?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Serves the billing / product-selection screen.
 *
 * The frontend calls `/inventory/products?search=...&searchField=...&pageSize=20`,
 * `/inventory/products/recent?limit=5` and `/inventory/products/frequent?limit=5`.
 * These endpoints did not exist (only `inventory/items`), so the search box
 * always 404'd. This service maps items + unit + GST + warehouse stock into
 * the ProductRecord shape the UI expects.
 */
@Injectable()
export class ProductsService {
  constructor(private readonly database: DatabaseService) {}

  async search(params: SearchParams): Promise<ProductRecord[]> {
    const { search, searchField = 'name', page = 1, pageSize = 20 } = params;
    const searchFields = this.mapSearchFields(searchField);
    const result = await this.database.items.findAll({
      page,
      pageSize,
      search: search || undefined,
      searchFields,
    } as any);
    const items = ((result as any)?.data || []) as Record<string, any>[];
    return this.mapToProductRecords(items);
  }

  async recent(limit = 5): Promise<ProductRecord[]> {
    const result = await this.database.items.findAll({
      page: 1,
      pageSize: limit,
      sorts: [{ field: 'createdAt', order: 'desc' as const }],
    } as any);
    return this.mapToProductRecords(((result as any)?.data || []) as Record<string, any>[]);
  }

  async frequent(limit = 5): Promise<ProductRecord[]> {
    // For dummy/seed data, "frequent" = latest items; the sales screen can
    // later wire this to actual invoice-frequency analytics.
    const result = await this.database.items.findAll({
      page: 1,
      pageSize: limit,
    } as any);
    return this.mapToProductRecords(((result as any)?.data || []) as Record<string, any>[]);
  }

  /**
   * Scanner-gun lookup — barcode / QR code se exact product dhundho.
   *
   * Order of attempts:
   *   1. shranix_item_barcodes (barcode/QR values, unique index)
   *   2. shranix_item_variants.barcode
   *   3. items.sku exact match (QR codes often encode SKU / product code)
   *   4. Fuzzy name/SKU search — sirf tabhi use karo jab exactly 1 hit ho
   */
  async lookupByCode(code: string): Promise<ProductRecord | null> {
    const clean = (code || '').trim();
    if (!clean) {
      return null;
    }

    // Case variants — scanner gun kabhi lowercase, kabhi uppercase emit karta hai
    const candidates = [...new Set([clean, clean.toUpperCase(), clean.toLowerCase()])];

    const findItemById = async (itemId?: string | null): Promise<ProductRecord | null> => {
      if (!itemId) {
        return null;
      }
      const res = await this.database.items.findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'id', operator: 'eq' as const, value: itemId }],
      } as any);
      const rows = ((res as any)?.data || []) as Record<string, any>[];
      if (rows.length === 0) {
        return null;
      }
      const mapped = await this.mapToProductRecords(rows);
      return mapped[0] ?? null;
    };

    // 1) Item barcodes table (barcode / QR values)
    for (const candidate of candidates) {
      const bcRes = await this.database.itemBarcodes.findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'barcode', operator: 'eq' as const, value: candidate }],
      } as any);
      const bcRow = ((bcRes as any)?.data || [])[0];
      const fromBarcode = await findItemById(bcRow?.itemId);
      if (fromBarcode) {
        return fromBarcode;
      }
    }

    // 2) Item variants barcode
    for (const candidate of candidates) {
      const vRes = await this.database.itemVariants.findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'barcode', operator: 'eq' as const, value: candidate }],
      } as any);
      const vRow = ((vRes as any)?.data || [])[0];
      const fromVariant = await findItemById(vRow?.itemId);
      if (fromVariant) {
        return fromVariant;
      }
    }

    // 3) SKU exact match (QR codes often encode SKU / product code)
    for (const candidate of candidates) {
      const skuRes = await this.database.items.findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'sku', operator: 'eq' as const, value: candidate }],
      } as any);
      const skuRow = ((skuRes as any)?.data || [])[0];
      if (skuRow) {
        const mapped = await this.mapToProductRecords([skuRow as Record<string, any>]);
        if (mapped[0]) {
          return mapped[0];
        }
      }
    }

    // 4) Fuzzy search — single hit ho to use karo (QR may encode full name)
    const fuzzyRes = await this.database.items.findAll({
      page: 1,
      pageSize: 5,
      search: clean,
      searchFields: ['name', 'sku', 'shortName'],
    } as any);
    const fuzzyRows = ((fuzzyRes as any)?.data || []) as Record<string, any>[];
    if (fuzzyRows.length === 1) {
      const mapped = await this.mapToProductRecords(fuzzyRows);
      if (mapped[0]) {
        return mapped[0];
      }
    }

    return null;
  }

  private mapSearchFields(field: string): string[] {
    switch (field) {
      case 'sku':
        return ['sku'];
      case 'barcode':
        return ['sku', 'name', 'shortName'];
      case 'hsn':
        return ['hsnCode'];
      case 'company':
        return ['manufacturer', 'name'];
      default:
        return ['name', 'sku', 'shortName', 'hsnCode', 'manufacturer', 'description'];
    }
  }

  private async mapToProductRecords(items: Record<string, any>[]): Promise<ProductRecord[]> {
    if (items.length === 0) {
      return [];
    }

    // Warehouse-stock is a secondary enrichment: its table may not carry
    // soft-delete columns, so a lookup failure must not take down the search.
    let stockRows: any[] = [];
    try {
      const stockRes = await this.database.warehouseStock.findAll({
        page: 1,
        pageSize: 1000,
      } as any);
      stockRows = (stockRes as any)?.data || [];
    } catch {
      stockRows = [];
    }

    // Barcodes — invoice line ke barcode column ke liye (gun-scan result bhi yahin se bharti hai)
    let barcodeRows: any[] = [];
    try {
      const bcRes = await this.database.itemBarcodes.findAll({ page: 1, pageSize: 1000 } as any);
      barcodeRows = (bcRes as any)?.data || [];
    } catch {
      barcodeRows = [];
    }
    const barcodeByItem = new Map<string, string>();
    for (const b of barcodeRows) {
      if (b.itemId && b.barcode) {
        barcodeByItem.set(b.itemId, b.barcode);
      }
    }
    // Default barcode ko precedence do
    for (const b of barcodeRows) {
      if (b.isDefault && b.itemId && b.barcode) {
        barcodeByItem.set(b.itemId, b.barcode);
      }
    }

    const [unitsRes, gstRes, whRes] = await Promise.all([
      this.database.units.findAll({ page: 1, pageSize: 1000 } as any),
      this.database.gstRates.findAll({ page: 1, pageSize: 1000 } as any),
      this.database.warehouses.findAll({ page: 1, pageSize: 1000 } as any),
    ]);

    const unitMap = new Map<string, Record<string, any>>(
      ((unitsRes as any)?.data || []).map((u: any) => [u.id, u]),
    );
    const gstMap = new Map<string, Record<string, any>>(
      ((gstRes as any)?.data || []).map((g: any) => [g.id, g]),
    );
    const whMap = new Map<string, Record<string, any>>(
      ((whRes as any)?.data || []).map((w: any) => [w.id, w]),
    );

    const stockByItem = new Map<string, { warehouse: string; qty: number }[]>();
    for (const s of stockRows) {
      const wh = whMap.get(s.warehouseId);
      const list = stockByItem.get(s.itemId) || [];
      list.push({ warehouse: wh?.name || s.warehouseId, qty: Number(s.quantity) || 0 });
      stockByItem.set(s.itemId, list);
    }

    return items.map((item) => {
      const unit = unitMap.get(item.unitId);
      const gst = gstMap.get(item.gstRateId);
      const whStocks = stockByItem.get(item.id) || [];
      const totalStock = whStocks.reduce((a, b) => a + b.qty, 0) || Number(item.currentStock) || 0;
      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        barcode: barcodeByItem.get(item.id) || undefined,
        hsn: item.hsnCode || undefined,
        unitId: item.unitId || undefined,
        unitName: unit?.shortName || unit?.name || undefined,
        gstRate: gst ? Number(gst.rate) : undefined,
        purchaseRate: Number(item.purchaseRate) || 0,
        salesRate: Number(item.salesRate) || 0,
        mrp: Number(item.mrp) || undefined,
        currentStock: totalStock,
        warehouseStocks: whStocks.length > 0 ? whStocks : undefined,
        description: item.description || undefined,
        company: item.manufacturer || undefined,
        manufacturer: item.manufacturer || undefined,
        isActive: item.isActive !== false,
        isBlocked: false,
        batches: [],
      };
    });
  }
}
