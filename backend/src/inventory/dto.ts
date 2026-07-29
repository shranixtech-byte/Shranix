import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, Min, MinLength } from 'class-validator';

// ── Item ────────────────────────────────────────────────
export class CreateItemDto {
  @ApiProperty() @IsString() @MinLength(2) name!: string;
  @ApiProperty() @IsString() sku!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstRateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hsnCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) purchaseRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) salesRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) reorderLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) openingStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasBatch?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasSerial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasExpiry?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isTaxable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() taxPreference?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) weight?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() weightUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() qrCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subCategoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() packSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateItemDto implements Partial<CreateItemDto> {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstRateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hsnCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() purchaseRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() salesRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() reorderLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasBatch?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasSerial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasExpiry?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() productCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() qrCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subCategoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() packSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ── Item Variant ────────────────────────────────────────
export class CreateItemVariantDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() sku!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() purchaseRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() salesRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() attributes?: string;
}
export class UpdateItemVariantDto { @ApiPropertyOptional() @IsOptional() @IsString() name?: string; @ApiPropertyOptional() @IsOptional() @IsString() sku?: string; @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string; @ApiPropertyOptional() @IsOptional() @IsNumber() purchaseRate?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() salesRate?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number; @ApiPropertyOptional() @IsOptional() @IsString() attributes?: string; }

// ── Item Group ──────────────────────────────────────────
export class CreateItemGroupDto { @ApiProperty() @IsString() name!: string; @ApiPropertyOptional() @IsOptional() @IsString() description?: string; }
export class UpdateItemGroupDto { @ApiPropertyOptional() @IsOptional() @IsString() name?: string; @ApiPropertyOptional() @IsOptional() @IsString() description?: string; }

// ── Item Pricing ────────────────────────────────────────
export class CreateItemPricingDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priceList?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() purchaseRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() salesRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() partyId?: string;
}
export class UpdateItemPricingDto { @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string; @ApiPropertyOptional() @IsOptional() @IsString() priceList?: string; @ApiPropertyOptional() @IsOptional() @IsNumber() purchaseRate?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() salesRate?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() discountPercent?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() minQuantity?: number; }

// ── Item Barcode ────────────────────────────────────────
export class CreateItemBarcodeDto { @ApiProperty() @IsString() itemId!: string; @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string; @ApiProperty() @IsString() barcode!: string; @ApiPropertyOptional() @IsOptional() @IsString() type?: string; @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean; }
export class UpdateItemBarcodeDto { @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string; @ApiPropertyOptional() @IsOptional() @IsString() type?: string; @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean; }

// ── HSN Code ────────────────────────────────────────────
export class CreateHsnCodeDto { @ApiProperty() @IsString() code!: string; @ApiPropertyOptional() @IsOptional() @IsString() description?: string; @ApiPropertyOptional() @IsOptional() @IsString() type?: string; @ApiPropertyOptional() @IsOptional() @IsNumber() gstRate?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() igst?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() cgst?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() sgst?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() cess?: number; @ApiPropertyOptional() @IsOptional() @IsString() chapter?: string; @ApiPropertyOptional() @IsOptional() @IsString() heading?: string; }
export class UpdateHsnCodeDto { @ApiPropertyOptional() @IsOptional() @IsString() description?: string; @ApiPropertyOptional() @IsOptional() @IsNumber() gstRate?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() igst?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() cgst?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() sgst?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() cess?: number; @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean; }

// ── Stock Opening ───────────────────────────────────────
export class CreateStockOpeningDto { @ApiProperty() @IsString() itemId!: string; @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string; @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string; @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string; @ApiProperty() @IsNumber() @Min(0) quantity!: number; @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rate?: number; @ApiPropertyOptional() @IsOptional() @IsString() mfgDate?: string; @ApiPropertyOptional() @IsOptional() @IsString() expDate?: string; @ApiPropertyOptional() @IsOptional() @IsString() serialNumbers?: string; }
export class UpdateStockOpeningDto { @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() rate?: number; @ApiPropertyOptional() @IsOptional() @IsBoolean() isPosted?: boolean; }

// ── Item Image ──────────────────────────────────────────
export class CreateItemImageDto { @ApiProperty() @IsString() itemId!: string; @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string; @ApiProperty() @IsString() url!: string; @ApiPropertyOptional() @IsOptional() @IsString() thumbnailUrl?: string; @ApiPropertyOptional() @IsOptional() @IsString() alt?: string; @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number; @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean; }
export class UpdateItemImageDto { @ApiPropertyOptional() @IsOptional() @IsString() url?: string; @ApiPropertyOptional() @IsOptional() @IsString() thumbnailUrl?: string; @ApiPropertyOptional() @IsOptional() @IsString() alt?: string; @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number; @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean; }

// ── Inventory Settings ──────────────────────────────────
export class CreateInventorySettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() companyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() method?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() negativeStock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoReorder?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() batchTracking?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() serialTracking?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() expiryTracking?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultWarehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stockValuation?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() roundOff?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableWarehouse?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableBatch?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableSerial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableExpiry?: boolean;
}
export class UpdateInventorySettingsDto { @ApiPropertyOptional() @IsOptional() @IsString() method?: string; @ApiPropertyOptional() @IsOptional() @IsBoolean() negativeStock?: boolean; @ApiPropertyOptional() @IsOptional() @IsBoolean() autoReorder?: boolean; @ApiPropertyOptional() @IsOptional() @IsInt() roundOff?: number; }

// ── PRM-015A: Sub Category ──────────────────────────────
export class CreateSubCategoryDto {
  @ApiProperty() @IsString() @MinLength(2) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateSubCategoryDto { @ApiPropertyOptional() @IsOptional() @IsString() name?: string; @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string; @ApiPropertyOptional() @IsOptional() @IsString() description?: string; @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean; }

// ── PRM-015: Batch Management ────────────────────────────
export class CreateBatchDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiProperty() @IsString() batchNo!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mfgDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shelfLife?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() purchaseRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sellingPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() distributorPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retailPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() reservedQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationCode?: string;  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseReference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class UpdateBatchDto { @ApiPropertyOptional() @IsOptional() @IsString() lotNo?: string; @ApiPropertyOptional() @IsOptional() @IsString() expDate?: string; @ApiPropertyOptional() @IsOptional() @IsNumber() purchaseRate?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() mrp?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() sellingPrice?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() distributorPrice?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() retailPrice?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() reservedQuantity?: number; @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string; @ApiPropertyOptional() @IsOptional() @IsString() locationCode?: string; @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean; @ApiPropertyOptional() @IsOptional() @IsString() supplierId?: string; @ApiPropertyOptional() @IsOptional() @IsString() purchaseReference?: string; @ApiPropertyOptional() @IsOptional() @IsString() status?: string; @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string; }

// ── PRM-015: Stock Movement ─────────────────────────────
export class CreateStockMovementDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiProperty() @IsString() movementType!: string;
  @ApiProperty() @IsNumber() @Min(0) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() beforeQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() afterQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
export class UpdateStockMovementDto { @ApiPropertyOptional() @IsOptional() @IsString() movementType?: string; @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number; @ApiPropertyOptional() @IsOptional() @IsNumber() rate?: number; @ApiPropertyOptional() @IsOptional() @IsString() reason?: string; @ApiPropertyOptional() @IsOptional() @IsString() notes?: string; }

// ── PRM-015: Warehouse Location ─────────────────────────
export class CreateWarehouseLocationDto {
  @ApiProperty() @IsString() warehouseId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() godown?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rack?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shelf?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateWarehouseLocationDto { @ApiPropertyOptional() @IsOptional() @IsString() godown?: string; @ApiPropertyOptional() @IsOptional() @IsString() rack?: string; @ApiPropertyOptional() @IsOptional() @IsString() shelf?: string; @ApiPropertyOptional() @IsOptional() @IsString() bin?: string; @ApiPropertyOptional() @IsOptional() @IsString() locationCode?: string; @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean; }

// ── PRM-015: Agriculture Features ───────────────────────
export class CreateDamageRegisterDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiProperty() @IsNumber() @Min(1) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rate?: number;
  @ApiProperty() @IsString() reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
export class UpdateDamageRegisterDto { @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number; @ApiPropertyOptional() @IsOptional() @IsString() reason?: string; @ApiPropertyOptional() @IsOptional() @IsString() status?: string; }

export class CreateRecallRegisterDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiProperty() @IsNumber() @Min(1) quantity!: number;
  @ApiProperty() @IsString() reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notifiedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
export class UpdateRecallRegisterDto { @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number; @ApiPropertyOptional() @IsOptional() @IsString() reason?: string; @ApiPropertyOptional() @IsOptional() @IsString() status?: string; }

export class CreateDistributorReturnDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiProperty() @IsNumber() @Min(1) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() distributorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() distributorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expectedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
export class UpdateDistributorReturnDto { @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number; @ApiPropertyOptional() @IsOptional() @IsString() reason?: string; @ApiPropertyOptional() @IsOptional() @IsString() status?: string; @ApiPropertyOptional() @IsOptional() @IsString() expectedDate?: string; }

// ── PRM-015: Replacement Queue ──────────────────────────
export class CreateReplacementDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() originalReturnId?: string;
  @ApiProperty() @IsNumber() @Min(1) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() distributorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expectedDate?: string;
}
export class UpdateReplacementDto { @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number; @ApiPropertyOptional() @IsOptional() @IsString() reason?: string; @ApiPropertyOptional() @IsOptional() @IsString() status?: string; @ApiPropertyOptional() @IsOptional() @IsString() expectedDate?: string; }

// ── PRM-015C: Stock Transfer ────────────────────────────
export class CreateTransferDto {
  @ApiProperty() @IsString() transferNumber!: string;
  @ApiProperty() @IsString() fromLocation!: string;
  @ApiProperty() @IsString() toLocation!: string;
  @ApiProperty() @IsString() fromType!: string;
  @ApiProperty() @IsString() toType!: string;
  @ApiProperty() @IsString() itemId!: string;
  @ApiProperty() @IsString() batchNo!: string;
  @ApiProperty() @IsNumber() @Min(1) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() requestedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() approvedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() approvedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectedReason?: string;
}
export class UpdateTransferDto { @ApiPropertyOptional() @IsOptional() @IsString() status?: string; @ApiPropertyOptional() @IsOptional() @IsString() approvedBy?: string; @ApiPropertyOptional() @IsOptional() @IsString() approvedDate?: string; @ApiPropertyOptional() @IsOptional() @IsString() rejectedReason?: string; @ApiPropertyOptional() @IsOptional() @IsString() reason?: string; }
