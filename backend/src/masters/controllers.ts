import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CreateFinancialYearDto,
  UpdateFinancialYearDto,
  CreateBranchDto,
  UpdateBranchDto,
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateUnitDto,
  UpdateUnitDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateBrandDto,
  UpdateBrandDto,
  CreateTaxGroupDto,
  UpdateTaxGroupDto,
  CreateGSTRateDto,
  UpdateGSTRateDto,
} from './dto';
import {
  CompaniesService,
  FinancialYearsService,
  BranchesService,
  WarehousesService,
  UnitsService,
  CategoriesService,
  BrandsService,
  TaxGroupsService,
  GSTRatesService,
} from './services';

function parseIsActive(value?: string): boolean | undefined {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
}

@ApiTags('Masters - Companies')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(public readonly service: CompaniesService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('companies.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCompanyDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('companies.read')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll(Number(page), Number(pageSize), search, parseIsActive(isActive));
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('companies.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('companies.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.update(id, dto, user?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('companies.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.delete(id, user?.id);
  }
  @Post(':id/restore')
  @Roles('admin')
  @Permissions('companies.update')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.restore(id, user?.id);
  }
}

@ApiTags('Masters - Financial Years')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('financial-years')
export class FinancialYearsController {
  constructor(public readonly service: FinancialYearsService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('financial-years.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateFinancialYearDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('financial-years.read')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll(Number(page), Number(pageSize), search, parseIsActive(isActive));
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('financial-years.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('financial-years.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFinancialYearDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.update(id, dto, user?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('financial-years.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.delete(id, user?.id);
  }
  @Post(':id/restore')
  @Roles('admin')
  @Permissions('financial-years.update')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.restore(id, user?.id);
  }
}

@ApiTags('Masters - Branches')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('branches')
export class BranchesController {
  constructor(public readonly service: BranchesService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('branches.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBranchDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('branches.read')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll(Number(page), Number(pageSize), search, parseIsActive(isActive));
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('branches.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('branches.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.update(id, dto, user?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('branches.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.delete(id, user?.id);
  }
  @Post(':id/restore')
  @Roles('admin')
  @Permissions('branches.update')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.restore(id, user?.id);
  }
}

@ApiTags('Masters - Warehouses')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(public readonly service: WarehousesService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('warehouses.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateWarehouseDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('warehouses.read')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll(Number(page), Number(pageSize), search, parseIsActive(isActive));
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('warehouses.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('warehouses.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.update(id, dto, user?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('warehouses.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.delete(id, user?.id);
  }
  @Post(':id/restore')
  @Roles('admin')
  @Permissions('warehouses.update')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.restore(id, user?.id);
  }
}

@ApiTags('Masters - Units')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('units')
export class UnitsController {
  constructor(public readonly service: UnitsService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('units.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUnitDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('units.read')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll(Number(page), Number(pageSize), search, parseIsActive(isActive));
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('units.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('units.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.update(id, dto, user?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('units.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.delete(id, user?.id);
  }
  @Post(':id/restore')
  @Roles('admin')
  @Permissions('units.update')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.restore(id, user?.id);
  }
}

@ApiTags('Masters - Categories')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(public readonly service: CategoriesService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('categories.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCategoryDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('categories.read')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll(Number(page), Number(pageSize), search, parseIsActive(isActive));
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('categories.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('categories.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.update(id, dto, user?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('categories.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.delete(id, user?.id);
  }
  @Post(':id/restore')
  @Roles('admin')
  @Permissions('categories.update')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.restore(id, user?.id);
  }
}

@ApiTags('Masters - Brands')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('brands')
export class BrandsController {
  constructor(public readonly service: BrandsService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('brands.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBrandDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('brands.read')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll(Number(page), Number(pageSize), search, parseIsActive(isActive));
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('brands.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('brands.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.update(id, dto, user?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('brands.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.delete(id, user?.id);
  }
  @Post(':id/restore')
  @Roles('admin')
  @Permissions('brands.update')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.restore(id, user?.id);
  }
}

@ApiTags('Masters - Tax Groups')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('tax-groups')
export class TaxGroupsController {
  constructor(public readonly service: TaxGroupsService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('tax-groups.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTaxGroupDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('tax-groups.read')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll(Number(page), Number(pageSize), search, parseIsActive(isActive));
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('tax-groups.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('tax-groups.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaxGroupDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.update(id, dto, user?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('tax-groups.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.delete(id, user?.id);
  }
  @Post(':id/restore')
  @Roles('admin')
  @Permissions('tax-groups.update')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.restore(id, user?.id);
  }
}

@ApiTags('Masters - GST Rates')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('gst-rates')
export class GSTRatesController {
  constructor(public readonly service: GSTRatesService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('gst-rates.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateGSTRateDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('gst-rates.read')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll(Number(page), Number(pageSize), search, parseIsActive(isActive));
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('gst-rates.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('gst-rates.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGSTRateDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.update(id, dto, user?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('gst-rates.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.delete(id, user?.id);
  }
  @Post(':id/restore')
  @Roles('admin')
  @Permissions('gst-rates.update')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.restore(id, user?.id);
  }
}
