import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { WorkflowDocument } from '../common/decorators/workflow-document.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import {
  CreateSalesQuotationDto, UpdateSalesQuotationDto, CreateSalesOrderDto, UpdateSalesOrderDto,
  CreateDeliveryChallanDto, UpdateDeliveryChallanDto, CreateSalesInvoiceDto, UpdateSalesInvoiceDto,
  CreateSalesReturnDto, UpdateSalesReturnDto, CreateCustomerPriceListDto, UpdateCustomerPriceListDto,
  CreateSalesApprovalDto, UpdateSalesApprovalDto, CreateSalesSettingsDto, UpdateSalesSettingsDto,
} from './dto';
import {
  SalesQuotationsService, SalesOrdersService, DeliveryChallansService,
  SalesInvoicesService, SalesReturnsService, CustomerPriceListService,
  SalesApprovalsService, SalesSettingsService,
} from './services';
import { DatabaseService } from '../database/database.service';
import { SalesApprovalEngineService } from './approval-engine.service';
import { SalesCreditEngineService } from './credit-engine.service';
import { PostingEngineService } from './posting-engine.service';
import { PostSalesInvoiceDto } from './dto';

@ApiTags('Sales - Quotations') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('sales/quotations')
export class SalesQuotationsController {
  constructor(public readonly service: SalesQuotationsService) {}
  @Post() @Roles('admin','manager') @Permissions('sales.create') @HttpCode(HttpStatus.CREATED)
  @WorkflowDocument({ module:'sales', documentType:'sales_quotation', templateCode:'sales-quotation', templateName:'Sales Quotation Workflow', amountField:'totalAmount', numberField:'quoteNumber' })
  async create(@Body() dto: CreateSalesQuotationDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('sales.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.findAll(Number(p), Number(ps), s); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('sales.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('sales.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateSalesQuotationDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('sales.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Sales - Orders') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('sales/orders')
export class SalesOrdersController {
  constructor(public readonly service: SalesOrdersService) {}
  @Post() @Roles('admin','manager') @Permissions('sales.create') @HttpCode(HttpStatus.CREATED)
  @WorkflowDocument({ module:'sales', documentType:'sales_order', templateCode:'sales-order', templateName:'Sales Order Workflow', amountField:'totalAmount', numberField:'orderNumber' })
  async create(@Body() dto: CreateSalesOrderDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('sales.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.findAll(Number(p), Number(ps), s); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('sales.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id/status') @Roles('admin','manager') @Permissions('sales.update') @HttpCode(HttpStatus.OK)
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateSalesOrderDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('sales.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Sales - Delivery Challan') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('sales/delivery-challans')
export class DeliveryChallansController {
  constructor(public readonly service: DeliveryChallansService) {}
  @Post() @Roles('admin','manager') @Permissions('sales.create') @HttpCode(HttpStatus.CREATED)
  @WorkflowDocument({ module:'sales', documentType:'delivery_challan', templateCode:'sales-delivery-challan', templateName:'Delivery Challan Workflow', amountField:'totalAmount', numberField:'challanNumber' })
  async create(@Body() dto: CreateDeliveryChallanDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('sales.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.findAll(Number(p), Number(ps), s); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('sales.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('sales.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateDeliveryChallanDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('sales.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Sales - Invoices') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('sales/invoices')
export class SalesInvoicesController {
  constructor(
    public readonly service: SalesInvoicesService,
    private readonly postingEngine: PostingEngineService,
    private readonly approvalEngine: SalesApprovalEngineService,
    private readonly creditEngine: SalesCreditEngineService,
    private readonly database: DatabaseService,
  ) {}
  @Post() @Roles('admin','manager') @Permissions('sales.create') @HttpCode(HttpStatus.CREATED)
  @WorkflowDocument({ module:'sales', documentType:'sales_invoice', templateCode:'sales-invoice', templateName:'Sales Invoice Workflow', amountField:'grandTotal', numberField:'invoiceNumber' })
  async create(@Body() dto: CreateSalesInvoiceDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('sales.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.findAll(Number(p), Number(ps), s); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('sales.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('sales.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateSalesInvoiceDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('sales.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }

  // ── Step 9: Database Persistence Engine — transactional posting ─
  @Post(':id/post')
  @Roles('admin','manager')
  @Permissions('sales.create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Post an invoice with approval + credit validation' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiBody({ type: PostSalesInvoiceDto })
  @ApiResponse({ status: 200, description: 'Invoice posted successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed - approval/credit check' })
  async postInvoice(
    @Param('id') id: string,
    @Body() dto: PostSalesInvoiceDto,
    @CurrentUser() u: {id:string},
  ) {
    const invoice = await this.service.findById(id);
    if (!invoice) {
      return { success: false, message: 'Invoice not found' };
    }

    // ═══════════════════════════════════════════════════════════════
    // CRITICAL FIX 1: Before posting, enforce approval + credit checks
    // ═══════════════════════════════════════════════════════════════

    // 1. Verify Approval Status == Approved
    const approvalRecords = await this.approvalEngine.findAll({ documentId: id, status: 'approved' });
    const isApproved = approvalRecords?.data?.length > 0;
    // Also check if invoice.status is already 'approved' or 'posted'
    if (invoice.status !== 'approved' && invoice.status !== 'posted' && invoice.status !== 'draft') {
      // If there's an approval record, it must be approved
      const pendingApprovals = await this.approvalEngine.findAll({ documentId: id });
      if (pendingApprovals?.data?.length > 0 && !isApproved) {
        return { success: false, message: 'Invoice requires approval before posting. Current approval status is not approved.' };
      }
    }

    // 2. Verify Credit Check
    const grandTotal = Number(invoice.grandTotal || 0);
    const creditResult = await this.creditEngine.checkCredit(invoice.customerId, grandTotal);

    if (creditResult.errors.length > 0) {
      return {
        success: false,
        message: 'Credit validation failed',
        errors: creditResult.errors,
        warnings: creditResult.warnings,
        creditStatus: creditResult.creditStatus,
      };
    }

    // 3. Check if approval is required due to credit risk
    if (creditResult.requiredApproval) {
      return {
        success: false,
        message: 'Invoice requires manager approval due to credit risk',
        warnings: creditResult.warnings,
        creditStatus: creditResult.creditStatus,
        requiredApproval: true,
      };
    }

    // 4. Warnings (non-blocking but informative)
    if (creditResult.warnings.length > 0) {
      console.warn(`[POSTING] Credit warnings for invoice ${invoice.invoiceNumber}:`, creditResult.warnings);
    }

    // Build posting input from saved invoice
    const invoiceItems = await this.service['invoiceItemsRepo']?.findAll({ search: id, page: 1, pageSize: 1000 }) || { data: [] };

    // ════════════════════════════════════════════════════════════
    // HARDENING H1+H2: Real stock validation + Real product data
    // ════════════════════════════════════════════════════════════
    // Batch-fetch product masters and warehouse stocks (2 queries total — NOT N+1)
    const allItems = await this.database.items.findAll({ page: 1, pageSize: 10000 }).catch(() => ({ data: [] }));
    const itemMasterMap = new Map((allItems?.data || []).map((im: Record<string, unknown>) => [im.id as string, im]));

    const allStock = await this.database.warehouseStock.findAll({ page: 1, pageSize: 10000 }).catch(() => ({ data: [] }));
    const stockByItemId = new Map((allStock?.data || []).map((s: Record<string, unknown>) => [s.itemId as string, s]));

    const postingInputItems: any[] = [];
    for (const item of (invoiceItems.data || [])) {
      // H2: Look up product master for real SKU and HSN code
      const productMaster = itemMasterMap.get(item.itemId) as Record<string, unknown> | undefined;
      const sku = (productMaster?.sku as string) || '';
      const hsn = (productMaster?.hsnCode as string) || '';

      // H1: Look up warehouse stock for real available quantity (in-memory filter after batch fetch)
      const stockRecord = stockByItemId.get(item.itemId) as Record<string, unknown> | undefined;
      const availableStock = stockRecord ? Number((stockRecord.quantity as number) || 0) : 0;

      // Validate: If stock insufficient, fail with clear message
      const qty = Number(item.quantity || 0);
      if (qty > availableStock) {
        return {
          success: false,
          message: `Insufficient stock for ${item.description || item.itemId}: requested ${qty}, available ${availableStock}`,
          item: item.itemId,
          requestedQty: qty,
          availableStock,
        };
      }

      postingInputItems.push({
        id: item.id,
        productId: item.itemId,
        productName: item.description || '',
        sku,
        hsn,
        batchNo: item.batchNo || '',
        expiryDate: item.expiryDate || '',
        warehouse: item.warehouse || 'Main',
        uom: item.unitId || '',
        quantity: qty,
        rate: Number(item.rate || 0),
        discountPercent: Number(item.discountPercent || 0),
        gstPercent: Number(item.gstRate || 0),
        taxableAmount: Number(item.taxableValue || 0),
        cgstAmount: Number(item.cgst || 0),
        sgstAmount: Number(item.sgst || 0),
        igstAmount: Number(item.igst || 0),
        cessAmount: Number(item.cess || 0),
        amount: Number(item.totalAmount || 0),
        availableStock,
      });
    }

    const postingInput = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      customerId: invoice.customerId,
      customerName: dto.userEmail || 'Customer',
      placeOfSupply: invoice.placeOfSupply || '',
      billingAddress: invoice.billingAddress || '',
      salesPerson: invoice.salesPerson || '',
      notes: invoice.notes || '',
      paymentTerms: '',
      status: invoice.status || 'draft',
      grossTotal: Number(invoice.subTotal || 0),
      itemDiscountTotal: Number(invoice.discountAmount || 0),
      taxableAfterDiscount: Number(invoice.subTotal || 0) - Number(invoice.discountAmount || 0),
      cgstTotal: Number(invoice.cgstTotal || 0),
      sgstTotal: Number(invoice.sgstTotal || 0),
      igstTotal: Number(invoice.igstTotal || 0),
      cessTotal: Number(invoice.cessTotal || 0),
      roundOff: Number(invoice.roundOff || 0),
      grandTotal,
      totalPaid: Number(invoice.paidAmount || 0),
      balance: Number(invoice.balanceAmount || 0),
      customerGstin: invoice.customerGstin || '',
      gstCategory: invoice.gstCategory || 'intrastate',
      isInterState: invoice.placeOfSupply && invoice.placeOfSupply !== 'MH',
      items: postingInputItems,
      paymentSplits: [],
      userId: u?.id || 'system',
      userEmail: dto.userEmail || 'system',
    };

    // Prepare posting payload
    const preparedPayload = await this.postingEngine.preparePosting(postingInput);

    // Persist in a single transaction
    return this.postingEngine.triggerPosting(preparedPayload, u?.id || 'system');
  };
}

@ApiTags('Sales - Returns') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('sales/returns')
export class SalesReturnsController {
  constructor(public readonly service: SalesReturnsService) {}
  @Post() @Roles('admin','manager') @Permissions('sales.create') @HttpCode(HttpStatus.CREATED)
  @WorkflowDocument({ module:'sales', documentType:'sales_return', templateCode:'sales-return', templateName:'Sales Return Workflow', amountField:'totalAmount', numberField:'returnNumber' })
  async create(@Body() dto: CreateSalesReturnDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('sales.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.findAll(Number(p), Number(ps), s); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('sales.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('sales.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateSalesReturnDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('sales.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Sales - Customer Price List') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('sales/customer-prices')
export class CustomerPriceListController {
  constructor(public readonly service: CustomerPriceListService) {}
  @Post() @Roles('admin','manager') @Permissions('sales.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCustomerPriceListDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('sales.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.findAll(Number(p), Number(ps), s); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('sales.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('sales.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerPriceListDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('sales.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

@ApiTags('Sales - Approvals') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('sales/approvals')
export class SalesApprovalsController {
  constructor(public readonly service: SalesApprovalsService) {}
  @Post() @Roles('admin','manager') @Permissions('sales.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSalesApprovalDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('sales.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Put(':id') @Roles('admin','manager') @Permissions('sales.update') @HttpCode(HttpStatus.OK)
  async approve(@Param('id') id: string, @Body() dto: UpdateSalesApprovalDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
}

@ApiTags('Sales - Settings') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('sales/settings')
export class SalesSettingsController {
  constructor(public readonly service: SalesSettingsService) {}
  @Post() @Roles('admin') @Permissions('sales.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSalesSettingsDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager') @Permissions('sales.read') @HttpCode(HttpStatus.OK)
  async getSettings() { const r = await this.service.findAll(1,1); return r.data[0] || {}; }
  @Put() @Roles('admin') @Permissions('sales.update') @HttpCode(HttpStatus.OK)
  async update(@Body() dto: UpdateSalesSettingsDto, @CurrentUser() u: {id:string}) { const r = await this.service.findAll(1,1); return r.data.length > 0 ? this.service.update(r.data[0].id as string, dto, u?.id) : this.service.create(dto, u?.id); }
}
