import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { WorkflowDocument } from '../common/decorators/workflow-document.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';





import {
  CreateItemDto, UpdateItemDto, CreateItemVariantDto, UpdateItemVariantDto,
  CreateItemGroupDto, UpdateItemGroupDto, CreateItemPricingDto, UpdateItemPricingDto,
  CreateItemBarcodeDto, UpdateItemBarcodeDto, CreateHsnCodeDto, UpdateHsnCodeDto,
  CreateStockOpeningDto, CreateItemImageDto, UpdateItemImageDto,
  CreateInventorySettingsDto, UpdateInventorySettingsDto,
  CreateBatchDto, UpdateBatchDto,
  CreateStockMovementDto, UpdateStockMovementDto,
  CreateWarehouseLocationDto, UpdateWarehouseLocationDto,
  CreateDamageRegisterDto, UpdateDamageRegisterDto,
  CreateRecallRegisterDto, UpdateRecallRegisterDto,
  CreateDistributorReturnDto, UpdateDistributorReturnDto,
  CreateReplacementDto, UpdateReplacementDto,
  CreateSubCategoryDto, UpdateSubCategoryDto,
  CreateTransferDto, UpdateTransferDto,
} from './dto';
import {
  ItemsService, ItemVariantsService, ItemGroupsService,
  ItemPricingService, ItemBarcodesService, HsnCodesService,
  StockOpeningService, ItemImagesService, InventorySettingsService,
  BatchStockService, StockLedgerService, StockMovementService,
  WarehouseLocationService, DamageRegisterService, RecallRegisterService,
  DistributorReturnService, ReplacementQueueService, SubCategoriesService,
  StockTransferService, WarehouseService,
} from './services';

@ApiTags('Inventory - Items') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/items')
export class ItemsController {
  constructor(public readonly service: ItemsService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateItemDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('q') q?: string) { return this.service.findAll(Number(p), Number(ps), q); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateItemDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
  @Post(':id/restore') @Roles('admin') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async restore(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.restore(id, u?.id); }
  @Post(':id/duplicate') @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async duplicate(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.duplicate(id, u?.id); }
}

@ApiTags('Inventory - Variants') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/variants')
export class ItemVariantsController {
  constructor(public readonly service: ItemVariantsService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateItemVariantDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') q?: string) { return this.service.findAll(Number(p), Number(ps), q); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateItemVariantDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Inventory - Groups') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/groups')
export class ItemGroupsController {
  constructor(public readonly service: ItemGroupsService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateItemGroupDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') q?: string) { return this.service.findAll(Number(p), Number(ps), q); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateItemGroupDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Inventory - Pricing') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/pricing')
export class ItemPricingController {
  constructor(public readonly service: ItemPricingService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateItemPricingDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateItemPricingDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Inventory - Barcodes') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/barcodes')
export class ItemBarcodesController {
  constructor(public readonly service: ItemBarcodesService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateItemBarcodeDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateItemBarcodeDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Inventory - HSN Codes') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/hsn-codes')
export class HsnCodesController {
  constructor(public readonly service: HsnCodesService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateHsnCodeDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('q') q?: string) { return this.service.findAll(Number(p), Number(ps), q); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateHsnCodeDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Inventory - Stock Opening') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/stock-opening')
export class StockOpeningController {
  constructor(public readonly service: StockOpeningService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @WorkflowDocument({ module:'inventory', documentType:'stock_opening', templateCode:'inventory-stock-opening', templateName:'Stock Opening Workflow', amountField:'totalAmount' })
  async create(@Body() dto: CreateStockOpeningDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Post(':id/post') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async markPosted(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.update(id, { isPosted: true }, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Inventory - Images') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/images')
export class ItemImagesController {
  constructor(public readonly service: ItemImagesService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateItemImageDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateItemImageDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

// ── PRM-015: Batch Management ────────────────────────────
@ApiTags('Inventory - Batches') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/batches')
export class BatchStockController {
  constructor(public readonly service: BatchStockService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBatchDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('q') q?: string) { return this.service.findAll(Number(p), Number(ps), q); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateBatchDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
  @Post('stock/opening') @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async recordOpening(@Body() dto: CreateBatchDto, @CurrentUser() u: {id:string}) {
    dto.status = 'fresh';
    return this.service.recordEntry({ ...dto, entryType: 'opening' }, u?.id);
  }
  @Post('stock/adjustment') @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.OK)
  async adjustStock(@Param('id') id: string, @Body() body: { type: 'increase'|'decrease'; quantity: number; reason: string; remarks?: string }, @CurrentUser() u: {id:string}) {
    return this.service.recordAdjustment(id, body, u?.id);
  }
  @Get('stock/live') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async getLiveStock(@Query('itemId') itemId?: string, @Query('warehouseId') warehouseId?: string) {
    return this.service.getLiveStock(itemId, warehouseId);
  }
}

// ── PRM-015B: Stock Ledger ───────────────────────────────
@ApiTags('Inventory - Stock Ledger') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/ledger')
export class StockLedgerController {
  constructor(private readonly service: StockLedgerService) {}
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async getLedger(
    @Query('page') page?: number, @Query('pageSize') ps?: number,
    @Query('itemId') itemId?: string, @Query('batchNo') batchNo?: string,
    @Query('movementType') movementType?: string,
    @Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string,
  ) {
    return this.service.getLedger({ page: Number(page) || 1, pageSize: Number(ps) || 50, itemId, batchNo, movementType, fromDate, toDate });
  }
}

// ── PRM-015: Stock Movement ─────────────────────────────
@ApiTags('Inventory - Stock Movements') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/stock-movements')
export class StockMovementController {
  constructor(public readonly service: StockMovementService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateStockMovementDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('q') q?: string) { return this.service.findAll(Number(p), Number(ps), q); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateStockMovementDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

// ── PRM-015: Warehouse Location ─────────────────────────
@ApiTags('Inventory - Warehouse Locations') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/warehouse-locations')
export class WarehouseLocationController {
  constructor(public readonly service: WarehouseLocationService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateWarehouseLocationDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateWarehouseLocationDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

// ── PRM-015: Damage Register ────────────────────────────
@ApiTags('Inventory - Damage Register') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/damage-register')
export class DamageRegisterController {
  constructor(public readonly service: DamageRegisterService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDamageRegisterDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateDamageRegisterDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

// ── PRM-015: Recall Register ────────────────────────────
@ApiTags('Inventory - Recall Register') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/recall-register')
export class RecallRegisterController {
  constructor(public readonly service: RecallRegisterService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRecallRegisterDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateRecallRegisterDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

// ── PRM-015: Distributor Return Queue ───────────────────
@ApiTags('Inventory - Distributor Returns') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/distributor-returns')
export class DistributorReturnController {
  constructor(public readonly service: DistributorReturnService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDistributorReturnDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateDistributorReturnDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

// ── PRM-015: Replacement Queue ──────────────────────────
@ApiTags('Inventory - Replacement Queue') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/replacement-queue')
export class ReplacementQueueController {
  constructor(public readonly service: ReplacementQueueService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateReplacementDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateReplacementDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

// ── PRM-015A: Sub Categories ────────────────────────────
@ApiTags('Inventory - Sub Categories') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/sub-categories')
export class SubCategoriesController {
  constructor(public readonly service: SubCategoriesService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSubCategoryDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('q') q?: string) { return this.service.findAll(Number(p), Number(ps), q); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateSubCategoryDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

// ── PRM-015C: Stock Transfers ───────────────────────────
@ApiTags('Inventory - Stock Transfers') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/transfers')
export class StockTransferController {
  constructor(public readonly service: StockTransferService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTransferDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('q') q?: string) { return this.service.findAll(Number(p), Number(ps), q); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateTransferDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
  @Post(':id/approve') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async approve(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.approve(id, u?.id); }
  @Post(':id/reject') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() u: {id:string}) { return this.service.reject(id, body.reason, u?.id); }
}

// ── PRM-015C: Warehouse Dashboard ───────────────────────
@ApiTags('Inventory - Warehouse Dashboard') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/warehouse-dashboard')
export class WarehouseDashboardController {
  constructor(private readonly service: WarehouseService) {}
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async getDashboard() { return this.service.getDashboard(); }
}

// ── PRM-015C: Warehouse Stock ────────────────────────────
@ApiTags('Inventory - Warehouse Stock') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/warehouse-stock')
export class WarehouseStockController {
  constructor(private readonly service: WarehouseService) {}
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async getStock(@Query('warehouseId') warehouseId?: string) { return this.service.getWarehouseStock(warehouseId); }
}

// ── PRM-015C: Warehouse Enterprise Search ────────────────
@ApiTags('Inventory - Warehouse Search') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/warehouse-search')
export class WarehouseSearchController {
  constructor(private readonly service: WarehouseService) {}
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async search(@Query('q') q: string) { return this.service.search(q || ''); }
}

@ApiTags('Inventory - Settings') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/settings')
export class InventorySettingsController {
  constructor(public readonly service: InventorySettingsService) {}
  @Post() @Roles('admin') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateInventorySettingsDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  async getSettings() { return this.service.findAll(1, 1); }
  @Put() @Roles('admin') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  async updateSettings(@Body() dto: UpdateInventorySettingsDto, @CurrentUser() u: {id:string}) {
    const existing = await this.service.findAll(1, 1);
    if (existing.data.length > 0) {
      return this.service.update(existing.data[0].id as string, dto, u?.id);
    }
    return this.service.create(dto, u?.id);
  }
}
