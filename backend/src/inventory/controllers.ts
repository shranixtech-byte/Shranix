import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { WorkflowDocument } from '../common/decorators/workflow-document.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { BaseMasterService } from '../masters/base-master.service';

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
  CreateBatchMasterDto, UpdateBatchMasterDto,
  CreateBatchLotDto, UpdateBatchLotDto,
  CreateBatchGenealogyDto,
  CreateSerialDto, UpdateSerialDto,
  CreateSerialWarrantyDto, UpdateSerialWarrantyDto,
  CreateSerialHistoryDto,
  CreateSerialRelationshipDto,
  CreateSerialRMADto, UpdateSerialRMADto,
  CreateSerialServiceDto,
} from './dto';
import {
  ItemsService, ItemVariantsService, ItemGroupsService,
  ItemPricingService, ItemBarcodesService, HsnCodesService,
  StockOpeningService, ItemImagesService, InventorySettingsService,
  BatchStockService, StockLedgerService, StockMovementService,
  WarehouseLocationService, DamageRegisterService, RecallRegisterService,
  DistributorReturnService, ReplacementQueueService, SubCategoriesService,
  StockTransferService, WarehouseService,
  WarehouseZonesService, WarehouseRacksService, WarehouseShelvesService, WarehouseBinsService,
  UOMConversionService, ProductAttributeService, ItemPackagingService,
  BatchMasterService, BatchLotService, BatchTraceabilityService, BatchDashboardService,
  SerialMasterService, SerialTraceabilityService, SerialDashboardService,
  SerialWarrantyService, SerialHistoryService, SerialRelationshipService,
  SerialRMAService, SerialServiceHistoryService,
} from './services';

@ApiTags('Inventory - Items') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/items')
export class ItemsController {
  constructor(public readonly service: ItemsService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create item' }) @ApiResponse({ status: 201, description: 'Item created' })
  async create(@Body() dto: CreateItemDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List items' }) @ApiResponse({ status: 200, description: 'Paginated items list' })
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('q') q?: string) { return this.service.findAll(Number(p), Number(ps), q); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get item by ID' }) @ApiResponse({ status: 200, description: 'Item record' })
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

// ── Step 18: Enterprise Batch Master ─────────────────────
@ApiTags('Inventory - Batch Master') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/batch-master')
export class BatchMasterController {
  constructor(public readonly service: BatchMasterService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create batch master record' }) @ApiResponse({ status: 201, description: 'Batch created' })
  async create(@Body() dto: CreateBatchMasterDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List batches' }) @ApiResponse({ status: 200, description: 'Paginated batches' })
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('q') q?: string) { return this.service.findAll(Number(p), Number(ps), q); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get batch by ID' }) @ApiResponse({ status: 200, description: 'Batch record' })
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update batch' }) @ApiResponse({ status: 200, description: 'Batch updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateBatchMasterDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete batch' }) @ApiResponse({ status: 200, description: 'Batch deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
  @Post(':id/release') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release batch' }) @ApiResponse({ status: 200, description: 'Batch released' })
  async release(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.release(id, u?.id); }
  @Post(':id/block') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block batch' }) @ApiResponse({ status: 200, description: 'Batch blocked' })
  async block(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() u: {id:string}) { return this.service.block(id, body.reason, u?.id); }
  @Post(':id/quarantine') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quarantine batch' }) @ApiResponse({ status: 200, description: 'Batch quarantined' })
  async quarantine(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.quarantine(id, u?.id); }
  @Get('select/:itemId/:warehouseId') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FEFO/FIFO batch selection engine' }) @ApiResponse({ status: 200, description: 'Allocated batches' })
  async selectBatches(@Param('itemId') i: string, @Param('warehouseId') w: string, @Query('qty') qty: string, @Query('strategy') strategy?: string) {
    return this.service.selectBatches(i, w, Number(qty) || 0, (strategy as any) || 'fifo');
  }
  @Get('expiry-alerts') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Expiry alerts dashboard' }) @ApiResponse({ status: 200, description: 'Expired & near-expiry batches' })
  async getExpiryAlerts(@Query('days') days?: string) { return this.service.getExpiryAlerts(Number(days) || 30); }
}

// ── Step 18: Batch Lots ─────────────────────────────────
@ApiTags('Inventory - Batch Lots') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/batch-lots')
export class BatchLotController {
  constructor(public readonly service: BatchLotService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create lot' }) @ApiResponse({ status: 201, description: 'Lot created' })
  async create(@Body() dto: CreateBatchLotDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List lots' }) @ApiResponse({ status: 200, description: 'Paginated lots' })
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get lot by ID' }) @ApiResponse({ status: 200, description: 'Lot record' })
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update lot' }) @ApiResponse({ status: 200, description: 'Lot updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateBatchLotDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Post(':id/split') @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Split lot' }) @ApiResponse({ status: 201, description: 'Lot split' })
  async split(@Param('id') id: string, @Body() body: { splitQuantity: number; newLotCode: string }, @CurrentUser() u: {id:string}) {
    return this.service.splitLot(id, body.splitQuantity, body.newLotCode);
  }
  @Post(':sourceId/merge/:targetId') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge lots' }) @ApiResponse({ status: 200, description: 'Lots merged' })
  async merge(@Param('sourceId') s: string, @Param('targetId') t: string, @CurrentUser() u: {id:string}) {
    return this.service.mergeLots(s, t);
  }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete lot' }) @ApiResponse({ status: 200, description: 'Lot deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

// ── Step 18: Batch Genealogy ────────────────────────────
@ApiTags('Inventory - Batch Genealogy') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/batch-genealogy')
export class BatchGenealogyController {
  constructor(public readonly service: BaseMasterService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create genealogy link' }) @ApiResponse({ status: 201, description: 'Link created' })
  async create(@Body() dto: CreateBatchGenealogyDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get genealogy link' }) @ApiResponse({ status: 200, description: 'Link record' })
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
}

// ── Step 18: Batch Traceability ─────────────────────────
@ApiTags('Inventory - Batch Traceability') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/batch-trace')
export class BatchTraceController {
  constructor(private readonly service: BatchTraceabilityService) {}
  @Get('forward/:batchId') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forward trace (find child batches)' }) @ApiResponse({ status: 200, description: 'Children tree' })
  async forwardTrace(@Param('batchId') id: string) { return this.service.forwardTrace(id); }
  @Get('backward/:batchId') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Backward trace (find parent batches)' }) @ApiResponse({ status: 200, description: 'Parent tree' })
  async backwardTrace(@Param('batchId') id: string) { return this.service.backwardTrace(id); }
  @Get('genealogy/:batchId') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Full genealogy tree' }) @ApiResponse({ status: 200, description: 'Full genealogy' })
  async fullGenealogy(@Param('batchId') id: string) { return this.service.fullGenealogy(id); }
}

// ── Step 19: Serial Master ──────────────────────────────
@ApiTags('Inventory - Serials') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/serials')
export class SerialMasterController {
  constructor(public readonly service: SerialMasterService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create serial number' }) @ApiResponse({ status: 201, description: 'Serial created' })
  async create(@Body() dto: CreateSerialDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List serials' }) @ApiResponse({ status: 200, description: 'Paginated serials' })
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('q') q?: string) { return this.service.findAll(Number(p), Number(ps), q); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get serial by ID' }) @ApiResponse({ status: 200, description: 'Serial record' })
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update serial' }) @ApiResponse({ status: 200, description: 'Serial updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateSerialDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete serial' }) @ApiResponse({ status: 200, description: 'Serial deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
  @Get(':id/details') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get serial details with warranty, installation, service, history' }) @ApiResponse({ status: 200, description: 'Full serial details' })
  async getDetails(@Param('id') id: string) { return this.service.getSerialDetails(id); }
}

// ── Step 19: Serial Warranty ────────────────────────────
@ApiTags('Inventory - Serial Warranties') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/serial-warranties')
export class SerialWarrantyController {
  constructor(public readonly service: SerialWarrantyService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create warranty record' }) @ApiResponse({ status: 201, description: 'Warranty created' })
  async create(@Body() dto: CreateSerialWarrantyDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List warranties' }) @ApiResponse({ status: 200, description: 'Paginated warranties' })
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get warranty by ID' }) @ApiResponse({ status: 200, description: 'Warranty record' })
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update warranty' }) @ApiResponse({ status: 200, description: 'Warranty updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateSerialWarrantyDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete warranty' }) @ApiResponse({ status: 200, description: 'Warranty deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

// ── Step 19: Serial History ─────────────────────────────
@ApiTags('Inventory - Serial History') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/serial-history')
export class SerialHistoryController {
  constructor(public readonly service: SerialHistoryService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create history event' }) @ApiResponse({ status: 201, description: 'Event created' })
  async create(@Body() dto: CreateSerialHistoryDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get('by-serial/:serialId') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get history by serial' }) @ApiResponse({ status: 200, description: 'Serial history' })
  async findBySerial(@Param('serialId') id: string) { return this.service.findAll(1, 100, id); }
}

// ── Step 19: Serial Relationships ───────────────────────
@ApiTags('Inventory - Serial Relationships') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/serial-relationships')
export class SerialRelationshipController {
  constructor(public readonly service: SerialRelationshipService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create serial relationship' }) @ApiResponse({ status: 201, description: 'Relationship created' })
  async create(@Body() dto: CreateSerialRelationshipDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get('children/:serialId') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get child serials' }) @ApiResponse({ status: 200, description: 'Child serials' })
  async findChildren(@Param('serialId') id: string) { return this.service.findAll(1, 100, id); }
}

// ── Step 19: Serial RMA ─────────────────────────────────
@ApiTags('Inventory - Serial RMA') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/serial-rma')
export class SerialRMAController {
  constructor(public readonly service: SerialRMAService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create RMA' }) @ApiResponse({ status: 201, description: 'RMA created' })
  async create(@Body() dto: CreateSerialRMADto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List RMAs' }) @ApiResponse({ status: 200, description: 'Paginated RMAs' })
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get RMA by ID' }) @ApiResponse({ status: 200, description: 'RMA record' })
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update RMA' }) @ApiResponse({ status: 200, description: 'RMA updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateSerialRMADto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
}

// ── Step 19: Serial Service ─────────────────────────────
@ApiTags('Inventory - Serial Service') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/serial-service')
export class SerialServiceController {
  constructor(public readonly service: SerialServiceHistoryService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create service record' }) @ApiResponse({ status: 201, description: 'Service created' })
  async create(@Body() dto: CreateSerialServiceDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get('by-serial/:serialId') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get service history by serial' }) @ApiResponse({ status: 200, description: 'Service history' })
  async findBySerial(@Param('serialId') id: string) { return this.service.findAll(1, 100, id); }
}

// ── Step 19: Serial Traceability ────────────────────────
@ApiTags('Inventory - Serial Traceability') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/serial-trace')
export class SerialTraceController {
  constructor(private readonly service: SerialTraceabilityService) {}
  @Get('children/:serialId') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Find child serials' }) @ApiResponse({ status: 200, description: 'Child serials' })
  async findChildren(@Param('serialId') id: string) { return this.service.findChildren(id); }
  @Get('parents/:serialId') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Find parent serials' }) @ApiResponse({ status: 200, description: 'Parent serials' })
  async findParents(@Param('serialId') id: string) { return this.service.findParents(id); }
  @Get('history/:serialId') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get serial history' }) @ApiResponse({ status: 200, description: 'Full history' })
  async getHistory(@Param('serialId') id: string) { return this.service.getHistory(id); }
}

// ── Step 19: Serial Dashboard ───────────────────────────
@ApiTags('Inventory - Serial Dashboard') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/serial-dashboard')
export class SerialDashboardController {
  constructor(private readonly service: SerialDashboardService) {}
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Serial dashboard KPIs' }) @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getDashboard() { return this.service.getDashboard(); }
}

// ── Step 18: Batch Dashboard ────────────────────────────
@ApiTags('Inventory - Batch Dashboard') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/batch-dashboard')
export class BatchDashboardController {
  constructor(private readonly service: BatchDashboardService) {}
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Batch dashboard KPIs' }) @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getDashboard() { return this.service.getDashboard(); }
}

// ── PRM-015: Batch Management (Legacy) ───────────────────
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
  @ApiOperation({ summary: 'Record opening stock entry' }) @ApiResponse({ status: 201, description: 'Opening stock recorded' })
  async recordOpening(@Body() dto: CreateBatchDto, @CurrentUser() u: {id:string}) {
    dto.status = 'fresh';
    return this.service.recordEntry({ ...dto, entryType: 'opening' }, u?.id);
  }
  @Post('stock/adjustment') @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjust stock (increase/decrease)' }) @ApiResponse({ status: 200, description: 'Stock adjusted' })
  async adjustStock(@Param('id') id: string, @Body() body: { type: 'increase'|'decrease'; quantity: number; reason: string; remarks?: string }, @CurrentUser() u: {id:string}) {
    return this.service.recordAdjustment(id, body, u?.id);
  }
  @Get('stock/live') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get live stock snapshot' }) @ApiResponse({ status: 200, description: 'Live stock data' })
  async getLiveStock(@Query('itemId') itemId?: string, @Query('warehouseId') warehouseId?: string) {
    return this.service.getLiveStock(itemId, warehouseId);
  }
}

// ── PRM-015B: Stock Ledger ───────────────────────────────
@ApiTags('Inventory - Stock Ledger') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/ledger')
export class StockLedgerController {
  constructor(private readonly service: StockLedgerService) {}
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stock ledger' }) @ApiResponse({ status: 200, description: 'Filtered stock movements' })
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
  @ApiOperation({ summary: 'Approve stock transfer' }) @ApiResponse({ status: 200, description: 'Transfer approved' })
  async approve(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.approve(id, u?.id); }
  @Post(':id/reject') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject stock transfer' }) @ApiResponse({ status: 200, description: 'Transfer rejected' })
  async reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() u: {id:string}) { return this.service.reject(id, body.reason, u?.id); }
}

// ── Step 16: Warehouse Zones ─────────────────────────────
@ApiTags('Inventory - Warehouse Zones') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/zones')
export class WarehouseZonesController {
  constructor(public readonly service: WarehouseZonesService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create warehouse zone' }) @ApiResponse({ status: 201, description: 'Zone created' })
  async create(@Body() dto: any, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List warehouse zones' }) @ApiResponse({ status: 200, description: 'Paginated zones' })
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get zone by ID' }) @ApiResponse({ status: 200, description: 'Zone record' })
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update zone' }) @ApiResponse({ status: 200, description: 'Zone updated' })
  async update(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete zone' }) @ApiResponse({ status: 200, description: 'Zone deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Inventory - Warehouse Racks') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/racks')
export class WarehouseRacksController {
  constructor(public readonly service: WarehouseRacksService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create warehouse rack' }) @ApiResponse({ status: 201, description: 'Rack created' })
  async create(@Body() dto: any, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List warehouse racks' }) @ApiResponse({ status: 200, description: 'Paginated racks' })
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get rack by ID' }) @ApiResponse({ status: 200, description: 'Rack record' })
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update rack' }) @ApiResponse({ status: 200, description: 'Rack updated' })
  async update(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete rack' }) @ApiResponse({ status: 200, description: 'Rack deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Inventory - Warehouse Shelves') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/shelves')
export class WarehouseShelvesController {
  constructor(public readonly service: WarehouseShelvesService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create warehouse shelf' }) @ApiResponse({ status: 201, description: 'Shelf created' })
  async create(@Body() dto: any, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List warehouse shelves' }) @ApiResponse({ status: 200, description: 'Paginated shelves' })
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get shelf by ID' }) @ApiResponse({ status: 200, description: 'Shelf record' })
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update shelf' }) @ApiResponse({ status: 200, description: 'Shelf updated' })
  async update(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete shelf' }) @ApiResponse({ status: 200, description: 'Shelf deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Inventory - Warehouse Bins') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/bins')
export class WarehouseBinsController {
  constructor(public readonly service: WarehouseBinsService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create warehouse bin' }) @ApiResponse({ status: 201, description: 'Bin created' })
  async create(@Body() dto: any, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List warehouse bins' }) @ApiResponse({ status: 200, description: 'Paginated bins' })
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get bin by ID' }) @ApiResponse({ status: 200, description: 'Bin record' })
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update bin' }) @ApiResponse({ status: 200, description: 'Bin updated' })
  async update(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete bin' }) @ApiResponse({ status: 200, description: 'Bin deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

// ── PRM-015C: Warehouse Dashboard ───────────────────────
@ApiTags('Inventory - Warehouse Dashboard') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/warehouse-dashboard')
export class WarehouseDashboardController {
  constructor(private readonly service: WarehouseService) {}
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Warehouse dashboard KPIs' }) @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getDashboard() { return this.service.getDashboard(); }
}

// ── PRM-015C: Warehouse Stock ────────────────────────────
@ApiTags('Inventory - Warehouse Stock') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/warehouse-stock')
export class WarehouseStockController {
  constructor(private readonly service: WarehouseService) {}
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get warehouse stock' }) @ApiResponse({ status: 200, description: 'Stock by warehouse' })
  async getStock(@Query('warehouseId') warehouseId?: string) { return this.service.getWarehouseStock(warehouseId); }
}

// ── PRM-015C: Warehouse Enterprise Search ────────────────
@ApiTags('Inventory - Warehouse Search') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/warehouse-search')
export class WarehouseSearchController {
  constructor(private readonly service: WarehouseService) {}
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Global warehouse search' }) @ApiResponse({ status: 200, description: 'Search results' })
  async search(@Query('q') q: string) { return this.service.search(q || ''); }
}

// ── Step 17: UOM Conversions ────────────────────────────
@ApiTags('Inventory - UOM Conversions') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/uom-conversions')
export class UOMConversionsController {
  constructor(public readonly service: UOMConversionService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create UOM conversion' }) @ApiResponse({ status: 201, description: 'Conversion created' })
  async create(@Body() dto: any, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List UOM conversions' }) @ApiResponse({ status: 200, description: 'Paginated conversions' })
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get conversion by ID' }) @ApiResponse({ status: 200, description: 'Conversion record' })
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update UOM conversion' }) @ApiResponse({ status: 200, description: 'Conversion updated' })
  async update(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete UOM conversion' }) @ApiResponse({ status: 200, description: 'Conversion deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
  @Get('convert/:fromUnitId/:toUnitId') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert quantity between units' }) @ApiResponse({ status: 200, description: 'Converted quantity' })
  async convert(@Param('fromUnitId') f: string, @Param('toUnitId') t: string, @Query('qty') qty: string, @Query('itemId') itemId?: string) {
    const result = await this.service.convert(f, t, Number(qty) || 0, itemId);
    return { fromUnitId: f, toUnitId: t, quantity: Number(qty) || 0, result, success: result !== null };
  }
}

// ── Step 17: Product Attributes ─────────────────────────
@ApiTags('Inventory - Product Attributes') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/product-attributes')
export class ProductAttributesController {
  constructor(public readonly service: ProductAttributeService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create product attribute' }) @ApiResponse({ status: 201, description: 'Attribute created' })
  async create(@Body() dto: any, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List product attributes' }) @ApiResponse({ status: 200, description: 'Paginated attributes' })
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get('by-item/:itemId') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get attributes by item' }) @ApiResponse({ status: 200, description: 'Item attributes' })
  async findByItem(@Param('itemId') itemId: string) { return this.service.getAttributesByItem(itemId); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get attribute by ID' }) @ApiResponse({ status: 200, description: 'Attribute record' })
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update product attribute' }) @ApiResponse({ status: 200, description: 'Attribute updated' })
  async update(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete product attribute' }) @ApiResponse({ status: 200, description: 'Attribute deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

// ── Step 17: Item Packaging ─────────────────────────────
@ApiTags('Inventory - Item Packaging') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/packaging')
export class ItemPackagingController {
  constructor(public readonly service: ItemPackagingService) {}
  @Post() @Roles('admin','manager') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create packaging entry' }) @ApiResponse({ status: 201, description: 'Packaging created' })
  async create(@Body() dto: any, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List packaging entries' }) @ApiResponse({ status: 200, description: 'Paginated packaging' })
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get('by-item/:itemId') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get packaging by item' }) @ApiResponse({ status: 200, description: 'Item packaging' })
  async findByItem(@Param('itemId') itemId: string) { return this.service.getPackagingByItem(itemId); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get packaging by ID' }) @ApiResponse({ status: 200, description: 'Packaging record' })
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update packaging' }) @ApiResponse({ status: 200, description: 'Packaging updated' })
  async update(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('items.delete') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete packaging' }) @ApiResponse({ status: 200, description: 'Packaging deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Inventory - Settings') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('inventory/settings')
export class InventorySettingsController {
  constructor(public readonly service: InventorySettingsService) {}
  @Post() @Roles('admin') @Permissions('items.create') @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create inventory settings' }) @ApiResponse({ status: 201, description: 'Settings created' })
  async create(@Body() dto: CreateInventorySettingsDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager') @Permissions('items.read') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get inventory settings' }) @ApiResponse({ status: 200, description: 'Current settings' })
  async getSettings() { return this.service.findAll(1, 1); }
  @Put() @Roles('admin') @Permissions('items.update') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update inventory settings' }) @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(@Body() dto: UpdateInventorySettingsDto, @CurrentUser() u: {id:string}) {
    const existing = await this.service.findAll(1, 1);
    if (existing.data.length > 0) {
      return this.service.update(existing.data[0].id as string, dto, u?.id);
    }
    return this.service.create(dto, u?.id);
  }
}
