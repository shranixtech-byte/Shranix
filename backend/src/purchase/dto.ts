import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  IsIn,
  IsEmail,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';

// ═════════════════════════════════════════════════════════
// SUPPLIER DTOs (PRM-016 Module 1 + Supplier Master Phase)
// ═════════════════════════════════════════════════════════
export class CreateSupplierDto {
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firmName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() groupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pan?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() aadhaar?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() altMobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() whatsapp?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() village?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taluka?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) openingBalance?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) creditDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() upiId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccountNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankIfsc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankBranch?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsIn(['active', 'inactive', 'blocked']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}
export class UpdateSupplierDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firmName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() groupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pan?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() aadhaar?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() altMobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() whatsapp?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() village?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taluka?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) openingBalance?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) creditDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() upiId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccountNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankIfsc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankBranch?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class SupplierStatusDto {
  @ApiProperty({ enum: ['active', 'inactive', 'blocked'] })
  @IsIn(['active', 'inactive', 'blocked'])
  status!: string;
}

export class SupplierAddressDto {
  @ApiPropertyOptional({ enum: ['billing', 'shipping', 'branch', 'head_office'] })
  @IsOptional()
  @IsIn(['billing', 'shipping', 'branch', 'head_office'])
  addressType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() village?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taluka?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pincode?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class SupplierGroupDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class SupplierCategoryDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) priority?: number;
}

export class SupplierContactDto {
  @ApiPropertyOptional({
    enum: ['owner', 'accounts', 'purchase', 'sales', 'dispatch', 'purchase_manager'],
  })
  @IsOptional()
  @IsIn(['owner', 'accounts', 'purchase', 'sales', 'dispatch', 'purchase_manager'])
  contactType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designation?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
}

/** Create-only contact DTO — name is mandatory for new records. */
export class CreateSupplierContactDto {
  @ApiPropertyOptional({
    enum: ['owner', 'accounts', 'purchase', 'sales', 'dispatch', 'purchase_manager'],
  })
  @IsOptional()
  @IsIn(['owner', 'accounts', 'purchase', 'sales', 'dispatch', 'purchase_manager'])
  contactType?: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designation?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class SupplierDocumentDto {
  @ApiProperty({ enum: ['gst_certificate', 'pan', 'agreement', 'shop_license', 'other'] })
  @IsIn(['gst_certificate', 'pan', 'agreement', 'shop_license', 'other'])
  docType!: string;
  @ApiProperty() @IsString() fileName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) fileSize?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class BulkSupplierStatusDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) ids!: string[];
  @ApiProperty({ enum: ['active', 'inactive', 'blocked'] })
  @IsIn(['active', 'inactive', 'blocked'])
  status!: string;
}

export class BulkSupplierDeleteDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) ids!: string[];
}

// ═════════════════════════════════════════════════════════
// PURCHASE REQUISITION DTOs (PRM-016 Module 2)
// ═════════════════════════════════════════════════════════
export class CreatePurchaseRequisitionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() prNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() requestedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() requiredDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequisitionItemDto)
  items?: RequisitionItemDto[];
}
export class UpdatePurchaseRequisitionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() requiredDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectionReason?: string;
}
export class RequisitionItemDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() @Min(1) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

// ═════════════════════════════════════════════════════════
// PURCHASE QUOTATION DTOs
// ═════════════════════════════════════════════════════════
export class CreatePurchaseQuotationDto {
  @ApiProperty() @IsString() quoteNumber!: string;
  @ApiProperty() @IsString() supplierId!: string;
  @ApiProperty() @IsString() quoteDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() validUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grandTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
export class UpdatePurchaseQuotationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ═════════════════════════════════════════════════════════
// ENHANCED PURCHASE ORDER DTOs (PRM-016 Module 3)
// ═════════════════════════════════════════════════════════
export class CreatePurchaseOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() poNumber?: string;
  @ApiProperty() @IsString() supplierId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiProperty() @IsString() orderDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expectedDelivery?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transportDetails?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() terms?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) subTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grandTotal?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POItemDto)
  items?: POItemDto[];
}
export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expectedDelivery?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transportDetails?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectionReason?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POItemDto)
  items?: POItemDto[];
}
export class POItemDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() @Min(1) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string;
  @ApiProperty() @IsNumber() @Min(0) rate!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) gstRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) totalAmount?: number;
}

// ═════════════════════════════════════════════════════════
// ENHANCED GRN DTOs (PRM-016 Module 4)
// ═════════════════════════════════════════════════════════
export class CreateGrnDto {
  @ApiPropertyOptional() @IsOptional() @IsString() grnNumber?: string;
  @ApiProperty() @IsString() poId!: string;
  @ApiProperty() @IsString() supplierId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiProperty() @IsString() receivedDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiptType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryChallanNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transporterName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GRNItemDto)
  items?: GRNItemDto[];
}
export class UpdateGrnDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
export class GRNItemDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() poItemId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lotNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mfgDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expDate?: string;
  @ApiProperty() @IsNumber() @Min(0) receivedQuantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) acceptedQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rejectedQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) purchaseRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) mrp?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sellingPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) gstRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

// ═════════════════════════════════════════════════════════
// PURCHASE INVOICE DTOs
// ═════════════════════════════════════════════════════════
export class CreatePurchaseInvoiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierInvoiceNo?: string;
  @ApiProperty() @IsString() supplierId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() poId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() grnId?: string;
  @ApiProperty() @IsString() invoiceDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) subTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) roundOff?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grandTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseInvoiceItemDto)
  items?: PurchaseInvoiceItemDto[];
}
export class UpdatePurchaseInvoiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) subTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grandTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseInvoiceItemDto)
  items?: PurchaseInvoiceItemDto[];
}

export class PurchaseInvoiceItemDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() poItemId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() grnItemId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mfgDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expDate?: string;
  @ApiProperty() @IsNumber() @Min(0) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string;
  @ApiProperty() @IsNumber() @Min(0) rate!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) gstRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) igst?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cgst?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sgst?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cess?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) totalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

// ═════════════════════════════════════════════════════════
// PURCHASE RETURN DTOs (PRM-016 Module 6)
// ═════════════════════════════════════════════════════════
export class CreatePurchaseReturnDto {
  @ApiPropertyOptional() @IsOptional() @IsString() returnNumber?: string;
  @ApiProperty() @IsString() supplierId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() grnId?: string;
  @ApiProperty() @IsString() returnDate!: string;
  @ApiProperty() @IsString() returnReason!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grandTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items?: ReturnItemDto[];
}
export class UpdatePurchaseReturnDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectionReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
export class ReturnItemDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiProperty() @IsNumber() @Min(1) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

// ═════════════════════════════════════════════════════════
// SUPPLIER PRICE LIST DTOs
// ═════════════════════════════════════════════════════════
export class CreateSupplierPriceListDto {
  @ApiProperty() @IsString() supplierId!: string;
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsNumber() @Min(0) rate!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() effectiveFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() effectiveTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) minQuantity?: number;
}
export class UpdateSupplierPriceListDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ═════════════════════════════════════════════════════════
// PURCHASE APPROVAL DTOs
// ═════════════════════════════════════════════════════════
export class CreatePurchaseApprovalDto {
  @ApiProperty() @IsString() documentType!: string;
  @ApiProperty() @IsString() documentId!: string;
  @ApiProperty() @IsString() requestedBy!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) approvalLevel?: number;
}
export class UpdatePurchaseApprovalDto {
  @ApiProperty() @IsString() status!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comments?: string;
}

// ═════════════════════════════════════════════════════════
// PURCHASE SETTINGS DTOs
// ═════════════════════════════════════════════════════════
export class CreatePurchaseSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoPoNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() poPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) poNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireApproval?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) approvalLevels?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultPaymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() gstEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) roundOffDecimals?: number;
  // Purchase Settings — defaults & automation
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoGrn?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) supplierCreditDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultTaxGroupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultWarehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultPaymentMode?: string;
  // Supplier Settings (Settings Hub → Purchase → Supplier)
  @ApiPropertyOptional() @IsOptional() @IsString() defaultSupplierCategory?: string;
  // Select UI sends '1'–'5' strings → coerce to number before @IsInt validation
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  defaultVendorRating?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultGstRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireVendorApproval?: boolean;
  // Numbering prefixes (schema-backed, exposed for settings UI)
  @ApiPropertyOptional() @IsOptional() @IsString() quotationPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) quotationNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() grnPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) grnNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() invoicePrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) invoiceNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() returnPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) returnNextNumber?: number;
}
export class UpdatePurchaseSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoPoNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() poPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() poNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireApproval?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultPaymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() gstEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoGrn?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) supplierCreditDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultTaxGroupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultWarehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultPaymentMode?: string;
  // Supplier Settings (Settings Hub → Purchase → Supplier)
  @ApiPropertyOptional() @IsOptional() @IsString() defaultSupplierCategory?: string;
  // Select UI sends '1'–'5' strings → coerce to number before @IsInt validation
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  defaultVendorRating?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultGstRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireVendorApproval?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() quotationPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() quotationNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() grnPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() grnNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() invoicePrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() invoiceNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() returnPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() returnNextNumber?: number;
}

// ═════════════════════════════════════════════════════════
// PURCHASE PAYMENT DTOs (Phase 3.3 — G3 supplier payment collection)
// ═════════════════════════════════════════════════════════
export class CollectSupplierPaymentDto {
  @ApiProperty() @IsString() supplierId!: string;
  @ApiProperty() @IsString() paymentDate!: string;
  @ApiProperty({ enum: ['cash', 'upi', 'bank', 'cheque'] })
  @IsIn(['cash', 'upi', 'bank', 'cheque'])
  mode!: string;
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chequeNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chequeDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  /** Empty array = pura payment advance (invoice-free payment). */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  invoiceIds?: string[];
}

export class ApplySupplierAdvanceDto {
  @ApiProperty() @IsString() supplierId!: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) invoiceIds!: string[];
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
