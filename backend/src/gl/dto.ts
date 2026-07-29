import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

// ═════════════════════════════════════════════════════════
// 1. GENERAL LEDGER ENTRIES
// ═════════════════════════════════════════════════════════
export class CreateGlEntryDto {
  @ApiProperty() @IsString() entryNumber!: string;
  @ApiProperty() @IsString() entryDate!: string;
  @ApiProperty() @IsString() accountId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ledgerId?: string;
  @ApiProperty() @IsString() voucherId!: string;
  @ApiProperty() @IsString() voucherType!: string;
  @ApiProperty() @IsString() voucherNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) debit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) credit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() narration?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() financialYearId?: string;
}
export class UpdateGlEntryDto { @ApiPropertyOptional() @IsOptional() @IsString() narration?: string; }

// ═════════════════════════════════════════════════════════
// 2. POSTING RULES
// ═════════════════════════════════════════════════════════
export class CreatePostingRuleDto {
  @ApiProperty() @IsString() ruleName!: string;
  @ApiProperty() @IsString() voucherType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() debitAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() creditAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() condition?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
export class UpdatePostingRuleDto { @ApiPropertyOptional() @IsOptional() @IsString() debitAccountId?: string; @ApiPropertyOptional() @IsOptional() @IsString() creditAccountId?: string; @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean; @ApiPropertyOptional() @IsOptional() @IsString() description?: string; }

// ═════════════════════════════════════════════════════════
// 3. FISCAL CLOSING
// ═════════════════════════════════════════════════════════
export class CreateFiscalClosingDto {
  @ApiProperty() @IsString() financialYearId!: string;
  @ApiProperty() @IsString() closingDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() closingType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() retainedEarningsAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
export class UpdateFiscalClosingDto { @ApiPropertyOptional() @IsOptional() @IsString() status?: string; @ApiPropertyOptional() @IsOptional() @IsString() notes?: string; }

// ═════════════════════════════════════════════════════════
// 4. REPORT GENERATION PARAMS
// ═════════════════════════════════════════════════════════
export class TrialBalanceParamsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() financialYearId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fromDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterId?: string;
}

export class ProfitLossParamsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() financialYearId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fromDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterId?: string;
}

export class BalanceSheetParamsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() financialYearId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() asOnDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comparativeYear?: string;
}

export class CashFlowParamsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() financialYearId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fromDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toDate?: string;
}

export class DayBookParamsDto {
  @ApiProperty() @IsString() date!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voucherType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
}

export class AccountStatementParamsDto {
  @ApiProperty() @IsString() accountId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fromDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() financialYearId?: string;
}
