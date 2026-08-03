import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

// ═════════════════════════════════════════════════════════
// 1. ACCOUNT GROUPS
// ═════════════════════════════════════════════════════════
export class CreateAccountGroupDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alias?: string;
  @ApiProperty() @IsString() type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) level?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() path?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSystem?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
export class UpdateAccountGroupDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alias?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ═════════════════════════════════════════════════════════
// 2. CHART OF ACCOUNTS
// ═════════════════════════════════════════════════════════
export class CreateChartOfAccountDto {
  @ApiProperty() @IsString() accountCode!: string;
  @ApiProperty() @IsString() accountName!: string;
  @ApiProperty() @IsString() accountType!: string;
  @ApiProperty() @IsString() groupId!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() openingBalance?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() openingBalanceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() costCenterRequired?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() gstApplicable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() bankReconciliation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCashAccount?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isControlAccount?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowManualPosting?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
export class UpdateChartOfAccountDto {
  @ApiPropertyOptional() @IsOptional() @IsString() accountName?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() openingBalance?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() openingBalanceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

// ═════════════════════════════════════════════════════════
// 3. LEDGER MASTER
// ═════════════════════════════════════════════════════════
export class CreateLedgerMasterDto {
  @ApiProperty() @IsString() accountId!: string;
  @ApiProperty() @IsString() ledgerType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() openingBalance?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() openingBalanceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) creditDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
export class UpdateLedgerMasterDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() openingBalance?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() openingBalanceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) creditDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ═════════════════════════════════════════════════════════
// 4. JOURNAL ENTRIES
// ═════════════════════════════════════════════════════════
export class CreateJournalEntryDto {
  @ApiProperty() @IsString() voucherNumber!: string;
  @ApiProperty() @IsString() voucherDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voucherType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() narration?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) totalDebit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) totalCredit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterId?: string;
}
export class UpdateJournalEntryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() narration?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
}

// ═════════════════════════════════════════════════════════
// 5. CASH BOOK
// ═════════════════════════════════════════════════════════
export class CreateCashBookDto {
  @ApiProperty() @IsString() cashAccountId!: string;
  @ApiProperty() @IsString() entryDate!: string;
  @ApiProperty() @IsString() voucherType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voucherId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voucherNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ledgerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) debit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) credit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() narration?: string;
}
export class UpdateCashBookDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) debit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) credit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() narration?: string;
}

// ═════════════════════════════════════════════════════════
// 6. BANK BOOK
// ═════════════════════════════════════════════════════════
export class CreateBankBookDto {
  @ApiProperty() @IsString() bankAccountId!: string;
  @ApiProperty() @IsString() entryDate!: string;
  @ApiProperty() @IsString() voucherType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voucherId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voucherNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chequeNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utrNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) debit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) credit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() narration?: string;
}
export class UpdateBankBookDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reconciliationStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reconciliationDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() narration?: string;
}

// ═════════════════════════════════════════════════════════
// 7. COST CENTERS
// ═════════════════════════════════════════════════════════
export class CreateCostCenterDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() code!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) level?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
export class UpdateCostCenterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ═════════════════════════════════════════════════════════
// 8. ACCOUNTING SETTINGS
// ═════════════════════════════════════════════════════════
export class CreateAccountingSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoVoucherNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() voucherPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) voucherNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowNegativeBalance?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enforceDebitCreditEquality?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireApproval?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) approvalLevels?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultCashAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultBankAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) roundOffDecimals?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  // Financial Settings — locks & defaults
  @ApiPropertyOptional() @IsOptional() @IsBoolean() fiscalYearLock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() periodLock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() periodLockDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() voucherLock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() closingDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() openingBalanceLock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultLedgerAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultTaxGroupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() roundingRule?: string;
}
export class UpdateAccountingSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoVoucherNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() voucherPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) voucherNextNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowNegativeBalance?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enforceDebitCreditEquality?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireApproval?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) approvalLevels?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultCashAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultBankAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) roundOffDecimals?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() fiscalYearLock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() periodLock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() periodLockDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() voucherLock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() closingDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() openingBalanceLock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultLedgerAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultTaxGroupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() roundingRule?: string;
}

// ═════════════════════════════════════════════════════════
// 9. SETTINGS SECURITY (password gate for the Settings page)
// ═════════════════════════════════════════════════════════
export class SetSettingsPasswordDto {
  @ApiProperty({ minLength: 4, maxLength: 64 })
  @IsString()
  @MinLength(4, { message: 'Password must be at least 4 characters' })
  @MaxLength(64)
  password!: string;
}
export class VerifySettingsPasswordDto {
  @ApiProperty() @IsString() @MaxLength(64) password!: string;
}
export class ChangeSettingsPasswordDto {
  @ApiProperty() @IsString() currentPassword!: string;
  @ApiProperty({ minLength: 4, maxLength: 64 })
  @IsString()
  @MinLength(4, { message: 'New password must be at least 4 characters' })
  @MaxLength(64)
  newPassword!: string;
}
