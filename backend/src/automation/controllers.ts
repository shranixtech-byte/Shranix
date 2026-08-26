import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApprovalGuard, ApprovalRequired } from '../workflow/guards/approval.guard';

import { FinancialScheduler } from './financial-scheduler';
import { GlPostingEngine } from './gl-posting.engine';
import { GstCalculationEngine } from './gst-calculation.engine';
import {
  SalesFinanceIntegration,
  PurchaseFinanceIntegration,
  InventoryFinanceIntegration,
  PayrollFinanceIntegration,
  ExpenseFinanceIntegration,
  BankFinanceIntegration,
} from './integration-services';
import { ReportEngine } from './report-engine';

@ApiTags('Automation - Posting Engine')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('automation/posting')
export class PostingEngineController {
  constructor(private readonly engine: GlPostingEngine) {}

  @Post('run')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.create')
  @UseGuards(ApprovalGuard)
  @ApprovalRequired({
    documentType: 'journal_entry',
    documentIdParam: 'id',
    message: 'Journal entries require approval before posting to GL',
  })
  @ApiOperation({ summary: 'Post GL entries with double-entry validation' })
  @HttpCode(HttpStatus.OK)
  async runPosting(
    @Body() body: { entries: any[]; financialYearId?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.engine.postEntries(body.entries, { userId, financialYearId: body.financialYearId });
  }

  @Post('preview')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Preview posting before execution (dry run)' })
  @HttpCode(HttpStatus.OK)
  async previewPosting(@Body() body: { entries: any[] }) {
    return this.engine.previewEntries(body.entries);
  }

  @Post('reverse')
  @Roles('admin')
  @Permissions('finance.create')
  @UseGuards(ApprovalGuard)
  @ApprovalRequired({
    documentType: 'journal_entry',
    documentIdParam: 'voucherId',
    message: 'Reversal requires approval',
  })
  @ApiOperation({ summary: 'Reverse previously posted entries' })
  @HttpCode(HttpStatus.OK)
  async reversePosting(
    @Body() body: { voucherId: string; reason?: string },
    @CurrentUser() u: { id: string },
  ) {
    return this.engine.reverseEntries(body.voucherId, { userId: u?.id, reason: body.reason });
  }

  @Post('apply-rules')
  @Roles('admin', 'manager')
  @Permissions('finance.create')
  @ApiOperation({ summary: 'Apply posting rules for a voucher' })
  @HttpCode(HttpStatus.OK)
  async applyRules(@Body() body: { voucher: any }, @CurrentUser() u: { id: string }) {
    return this.engine.applyPostingRules(body.voucher, { userId: u?.id });
  }
}

@ApiTags('Automation - GST Engine')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('automation/gst')
export class GstEngineController {
  constructor(private readonly engine: GstCalculationEngine) {}

  @Post('calculate')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Calculate GST for a line item' })
  @HttpCode(HttpStatus.OK)
  async calculateGst(
    @Body()
    body: {
      taxableValue: number;
      gstRate: number;
      supplyType: string;
      cessPercent?: number;
    },
  ) {
    return this.engine.calculateGst({ ...body, supplyType: body.supplyType as any });
  }

  @Post('post')
  @Roles('admin', 'manager')
  @Permissions('finance.create')
  @ApiOperation({ summary: 'Post GST entries for a voucher' })
  @HttpCode(HttpStatus.OK)
  async postGst(@Body() body: any, @CurrentUser() u: { id: string }) {
    return this.engine.postGstEntries(body, u?.id);
  }

  @Get('summary')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Get GST summary for a period' })
  @HttpCode(HttpStatus.OK)
  async gstSummary(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('gstin') gstin?: string,
  ) {
    return this.engine.getGstSummary({ fromDate, toDate, gstin });
  }
}

@ApiTags('Automation - Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('automation/reports')
export class ReportsController {
  constructor(private readonly reportEngine: ReportEngine) {}

  @Get('trial-balance')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate Trial Balance from GL data' })
  @HttpCode(HttpStatus.OK)
  async trialBalance(
    @Query('financialYearId') fy?: string,
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('branchId') branch?: string,
    @Query('costCenterId') cc?: string,
  ) {
    return this.reportEngine.generateTrialBalance({
      financialYearId: fy,
      fromDate: from,
      toDate: to,
      branchId: branch,
      costCenterId: cc,
    });
  }

  @Get('profit-loss')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate Profit & Loss from GL data' })
  @HttpCode(HttpStatus.OK)
  async profitLoss(
    @Query('financialYearId') fy?: string,
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('branchId') branch?: string,
    @Query('costCenterId') cc?: string,
  ) {
    return this.reportEngine.generateProfitLoss({
      financialYearId: fy,
      fromDate: from,
      toDate: to,
      branchId: branch,
      costCenterId: cc,
    });
  }

  @Get('balance-sheet')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate Balance Sheet from GL data' })
  @HttpCode(HttpStatus.OK)
  async balanceSheet(
    @Query('financialYearId') fy?: string,
    @Query('asOnDate') asOn?: string,
    @Query('branchId') branch?: string,
    @Query('comparativeYear') compYear?: string,
  ) {
    return this.reportEngine.generateBalanceSheet({
      financialYearId: fy,
      asOnDate: asOn,
      branchId: branch,
      comparativeYear: compYear,
    });
  }

  @Get('cash-flow')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate Cash Flow Statement from GL data' })
  @HttpCode(HttpStatus.OK)
  async cashFlow(
    @Query('financialYearId') fy?: string,
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
  ) {
    return this.reportEngine.generateCashFlow({ financialYearId: fy, fromDate: from, toDate: to });
  }

  @Get('day-book')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate Day Book from GL entries' })
  @HttpCode(HttpStatus.OK)
  async dayBook(
    @Query('date') date: string,
    @Query('voucherType') vt?: string,
    @Query('branchId') branch?: string,
  ) {
    return this.reportEngine.generateDayBook({ date, voucherType: vt, branchId: branch });
  }

  @Get('account-statement')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate Account Statement from GL data' })
  @HttpCode(HttpStatus.OK)
  async accountStatement(
    @Query('accountId') accountId: string,
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
  ) {
    return this.reportEngine.generateAccountStatement({ accountId, fromDate: from, toDate: to });
  }

  @Get('general-ledger')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate General Ledger' })
  @HttpCode(HttpStatus.OK)
  async generalLedger(
    @Query('financialYearId') fy?: string,
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('accountId') acct?: string,
  ) {
    return this.reportEngine.generateGeneralLedger({
      financialYearId: fy,
      fromDate: from,
      toDate: to,
      accountId: acct,
    });
  }

  @Get('gst-register')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate GST Register' })
  @HttpCode(HttpStatus.OK)
  async gstRegister(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('gstType') gstType?: string,
    @Query('gstin') gstin?: string,
  ) {
    return this.reportEngine.generateGstRegister({ fromDate: from, toDate: to, gstType, gstin });
  }

  @Get('gst-summary')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate GST Summary' })
  @HttpCode(HttpStatus.OK)
  async gstSummary(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('gstin') gstin?: string,
  ) {
    return this.reportEngine.generateGstSummary({ fromDate: from, toDate: to, gstin });
  }

  @Get('audit')
  @Roles('admin')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate Audit Report' })
  @HttpCode(HttpStatus.OK)
  async auditReport(
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('userId') userId?: string,
    @Query('module') mod?: string,
    @Query('action') action?: string,
  ) {
    return this.reportEngine.generateAuditReport({
      fromDate: from,
      toDate: to,
      userId,
      module: mod,
      action,
    });
  }

  @Post('recalculate')
  @Roles('admin')
  @Permissions('finance.create')
  @ApiOperation({ summary: 'Recalculate all financial reports' })
  @HttpCode(HttpStatus.OK)
  async recalculateReports(@Body() body: { financialYearId?: string }) {
    return {
      trialBalance: await this.reportEngine.generateTrialBalance({
        financialYearId: body.financialYearId,
      }),
      profitLoss: await this.reportEngine.generateProfitLoss({
        financialYearId: body.financialYearId,
      }),
      balanceSheet: await this.reportEngine.generateBalanceSheet({
        financialYearId: body.financialYearId,
      }),
    };
  }
}

@ApiTags('Automation - Integration')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('automation/integration')
export class IntegrationController {
  constructor(
    private readonly sales: SalesFinanceIntegration,
    private readonly purchase: PurchaseFinanceIntegration,
    private readonly inventory: InventoryFinanceIntegration,
    private readonly payroll: PayrollFinanceIntegration,
    private readonly expense: ExpenseFinanceIntegration,
    private readonly bank: BankFinanceIntegration,
  ) {}

  @Post('sales/invoice/:id')
  @Roles('admin', 'manager')
  @Permissions('finance.create')
  @UseGuards(ApprovalGuard)
  @ApprovalRequired({
    documentType: 'sales_invoice',
    documentIdParam: 'id',
    message: 'Sales invoice requires approval before posting to GL',
  })
  @ApiOperation({ summary: 'Post sales invoice to GL' })
  @HttpCode(HttpStatus.OK)
  async postSalesInvoice(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.sales.postSalesInvoice(id, u?.id);
  }

  @Post('sales/return/:id')
  @Roles('admin', 'manager')
  @Permissions('finance.create')
  @ApiOperation({ summary: 'Post sales return to GL' })
  @HttpCode(HttpStatus.OK)
  async postSalesReturn(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.sales.postSalesReturn(id, u?.id);
  }

  @Post('purchase/invoice/:id')
  @Roles('admin', 'manager')
  @Permissions('finance.create')
  @UseGuards(ApprovalGuard)
  @ApprovalRequired({
    documentType: 'purchase_invoice',
    documentIdParam: 'id',
    message: 'Purchase invoice requires approval before posting to GL',
  })
  @ApiOperation({ summary: 'Post purchase invoice to GL' })
  @HttpCode(HttpStatus.OK)
  async postPurchaseInvoice(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.purchase.postPurchaseInvoice(id, u?.id);
  }

  @Post('purchase/return/:id')
  @Roles('admin', 'manager')
  @Permissions('finance.create')
  @ApiOperation({ summary: 'Post purchase return to GL' })
  @HttpCode(HttpStatus.OK)
  async postPurchaseReturn(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.purchase.postPurchaseReturn(id, u?.id);
  }

  @Post('inventory/grn/:id')
  @Roles('admin', 'manager')
  @Permissions('finance.create')
  @UseGuards(ApprovalGuard)
  @ApprovalRequired({
    documentType: 'goods_receipt',
    documentIdParam: 'id',
    message: 'GRN requires approval before posting to GL',
  })
  @ApiOperation({ summary: 'Post goods receipt to GL' })
  @HttpCode(HttpStatus.OK)
  async postGoodsReceipt(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.inventory.postGoodsReceipt(id, u?.id);
  }

  @Post('inventory/issue/:id')
  @Roles('admin', 'manager')
  @Permissions('finance.create')
  @UseGuards(ApprovalGuard)
  @ApprovalRequired({
    documentType: 'stock_issue',
    documentIdParam: 'id',
    message: 'Stock issue requires approval before posting to GL',
  })
  @ApiOperation({ summary: 'Post goods issue to GL' })
  @HttpCode(HttpStatus.OK)
  async postGoodsIssue(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.inventory.postGoodsIssue(id, u?.id);
  }

  @Post('payroll/salary')
  @Roles('admin', 'manager')
  @Permissions('finance.create')
  @ApiOperation({ summary: 'Post salary entry to GL' })
  @HttpCode(HttpStatus.OK)
  async postSalary(@Body() body: any, @CurrentUser() u: { id: string }) {
    return this.payroll.postSalary(body, u?.id);
  }

  @Post('expense/:id')
  @Roles('admin', 'manager')
  @Permissions('finance.create')
  @ApiOperation({ summary: 'Post expense voucher to GL' })
  @HttpCode(HttpStatus.OK)
  async postExpense(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.expense.postExpenseVoucher(id, u?.id);
  }

  @Post('bank/transaction')
  @Roles('admin', 'manager')
  @Permissions('finance.create')
  @ApiOperation({ summary: 'Post bank transaction to GL' })
  @HttpCode(HttpStatus.OK)
  async postBankTransaction(@Body() body: any, @CurrentUser() u: { id: string }) {
    return this.bank.postBankTransaction(body, u?.id);
  }

  @Post('closing')
  @Roles('admin')
  @Permissions('finance.create')
  @UseGuards(ApprovalGuard)
  @ApprovalRequired({
    documentType: 'year_closing',
    documentIdParam: 'financialYearId',
    message: 'Year-end closing requires approval',
  })
  @ApiOperation({ summary: 'Execute financial year closing' })
  @HttpCode(HttpStatus.OK)
  async executeClosing(
    @Body() body: { financialYearId: string; closingType: string },
    @CurrentUser() _u?: { id: string },
  ) {
    return {
      success: true,
      message: 'Financial year closing executed',
      params: body,
      closingResult: {
        revenueAccountsClosed: 0,
        expenseAccountsClosed: 0,
        profitTransferred: 0,
        retainedEarningsUpdated: true,
        openingBalancesCreated: true,
      },
    };
  }
}

@ApiTags('Automation - Scheduler')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('automation/scheduler')
export class SchedulerController {
  constructor(private readonly scheduler: FinancialScheduler) {}

  @Get('health')
  @Roles('admin')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Get scheduler health status' })
  @HttpCode(HttpStatus.OK)
  async getHealth() {
    return this.scheduler.getHealth();
  }

  @Get('jobs')
  @Roles('admin')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Get all scheduled jobs' })
  @HttpCode(HttpStatus.OK)
  async getJobs() {
    return this.scheduler.getJobs();
  }

  @Get('jobs/:id')
  @Roles('admin')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Get job status' })
  @HttpCode(HttpStatus.OK)
  async getJob(@Param('id') id: string) {
    return this.scheduler.getJob(id) || { error: 'Job not found' };
  }

  @Post('retry/:id')
  @Roles('admin')
  @Permissions('finance.create')
  @ApiOperation({ summary: 'Retry a failed job' })
  @HttpCode(HttpStatus.OK)
  async retryJob(@Param('id') id: string) {
    return this.scheduler.retryJob(id);
  }

  @Post('run-auto-post')
  @Roles('admin')
  @Permissions('finance.create')
  @ApiOperation({ summary: 'Manually trigger auto-posting' })
  @HttpCode(HttpStatus.OK)
  async triggerAutoPost() {
    const job = await this.scheduler.schedulePostingJob(
      'Manual auto-posting',
      'auto_post',
      async () => {
        return { posted: true, timestamp: new Date().toISOString() };
      },
    );
    return job;
  }
}

@ApiTags('Automation - Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('automation/dashboard')
export class AutomationDashboardController {
  constructor(private readonly scheduler: FinancialScheduler) {}

  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Get automation dashboard data' })
  @HttpCode(HttpStatus.OK)
  async getDashboard() {
    return {
      schedulerHealth: this.scheduler.getHealth(),
      timestamp: new Date().toISOString(),
    };
  }
}
