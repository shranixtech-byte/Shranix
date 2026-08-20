import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  createFileFilter,
  createUploadLimits,
  IMPORT_ALLOWED_MIMES,
  IMPORT_ALLOWED_EXTENSIONS,
} from '../common/utils/file-validation';
import { sanitizePage, sanitizePageSize } from '../common/utils/pagination.util';

import {
  BulkProductDeleteDto,
  BulkProductStatusDto,
  CreateProductDocumentDto,
  CreateProductDto,
  ProductStatusDto,
  UpdateProductDto,
} from './products-master.dto';
import { ProductsMasterService } from './products-master.service';

/**
 * PHASE 3.2 — PRODUCT MASTER (enterprise)
 * Backed by shranix_items (canonical) + product_documents + product_price_history.
 * Static routes declared BEFORE :id so they never collide.
 */
@ApiTags('Inventory - Product Master')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsMasterController {
  constructor(private readonly service: ProductsMasterService) {}

  // ── Static routes FIRST ──
  @Get('dashboard')
  @Roles('admin', 'manager', 'accountant', 'sales', 'purchase', 'inventory')
  @Permissions('product.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Product master dashboard — counts, low stock, expiry, top selling' })
  async dashboard() {
    return this.service.getDashboard();
  }

  @Get('search')
  @Roles('admin', 'manager', 'accountant', 'sales', 'purchase', 'inventory')
  @Permissions('product.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quick search — code / SKU / barcode / name / HSN' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async search(
    @Query('q') q?: string,
    @Query('page') p = 1,
    @Query('pageSize') ps = 50,
    @Query('status') status?: string,
  ) {
    return this.service.searchProducts({
      q,
      page: sanitizePage(p),
      pageSize: sanitizePageSize(ps, 50),
      status,
    });
  }

  @Get('export')
  @Roles('admin', 'manager', 'inventory', 'accountant')
  @Permissions('product.export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export products as CSV / XLSX / JSON' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'xlsx', 'json'],
    description: 'Default csv',
  })
  async exportData(@Query('format') format = 'csv') {
    const { fileName, buffer, mime } = await this.service.exportProducts(format);
    return new StreamableFile(buffer, {
      type: mime,
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Post('import')
  @Roles('admin', 'manager', 'inventory')
  @Permissions('product.import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import products from Excel / CSV / JSON with duplicate detection' })
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
    return this.service.importProducts(file, mode, u?.id);
  }

  @Post('bulk-status')
  @Roles('admin', 'manager', 'inventory')
  @Permissions('product.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk status update for products' })
  @ApiBody({ type: BulkProductStatusDto })
  async bulkStatus(@Body() dto: BulkProductStatusDto, @CurrentUser() u: { id: string }) {
    return this.service.bulkStatus(dto.ids, dto.status, u?.id);
  }

  @Post('bulk-delete')
  @Roles('admin')
  @Permissions('product.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk soft-delete products (guarded against transaction history)' })
  @ApiBody({ type: BulkProductDeleteDto })
  async bulkDelete(@Body() dto: BulkProductDeleteDto, @CurrentUser() u: { id: string }) {
    return this.service.bulkDelete(dto.ids, u?.id);
  }

  @Get('masters')
  @Roles('admin', 'manager', 'accountant', 'sales', 'purchase', 'inventory')
  @Permissions('product.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Form masters — categories, sub-categories, brands, units, GST rates, suppliers',
  })
  async masters() {
    return this.service.getFormMasters();
  }

  @Get('reports/:report')
  @Roles('admin', 'manager', 'accountant', 'inventory')
  @Permissions('product.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Product reports — master | price | low-stock | out-of-stock | expiry' })
  @ApiParam({ name: 'report', enum: ['master', 'price', 'low-stock', 'out-of-stock', 'expiry'] })
  async report(@Param('report') report: string) {
    return this.service.getReports(report);
  }

  // ── Product detail sub-resources (declare before :id routes not needed — distinct paths) ──
  @Get(':id/stock')
  @Roles('admin', 'manager', 'accountant', 'inventory')
  @Permissions('product.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Product stock — warehouse breakdown, ledger, batches' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async stock(@Param('id') id: string) {
    return this.service.getStock(id);
  }

  @Get(':id/prices')
  @Roles('admin', 'manager', 'accountant', 'sales', 'purchase')
  @Permissions('product.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Product current prices + price history' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async prices(@Param('id') id: string) {
    return this.service.getPrices(id);
  }

  @Get(':id/batches')
  @Roles('admin', 'manager', 'accountant', 'inventory')
  @Permissions('product.batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Product batches' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async batches(@Param('id') id: string) {
    return this.service.getBatches(id);
  }

  @Get(':id/history')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('product.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Product 360° history — price, stock, purchase, sales' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async history(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  @Get(':id/delete-guard')
  @Roles('admin', 'manager')
  @Permissions('product.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check whether product can be deleted (transaction-history guard)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async deleteGuard(@Param('id') id: string) {
    return this.service.checkTransactionHistory(id);
  }

  @Post('documents')
  @Roles('admin', 'manager', 'inventory')
  @Permissions('product.documents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a product document' })
  @ApiBody({ type: CreateProductDocumentDto })
  async addDocument(@Body() dto: CreateProductDocumentDto, @CurrentUser() u: { id: string }) {
    return this.service.addDocument(dto, u?.id);
  }

  @Delete('documents/:docId')
  @Roles('admin', 'manager', 'inventory')
  @Permissions('product.documents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a product document' })
  @ApiParam({ name: 'docId', description: 'Document ID' })
  async removeDocument(@Param('docId') docId: string, @CurrentUser() u: { id: string }) {
    return this.service.removeDocument(docId, u?.id);
  }

  // ── CRUD ──
  @Post()
  @Roles('admin', 'manager', 'inventory')
  @Permissions('product.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create product' })
  @ApiBody({ type: CreateProductDto })
  async create(@Body() dto: CreateProductDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }

  @Get()
  @Roles('admin', 'manager', 'accountant', 'sales', 'purchase', 'inventory')
  @Permissions('product.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List products with filters (search, category, brand, type, status, sort)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'subCategoryId', required: false, type: String })
  @ApiQuery({ name: 'brandId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortDir', required: false, enum: ['asc', 'desc'] })
  async findAll(
    @Query('page') p = 1,
    @Query('pageSize') ps = 50,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subCategoryId') subCategoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    return this.service.findAll({
      // H4 — bound client-supplied page/pageSize (default 50, max 200)
      page: sanitizePage(p),
      pageSize: sanitizePageSize(ps, 50),
      search,
      categoryId,
      subCategoryId,
      brandId,
      type,
      status,
      sortBy,
      sortDir: (sortDir as 'asc' | 'desc') || 'asc',
    });
  }

  @Get(':id')
  @Roles('admin', 'manager', 'accountant', 'sales', 'purchase', 'inventory')
  @Permissions('product.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get product detail (with documents, price history, batches, stock)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @Roles('admin', 'manager', 'inventory')
  @Permissions('product.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update product (code immutable; price changes recorded in history)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({ type: UpdateProductDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }

  @Patch(':id/status')
  @Roles('admin', 'manager', 'inventory')
  @Permissions('product.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update product status (active / inactive / blocked / discontinued)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({ type: ProductStatusDto })
  async status(
    @Param('id') id: string,
    @Body() dto: ProductStatusDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.setStatus(id, dto.status, u?.id);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @Permissions('product.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete product (guarded — blocked if transaction history exists)',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product soft-deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete — transaction history exists' })
  async remove(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}
