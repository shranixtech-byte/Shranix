import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { WorkflowDocument } from '../common/decorators/workflow-document.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import {
  CreatePurchaseOrderDto, UpdatePurchaseOrderDto, CreatePurchaseQuotationDto, UpdatePurchaseQuotationDto,
  CreateGrnDto, UpdateGrnDto, CreatePurchaseInvoiceDto, UpdatePurchaseInvoiceDto,
  CreatePurchaseReturnDto, UpdatePurchaseReturnDto, CreateSupplierPriceListDto, UpdateSupplierPriceListDto,
  CreatePurchaseApprovalDto, UpdatePurchaseApprovalDto, CreatePurchaseSettingsDto, UpdatePurchaseSettingsDto,
  CreateSupplierDto, UpdateSupplierDto, CreatePurchaseRequisitionDto, UpdatePurchaseRequisitionDto,
} from './dto';
import {
  PurchaseOrdersService, PurchaseQuotationsService, GrnService,
  PurchaseInvoicesService, PurchaseReturnsService, SupplierPriceListService,
  PurchaseApprovalsService, PurchaseSettingsService,
  SuppliersService, PurchaseRequisitionsService,
  PurchaseDashboardService, PurchaseReportsService, PurchaseSearchService,
} from './services';

@ApiTags('Purchase - Orders') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('purchase/orders')
export class PurchaseOrdersController {
  constructor(public readonly service: PurchaseOrdersService) {}
  @Post() @Roles('admin','manager') @Permissions('purchase.create') @HttpCode(HttpStatus.CREATED)
  @WorkflowDocument({ module:'purchase', documentType:'purchase_order', templateCode:'purchase-order', templateName:'Purchase Order Workflow', amountField:'totalAmount', numberField:'orderNumber' })
  async create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.findAll(Number(p), Number(ps), s); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id/status') @Roles('admin','manager') @Permissions('purchase.update') @HttpCode(HttpStatus.OK)
  async updateStatus(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('purchase.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Purchase - Quotations') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('purchase/quotations')
export class PurchaseQuotationsController {
  constructor(public readonly service: PurchaseQuotationsService) {}
  @Post() @Roles('admin','manager') @Permissions('purchase.create') @HttpCode(HttpStatus.CREATED)
  @WorkflowDocument({ module:'purchase', documentType:'purchase_quotation', templateCode:'purchase-quotation', templateName:'Purchase Quotation Workflow', amountField:'totalAmount', numberField:'quoteNumber' })
  async create(@Body() dto: CreatePurchaseQuotationDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.findAll(Number(p), Number(ps), s); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('purchase.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdatePurchaseQuotationDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('purchase.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Purchase - GRN') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('purchase/grn')
export class GrnController {
  constructor(public readonly service: GrnService) {}
  @Post() @Roles('admin','manager') @Permissions('purchase.create') @HttpCode(HttpStatus.CREATED)
  @WorkflowDocument({ module:'purchase', documentType:'goods_receipt', templateCode:'purchase-grn', templateName:'GRN Workflow', amountField:'totalAmount', numberField:'grnNumber' })
  async create(@Body() dto: CreateGrnDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.findAll(Number(p), Number(ps), s); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('purchase.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateGrnDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Post(':id/approve') @Roles('admin','manager') @Permissions('purchase.update') @HttpCode(HttpStatus.OK)
  async approve(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.approve(id, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('purchase.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Purchase - Invoices') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('purchase/invoices')
export class PurchaseInvoicesController {
  constructor(public readonly service: PurchaseInvoicesService) {}
  @Post() @Roles('admin','manager') @Permissions('purchase.create') @HttpCode(HttpStatus.CREATED)
  @WorkflowDocument({ module:'purchase', documentType:'purchase_invoice', templateCode:'purchase-invoice', templateName:'Purchase Invoice Workflow', amountField:'grandTotal', numberField:'invoiceNumber' })
  async create(@Body() dto: CreatePurchaseInvoiceDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.findAll(Number(p), Number(ps), s); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('purchase.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdatePurchaseInvoiceDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('purchase.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Purchase - Returns') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('purchase/returns')
export class PurchaseReturnsController {
  constructor(public readonly service: PurchaseReturnsService) {}
  @Post() @Roles('admin','manager') @Permissions('purchase.create') @HttpCode(HttpStatus.CREATED)
  @WorkflowDocument({ module:'purchase', documentType:'purchase_return', templateCode:'purchase-return', templateName:'Purchase Return Workflow', amountField:'totalAmount', numberField:'returnNumber' })
  async create(@Body() dto: CreatePurchaseReturnDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.findAll(Number(p), Number(ps), s); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('purchase.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdatePurchaseReturnDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('purchase.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Purchase - Supplier Price List') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('purchase/supplier-prices')
export class SupplierPriceListController {
  constructor(public readonly service: SupplierPriceListService) {}
  @Post() @Roles('admin','manager') @Permissions('purchase.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSupplierPriceListDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.findAll(Number(p), Number(ps), s); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('purchase.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateSupplierPriceListDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('purchase.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Purchase - Approvals') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('purchase/approvals')
export class PurchaseApprovalsController {
  constructor(public readonly service: PurchaseApprovalsService) {}
  @Post() @Roles('admin','manager') @Permissions('purchase.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePurchaseApprovalDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Put(':id') @Roles('admin','manager') @Permissions('purchase.update') @HttpCode(HttpStatus.OK)
  async approve(@Param('id') id: string, @Body() dto: UpdatePurchaseApprovalDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
}

@ApiTags('Purchase - Settings') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('purchase/settings')
export class PurchaseSettingsController {
  constructor(public readonly service: PurchaseSettingsService) {}
  @Post() @Roles('admin') @Permissions('purchase.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePurchaseSettingsDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async getSettings() { const r = await this.service.findAll(1,1); return r.data[0] || {}; }
  @Put() @Roles('admin') @Permissions('purchase.update') @HttpCode(HttpStatus.OK)
  async update(@Body() dto: UpdatePurchaseSettingsDto, @CurrentUser() u: {id:string}) { const r = await this.service.findAll(1,1); return r.data.length > 0 ? this.service.update(r.data[0].id as string, dto, u?.id) : this.service.create(dto, u?.id); }
}

// ═════════════════════════════════════════════════════════
// PRM-016 NEW CONTROLLERS
// ═════════════════════════════════════════════════════════

@ApiTags('Purchase - Suppliers') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('suppliers')
export class SuppliersController {
  constructor(public readonly service: SuppliersService) {}
  @Post() @Roles('admin','manager') @Permissions('purchase.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSupplierDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.findAll(Number(p), Number(ps), s); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('purchase.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateSupplierDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('purchase.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
  @Post(':id/restore') @Roles('admin') @Permissions('purchase.update') @HttpCode(HttpStatus.OK)
  async restore(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.restore(id, u?.id); }
}

@ApiTags('Purchase - Requisitions') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('purchase/requisitions')
export class PurchaseRequisitionsController {
  constructor(public readonly service: PurchaseRequisitionsService) {}
  @Post() @Roles('admin','manager') @Permissions('purchase.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePurchaseRequisitionDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.findAll(Number(p), Number(ps), s); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('purchase.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdatePurchaseRequisitionDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('purchase.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Purchase - Dashboard') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('purchase/dashboard')
export class PurchaseDashboardController {
  constructor(public readonly service: PurchaseDashboardService) {}
  @Get() @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async getDashboard() { return this.service.getDashboardData(); }
}

@ApiTags('Purchase - Reports') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('purchase/reports')
export class PurchaseReportsController {
  constructor(public readonly service: PurchaseReportsService) {}
  @Get('purchase-register') @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async purchaseRegister(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.getPurchaseRegister(Number(p), Number(ps), s); }
  @Get('grn-register') @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async grnRegister(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.getGrnRegister(Number(p), Number(ps), s); }
  @Get('supplier-wise/:supplierId') @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async supplierWise(@Param('supplierId') supplierId: string, @Query('page') p=1, @Query('ps') ps=50) { return this.service.getSupplierWisePurchase(supplierId, Number(p), Number(ps)); }
  @Get('item-wise/:itemId') @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async itemWise(@Param('itemId') itemId: string, @Query('page') p=1, @Query('ps') ps=50) { return this.service.getItemWisePurchase(itemId, Number(p), Number(ps)); }
  @Get('pending-pos') @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async pendingPOs(@Query('page') p=1, @Query('ps') ps=50) { return this.service.getPendingPOs(Number(p), Number(ps)); }
  @Get('purchase-returns') @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async purchaseReturns(@Query('page') p=1, @Query('ps') ps=50) { return this.service.getPurchaseReturnReport(Number(p), Number(ps)); }
  @Get('gst-purchase') @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async gstPurchase(@Query('page') p=1, @Query('ps') ps=50) { return this.service.getGstPurchaseReport(Number(p), Number(ps)); }
}

@ApiTags('Purchase - Search') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('purchase/search')
export class PurchaseSearchController {
  constructor(public readonly service: PurchaseSearchService) {}
  @Get() @Roles('admin','manager','accountant') @Permissions('purchase.read') @HttpCode(HttpStatus.OK)
  async search(@Query('q') q: string, @Query('page') p=1, @Query('ps') ps=50) { return this.service.search(q, Number(p), Number(ps)); }
}
