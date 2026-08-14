
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
import { sanitizePage, sanitizePageSize } from '../common/utils/pagination.util';

import { CustomersService } from './customers.service';
import {
  BulkCustomerDeleteDto,
  BulkCustomerStatusDto,
  CreateCustomerDto,
  CustomerStatusDto,
  UpdateCustomerDto,
} from './dto';

@ApiTags('Sales - Customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(public readonly service: CustomersService) {}

  // ─────────────────────────────────────────────────────────────
  // STATIC ROUTES — must be declared BEFORE @Get(':id')
  // ─────────────────────────────────────────────────────────────

  @Get('dashboard')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer master dashboard — totals, status split, top customers' })
  async getDashboard() {
    return this.service.getDashboard();
  }

  @Get('search')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Quick search — name / mobile / gstin / code / firm name / village / email',
  })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async search(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.searchCustomers({
      q,
      // H4 — bound client-supplied page/pageSize (default 50, max 200)
      page: sanitizePage(page),
      pageSize: sanitizePageSize(pageSize, 50),
    });
  }

  @Get('outstanding')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Outstanding report — customers with balances and ageing totals' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive', 'blocked'] })
  async outstanding(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.service.getOutstanding({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 50,
      search,
      status,
    });
  }

  @Get('export')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export customers as Excel / CSV / JSON' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx', 'json'] })
  async export(@Query('format') format?: string): Promise<StreamableFile> {
    return this.service.exportCustomers(format || 'csv').then(
      (r) =>
        new StreamableFile(r.buffer, {
          type: r.mime,
          disposition: `attachment; filename="${r.fileName}"`,
        }),
    );
  }

  @Post('import')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import customers from Excel / CSV / JSON (insert skips duplicates, upsert updates)',
  })
  async import(
    @UploadedFile() file: any,
    @Body('mode') mode: string,
    @CurrentUser() u: { id: string },
  ) {
    if (!file) {
      return { success: false, message: 'No file provided' };
    }
    return this.service.importCustomers(file, mode === 'upsert' ? 'upsert' : 'insert', u?.id);
  }

  @Post('bulk-status')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk status update (active / inactive / blocked)' })
  @ApiBody({ type: BulkCustomerStatusDto })
  async bulkStatus(@Body() dto: BulkCustomerStatusDto, @CurrentUser() u: { id: string }) {
    return this.service.bulkStatus(dto.ids, dto.status, u?.id);
  }

  @Post('bulk-delete')
  @Roles('admin')
  @Permissions('sales.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk soft-delete (skips customers that have invoices)' })
  @ApiBody({ type: BulkCustomerDeleteDto })
  async bulkDelete(@Body() dto: BulkCustomerDeleteDto, @CurrentUser() u: { id: string }) {
    return this.service.bulkDelete(dto.ids, u?.id);
  }

  @Get('ledger/:id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer 360° ledger — documents chain + running balance' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  async ledger(@Param('id') id: string) {
    return this.service.getLedger(id);
  }

  // ─────────────────────────────────────────────────────────────
  // ORIGINAL CRUD (backward compatible)
  // ─────────────────────────────────────────────────────────────

  @Post()
  @Roles('admin', 'manager')
  @Permissions('sales.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a customer' })
  @ApiResponse({ status: 201, description: 'Customer created' })
  async create(@Body() dto: CreateCustomerDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }

  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List customers with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'searchField', required: false, enum: ['name', 'mobile', 'gstin', 'code'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive', 'blocked'] })
  @ApiQuery({ name: 'groupId', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'customerType', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortDir', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'withProfile', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Paginated list of customers' })
  async findAll(
    @Query('page') p = 1,
    @Query('ps') ps = 50,
    @Query('search') s?: string,
    @Query('searchField') sf?: string,
    @Query('status') status?: string,
    @Query('groupId') groupId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('customerType') customerType?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('withProfile') withProfile?: string,
  ) {
    // Enterprise filters → master-table list; otherwise legacy path (unchanged shape)
    if (status || groupId || categoryId || customerType || sortBy || withProfile) {
      return this.service.listCustomers({
        page: Number(p),
        pageSize: Number(ps),
        search: s,
        status,
        groupId,
        categoryId,
        customerType,
        sortBy,
        sortDir: sortDir === 'desc' ? 'desc' : 'asc',
        withProfile: withProfile === 'true',
      });
    }
    return this.service.findAll(Number(p), Number(ps), s, sf);
  }

  @Patch(':id/status')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update customer status (active / inactive / blocked)' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiBody({ type: CustomerStatusDto })
  async setStatus(
    @Param('id') id: string,
    @Body() dto: CustomerStatusDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.setStatus(id, dto.status, u?.id);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer found' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('sales.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }

  @Post(':id/restore')
  @Roles('admin')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer restored' })
  async restore(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.restore(id, u?.id);
  }
}
