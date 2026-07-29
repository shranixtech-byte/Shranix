import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { Permissions } from '../common/decorators/permissions.decorator';
import { WorkflowDocument } from '../common/decorators/workflow-document.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';


import {
  CreateGstRegistrationDto, UpdateGstRegistrationDto,
  CreateGstLedgerDto, UpdateGstLedgerDto,
  CreateGstReturnDto, UpdateGstReturnDto,
  CreateTaxPostingDto, UpdateTaxPostingDto,
  CreateYearClosingDto, UpdateYearClosingDto,
  CreatePeriodLockDto, UpdatePeriodLockDto,
  CreateOpeningBalanceTransferDto, UpdateOpeningBalanceTransferDto,
  CreateYearEndEntryDto, UpdateYearEndEntryDto,
  CreateAuditDetailDto, UpdateAuditDetailDto,
  CreateNumberSeriesDto, UpdateNumberSeriesDto,
  CreateVoucherApprovalDto, UpdateVoucherApprovalDto,
  CreateFinanceAnalyticsDto, UpdateFinanceAnalyticsDto,
  CreateGstAuditSettingDto, UpdateGstAuditSettingDto,
} from './dto';
import {
  GstRegistrationsService,
  GstLedgerService,
  GstReturnsService,
  TaxPostingsService,
  YearClosingRecordsService,
  PeriodLocksService,
  OpeningBalanceTransfersService,
  YearEndEntriesService,
  AuditDetailsService,
  NumberSeriesService,
  VoucherApprovalsService,
  FinanceAnalyticsService,
  GstAuditSettingsService,
  GstSummaryService,
  GstRegisterService,
  TaxLedgerService,
  AuditReportService,
  YearClosingReportService,
  FinancialSummaryService,
  TaxPostingEngineService,
  FinancialClosingEngineService,
} from './services';

// ═══════════════════════════════════════════════════════════════════
// GST REGISTRATIONS
// ═══════════════════════════════════════════════════════════════════
@ApiTags('GST Registrations')
@ApiBearerAuth()
@Controller('gst/registrations')
@UseGuards(PermissionsGuard)
export class GstRegistrationsController {
  constructor(private readonly service: GstRegistrationsService) {}

  @Post() @Permissions('finance.create')
  @ApiOperation({ summary: 'Create GST Registration' })
  create(@Body() dto: CreateGstRegistrationDto) { return this.service.create(dto as any); }

  @Get() @Permissions('finance.read')
  @ApiOperation({ summary: 'List GST Registrations' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false }) @ApiQuery({ name: 'sortOrder', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.service.findAll(page, limit, search);
  }

  @Get(':id') @Permissions('finance.read')
  @ApiOperation({ summary: 'Get GST Registration by ID' })
  findOne(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('finance.update')
  @ApiOperation({ summary: 'Update GST Registration' })
  update(@Param('id') id: string, @Body() dto: UpdateGstRegistrationDto) { return this.service.update(id, dto as any); }

  @Delete(':id') @Permissions('finance.delete')
  @ApiOperation({ summary: 'Soft delete GST Registration' })
  remove(@Param('id') id: string) { return this.service.delete(id); }
}

// ═══════════════════════════════════════════════════════════════════
// GST LEDGER
// ═══════════════════════════════════════════════════════════════════
@ApiTags('GST Ledger')
@ApiBearerAuth()
@Controller('gst/ledger')
@UseGuards(PermissionsGuard)
export class GstLedgerController {
  constructor(private readonly service: GstLedgerService) {}

  @Post() @Permissions('finance.create')
  @ApiOperation({ summary: 'Create GST Ledger entry' })
  create(@Body() dto: CreateGstLedgerDto) { return this.service.create(dto as any); }

  @Get() @Permissions('finance.read')
  @ApiOperation({ summary: 'List GST Ledger entries' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false }) @ApiQuery({ name: 'sortOrder', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.service.findAll(page, limit, search);
  }

  @Get(':id') @Permissions('finance.read')
  @ApiOperation({ summary: 'Get GST Ledger entry by ID' })
  findOne(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('finance.update')
  @ApiOperation({ summary: 'Update GST Ledger entry' })
  update(@Param('id') id: string, @Body() dto: UpdateGstLedgerDto) { return this.service.update(id, dto as any); }

  @Delete(':id') @Permissions('finance.delete')
  @ApiOperation({ summary: 'Soft delete GST Ledger entry' })
  remove(@Param('id') id: string) { return this.service.delete(id); }
}

// ═══════════════════════════════════════════════════════════════════
// GST RETURNS
// ═══════════════════════════════════════════════════════════════════
@ApiTags('GST Returns')
@ApiBearerAuth()
@Controller('gst/returns')
@UseGuards(PermissionsGuard)
export class GstReturnsController {
  constructor(private readonly service: GstReturnsService) {}

  @Post() @Permissions('finance.create')
  @ApiOperation({ summary: 'Create GST Return' })
  @WorkflowDocument({ module:'gst', documentType:'gst_return', templateCode:'gst-return', templateName:'GST Return Workflow', amountField:'totalTax' })
  create(@Body() dto: CreateGstReturnDto) { return this.service.create(dto as any); }

  @Get() @Permissions('finance.read')
  @ApiOperation({ summary: 'List GST Returns' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false }) @ApiQuery({ name: 'sortOrder', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.service.findAll(page, limit, search);
  }

  @Get(':id') @Permissions('finance.read')
  @ApiOperation({ summary: 'Get GST Return by ID' })
  findOne(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('finance.update')
  @ApiOperation({ summary: 'Update GST Return' })
  update(@Param('id') id: string, @Body() dto: UpdateGstReturnDto) { return this.service.update(id, dto as any); }

  @Delete(':id') @Permissions('finance.delete')
  @ApiOperation({ summary: 'Soft delete GST Return' })
  remove(@Param('id') id: string) { return this.service.delete(id); }
}

// ═══════════════════════════════════════════════════════════════════
// TAX POSTINGS
// ═══════════════════════════════════════════════════════════════════
@ApiTags('Tax Postings')
@ApiBearerAuth()
@Controller('gst/tax-postings')
@UseGuards(PermissionsGuard)
export class TaxPostingsController {
  constructor(private readonly service: TaxPostingsService) {}

  @Post() @Permissions('finance.create')
  @ApiOperation({ summary: 'Create Tax Posting' })
  create(@Body() dto: CreateTaxPostingDto) { return this.service.create(dto as any); }

  @Get() @Permissions('finance.read')
  @ApiOperation({ summary: 'List Tax Postings' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false }) @ApiQuery({ name: 'sortOrder', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.service.findAll(page, limit, search);
  }

  @Get(':id') @Permissions('finance.read')
  @ApiOperation({ summary: 'Get Tax Posting by ID' })
  findOne(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('finance.update')
  @ApiOperation({ summary: 'Update Tax Posting' })
  update(@Param('id') id: string, @Body() dto: UpdateTaxPostingDto) { return this.service.update(id, dto as any); }

  @Delete(':id') @Permissions('finance.delete')
  @ApiOperation({ summary: 'Soft delete Tax Posting' })
  remove(@Param('id') id: string) { return this.service.delete(id); }
}

// ═══════════════════════════════════════════════════════════════════
// YEAR CLOSING RECORDS
// ═══════════════════════════════════════════════════════════════════
@ApiTags('Year Closing')
@ApiBearerAuth()
@Controller('gst/year-closing')
@UseGuards(PermissionsGuard)
export class YearClosingController {
  constructor(private readonly service: YearClosingRecordsService) {}

  @Post() @Permissions('finance.create')
  @ApiOperation({ summary: 'Create Year Closing record' })
  create(@Body() dto: CreateYearClosingDto) { return this.service.create(dto as any); }

  @Get() @Permissions('finance.read')
  @ApiOperation({ summary: 'List Year Closing records' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false }) @ApiQuery({ name: 'sortOrder', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.service.findAll(page, limit, search);
  }

  @Get(':id') @Permissions('finance.read')
  @ApiOperation({ summary: 'Get Year Closing record by ID' })
  findOne(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('finance.update')
  @ApiOperation({ summary: 'Update Year Closing record' })
  update(@Param('id') id: string, @Body() dto: UpdateYearClosingDto) { return this.service.update(id, dto as any); }

  @Delete(':id') @Permissions('finance.delete')
  @ApiOperation({ summary: 'Soft delete Year Closing record' })
  remove(@Param('id') id: string) { return this.service.delete(id); }
}

// ═══════════════════════════════════════════════════════════════════
// PERIOD LOCKS
// ═══════════════════════════════════════════════════════════════════
@ApiTags('Period Locks')
@ApiBearerAuth()
@Controller('gst/period-locks')
@UseGuards(PermissionsGuard)
export class PeriodLocksController {
  constructor(private readonly service: PeriodLocksService) {}

  @Post() @Permissions('finance.create')
  @ApiOperation({ summary: 'Create Period Lock' })
  create(@Body() dto: CreatePeriodLockDto) { return this.service.create(dto as any); }

  @Get() @Permissions('finance.read')
  @ApiOperation({ summary: 'List Period Locks' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false }) @ApiQuery({ name: 'sortOrder', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.service.findAll(page, limit, search);
  }

  @Get(':id') @Permissions('finance.read')
  @ApiOperation({ summary: 'Get Period Lock by ID' })
  findOne(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('finance.update')
  @ApiOperation({ summary: 'Update Period Lock' })
  update(@Param('id') id: string, @Body() dto: UpdatePeriodLockDto) { return this.service.update(id, dto as any); }

  @Delete(':id') @Permissions('finance.delete')
  @ApiOperation({ summary: 'Soft delete Period Lock' })
  remove(@Param('id') id: string) { return this.service.delete(id); }
}

// ═══════════════════════════════════════════════════════════════════
// OPENING BALANCE TRANSFERS
// ═══════════════════════════════════════════════════════════════════
@ApiTags('Opening Balance Transfers')
@ApiBearerAuth()
@Controller('gst/opening-balance-transfers')
@UseGuards(PermissionsGuard)
export class OpeningBalanceTransfersController {
  constructor(private readonly service: OpeningBalanceTransfersService) {}

  @Post() @Permissions('finance.create')
  @ApiOperation({ summary: 'Create Opening Balance Transfer' })
  create(@Body() dto: CreateOpeningBalanceTransferDto) { return this.service.create(dto as any); }

  @Get() @Permissions('finance.read')
  @ApiOperation({ summary: 'List Opening Balance Transfers' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false }) @ApiQuery({ name: 'sortOrder', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.service.findAll(page, limit, search);
  }

  @Get(':id') @Permissions('finance.read')
  @ApiOperation({ summary: 'Get Opening Balance Transfer by ID' })
  findOne(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('finance.update')
  @ApiOperation({ summary: 'Update Opening Balance Transfer' })
  update(@Param('id') id: string, @Body() dto: UpdateOpeningBalanceTransferDto) { return this.service.update(id, dto as any); }

  @Delete(':id') @Permissions('finance.delete')
  @ApiOperation({ summary: 'Soft delete Opening Balance Transfer' })
  remove(@Param('id') id: string) { return this.service.delete(id); }
}

// ═══════════════════════════════════════════════════════════════════
// YEAR-END ENTRIES
// ═══════════════════════════════════════════════════════════════════
@ApiTags('Year-End Entries')
@ApiBearerAuth()
@Controller('gst/year-end-entries')
@UseGuards(PermissionsGuard)
export class YearEndEntriesController {
  constructor(private readonly service: YearEndEntriesService) {}

  @Post() @Permissions('finance.create')
  @ApiOperation({ summary: 'Create Year-End Entry' })
  create(@Body() dto: CreateYearEndEntryDto) { return this.service.create(dto as any); }

  @Get() @Permissions('finance.read')
  @ApiOperation({ summary: 'List Year-End Entries' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false }) @ApiQuery({ name: 'sortOrder', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.service.findAll(page, limit, search);
  }

  @Get(':id') @Permissions('finance.read')
  @ApiOperation({ summary: 'Get Year-End Entry by ID' })
  findOne(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('finance.update')
  @ApiOperation({ summary: 'Update Year-End Entry' })
  update(@Param('id') id: string, @Body() dto: UpdateYearEndEntryDto) { return this.service.update(id, dto as any); }

  @Delete(':id') @Permissions('finance.delete')
  @ApiOperation({ summary: 'Soft delete Year-End Entry' })
  remove(@Param('id') id: string) { return this.service.delete(id); }
}

// ═══════════════════════════════════════════════════════════════════
// AUDIT DETAILS
// ═══════════════════════════════════════════════════════════════════
@ApiTags('Audit Details')
@ApiBearerAuth()
@Controller('gst/audit-details')
@UseGuards(PermissionsGuard)
export class AuditDetailsController {
  constructor(private readonly service: AuditDetailsService) {}

  @Post() @Permissions('finance.create')
  @ApiOperation({ summary: 'Create Audit Detail entry' })
  create(@Body() dto: CreateAuditDetailDto) { return this.service.create(dto as any); }

  @Get() @Permissions('finance.read')
  @ApiOperation({ summary: 'List Audit Details' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false }) @ApiQuery({ name: 'sortOrder', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.service.findAll(page, limit, search);
  }

  @Get(':id') @Permissions('finance.read')
  @ApiOperation({ summary: 'Get Audit Detail by ID' })
  findOne(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('finance.update')
  @ApiOperation({ summary: 'Update Audit Detail' })
  update(@Param('id') id: string, @Body() dto: UpdateAuditDetailDto) { return this.service.update(id, dto as any); }

  @Delete(':id') @Permissions('finance.delete')
  @ApiOperation({ summary: 'Soft delete Audit Detail' })
  remove(@Param('id') id: string) { return this.service.delete(id); }
}

// ═══════════════════════════════════════════════════════════════════
// NUMBER SERIES
// ═══════════════════════════════════════════════════════════════════
@ApiTags('Number Series')
@ApiBearerAuth()
@Controller('gst/number-series')
@UseGuards(PermissionsGuard)
export class NumberSeriesController {
  constructor(private readonly service: NumberSeriesService) {}

  @Post() @Permissions('finance.create')
  @ApiOperation({ summary: 'Create Number Series' })
  create(@Body() dto: CreateNumberSeriesDto) { return this.service.create(dto as any); }

  @Get() @Permissions('finance.read')
  @ApiOperation({ summary: 'List Number Series' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false }) @ApiQuery({ name: 'sortOrder', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.service.findAll(page, limit, search);
  }

  @Get(':id') @Permissions('finance.read')
  @ApiOperation({ summary: 'Get Number Series by ID' })
  findOne(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('finance.update')
  @ApiOperation({ summary: 'Update Number Series' })
  update(@Param('id') id: string, @Body() dto: UpdateNumberSeriesDto) { return this.service.update(id, dto as any); }

  @Delete(':id') @Permissions('finance.delete')
  @ApiOperation({ summary: 'Soft delete Number Series' })
  remove(@Param('id') id: string) { return this.service.delete(id); }
}

// ═══════════════════════════════════════════════════════════════════
// VOUCHER APPROVALS
// ═══════════════════════════════════════════════════════════════════
@ApiTags('Voucher Approvals')
@ApiBearerAuth()
@Controller('gst/voucher-approvals')
@UseGuards(PermissionsGuard)
export class VoucherApprovalsController {
  constructor(private readonly service: VoucherApprovalsService) {}

  @Post() @Permissions('finance.create')
  @ApiOperation({ summary: 'Create Voucher Approval' })
  create(@Body() dto: CreateVoucherApprovalDto) { return this.service.create(dto as any); }

  @Get() @Permissions('finance.read')
  @ApiOperation({ summary: 'List Voucher Approvals' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false }) @ApiQuery({ name: 'sortOrder', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.service.findAll(page, limit, search);
  }

  @Get(':id') @Permissions('finance.read')
  @ApiOperation({ summary: 'Get Voucher Approval by ID' })
  findOne(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('finance.update')
  @ApiOperation({ summary: 'Update Voucher Approval' })
  update(@Param('id') id: string, @Body() dto: UpdateVoucherApprovalDto) { return this.service.update(id, dto as any); }

  @Delete(':id') @Permissions('finance.delete')
  @ApiOperation({ summary: 'Soft delete Voucher Approval' })
  remove(@Param('id') id: string) { return this.service.delete(id); }
}

// ═══════════════════════════════════════════════════════════════════
// FINANCE ANALYTICS
// ═══════════════════════════════════════════════════════════════════
@ApiTags('Finance Analytics')
@ApiBearerAuth()
@Controller('gst/finance-analytics')
@UseGuards(PermissionsGuard)
export class FinanceAnalyticsController {
  constructor(private readonly service: FinanceAnalyticsService) {}

  @Post() @Permissions('finance.create')
  @ApiOperation({ summary: 'Create Finance Analytics entry' })
  create(@Body() dto: CreateFinanceAnalyticsDto) { return this.service.create(dto as any); }

  @Get() @Permissions('finance.read')
  @ApiOperation({ summary: 'List Finance Analytics' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false }) @ApiQuery({ name: 'sortOrder', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.service.findAll(page, limit, search);
  }

  @Get(':id') @Permissions('finance.read')
  @ApiOperation({ summary: 'Get Finance Analytics by ID' })
  findOne(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('finance.update')
  @ApiOperation({ summary: 'Update Finance Analytics' })
  update(@Param('id') id: string, @Body() dto: UpdateFinanceAnalyticsDto) { return this.service.update(id, dto as any); }

  @Delete(':id') @Permissions('finance.delete')
  @ApiOperation({ summary: 'Soft delete Finance Analytics' })
  remove(@Param('id') id: string) { return this.service.delete(id); }
}

// ═══════════════════════════════════════════════════════════════════
// GST/AUDIT SETTINGS
// ═══════════════════════════════════════════════════════════════════
@ApiTags('GST/Audit Settings')
@ApiBearerAuth()
@Controller('gst/settings')
@UseGuards(PermissionsGuard)
export class GstAuditSettingsController {
  constructor(private readonly service: GstAuditSettingsService) {}

  @Post() @Permissions('finance.create')
  @ApiOperation({ summary: 'Create Setting' })
  create(@Body() dto: CreateGstAuditSettingDto) { return this.service.create(dto as any); }

  @Get() @Permissions('finance.read')
  @ApiOperation({ summary: 'List Settings' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false }) @ApiQuery({ name: 'sortOrder', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.service.findAll(page, limit, search);
  }

  @Get(':id') @Permissions('finance.read')
  @ApiOperation({ summary: 'Get Setting by ID' })
  findOne(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('finance.update')
  @ApiOperation({ summary: 'Update Setting' })
  update(@Param('id') id: string, @Body() dto: UpdateGstAuditSettingDto) { return this.service.update(id, dto as any); }

  @Delete(':id') @Permissions('finance.delete')
  @ApiOperation({ summary: 'Soft delete Setting' })
  remove(@Param('id') id: string) { return this.service.delete(id); }
}

// ═══════════════════════════════════════════════════════════════════
// REPORT CONTROLLERS
// ═══════════════════════════════════════════════════════════════════

@ApiTags('GST Reports')
@ApiBearerAuth()
@Controller('gst/reports')
@UseGuards(PermissionsGuard)
export class GstReportsController {
  constructor(
    private readonly gstSummary: GstSummaryService,
    private readonly gstRegister: GstRegisterService,
    private readonly taxLedger: TaxLedgerService,
    private readonly auditReport: AuditReportService,
    private readonly yearClosingReport: YearClosingReportService,
    private readonly financialSummary: FinancialSummaryService,
  ) {}

  @Get('gst-summary') @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate GST Summary' })
  getGstSummary(@Query() params: any) { return this.gstSummary.generate(params); }

  @Get('gst-register') @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate GST Register' })
  getGstRegister(@Query() params: any) { return this.gstRegister.generate(params); }

  @Get('tax-ledger') @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate Tax Ledger' })
  getTaxLedger(@Query() params: any) { return this.taxLedger.generate(params); }

  @Get('audit-report') @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate Audit Report' })
  getAuditReport(@Query() params: any) { return this.auditReport.generate(params); }

  @Get('year-closing-report') @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate Year Closing Report' })
  getYearClosingReport(@Query() params: any) { return this.yearClosingReport.generate(params); }

  @Get('financial-summary') @Permissions('finance.read')
  @ApiOperation({ summary: 'Generate Financial Summary' })
  getFinancialSummary(@Query() params: any) { return this.financialSummary.generate(params); }
}

// ═══════════════════════════════════════════════════════════════════
// ENGINE CONTROLLERS
// ═══════════════════════════════════════════════════════════════════

@ApiTags('GST Engine')
@ApiBearerAuth()
@Controller('gst/engine')
@UseGuards(PermissionsGuard)
export class GstEngineController {
  constructor(
    private readonly taxPostingEngine: TaxPostingEngineService,
    private readonly financialClosingEngine: FinancialClosingEngineService,
  ) {}

  @Post('auto-post') @Permissions('finance.create')
  @ApiOperation({ summary: 'Auto-post tax entries' })
  autoPost(@Body() params: any) { return this.taxPostingEngine.autoPost(params); }

  @Post('close-year') @Permissions('finance.create')
  @ApiOperation({ summary: 'Execute financial year closing' })
  closeYear(@Body() params: any) { return this.financialClosingEngine.closeYear(params); }
}
