import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { SalesCreditEngineService } from './credit-engine.service';

@ApiTags('Sales - Credit Control')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('sales/credit')
export class SalesCreditController {
  constructor(private readonly engine: SalesCreditEngineService) {}

  @Get('dashboard')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get credit control dashboard summary' })
  @ApiResponse({ status: 200, description: 'Returns credit dashboard summary with KPIs' })
  async getDashboard() { return this.engine.getDashboard(); }

  @Get('customers')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer credit profiles with filters and sorting' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Page size' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or code' })
  @ApiQuery({ name: 'riskCategory', required: false, enum: ['low', 'medium', 'high', 'critical'], description: 'Filter by risk category' })
  @ApiQuery({ name: 'isBlocked', required: false, description: 'Filter blocked customers' })
  @ApiQuery({ name: 'warningLevel', required: false, enum: ['green', 'amber', 'red', 'critical'], description: 'Filter by warning level' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sortDir', required: false, enum: ['asc', 'desc'], description: 'Sort direction' })
  @ApiResponse({ status: 200, description: 'Returns paginated customer credit profiles' })
  async getCustomers(
    @Query('page') page = 1, @Query('pageSize') pageSize = 50, @Query('search') search?: string,
    @Query('riskCategory') riskCategory?: string, @Query('isBlocked') isBlocked?: string,
    @Query('warningLevel') warningLevel?: string, @Query('sortBy') sortBy?: string, @Query('sortDir') sortDir?: string,
  ) {
    return this.engine.getCustomers({ page: Number(page), pageSize: Number(pageSize), search, riskCategory, isBlocked, warningLevel, sortBy, sortDir });
  }

  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get credit profile for a single customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Returns customer credit profile with health score' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getOne(@Param('id') id: string) {
    const profile = await this.engine.getCustomerProfile(id);
    const healthScore = this.engine.calculateHealthScore(profile);
    return { ...profile, healthScore };
  }

  @Post(':id/update')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update customer credit profile' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiBody({ description: 'Profile fields to update', required: true })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(@Param('id') id: string, @Body() data: any, @CurrentUser() _u: { id: string }) {
    return this.engine.updateProfile(id, data);
  }

  @Post('check')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check credit before posting an invoice' })
  @ApiBody({ description: 'Credit check payload with customerId and invoiceAmount', required: true })
  @ApiResponse({ status: 200, description: 'Returns credit check result with warnings/errors' })
  async checkCredit(@Body() dto: { customerId: string; invoiceAmount: number; invoiceDate?: string }) {
    return this.engine.checkCredit(dto.customerId, dto.invoiceAmount);
  }

  @Post('override')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manager override for credit control' })
  @ApiBody({ description: 'Override payload with customerId, reason, and optional newLimit', required: true })
  @ApiResponse({ status: 200, description: 'Override applied' })
  @ApiResponse({ status: 400, description: 'Insufficient permissions' })
  async override(
    @Body() dto: { customerId: string; reason: string; newLimit?: number },
    @CurrentUser() u: { id: string; name?: string; role?: string },
  ) {
    return this.engine.override(dto.customerId, u.id, u.name || u.id, u.role || 'manager', dto.reason, dto.newLimit);
  }

  @Post(':id/block')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block a customer from posting invoices' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiBody({ description: 'Block reason', required: true })
  @ApiResponse({ status: 200, description: 'Customer blocked' })
  async blockCustomer(@Param('id') id: string, @Body() dto: { reason: string }, @CurrentUser() u: { id: string }) {
    return this.engine.blockCustomer(id, dto.reason, u.id);
  }

  @Post(':id/release')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release a blocked customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiBody({ description: 'Release reason', required: true })
  @ApiResponse({ status: 200, description: 'Customer released' })
  async releaseCustomer(@Param('id') id: string, @Body() dto: { reason: string }, @CurrentUser() u: { id: string }) {
    return this.engine.releaseCustomer(id, dto.reason, u.id);
  }

  @Get('ageing/list')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get ageing report with bucketed data' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Page size' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by customer name or code' })
  @ApiResponse({ status: 200, description: 'Returns ageing report with buckets' })
  async getAgeing(@Query('page') page = 1, @Query('pageSize') pageSize = 50, @Query('search') search?: string) {
    return this.engine.getAgeing({ page: Number(page), pageSize: Number(pageSize), search });
  }

  @Get('recovery/dashboard')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get recovery dashboard data' })
  @ApiResponse({ status: 200, description: 'Returns recovery dashboard data with trend' })
  async getRecovery() { return this.engine.getRecovery(); }

  @Get('reminders/list')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payment reminders grouped by urgency' })
  @ApiResponse({ status: 200, description: 'Returns reminders grouped by due-soon, today, overdue, critical' })
  async getReminders() { return this.engine.getReminders(); }
}
