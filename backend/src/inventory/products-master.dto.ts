import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// ═════════════════════════════════════════════════════════
// PRODUCT MASTER DTOs (Phase 3.2 — enterprise Product Master)
// Backed by shranix_items + product_documents + product_price_history.
// ═════════════════════════════════════════════════════════

export class CreateProductDto {
  // ── Tab 1: Basic Information ──
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shortName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() qrCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string; // goods, service, fertilizer, seed, pesticide, ...
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subCategoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturerCode?: string;

  // ── Tab 2: Tax & Compliance ──
  @ApiPropertyOptional() @IsOptional() @IsString() hsnCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sacCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstRateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isTaxable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() taxPreference?: string; // taxable, exempt, nil_rated

  // ── Tab 3: Units ──
  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseUnitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salesUnitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stockUnitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.0001) conversionFactor?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() packSize?: string;

  // ── Tab 4: Pricing ──
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) purchaseRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) salesRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) wholesalePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) dealerPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minSellingPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxDiscountPercent?: number;

  // ── Tab 5: Inventory ──
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) openingStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) openingRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) reorderLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasBatch?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasExpiry?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasSerial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() trackInventory?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowNegativeStock?: boolean;

  // ── Tab 6: Supplier ──
  @ApiPropertyOptional() @IsOptional() @IsString() preferredSupplierId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  altSupplierIds?: string[];

  // ── Tab 8: Remarks & Status ──
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['active', 'inactive', 'blocked', 'discontinued'])
  status?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;

  // ── Agriculture extras ──
  @ApiPropertyOptional() @IsOptional() @IsString() cropSeason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variety?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() organic?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() seasonal?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) weight?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() weightUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shelfLife?: string;

  // ── Documents (inline on create — write to product_documents) ──
  @ApiPropertyOptional() @IsOptional() @IsArray() documents?: ProductDocumentInput[];
}

export class ProductDocumentInput {
  @ApiPropertyOptional() @IsOptional() @IsString() docType?: string;
  @ApiProperty() @IsString() fileName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) fileSize?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shortName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() qrCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subCategoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturerCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hsnCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sacCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstRateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isTaxable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() taxPreference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseUnitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salesUnitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stockUnitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.0001) conversionFactor?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() packSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) purchaseRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) salesRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) wholesalePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) dealerPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minSellingPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxDiscountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) openingStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) openingRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) reorderLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasBatch?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasExpiry?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasSerial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() trackInventory?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowNegativeStock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() preferredSupplierId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  altSupplierIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['active', 'inactive', 'blocked', 'discontinued'])
  status?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() cropSeason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variety?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() organic?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() seasonal?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) weight?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() weightUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shelfLife?: string;
}

export class ProductStatusDto {
  @ApiProperty({ enum: ['active', 'inactive', 'blocked', 'discontinued'] })
  @IsIn(['active', 'inactive', 'blocked', 'discontinued'])
  status!: string;
}

export class BulkProductStatusDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) ids!: string[];
  @ApiProperty({ enum: ['active', 'inactive', 'blocked', 'discontinued'] })
  @IsIn(['active', 'inactive', 'blocked', 'discontinued'])
  status!: string;
}

export class BulkProductDeleteDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) ids!: string[];
}

export class CreateProductDocumentDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() docType?: string;
  @ApiProperty() @IsString() fileName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) fileSize?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ProductStockDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mfgDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expDate?: string;
}
