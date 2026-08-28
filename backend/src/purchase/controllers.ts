import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { WorkflowDocument } from '../common/decorators/workflow-document.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  createFileFilter,
  createUploadLimits,
  IMPORT_ALLOWED_MIMES,
  IMPORT_ALLOWED_EXTENSIONS,
} from '../common/utils/file-validation';
import { sanitizePage, sanitizePageSize } from '../common/utils/pagination.util';
import {
  THROTTLE_UPLOAD_SINGLE,
  THROTTLE_EXPORT,
  throttle,
} from '../common/utils/rate-limit-policies';

import { PurchaseDebitNoteService } from './debit-note.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  CreatePurchaseQuotationDto,
  UpdatePurchaseQuotationDto,
  CreateGrnDto,
  UpdateGrnDto,
  CreatePurchaseInvoiceDto,
  UpdatePurchaseInvoiceDto,
  CreatePurchaseReturnDto,
  UpdatePurchaseReturnDto,
  CreateSupplierPriceListDto,
  UpdateSupplierPriceListDto,
  CreatePurchaseApprovalDto,
  UpdatePurchaseApprovalDto,
  CreatePurchaseSettingsDto,
  UpdatePurchaseSettingsDto,
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierStatusDto,
  BulkSupplierStatusDto,
  BulkSupplierDeleteDto,
  CreatePurchaseRequisitionDto,
  UpdatePurchaseRequisitionDto,
  CollectSupplierPaymentDto,
  ApplySupplierAdvanceDto,
} from './dto';
import { PurchasePaymentsService } from './purchase-payments.service';
import { PurchasePostingEngineService } from './purchase-postings.service';
import {
  PurchaseOrdersService,
  PurchaseQuotationsService,
  GrnService,
  PurchaseInvoicesService,
  PurchaseReturnsService,
  SupplierPriceListService,
  PurchaseApprovalsService,
  PurchaseSettingsService,
  PurchaseRequisitionsService,
  PurchaseDashboardService,
  PurchaseReportsService,
  PurchaseSearchService,
} from './services';
import { SuppliersService } from './suppliers.service';

@ApiTags('Purchase - Orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('purchase/orders')
export class PurchaseOrdersController {
  constructor(public readonly service: PurchaseOrdersService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('purchase.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a purchase order' })
  @ApiBody({ type: CreatePurchaseOrderDto })
  @ApiResponse({ status: 201, description: 'Purchase order created' })
  @WorkflowDocument({
    module: 'purchase',
    documentType: 'purchase_order',
    templateCode: 'purchase-order',
    templateName: 'Purchase Order Workflow',
    amountField: 'totalAmount',
    numberField: 'orderNumber',
  })
  async create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List purchase orders with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of purchase orders' })
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.findAll(Number(p), Number(ps), s);
  }
  @Get('next-number')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Next auto purchase-order number (e.g. PO-0001)' })
  @ApiResponse({ status: 200, description: 'Next PO number' })
  async getNextNumber() {
    return this.service.getNextNumber();
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a purchase order by ID' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({ status: 200, description: 'Purchase order found' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id/status')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update purchase order status' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({ status: 200, description: 'Purchase order status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('purchase.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a purchase order' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({ status: 200, description: 'Purchase order deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}

@ApiTags('Purchase - Quotations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('purchase/quotations')
export class PurchaseQuotationsController {
  constructor(public readonly service: PurchaseQuotationsService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('purchase.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a purchase quotation' })
  @ApiBody({ type: CreatePurchaseQuotationDto })
  @ApiResponse({ status: 201, description: 'Purchase quotation created' })
  @WorkflowDocument({
    module: 'purchase',
    documentType: 'purchase_quotation',
    templateCode: 'purchase-quotation',
    templateName: 'Purchase Quotation Workflow',
    amountField: 'totalAmount',
    numberField: 'quoteNumber',
  })
  async create(@Body() dto: CreatePurchaseQuotationDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List purchase quotations with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of purchase quotations' })
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.findAll(Number(p), Number(ps), s);
  }
  @Get('next-number')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Next auto purchase-quotation number (e.g. QTN-0001)' })
  @ApiResponse({ status: 200, description: 'Next quotation number' })
  async getNextNumber() {
    return this.service.getNextNumber();
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a purchase quotation by ID' })
  @ApiParam({ name: 'id', description: 'Purchase quotation ID' })
  @ApiResponse({ status: 200, description: 'Purchase quotation found' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a purchase quotation' })
  @ApiParam({ name: 'id', description: 'Purchase quotation ID' })
  @ApiResponse({ status: 200, description: 'Purchase quotation updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseQuotationDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('purchase.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a purchase quotation' })
  @ApiParam({ name: 'id', description: 'Purchase quotation ID' })
  @ApiResponse({ status: 200, description: 'Purchase quotation deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}

@ApiTags('Purchase - GRN')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('purchase/grn')
export class GrnController {
  constructor(public readonly service: GrnService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('purchase.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a Goods Receipt Note (GRN)' })
  @ApiBody({ type: CreateGrnDto })
  @ApiResponse({ status: 201, description: 'GRN created' })
  @WorkflowDocument({
    module: 'purchase',
    documentType: 'goods_receipt',
    templateCode: 'purchase-grn',
    templateName: 'GRN Workflow',
    amountField: 'totalAmount',
    numberField: 'grnNumber',
  })
  async create(@Body() dto: CreateGrnDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List GRNs with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of GRNs' })
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.findAll(Number(p), Number(ps), s);
  }
  @Get('next-number')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Next auto GRN number (e.g. GRN-0001)' })
  @ApiResponse({ status: 200, description: 'Next GRN number' })
  async getNextNumber() {
    return this.service.getNextNumber();
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a GRN by ID' })
  @ApiParam({ name: 'id', description: 'GRN ID' })
  @ApiResponse({ status: 200, description: 'GRN found' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a GRN' })
  @ApiParam({ name: 'id', description: 'GRN ID' })
  @ApiResponse({ status: 200, description: 'GRN updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGrnDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
  @Post(':id/approve')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve GRN and auto-post stock' })
  @ApiParam({ name: 'id', description: 'GRN ID' })
  @ApiResponse({ status: 200, description: 'GRN approved with stock posted' })
  async approve(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.approve(id, u?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('purchase.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a GRN' })
  @ApiParam({ name: 'id', description: 'GRN ID' })
  @ApiResponse({ status: 200, description: 'GRN deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}

@ApiTags('Purchase - Invoices')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('purchase/invoices')
export class PurchaseInvoicesController {
  constructor(public readonly service: PurchaseInvoicesService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('purchase.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a purchase invoice' })
  @ApiBody({ type: CreatePurchaseInvoiceDto })
  @ApiResponse({ status: 201, description: 'Purchase invoice created' })
  @WorkflowDocument({
    module: 'purchase',
    documentType: 'purchase_invoice',
    templateCode: 'purchase-invoice',
    templateName: 'Purchase Invoice Workflow',
    amountField: 'grandTotal',
    numberField: 'invoiceNumber',
  })
  async create(@Body() dto: CreatePurchaseInvoiceDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List purchase invoices with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of purchase invoices' })
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.findAll(Number(p), Number(ps), s);
  }
  @Get('next-number')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Next auto purchase-invoice number (e.g. PI-0001)' })
  @ApiResponse({ status: 200, description: 'Next invoice number' })
  async getNextNumber() {
    return this.service.getNextNumber();
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a purchase invoice by ID' })
  @ApiParam({ name: 'id', description: 'Purchase invoice ID' })
  @ApiResponse({ status: 200, description: 'Purchase invoice found' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a purchase invoice' })
  @ApiParam({ name: 'id', description: 'Purchase invoice ID' })
  @ApiResponse({ status: 200, description: 'Purchase invoice updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseInvoiceDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('purchase.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a purchase invoice' })
  @ApiParam({ name: 'id', description: 'Purchase invoice ID' })
  @ApiResponse({ status: 200, description: 'Purchase invoice deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}

@ApiTags('Purchase - Returns')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('purchase/returns')
export class PurchaseReturnsController {
  constructor(public readonly service: PurchaseReturnsService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('purchase.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a purchase return' })
  @ApiBody({ type: CreatePurchaseReturnDto })
  @ApiResponse({ status: 201, description: 'Purchase return created' })
  @WorkflowDocument({
    module: 'purchase',
    documentType: 'purchase_return',
    templateCode: 'purchase-return',
    templateName: 'Purchase Return Workflow',
    amountField: 'totalAmount',
    numberField: 'returnNumber',
  })
  async create(@Body() dto: CreatePurchaseReturnDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List purchase returns with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of purchase returns' })
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.findAll(Number(p), Number(ps), s);
  }
  @Get('next-number')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Next auto purchase-return number (e.g. PR-0001)' })
  @ApiResponse({ status: 200, description: 'Next return number' })
  async getNextNumber() {
    return this.service.getNextNumber();
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a purchase return by ID' })
  @ApiParam({ name: 'id', description: 'Purchase return ID' })
  @ApiResponse({ status: 200, description: 'Purchase return found' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a purchase return' })
  @ApiParam({ name: 'id', description: 'Purchase return ID' })
  @ApiResponse({ status: 200, description: 'Purchase return updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseReturnDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
  @Post(':id/approve')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve purchase return (posts debit note + stock reversal + GL + GST)',
  })
  @ApiParam({ name: 'id', description: 'Purchase Return ID' })
  @ApiResponse({ status: 200, description: 'Purchase return approved with debit note' })
  async approve(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.approve(id, u?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('purchase.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a purchase return' })
  @ApiParam({ name: 'id', description: 'Purchase return ID' })
  @ApiResponse({ status: 200, description: 'Purchase return deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}

@ApiTags('Purchase - Supplier Price List')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('purchase/supplier-prices')
export class SupplierPriceListController {
  constructor(public readonly service: SupplierPriceListService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('purchase.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a supplier price list entry' })
  @ApiBody({ type: CreateSupplierPriceListDto })
  @ApiResponse({ status: 201, description: 'Supplier price created' })
  async create(@Body() dto: CreateSupplierPriceListDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List supplier price list entries with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of supplier prices' })
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.findAll(Number(p), Number(ps), s);
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a supplier price by ID' })
  @ApiParam({ name: 'id', description: 'Supplier price ID' })
  @ApiResponse({ status: 200, description: 'Supplier price found' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a supplier price list entry' })
  @ApiParam({ name: 'id', description: 'Supplier price ID' })
  @ApiResponse({ status: 200, description: 'Supplier price updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierPriceListDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('purchase.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a supplier price list entry' })
  @ApiParam({ name: 'id', description: 'Supplier price ID' })
  @ApiResponse({ status: 200, description: 'Supplier price deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}

@ApiTags('Purchase - Approvals')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('purchase/approvals')
export class PurchaseApprovalsController {
  constructor(public readonly service: PurchaseApprovalsService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('purchase.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a purchase approval request' })
  @ApiBody({ type: CreatePurchaseApprovalDto })
  @ApiResponse({ status: 201, description: 'Purchase approval created' })
  async create(@Body() dto: CreatePurchaseApprovalDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List purchase approvals with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of purchase approvals' })
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50) {
    return this.service.findAll(Number(p), Number(ps));
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject a purchase approval' })
  @ApiParam({ name: 'id', description: 'Purchase approval ID' })
  @ApiResponse({ status: 200, description: 'Purchase approval updated' })
  async approve(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseApprovalDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
}

@ApiTags('Purchase - Settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('purchase/settings')
export class PurchaseSettingsController {
  constructor(public readonly service: PurchaseSettingsService) {}
  @Post()
  @Roles('admin')
  @Permissions('purchase.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create purchase settings' })
  @ApiBody({ type: CreatePurchaseSettingsDto })
  @ApiResponse({ status: 201, description: 'Purchase settings created' })
  async create(@Body() dto: CreatePurchaseSettingsDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get purchase settings (returns first record)' })
  @ApiResponse({ status: 200, description: 'Purchase settings returned' })
  async getSettings() {
    const r = await this.service.findAll(1, 1);
    return r.data[0] || {};
  }
  @Put()
  @Roles('admin')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert purchase settings' })
  @ApiBody({ type: UpdatePurchaseSettingsDto })
  @ApiResponse({ status: 200, description: 'Purchase settings upserted' })
  async update(@Body() dto: UpdatePurchaseSettingsDto, @CurrentUser() u: { id: string }) {
    const r = await this.service.findAll(1, 1);
    return r.data.length > 0
      ? this.service.update(r.data[0].id as string, dto, u?.id)
      : this.service.create(dto, u?.id);
  }
}

// ═════════════════════════════════════════════════════════
// PRM-016 NEW CONTROLLERS
// ═════════════════════════════════════════════════════════

@ApiTags('Purchase - Suppliers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(public readonly service: SuppliersService) {}

  // ── Static routes FIRST so they never collide with :id ──
  @Get('dashboard')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supplier dashboard — counts, payable, top suppliers' })
  async dashboard() {
    return this.service.getDashboard();
  }

  @Get('search')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quick search across name / code / mobile / gstin / firm' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async search(@Query('q') q: string, @Query('page') p = 1, @Query('pageSize') ps = 50) {
    // H4 — bound client-supplied page/pageSize (default 50, max 200)
    return this.service.searchSuppliers({
      q,
      page: sanitizePage(p),
      pageSize: sanitizePageSize(ps, 50),
    });
  }

  @Get('outstanding')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Outstanding (payable) report from unpaid purchase invoices' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  async outstanding(
    @Query('page') p = 1,
    @Query('pageSize') ps = 50,
    @Query('search') s?: string,
    @Query('status') status?: string,
  ) {
    return this.service.getOutstanding({
      // H4 — bound client-supplied page/pageSize (default 50, max 200)
      page: sanitizePage(p),
      pageSize: sanitizePageSize(ps, 50),
      search: s,
      status,
    });
  }

  @Get('export')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @Throttle(throttle(THROTTLE_EXPORT))
  @ApiOperation({ summary: 'Export suppliers as CSV / XLSX / JSON' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'xlsx', 'json'],
    description: 'Default csv',
  })
  async exportData(@Query('format') format = 'csv') {
    const { fileName, buffer, mime } = await this.service.exportSuppliers(format);
    return new StreamableFile(buffer, {
      type: mime,
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Post('import')
  @Roles('admin', 'manager')
  @Permissions('purchase.create')
  @HttpCode(HttpStatus.OK)
  @Throttle(throttle(THROTTLE_UPLOAD_SINGLE))
  @ApiOperation({ summary: 'Import suppliers from Excel / CSV / JSON with duplicate detection' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ description: 'File upload (file + mode=insert|upsert)', required: true })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: createUploadLimits(),
      fileFilter: createFileFilter(IMPORT_ALLOWED_MIMES, IMPORT_ALLOWED_EXTENSIONS, 'import'),
    }),
  )
  async importData(
    @UploadedFile() file: any,
    @Query('mode') mode: 'insert' | 'upsert' = 'insert',
    @CurrentUser() u: { id: string },
  ) {
    return this.service.importSuppliers(file, mode, u?.id);
  }

  @Post('bulk-status')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk status update for suppliers' })
  @ApiBody({ type: BulkSupplierStatusDto })
  async bulkStatus(@Body() dto: BulkSupplierStatusDto, @CurrentUser() u: { id: string }) {
    return this.service.bulkStatus(dto.ids, dto.status, u?.id);
  }

  @Post('bulk-delete')
  @Roles('admin')
  @Permissions('purchase.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk soft-delete suppliers (guarded against purchase documents)' })
  @ApiBody({ type: BulkSupplierDeleteDto })
  async bulkDelete(@Body() dto: BulkSupplierDeleteDto, @CurrentUser() u: { id: string }) {
    return this.service.bulkDelete(dto.ids, u?.id);
  }

  @Post()
  @Roles('admin', 'manager')
  @Permissions('purchase.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a supplier' })
  @ApiBody({ type: CreateSupplierDto })
  @ApiResponse({ status: 201, description: 'Supplier created' })
  async create(@Body() dto: CreateSupplierDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List suppliers with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'supplierType', required: false, type: String })
  @ApiQuery({ name: 'groupId', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortDir', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Paginated list of suppliers' })
  async findAll(
    @Query('page') p = 1,
    @Query('ps') ps = 50,
    @Query('search') s?: string,
    @Query('status') status?: string,
    @Query('supplierType') supplierType?: string,
    @Query('groupId') groupId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    // Legacy consumers (selection screens) call with only page/ps/search —
    // route them through findAll; the enterprise list page passes filters.
    if (!status && !supplierType && !sortBy && !groupId && !categoryId) {
      return this.service.findAll(sanitizePage(p), sanitizePageSize(ps, 50), s);
    }
    return this.service.listSuppliers({
      // H4 — bound client-supplied page/pageSize (default 50, max 200)
      page: sanitizePage(p),
      pageSize: sanitizePageSize(ps, 50),
      search: s,
      status,
      supplierType,
      groupId,
      categoryId,
      sortBy,
      sortDir: (sortDir as 'asc' | 'desc') || 'asc',
    });
  }

  @Get('ledger/:id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supplier 360° ledger — purchase invoices + payment status' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  async ledger(@Param('id') id: string) {
    return this.service.getLedger(id);
  }

  @Patch(':id/status')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update supplier status (active / inactive / blocked)' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  @ApiBody({ type: SupplierStatusDto })
  async status(
    @Param('id') id: string,
    @Body() dto: SupplierStatusDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.setStatus(id, dto.status, u?.id);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a supplier by ID' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  @ApiResponse({ status: 200, description: 'Supplier found' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  @ApiResponse({ status: 200, description: 'Supplier updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('purchase.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a supplier' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  @ApiResponse({ status: 200, description: 'Supplier deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
  @Post(':id/restore')
  @Roles('admin')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted supplier' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  @ApiResponse({ status: 200, description: 'Supplier restored' })
  async restore(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.restore(id, u?.id);
  }
}

@ApiTags('Purchase - Requisitions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('purchase/requisitions')
export class PurchaseRequisitionsController {
  constructor(public readonly service: PurchaseRequisitionsService) {}
  @Post()
  @Roles('admin', 'manager')
  @Permissions('purchase.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a purchase requisition with items' })
  @ApiBody({ type: CreatePurchaseRequisitionDto })
  @ApiResponse({ status: 201, description: 'Purchase requisition created' })
  async create(@Body() dto: CreatePurchaseRequisitionDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List purchase requisitions with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of purchase requisitions' })
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.findAll(Number(p), Number(ps), s);
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a purchase requisition by ID' })
  @ApiParam({ name: 'id', description: 'Purchase requisition ID' })
  @ApiResponse({ status: 200, description: 'Purchase requisition found' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a purchase requisition' })
  @ApiParam({ name: 'id', description: 'Purchase requisition ID' })
  @ApiResponse({ status: 200, description: 'Purchase requisition updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseRequisitionDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('purchase.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a purchase requisition' })
  @ApiParam({ name: 'id', description: 'Purchase requisition ID' })
  @ApiResponse({ status: 200, description: 'Purchase requisition deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}

@ApiTags('Purchase - Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('purchase/dashboard')
export class PurchaseDashboardController {
  constructor(public readonly service: PurchaseDashboardService) {}
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get purchase dashboard KPIs' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data with KPIs, top suppliers, recent purchases',
  })
  async getDashboard() {
    return this.service.getDashboardData();
  }
}

@ApiTags('Purchase - Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('purchase/reports')
export class PurchaseReportsController {
  constructor(public readonly service: PurchaseReportsService) {}
  @Get('purchase-register')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purchase register with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated purchase register' })
  async purchaseRegister(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.getPurchaseRegister(Number(p), Number(ps), s);
  }
  @Get('grn-register')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GRN register with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated GRN register' })
  async grnRegister(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.getGrnRegister(Number(p), Number(ps), s);
  }
  @Get('supplier-wise/:supplierId')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supplier-wise purchase report (DB-level filter)' })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Supplier-wise purchase data' })
  async supplierWise(
    @Param('supplierId') supplierId: string,
    @Query('page') p = 1,
    @Query('ps') ps = 50,
  ) {
    return this.service.getSupplierWisePurchase(supplierId, Number(p), Number(ps));
  }
  @Get('item-wise/:itemId')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Item-wise purchase report (DB-level filter)' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Item-wise purchase data' })
  async itemWise(@Param('itemId') itemId: string, @Query('page') p = 1, @Query('ps') ps = 50) {
    return this.service.getItemWisePurchase(itemId, Number(p), Number(ps));
  }
  @Get('pending-pos')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pending POs report (DB-level status filter)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Pending POs list' })
  async pendingPOs(@Query('page') p = 1, @Query('ps') ps = 50) {
    return this.service.getPendingPOs(Number(p), Number(ps));
  }
  @Get('purchase-returns')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purchase returns report' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Purchase returns data' })
  async purchaseReturns(@Query('page') p = 1, @Query('ps') ps = 50) {
    return this.service.getPurchaseReturnReport(Number(p), Number(ps));
  }
  @Get('gst-purchase')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GST purchase report (invoice GST breakdown)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'GST purchase data' })
  async gstPurchase(@Query('page') p = 1, @Query('ps') ps = 50) {
    return this.service.getGstPurchaseReport(Number(p), Number(ps));
  }
  @Get('payment-report')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purchase payment report' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Purchase payment data' })
  async paymentReport(@Query('page') p = 1, @Query('ps') ps = 50) {
    return this.service.getPaymentReport(Number(p), Number(ps));
  }
}

@ApiTags('Purchase - Search')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('purchase/search')
export class PurchaseSearchController {
  constructor(public readonly service: PurchaseSearchService) {}
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Global search across purchase documents' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Aggregated search results' })
  async search(@Query('q') q: string, @Query('page') p = 1, @Query('ps') ps = 50) {
    return this.service.search(q, Number(p), Number(ps));
  }
}

// ═════════════════════════════════════════════════════════
// PURCHASE DEBIT NOTE CONTROLLER
// ═════════════════════════════════════════════════════════

@ApiTags('Purchase - Debit Notes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('purchase/debit-notes')
export class PurchaseDebitNoteController {
  constructor(private readonly service: PurchaseDebitNoteService) {}

  @Post('from-return/:returnId')
  @Roles('admin', 'manager')
  @Permissions('purchase.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create debit note from purchase return (transactional — full rollback)',
  })
  @ApiParam({ name: 'returnId', description: 'Purchase return ID' })
  @ApiResponse({
    status: 201,
    description: 'Debit note created and posted with full accounting reversal',
  })
  @ApiResponse({ status: 400, description: 'Validation or business rule failure' })
  async createFromReturn(@Param('returnId') returnId: string, @CurrentUser() u: { id: string }) {
    return this.service.createDebitNoteFromReturn(returnId, u.id);
  }

  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all debit notes' })
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50) {
    return this.service.findAll(Number(p), Number(ps));
  }

  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get debit note by ID' })
  @ApiParam({ name: 'id', description: 'Debit note ID' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post(':id/cancel')
  @Roles('admin')
  @Permissions('purchase.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a draft debit note' })
  @ApiParam({ name: 'id', description: 'Debit note ID' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() u: { id: string },
    @Body('reason') reason?: string,
  ) {
    return this.service.cancel(id, u.id, reason);
  }
}

// ═════════════════════════════════════════════════════════
// PURCHASE POSTING CONTROLLER
// ═════════════════════════════════════════════════════════

@ApiTags('Purchase - Posting')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('purchase/posting')
export class PurchasePostingController {
  constructor(private readonly service: PurchasePostingEngineService) {}

  @Post('invoices/:invoiceId/post')
  @Roles('admin', 'manager')
  @Permissions('purchase.create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Post a purchase invoice with full accounting in single transaction (rollback on failure)',
  })
  @ApiParam({ name: 'invoiceId', description: 'Purchase invoice ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoice posted with journal entries, supplier ledger, GST ledger',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failure — invoice already posted, cancelled, or supplier missing',
  })
  async postInvoice(@Param('invoiceId') invoiceId: string, @CurrentUser() u: { id: string }) {
    return this.service.postInvoice(invoiceId, u.id);
  }

  @Get('invoices/:invoiceId/preview')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview purchase invoice posting (validates without persisting)' })
  @ApiParam({ name: 'invoiceId', description: 'Purchase invoice ID' })
  async previewPosting(@Param('invoiceId') invoiceId: string) {
    return this.service.previewPosting(invoiceId);
  }
}

// ═════════════════════════════════════════════════════════
// PURCHASE PAYMENTS CONTROLLER (Phase 3.3 — G3)
// ═════════════════════════════════════════════════════════

@ApiTags('Purchase - Payments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('purchase/payments')
export class PurchasePaymentsController {
  constructor(private readonly service: PurchasePaymentsService) {}

  @Get('dashboard')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Payment dashboard — total payable, overdue, advance, today payments',
  })
  @ApiResponse({ status: 200, description: 'Dashboard summary + recent payments' })
  async getDashboard() {
    return this.service.getDashboard();
  }

  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List supplier payments with filters (supplier, mode, date range)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'supplierId', required: false, type: String })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: ['cash', 'upi', 'bank', 'cheque', 'advance', 'all'],
  })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'search', required: false, type: String })
  async list(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('supplierId') supplierId?: string,
    @Query('mode') mode?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listPayments({
      // H4 — bound client-supplied page/pageSize (default 50, max 200)
      page: sanitizePage(page),
      pageSize: sanitizePageSize(pageSize, 50),
      supplierId,
      mode,
      from,
      to,
      search,
    });
  }

  @Get('invoice/:invoiceId')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Payments history for a single purchase invoice' })
  @ApiParam({ name: 'invoiceId', description: 'Purchase invoice ID' })
  async getInvoicePayments(@Param('invoiceId') invoiceId: string) {
    return this.service.getInvoicePayments(invoiceId);
  }

  @Get('supplier/:supplierId')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supplier payment summary — due invoices, advance balance, history',
  })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID' })
  async getSupplierSummary(@Param('supplierId') supplierId: string) {
    return this.service.getSupplierSummary(supplierId);
  }

  @Post('collect')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Make supplier payment — cash/UPI/bank/cheque. Allocates to invoices oldest-first; excess becomes advance',
  })
  @ApiBody({ type: CollectSupplierPaymentDto })
  async collect(@Body() dto: CollectSupplierPaymentDto, @CurrentUser() u: { id: string }) {
    return this.service.collect(dto as any, u?.id);
  }

  @Post('apply-advance')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply supplier advance balance to selected invoices' })
  @ApiBody({ type: ApplySupplierAdvanceDto })
  async applyAdvance(@Body() dto: ApplySupplierAdvanceDto, @CurrentUser() u: { id: string }) {
    return this.service.applyAdvance(dto as any, u?.id);
  }
}
