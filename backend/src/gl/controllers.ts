import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import {
  CreateGlEntryDto, UpdateGlEntryDto,
  CreatePostingRuleDto, UpdatePostingRuleDto,
  CreateFiscalClosingDto, UpdateFiscalClosingDto,
  TrialBalanceParamsDto, ProfitLossParamsDto,
  BalanceSheetParamsDto, CashFlowParamsDto,
  DayBookParamsDto, AccountStatementParamsDto,
} from './dto';
import {
  GlEntriesService, PostingRulesService, FiscalClosingRecordsService,
  TrialBalanceService, ProfitLossService, BalanceSheetService,
  CashFlowService, DayBookService, AccountStatementService,
  FinancialSnapshotsService,
} from './services';

// ═════════════════════════════════════════════════════════
// GL ENTRIES CRUD
// ═════════════════════════════════════════════════════════
@ApiTags('GL - Entries') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('gl/entries')
export class GlEntriesController {
  constructor(public readonly service: GlEntriesService) {}
  @Post() @Roles('admin','manager','accountant') @Permissions('finance.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateGlEntryDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('finance.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) { return this.service.findAll(Number(p), Number(ps), s); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('finance.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin','manager') @Permissions('finance.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateGlEntryDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('finance.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

// ═════════════════════════════════════════════════════════
// POSTING RULES
// ═════════════════════════════════════════════════════════
@ApiTags('GL - Posting Rules') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('gl/posting-rules')
export class PostingRulesController {
  constructor(public readonly service: PostingRulesService) {}
  @Post() @Roles('admin') @Permissions('finance.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePostingRuleDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('finance.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('finance.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin') @Permissions('finance.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdatePostingRuleDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
  @Delete(':id') @Roles('admin') @Permissions('finance.delete') @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) { return this.service.delete(id, u?.id); }
}

// ═════════════════════════════════════════════════════════
// FISCAL CLOSING
// ═════════════════════════════════════════════════════════
@ApiTags('GL - Fiscal Closing') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('gl/fiscal-closing')
export class FiscalClosingController {
  constructor(public readonly service: FiscalClosingRecordsService) {}
  @Post() @Roles('admin') @Permissions('finance.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateFiscalClosingDto, @CurrentUser() u: {id:string}) { return this.service.create(dto, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('finance.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
  @Get(':id') @Roles('admin','manager','accountant') @Permissions('finance.read') @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Roles('admin') @Permissions('finance.update') @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateFiscalClosingDto, @CurrentUser() u: {id:string}) { return this.service.update(id, dto, u?.id); }
}

// ═════════════════════════════════════════════════════════
// TRIAL BALANCE REPORT
// ═════════════════════════════════════════════════════════
@ApiTags('GL - Reports') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('gl/reports')
export class ReportsController {
  constructor(
    private readonly trialBalance: TrialBalanceService,
    private readonly profitLoss: ProfitLossService,
    private readonly balanceSheet: BalanceSheetService,
    private readonly cashFlow: CashFlowService,
    private readonly dayBook: DayBookService,
    private readonly accountStatement: AccountStatementService,
  ) {}

  @Get('trial-balance') @Roles('admin','manager','accountant') @Permissions('finance.read') @HttpCode(HttpStatus.OK)
  async trialBalanceReport(@Query() params: TrialBalanceParamsDto) { return this.trialBalance.generate(params); }

  @Get('profit-loss') @Roles('admin','manager','accountant') @Permissions('finance.read') @HttpCode(HttpStatus.OK)
  async profitLossReport(@Query() params: ProfitLossParamsDto) { return this.profitLoss.generate(params); }

  @Get('balance-sheet') @Roles('admin','manager','accountant') @Permissions('finance.read') @HttpCode(HttpStatus.OK)
  async balanceSheetReport(@Query() params: BalanceSheetParamsDto) { return this.balanceSheet.generate(params); }

  @Get('cash-flow') @Roles('admin','manager','accountant') @Permissions('finance.read') @HttpCode(HttpStatus.OK)
  async cashFlowReport(@Query() params: CashFlowParamsDto) { return this.cashFlow.generate(params); }

  @Get('day-book') @Roles('admin','manager','accountant') @Permissions('finance.read') @HttpCode(HttpStatus.OK)
  async dayBookReport(@Query() params: DayBookParamsDto) { return this.dayBook.generate(params); }

  @Get('account-statement') @Roles('admin','manager','accountant') @Permissions('finance.read') @HttpCode(HttpStatus.OK)
  async accountStatementReport(@Query() params: AccountStatementParamsDto) { return this.accountStatement.generate(params); }
}

// ═════════════════════════════════════════════════════════
// FINANCIAL SNAPSHOTS
// ═════════════════════════════════════════════════════════
@ApiTags('GL - Snapshots') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard) @Controller('gl/snapshots')
export class FinancialSnapshotsController {
  constructor(public readonly service: FinancialSnapshotsService) {}
  @Post() @Roles('admin','manager','accountant') @Permissions('finance.create') @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @CurrentUser() u: {id:string}) { return this.service.create(body, u?.id); }
  @Get() @Roles('admin','manager','accountant') @Permissions('finance.read') @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p=1, @Query('ps') ps=50) { return this.service.findAll(Number(p), Number(ps)); }
}
