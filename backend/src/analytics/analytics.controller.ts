import { Controller, Get, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { THROTTLE_ANALYTICS, throttle } from '../common/utils/rate-limit-policies';

import { AnalyticsService, type AnalyticsFilters } from './analytics.service';

/**
 * Enterprise BI Analytics API — reads existing source-of-truth data
 * (sales / purchase / inventory / GL / masters) and returns structured
 * KPI cards, chart series and report tables consumed by the BI dashboards.
 *
 * All endpoints accept optional `branchId` query parameter to scope
 * analytics to a specific branch, preventing cross-branch data leakage.
 */
@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Throttle(throttle(THROTTLE_ANALYTICS))
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  private filters(
    fromDate?: string,
    toDate?: string,
    period?: string,
    branchId?: string,
  ): AnalyticsFilters {
    return { fromDate, toDate, period, branchId };
  }

  @Get('overview')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Management dashboard KPIs, trends, top customers/products' })
  async overview(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('period') period?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.analytics.getOverview(this.filters(from, to, period, branchId));
  }

  @Get('sales')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sales analytics: trends, categories, customers, salespersons, quotation funnel',
  })
  async sales(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('period') period?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.analytics.getSales(this.filters(from, to, period, branchId));
  }

  @Get('purchase')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Purchase analytics: trends, suppliers, products, categories, concentration',
  })
  async purchase(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('period') period?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.analytics.getPurchase(this.filters(from, to, period, branchId));
  }

  @Get('inventory')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Inventory analytics: stock value, movement, low/out-of-stock, fast/slow/dead',
  })
  async inventory(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('period') period?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.analytics.getInventory(this.filters(from, to, period, branchId));
  }

  @Get('finance')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Financial analytics: revenue, margins, expenses, profit trend, sales vs purchase',
  })
  async finance(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('period') period?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.analytics.getFinance(this.filters(from, to, period, branchId));
  }

  @Get('gst')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GST analytics: output/input tax, GST by rate and period' })
  async gst(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('period') period?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.analytics.getGst(this.filters(from, to, period, branchId));
  }

  @Get('customers')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer analytics: top, inactive, credit utilization, outstanding' })
  async customers(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('period') period?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.analytics.getCustomers(this.filters(from, to, period, branchId));
  }

  @Get('suppliers')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('purchase.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supplier analytics: spend, concentration, pending payments' })
  async suppliers(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('period') period?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.analytics.getSuppliers(this.filters(from, to, period, branchId));
  }

  @Get('warehouses')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('inventory.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Warehouse analytics: stock distribution, transfers' })
  async warehouses(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('period') period?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.analytics.getWarehouses(this.filters(from, to, period, branchId));
  }

  @Get('profitability')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Profitability analytics: product margins, bottom performers' })
  async profitability(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('period') period?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.analytics.getProfitability(this.filters(from, to, period, branchId));
  }

  @Get('cashflow')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cash flow analytics: inflow/outflow by period' })
  async cashflow(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('period') period?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.analytics.getCashFlow(this.filters(from, to, period, branchId));
  }

  @Get('growth')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Growth analytics: MoM revenue/order growth' })
  async growth(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('period') period?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.analytics.getGrowth(this.filters(from, to, period, branchId));
  }

  @Get('top-bottom')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Top/bottom 10 customers, suppliers, products by sales/qty/profit' })
  async topBottom(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('period') period?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.analytics.getTopBottom(this.filters(from, to, period, branchId));
  }
}
