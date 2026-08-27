import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  IsArray,
  IsIn,
  Min,
} from 'class-validator';

// ═════════════════════════════════════════════════════════
// 1. SALES QUOTATIONS
// ═════════════════════════════════════════════════════════
export class CreateQuotationItemDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() discountType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxableValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) gstRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) igst?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cgst?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sgst?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cess?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) totalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hsnCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) freeQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouse?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expiryDate?: string;
}

export class CreateSalesQuotationDto {
  // Optional when Auto numbering is ON — required when Manual numbering is ON.
  @ApiPropertyOptional() @IsOptional() @IsString() quoteNumber?: string;
  @ApiProperty() @IsString() customerId!: string;
  @ApiProperty() @IsString() quoteDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() validTill?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() financialYearId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) freight?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) installationCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warranty?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) basicTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) subTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() discountMode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cgstTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sgstTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) igstTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cessTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() roundOff?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() applyRoundOff?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grandTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() terms?: string;
  @ApiPropertyOptional() @IsOptional() items?: CreateQuotationItemDto[];
}
export class UpdateSalesQuotationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() terms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) freight?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) installationCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warranty?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) basicTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) subTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() discountMode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cgstTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sgstTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) igstTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cessTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() roundOff?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() applyRoundOff?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grandTotal?: number;
  @ApiPropertyOptional() @IsOptional() items?: CreateQuotationItemDto[];
}

export class SendQuotationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() via?: string;
}

export class ConvertQuotationDto {
  /** Which steps to run — defaults to all three (order, challan, invoice). */
  @ApiPropertyOptional({ type: [String], enum: ['order', 'challan', 'invoice'] })
  @IsOptional()
  @IsArray()
  @IsIn(['order', 'challan', 'invoice'], { each: true })
  steps?: ('order' | 'challan' | 'invoice')[];
}

// ═════════════════════════════════════════════════════════
// 2. SALES ORDERS
// ═════════════════════════════════════════════════════════
export class CreateOrderItemDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) deliveredQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) reservedQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxableValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) gstRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) igst?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cgst?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sgst?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cess?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) totalAmount?: number;
}

export class CreateSalesOrderDto {
  // Optional when Auto numbering is ON — required when Manual numbering is ON.
  @ApiPropertyOptional() @IsOptional() @IsString() orderNumber?: string;
  @ApiProperty() @IsString() customerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() quotationId?: string;
  @ApiProperty() @IsString() orderDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPartial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) subTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cgstTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sgstTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) igstTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cessTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() roundOff?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grandTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() terms?: string;
  @ApiPropertyOptional() @IsOptional() items?: CreateOrderItemDto[];
}
export class UpdateSalesOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() orderNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPartial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() terms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectionReason?: string;
  @ApiPropertyOptional() @IsOptional() items?: CreateOrderItemDto[];
}

// ═════════════════════════════════════════════════════════
// 3. DELIVERY CHALLAN
// ═════════════════════════════════════════════════════════
export class CreateChallanItemDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() orderItemId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) deliveredQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumbers?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mfgDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateDeliveryChallanDto {
  // Optional when Auto numbering is ON — required when Manual numbering is ON.
  @ApiPropertyOptional() @IsOptional() @IsString() challanNumber?: string;
  @ApiProperty() @IsString() orderId!: string;
  @ApiProperty() @IsString() customerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiProperty() @IsString() dispatchDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dispatchType?: string;
  // ── Vehicle + Driver (Transport) ──
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverMobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transporterName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lrNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lrDate?: string;
  // ── E-way Bill (Phase 2) ──
  @ApiPropertyOptional() @IsOptional() @IsString() ewayBillNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ewayBillDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transportDetails?: string;
  // ── Dispatch status + totals ──
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) totalQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) totalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() billingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() financialYearId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() items?: CreateChallanItemDto[];
}
export class UpdateDeliveryChallanDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dispatchType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverMobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transporterName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lrNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lrDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ewayBillNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ewayBillDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transportDetails?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) totalQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) totalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() billingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() items?: CreateChallanItemDto[];
}

// ═════════════════════════════════════════════════════════
// 4. SALES INVOICES
// ═════════════════════════════════════════════════════════

export class CreateSalesInvoiceItemDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxableValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) gstRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) igst?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cgst?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sgst?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cess?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) totalAmount?: number;
}

export class CreateSalesInvoiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() orderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() challanId?: string;
  @ApiProperty() @IsString() customerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerInvoiceNo?: string;
  @ApiProperty() @IsString() invoiceDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) subTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) freight?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() roundOff?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grandTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) balanceAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() placeOfSupply?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salesPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstCategory?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerGstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() financialYear?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cgstTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sgstTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) igstTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cessTotal?: number;
  @ApiPropertyOptional() @IsOptional() items?: CreateSalesInvoiceItemDto[];
}

export class UpdateSalesInvoiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) balanceAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class PostSalesInvoiceDto {
  @ApiProperty() @IsString() userId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userEmail?: string;
}

// ═════════════════════════════════════════════════════════
// 5. SALES RETURNS
// ═════════════════════════════════════════════════════════
export class CreateSalesReturnDto {
  @ApiProperty() @IsString() returnNumber!: string;
  @ApiProperty() @IsString() invoiceId!: string;
  @ApiProperty() @IsString() customerId!: string;
  @ApiProperty() @IsString() returnDate!: string;
  @ApiProperty() @IsString() returnReason!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grandTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() creditNoteNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
export class UpdateSalesReturnDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectionReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ═════════════════════════════════════════════════════════
// 6. CUSTOMER PRICE LIST
// ═════════════════════════════════════════════════════════
export class CreateCustomerPriceListDto {
  @ApiProperty() @IsString() customerId!: string;
  @ApiProperty() @IsString() itemId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsNumber() @Min(0) rate!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) minQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() effectiveFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() effectiveTo?: string;
}
export class UpdateCustomerPriceListDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ═════════════════════════════════════════════════════════
// 7. SALES APPROVALS
// ═════════════════════════════════════════════════════════
export class CreateSalesApprovalDto {
  @ApiProperty() @IsString() documentType!: string;
  @ApiProperty() @IsString() documentId!: string;
  @ApiProperty() @IsString() requestedBy!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) approvalLevel?: number;
}
export class UpdateSalesApprovalDto {
  @ApiProperty() @IsString() status!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comments?: string;
}

// ═════════════════════════════════════════════════════════
// 8. SALES SETTINGS
// ═════════════════════════════════════════════════════════
export class CreateSalesSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoQuoteNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() quotePrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) quoteNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() quoteFyPrefix?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() quoteBranchPrefix?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoOrderNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() orderPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) orderNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() challanPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) challanNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoInvoiceNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() invoicePrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) invoiceNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() returnPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) returnNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireApproval?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) approvalLevels?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() gstEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) roundOffDecimals?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultPaymentTerms?: string;
  // Sales Settings — approvals, credit, alerts, defaults
  @ApiPropertyOptional() @IsOptional() @IsBoolean() discountApproval?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) discountApprovalLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enforceCreditLimit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() overdueAlert?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) overdueAlertDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() salesmanMandatory?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) quotationExpiryDays?: number;
  // Customer Settings — defaults, groups, loyalty, validations (Settings Hub → Customers)
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) defaultCreditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customerGroups?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultCustomerGroup?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() loyaltyEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) loyaltyPointsPerAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultPriceList?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() gstValidation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() panValidation?: boolean;
  // Invoice printing settings (Settings Hub → Invoice Settings)
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceSuffix?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() printFormat?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() duplicateCopy?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() transportCopy?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showQr?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showHsn?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showBatch?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showExpiry?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showDiscount?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showGst?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showBarcode?: boolean;
}
export class UpdateSalesSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoQuoteNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() quotePrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() quoteNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() quoteFyPrefix?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() quoteBranchPrefix?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoOrderNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() orderPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() orderNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() challanPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() challanNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoInvoiceNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() invoicePrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() invoiceNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() returnPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() returnNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireApproval?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() gstEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() discountApproval?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() discountApprovalLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enforceCreditLimit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() overdueAlert?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() overdueAlertDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() salesmanMandatory?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() quotationExpiryDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) defaultCreditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customerGroups?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultCustomerGroup?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() loyaltyEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) loyaltyPointsPerAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultPriceList?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() gstValidation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() panValidation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceSuffix?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() printFormat?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() duplicateCopy?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() transportCopy?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showQr?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showHsn?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showBatch?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showExpiry?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showDiscount?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showGst?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showBarcode?: boolean;
}

// UPI payment settings (dukandar ka UPI ID — bill ke QR code ke liye)
export class UpiSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() upiId?: string;
}

// ═════════════════════════════════════════════════════════
// 9. CUSTOMERS
// ═════════════════════════════════════════════════════════
export class CreateCustomerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pan?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pin?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) creditDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerGroup?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priceList?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) loyaltyPoints?: number;
  // ── Phase 3: Customer Master fields ──
  @ApiPropertyOptional() @IsOptional() @IsString() firmName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerCategory?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() altMobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() whatsapp?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() village?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taluka?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) openingBalance?: number;
}

// ═════════════════════════════════════════════════════════
// 10. PAYMENT COLLECTION (Phase 4)
// ═════════════════════════════════════════════════════════
export class CollectPaymentDto {
  @ApiProperty() @IsString() customerId!: string;
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
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  invoiceIds?: string[];
}

export class ApplyAdvanceDto {
  @ApiProperty() @IsString() customerId!: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) invoiceIds!: string[];
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
export class UpdateCustomerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pan?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pin?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) creditDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerGroup?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priceList?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) loyaltyPoints?: number;
  // ── Phase 3: Customer Master fields ──
  @ApiPropertyOptional() @IsOptional() @IsString() firmName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerCategory?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() altMobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() whatsapp?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() village?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taluka?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) openingBalance?: number;
}

// ═════════════════════════════════════════════════════════
// 11. CUSTOMER MASTER (Phase 3) — status, children, reference, bulk
// ═════════════════════════════════════════════════════════
export class CustomerStatusDto {
  @ApiProperty({ enum: ['active', 'inactive', 'blocked'] })
  @IsIn(['active', 'inactive', 'blocked'])
  status!: string;
}

export class CustomerAddressDto {
  @ApiProperty({ enum: ['billing', 'shipping', 'branch'] })
  @IsIn(['billing', 'shipping', 'branch'])
  addressType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() village?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taluka?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pincode?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class CustomerContactDto {
  @ApiProperty({ enum: ['owner', 'accounts', 'purchase', 'sales'] })
  @IsIn(['owner', 'accounts', 'purchase', 'sales'])
  contactType!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designation?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class CustomerDocumentDto {
  @ApiProperty({ enum: ['gst_certificate', 'pan', 'agreement', 'shop_license', 'other'] })
  @IsIn(['gst_certificate', 'pan', 'agreement', 'shop_license', 'other'])
  docType!: string;
  @ApiProperty() @IsString() fileName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) fileSize?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CustomerGroupDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CustomerCategoryDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) priority?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class BulkCustomerStatusDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) ids!: string[];
  @ApiProperty({ enum: ['active', 'inactive', 'blocked'] })
  @IsIn(['active', 'inactive', 'blocked'])
  status!: string;
}

export class BulkCustomerDeleteDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) ids!: string[];
}
