import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, Min } from 'class-validator';

// ═════════════════════════════════════════════════════════
// 1. SALES QUOTATIONS
// ═════════════════════════════════════════════════════════
export class CreateSalesQuotationDto {
  @ApiProperty() @IsString() quoteNumber!: string;
  @ApiProperty() @IsString() customerId!: string;
  @ApiProperty() @IsString() quoteDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() validTill?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) subTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grandTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() terms?: string;
}
export class UpdateSalesQuotationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() terms?: string;
}

// ═════════════════════════════════════════════════════════
// 2. SALES ORDERS
// ═════════════════════════════════════════════════════════
export class CreateSalesOrderDto {
  @ApiProperty() @IsString() orderNumber!: string;
  @ApiProperty() @IsString() customerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() quotationId?: string;
  @ApiProperty() @IsString() orderDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) subTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grandTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() terms?: string;
}
export class UpdateSalesOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectionReason?: string;
}

// ═════════════════════════════════════════════════════════
// 3. DELIVERY CHALLAN
// ═════════════════════════════════════════════════════════
export class CreateDeliveryChallanDto {
  @ApiProperty() @IsString() challanNumber!: string;
  @ApiProperty() @IsString() orderId!: string;
  @ApiProperty() @IsString() customerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiProperty() @IsString() dispatchDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dispatchType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverMobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transporterName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lrNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
export class UpdateDeliveryChallanDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
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
  @ApiProperty() @IsString() invoiceNumber!: string;
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
}
