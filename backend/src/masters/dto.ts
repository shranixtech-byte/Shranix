import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

// ── Company ─────────────────────────────────────────────
export class CreateCompanyDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alias?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pincode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pan?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() licenseNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pesticidesLicense?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seedsLicense?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cottonLicense?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fertilizerLicense?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() retailLicense?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isHeadOffice?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() financialYearStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
}

// ── Financial Year ──────────────────────────────────────
export class CreateFinancialYearDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() startDate!: string;
  @ApiProperty() @IsString() endDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() companyId?: string;
}

// ── Branch ──────────────────────────────────────────────
export class CreateBranchDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() code!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyId?: string;
}

// ── Warehouse ───────────────────────────────────────────
export class CreateWarehouseDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() code!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pincode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isMain?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyId?: string;
}

// ── Unit ────────────────────────────────────────────────
export class CreateUnitDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() shortName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
}

// ── Category ────────────────────────────────────────────
export class CreateCategoryDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

// ── Brand ───────────────────────────────────────────────
export class CreateBrandDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

// ── Tax Group ───────────────────────────────────────────
export class CreateTaxGroupDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

// ── GST Rate ────────────────────────────────────────────
export class CreateGSTRateDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsInt() @Min(0) @Max(999) rate!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) igst?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) cgst?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sgst?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) cess?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() effectiveFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() effectiveTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hsnSacCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxGroupId?: string;
}

// ── Update DTOs (all fields optional) ───────────────────
export class UpdateCompanyDto implements Partial<CreateCompanyDto> {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alias?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pincode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pan?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() licenseNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pesticidesLicense?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seedsLicense?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cottonLicense?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fertilizerLicense?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() retailLicense?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isHeadOffice?: boolean;
}

export class UpdateFinancialYearDto implements Partial<CreateFinancialYearDto> {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isClosed?: boolean;
}

export class UpdateBranchDto implements Partial<CreateBranchDto> {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateWarehouseDto implements Partial<CreateWarehouseDto> {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pincode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isMain?: boolean;
}

export class UpdateUnitDto implements Partial<CreateUnitDto> {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shortName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
}

export class UpdateCategoryDto implements Partial<CreateCategoryDto> {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateBrandDto implements Partial<CreateBrandDto> {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class UpdateTaxGroupDto implements Partial<CreateTaxGroupDto> {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateGSTRateDto implements Partial<CreateGSTRateDto> {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() igst?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() cgst?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() sgst?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() cess?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() effectiveFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() effectiveTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hsnSacCode?: string;
}
