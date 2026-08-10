import { Controller, Get, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { SalesReportsService, type ReportFilters } from './reports.service';

@ApiTags('Sales - Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('sales/reports')
export class SalesReportsController {
  constructor(private readonly reports: SalesReportsService) {}

  // ═════════════════════════════════════════════════════════
  // 0. QUOTATION DASHBOARD
  // ═════════════════════════════════════════════════════════

  @Get('quotation-summary')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Quotation dashboard: total/today/pending/approved/rejected/converted/lost + conversion %',
  })
  async getQuotationSummary() {
    return this.reports.getQuotationSummary();
  }

  // ═════════════════════════════════════════════════════════
  // 1. SALES DASHBOARD
  // ═════════════════════════════════════════════════════════

  @Get('dashboard')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get sales dashboard KPIs and chart data' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'yesterday', 'this_week', 'this_month', 'this_fy', 'custom'],
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getDashboard(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: ReportFilters = {
      period: period as ReportFilters['period'],
      startDate,
      endDate,
    };
    return this.reports.getDashboard(filters);
  }

  // ═════════════════════════════════════════════════════════
  // 2. SALES REGISTER
  // ═════════════════════════════════════════════════════════

  @Get('register')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get sales register with pagination and filters' })
  async getSalesRegister(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('search') search?: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('customerId') customerId?: string,
    @Query('salesPerson') salesPerson?: string,
    @Query('invoiceStatus') invoiceStatus?: string,
  ) {
    const filters: ReportFilters = {
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      period: period as ReportFilters['period'],
      startDate,
      endDate,
      customerId,
      salesPerson,
      invoiceStatus,
    };
    return this.reports.getSalesRegister(filters);
  }

  // ═════════════════════════════════════════════════════════
  // 3. INVOICE REGISTER
  // ═════════════════════════════════════════════════════════

  @Get('invoices')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get invoice register with search and filters' })
  async getInvoiceRegister(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('search') search?: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('customerId') customerId?: string,
    @Query('invoiceStatus') invoiceStatus?: string,
  ) {
    const filters: ReportFilters = {
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      period: period as ReportFilters['period'],
      startDate,
      endDate,
      customerId,
      invoiceStatus,
    };
    return this.reports.getInvoiceRegister(filters);
  }

  // ═════════════════════════════════════════════════════════
  // 4. CUSTOMER LEDGER
  // ═════════════════════════════════════════════════════════

  @Get('customer-ledger')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer-wise ledger with aging and running balance' })
  async getCustomerLedger(
    @Query('customerId') customerId?: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: ReportFilters = {
      customerId,
      period: period as ReportFilters['period'],
      startDate,
      endDate,
    };
    return this.reports.getCustomerLedger(filters);
  }

  // ═════════════════════════════════════════════════════════
  // 4b. CUSTOMER LEDGER 360° (single customer drill-down)
  // ═════════════════════════════════════════════════════════

  @Get('customer-ledger/:id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Customer 360° ledger: quotations, orders, challans, invoices, payments, outstanding + running ledger',
  })
  async getCustomerLedgerDetail(@Param('id') id: string) {
    return this.reports.getCustomerLedgerDetail(id);
  }

  // ═════════════════════════════════════════════════════════
  // 5. PRODUCT SALES
  // ═════════════════════════════════════════════════════════

  @Get('products')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get product-wise sales report with profit margins' })
  async getProductSales(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('productId') productId?: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: ReportFilters = {
      page: Number(page),
      pageSize: Number(pageSize),
      productId,
      period: period as ReportFilters['period'],
      startDate,
      endDate,
    };
    return this.reports.getProductSales(filters);
  }

  // ═════════════════════════════════════════════════════════
  // 6. OUTSTANDING REPORT
  // ═════════════════════════════════════════════════════════

  @Get('outstanding')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get outstanding report with aging and risk analysis' })
  async getOutstanding(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('period') period?: string,
  ) {
    const filters: ReportFilters = {
      page: Number(page),
      pageSize: Number(pageSize),
      period: period as ReportFilters['period'],
    };
    return this.reports.getOutstanding(filters);
  }

  // ═════════════════════════════════════════════════════════
  // 7. GST REPORT
  // ═════════════════════════════════════════════════════════

  @Get('gst')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get GST summary report with HSN and rate-wise breakdown' })
  async getGstReport(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: ReportFilters = {
      period: period as ReportFilters['period'],
      startDate,
      endDate,
    };
    return this.reports.getGstReport(filters);
  }

  // ═════════════════════════════════════════════════════════
  // 8. PAYMENT REPORT
  // ═════════════════════════════════════════════════════════

  @Get('payment')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payment report with mode-wise and collection summary' })
  async getPaymentReport(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: ReportFilters = {
      period: period as ReportFilters['period'],
      startDate,
      endDate,
    };
    return this.reports.getPaymentReport(filters);
  }

  // ═════════════════════════════════════════════════════════
  // 9. PROFIT ANALYSIS
  // ═════════════════════════════════════════════════════════

  @Get('profit')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('financial.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get profit analysis with margins, top products, and trends' })
  async getProfitAnalysis(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: ReportFilters = {
      period: period as ReportFilters['period'],
      startDate,
      endDate,
    };
    return this.reports.getProfitAnalysis(filters);
  }
}
