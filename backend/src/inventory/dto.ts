import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, Min, MinLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
  // ── Step 17: Enterprise Product Fields ──
  @ApiPropertyOptional() @IsOptional() @IsString() shortName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturerCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseUnitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salesUnitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stockUnitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) length?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) width?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) height?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) volume?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() volumeUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shelfLife?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() seasonal?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() organic?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() cropSeason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variety?: string;
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

// ── Step 18: Enterprise Batch Master ─────────────────────
export class CreateBatchMasterDto {
  @ApiProperty() @IsString() batchNo!: string;
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mfgDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() packingDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bestBeforeDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() retestDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryOfOrigin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierBatchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalBatchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) reservedQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) purchaseRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sellingPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cropSeason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seedVariety?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() farmSource?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() farmerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() harvestDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() packingCenter?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() organic?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() certificationNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() qualityStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class UpdateBatchMasterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() reservedQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() purchaseRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() qualityStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

// ── Step 18: Batch Lots ─────────────────────────────────
export class CreateBatchLotDto {
  @ApiProperty() @IsString() lotCode!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotName?: string;
  @ApiProperty() @IsString() batchId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentLotId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) quantity?: number;
}
export class UpdateBatchLotDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number;
}

// ── Step 18: Batch Genealogy ────────────────────────────
export class CreateBatchGenealogyDto {
  @ApiProperty() @IsString() parentBatchId!: string;
  @ApiProperty() @IsString() childBatchId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() relationshipType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

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

// ── Step 17: UOM Conversion ─────────────────────────────
export class CreateUOMConversionDto {
  @ApiProperty() @IsString() fromUnitId!: string;
  @ApiProperty() @IsString() toUnitId!: string;
  @ApiProperty() @IsNumber() @Min(0.0001) factor!: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() bidirectional?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() itemId?: string;
}
export class UpdateUOMConversionDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.0001) factor?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() bidirectional?: boolean;
}

// ── Step 17: Product Attribute ──────────────────────────
export class CreateProductAttributeDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsString() attributeName!: string;
  @ApiProperty() @IsString() attributeValue!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
}
export class UpdateProductAttributeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() attributeValue?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
}

// ── Step 17: Item Packaging ─────────────────────────────
export class CreateItemPackagingDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() level?: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) weight?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() weightUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) length?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) width?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) height?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) volume?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() volumeUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) quantity?: number;
}
export class UpdateItemPackagingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) weight?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() weightUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) length?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) width?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) height?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) volume?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() volumeUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) quantity?: number;
}

// ── Step 19: Serial Master ──────────────────────────────
export class CreateSerialDto {
  @ApiProperty() @IsString() serialNo!: string;
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalSerialNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturerSerialNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierSerialNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currentLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() qrCode?: string;
}
export class UpdateSerialDto {
  @ApiPropertyOptional() @IsOptional() @IsString() currentLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
}

// ── Step 19: Serial Warranty ────────────────────────────
export class CreateSerialWarrantyDto {
  @ApiProperty() @IsString() serialId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyEnd?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyType?: string;
}
export class UpdateSerialWarrantyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyEnd?: string;
}

// ── Step 19: Serial History ─────────────────────────────
export class CreateSerialHistoryDto {
  @ApiProperty() @IsString() serialId!: string;
  @ApiProperty() @IsString() eventType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fromLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

// ── Step 19: Serial Relationship ────────────────────────
export class CreateSerialRelationshipDto {
  @ApiProperty() @IsString() parentSerialId!: string;
  @ApiProperty() @IsString() childSerialId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() relationshipType?: string;
}

// ── Step 19: Serial RMA ─────────────────────────────────
export class CreateSerialRMADto {
  @ApiProperty() @IsString() serialId!: string;
  @ApiProperty() @IsString() rmaNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rmaType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
}
export class UpdateSerialRMADto {
  @ApiPropertyOptional() @IsOptional() @IsString() rmaStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() approvedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() completedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

// ── Step 19: Serial Service ─────────────────────────────
export class CreateSerialServiceDto {
  @ApiProperty() @IsString() serialId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() technician?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sparePartsUsed?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cost?: number;
}

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

// ── Step 20: Inventory Posting ──────────────────────────
export class PostMovementDto {
  @ApiProperty() @IsString() transactionType!: string;
  @ApiProperty({ enum: ['IN', 'OUT', 'TRANSFER'] }) @IsString() direction!: string;
  @ApiProperty() @IsString() itemId!: string;
  @ApiProperty() @IsString() warehouseId!: string;
  @ApiProperty() @IsNumber() @Min(0.01) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() batchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class PostTransferDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiProperty() @IsString() fromWarehouseId!: string;
  @ApiProperty() @IsString() toWarehouseId!: string;
  @ApiProperty() @IsNumber() @Min(0.01) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() batchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() uom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class ReverseMovementDto {
  @ApiProperty() @IsString() entryNumber!: string;
  @ApiProperty() @IsString() reason!: string;
}

export class ReserveStockDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiProperty() @IsString() warehouseId!: string;
  @ApiProperty() @IsNumber() @Min(0.01) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() batchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class ReleaseReservationDto {
  @ApiProperty() @IsString() reservationId!: string;
}

export class StockCardDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fromDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toDate?: string;
}

export class MovementReportDto {
  @ApiPropertyOptional() @IsOptional() @IsString() transactionType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() direction?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fromDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() itemId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() page?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pageSize?: number;
}

// ── Step 21: Enterprise Stock Transfer ──────────────────
export class CreateTransferItemDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() uom?: string;
  @ApiProperty() @IsNumber() @Min(0.01) requestedQty!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) unitCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class CreateTransferDocumentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() transferDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transferType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiProperty() @IsString() sourceWarehouseId!: string;
  @ApiProperty() @IsString() destinationWarehouseId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceZoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() destinationZoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceRackId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() destinationRackId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceShelfId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() destinationShelfId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceBinId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() destinationBinId?: string;
  @ApiProperty({ type: [CreateTransferItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => CreateTransferItemDto)
  items!: CreateTransferItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ReceiveTransferItemDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiProperty() @IsNumber() @Min(0) receivedQty!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rejectedQty?: number;
}

export class ReceiveTransferDto {
  @ApiProperty() @IsString() id!: string;
  @ApiPropertyOptional({ type: [ReceiveTransferItemDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ReceiveTransferItemDto)
  items?: ReceiveTransferItemDto[];
}

export class RejectTransferDto {
  @ApiProperty() @IsString() reason!: string;
}

export class CancelTransferDto {
  @ApiProperty() @IsString() reason!: string;
}

export class ApproveTransferDto {
  @ApiPropertyOptional() @IsOptional() @IsString() approvalNotes?: string;
}

export class InTransitTransferDto {
  @ApiPropertyOptional() @IsOptional() @IsString() expectedArrival?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transitNotes?: string;
}

export class TransferReportQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceWarehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() destinationWarehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fromDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() page?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pageSize?: number;
}

// ── Step 23: Enterprise Physical Count & Cycle Counting ──
export class CreateCountItemDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() uom?: string;
  @ApiProperty({ description: 'System quantity (from ledger)' }) @IsNumber() systemQty!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() countedQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class UpdateCountItemDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() countedQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() recountQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() verifiedQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string; // pending, counted, verified, resolved
}

export class CreatePhysicalCountDto {
  @ApiPropertyOptional() @IsOptional() @IsString() countDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countType?: string; // full_warehouse, cycle_count, abc_count, blind_count, spot_count, recount, random_audit
  @ApiProperty() @IsString() warehouseId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rackId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shelfId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() binId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string; // low, normal, high, urgent
  @ApiPropertyOptional() @IsOptional() @IsString() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supervisor?: string;
  @ApiProperty({ type: [CreateCountItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => CreateCountItemDto)
  items!: CreateCountItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class UpdatePhysicalCountDto {
  @ApiPropertyOptional() @IsOptional() @IsString() countDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rackId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shelfId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() binId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supervisor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class VerifyCountDto {
  @ApiProperty() @IsString() verifierId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() approvalNotes?: string;
}

export class ApproveCountDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoCreateAdjustment?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() approvalNotes?: string;
}

export class CompleteCountDto {
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class RejectCountDto {
  @ApiProperty() @IsString() reason!: string;
}

export class CancelCountDto {
  @ApiProperty() @IsString() reason!: string;
}

export class GenerateAdjustmentDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() postImmediately?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() approvalNotes?: string;
}

// ── Step 22: Enterprise Stock Adjustment ────────────────
export class CreateAdjustmentItemDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() uom?: string;
  @ApiProperty() @IsNumber() systemQty!: number;
  @ApiProperty() @IsNumber() physicalQty!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) unitCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class CreateAdjustmentDocumentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() adjustmentDate?: string;
  @ApiProperty() @IsString() adjustmentType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reasonCode?: string;
  @ApiProperty() @IsString() warehouseId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rackId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shelfId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() binId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
  @ApiProperty({ type: [CreateAdjustmentItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => CreateAdjustmentItemDto)
  items!: CreateAdjustmentItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}
