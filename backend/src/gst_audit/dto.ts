import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, IsDateString } from 'class-validator';

// ── GST Registration ─────────────────────────────────────────
export class CreateGstRegistrationDto {
  @ApiProperty() @IsString() gstin!: string;
  @ApiProperty() @IsString() tradeName!: string;
  @ApiProperty() @IsString() legalName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stateCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() registrationType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxPayerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() validFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() validTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() eWayBillRequired?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() eInvoiceRequired?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() returnFilingType?: string;
}

export class UpdateGstRegistrationDto extends CreateGstRegistrationDto {}

// ── GST Ledger ───────────────────────────────────────────────
export class CreateGstLedgerDto {
  @ApiProperty() @IsString() voucherType!: string;
  @ApiProperty() @IsString() voucherId!: string;
  @ApiProperty() @IsString() voucherNumber!: string;
  @ApiProperty() @IsDateString() voucherDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstin?: string;
  @ApiProperty() @IsString() gstType!: string;
  @ApiProperty() @IsNumber() @Min(0) gstRate!: number;
  @ApiProperty() @IsNumber() @Min(0) taxableValue!: number;
  @ApiProperty() @IsNumber() @Min(0) gstAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cessAmount?: number;
  @ApiProperty() @IsString() inputOutput!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reverseCharge?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hsnSacCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() financialYearId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
}

export class UpdateGstLedgerDto extends CreateGstLedgerDto {}

// ── GST Return ───────────────────────────────────────────────
export class CreateGstReturnDto {
  @ApiProperty() @IsString() returnType!: string;
  @ApiProperty() @IsString() returnPeriod!: string;
  @ApiProperty() @IsString() financialYear!: string;
  @ApiProperty() @IsString() gstin!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalOutwardSupply?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalInwardSupply?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalOutputTax?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalInputTaxCredit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() netTaxPayable?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalPaid?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() balanceDue?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() filingDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preparedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() validatedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class UpdateGstReturnDto extends CreateGstReturnDto {}

// ── Tax Posting ──────────────────────────────────────────────
export class CreateTaxPostingDto {
  @ApiProperty() @IsString() postingType!: string;
  @ApiProperty() @IsString() sourceType!: string;
  @ApiProperty() @IsString() sourceId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postingRule?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fromAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toAccountId?: string;
  @ApiProperty() @IsNumber() @Min(0) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) totalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() financialYearId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
}

export class UpdateTaxPostingDto extends CreateTaxPostingDto {}

// ── Year Closing ─────────────────────────────────────────────
export class CreateYearClosingDto {
  @ApiProperty() @IsString() closingNumber!: string;
  @ApiProperty() @IsString() financialYearId!: string;
  @ApiProperty() @IsString() closingType!: string;
  @ApiProperty() @IsDateString() closingDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalRevenue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalExpenses?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() netProfit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() netLoss?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retainedEarnings?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() closingRemarks?: string;
}

export class UpdateYearClosingDto extends CreateYearClosingDto {}

// ── Period Lock ──────────────────────────────────────────────
export class CreatePeriodLockDto {
  @ApiProperty() @IsString() financialYearId!: string;
  @ApiProperty() @IsString() periodType!: string;
  @ApiProperty() @IsString() periodKey!: string;
  @ApiProperty() @IsDateString() periodStart!: string;
  @ApiProperty() @IsDateString() periodEnd!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() module?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() roleRequired?: string;
}

export class UpdatePeriodLockDto extends CreatePeriodLockDto {}

// ── Opening Balance Transfer ─────────────────────────────────
export class CreateOpeningBalanceTransferDto {
  @ApiProperty() @IsString() transferNumber!: string;
  @ApiProperty() @IsString() fromFinancialYearId!: string;
  @ApiProperty() @IsString() toFinancialYearId!: string;
  @ApiProperty() @IsDateString() transferDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transferType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class UpdateOpeningBalanceTransferDto extends CreateOpeningBalanceTransferDto {}

// ── Year-End Entry ───────────────────────────────────────────
export class CreateYearEndEntryDto {
  @ApiProperty() @IsString() closingRecordId!: string;
  @ApiProperty() @IsString() entryNumber!: string;
  @ApiProperty() @IsString() entryType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fromAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toAccountId?: string;
  @ApiProperty() @IsNumber() @Min(0) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) debitAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() narration?: string;
}

export class UpdateYearEndEntryDto extends CreateYearEndEntryDto {}

// ── Audit Detail ─────────────────────────────────────────────
export class CreateAuditDetailDto {
  @ApiProperty() @IsString() auditLogId!: string;
  @ApiProperty() @IsString() action!: string;
  @ApiProperty() @IsString() entityType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() entityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userRole?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ipAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userAgent?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() oldValues?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() newValues?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() changes?: string;
  @ApiProperty() @IsDateString() timestamp!: string;
  @ApiProperty() @IsString() module!: string;
  @ApiProperty() @IsString() actionType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class UpdateAuditDetailDto extends CreateAuditDetailDto {}

// ── Number Series ────────────────────────────────────────────
export class CreateNumberSeriesDto {
  @ApiProperty() @IsString() seriesName!: string;
  @ApiProperty() @IsString() seriesCode!: string;
  @ApiProperty() @IsString() module!: string;
  @ApiProperty() @IsString() documentType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() suffix?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() startNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() currentNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() endNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() padLength?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() resetFrequency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() allowOverride?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
}

export class UpdateNumberSeriesDto extends CreateNumberSeriesDto {}

// ── Voucher Approval ─────────────────────────────────────────
export class CreateVoucherApprovalDto {
  @ApiProperty() @IsString() approvalNumber!: string;
  @ApiProperty() @IsString() voucherType!: string;
  @ApiProperty() @IsString() voucherId!: string;
  @ApiProperty() @IsString() voucherNumber!: string;
  @ApiProperty() @IsString() module!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() approvalLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() requestedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class UpdateVoucherApprovalDto extends CreateVoucherApprovalDto {}

// ── Finance Analytics ────────────────────────────────────────
export class CreateFinanceAnalyticsDto {
  @ApiProperty() @IsString() analyticsType!: string;
  @ApiProperty() @IsString() periodKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() financialYearId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalRevenue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalExpenses?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() netProfit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalReceivables?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalPayables?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cashBalance?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() bankBalance?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalSales?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalPurchases?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalGstInput?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalGstOutput?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalGstPayable?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() metrics?: string;
}

export class UpdateFinanceAnalyticsDto extends CreateFinanceAnalyticsDto {}

// ── GST/Audit Settings ───────────────────────────────────────
export class CreateGstAuditSettingDto {
  @ApiProperty() @IsString() settingKey!: string;
  @ApiProperty() @IsString() settingValue!: string;
  @ApiProperty() @IsString() settingGroup!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dataType?: string;
}

export class UpdateGstAuditSettingDto extends CreateGstAuditSettingDto {}
