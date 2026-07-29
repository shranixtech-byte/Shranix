import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, Min, IsArray, ValidateNested } from 'class-validator';

// ═════════════════════════════════════════════════════════
// SUPPLIER DTOs (PRM-016 Module 1)
// ═════════════════════════════════════════════════════════
export class CreateSupplierDto {
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pan?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pin?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) creditDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccountNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankIfsc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankBranch?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}
export class UpdateSupplierDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pan?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pin?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) creditDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccountNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankIfsc?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

// ═════════════════════════════════════════════════════════
// PURCHASE REQUISITION DTOs (PRM-016 Module 2)
// ═════════════════════════════════════════════════════════
export class CreatePurchaseRequisitionDto {
  @ApiProperty() @IsString() prNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() requestedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() requiredDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => RequisitionItemDto) items?: RequisitionItemDto[];
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
  @ApiProperty() @IsString() poNumber!: string;
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
  @ApiPropertyOptional() @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => POItemDto) items?: POItemDto[];
}
export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expectedDelivery?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transportDetails?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectionReason?: string;
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
  @ApiProperty() @IsString() grnNumber!: string;
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
  @ApiPropertyOptional() @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => GRNItemDto) items?: GRNItemDto[];
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
  @ApiProperty() @IsString() invoiceNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierInvoiceNo?: string;
  @ApiProperty() @IsString() supplierId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() poId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() grnId?: string;
  @ApiProperty() @IsString() invoiceDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grandTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
export class UpdatePurchaseInvoiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ═════════════════════════════════════════════════════════
// PURCHASE RETURN DTOs (PRM-016 Module 6)
// ═════════════════════════════════════════════════════════
export class CreatePurchaseReturnDto {
  @ApiProperty() @IsString() returnNumber!: string;
  @ApiProperty() @IsString() supplierId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() grnId?: string;
  @ApiProperty() @IsString() returnDate!: string;
  @ApiProperty() @IsString() returnReason!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grandTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ReturnItemDto) items?: ReturnItemDto[];
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
  @ApiProperty() @IsString() supplierId!: string; @ApiProperty() @IsString() itemId!: string;
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
}
export class UpdatePurchaseSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoPoNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() poPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() poNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireApproval?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultPaymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() gstEnabled?: boolean;
}
