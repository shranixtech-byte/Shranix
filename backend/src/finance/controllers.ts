import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { WorkflowDocument } from '../common/decorators/workflow-document.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import {
  CreateAccountGroupDto,
  UpdateAccountGroupDto,
  CreateChartOfAccountDto,
  UpdateChartOfAccountDto,
  CreateLedgerMasterDto,
  UpdateLedgerMasterDto,
  CreateJournalEntryDto,
  UpdateJournalEntryDto,
  CreateCashBookDto,
  UpdateCashBookDto,
  CreateBankBookDto,
  UpdateBankBookDto,
  CreateCostCenterDto,
  UpdateCostCenterDto,
  CreateAccountingSettingsDto,
  UpdateAccountingSettingsDto,
  SetSettingsPasswordDto,
  VerifySettingsPasswordDto,
  ChangeSettingsPasswordDto,
} from './dto';
import {
  AccountGroupsService,
  ChartOfAccountsService,
  LedgerMasterService,
  JournalEntriesService,
  CashBookService,
  BankBookService,
  CostCentersService,
  AccountingSettingsService,
  SettingsSecurityService,
} from './services';

@ApiTags('Finance - Account Groups')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('finance/account-groups')
export class AccountGroupsController {
  constructor(public readonly service: AccountGroupsService) {}
  @Post()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAccountGroupDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.findAll(Number(p), Number(ps), s);
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('finance.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountGroupDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('finance.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}

@ApiTags('Finance - Chart of Accounts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('finance/chart-of-accounts')
export class ChartOfAccountsController {
  constructor(public readonly service: ChartOfAccountsService) {}
  @Post()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateChartOfAccountDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.findAll(Number(p), Number(ps), s);
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('finance.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChartOfAccountDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('finance.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}

@ApiTags('Finance - Ledger Master')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('finance/ledgers')
export class LedgerMasterController {
  constructor(public readonly service: LedgerMasterService) {}
  @Post()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateLedgerMasterDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.findAll(Number(p), Number(ps), s);
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('finance.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLedgerMasterDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('finance.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}

@ApiTags('Finance - Journal Entries')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('finance/journal-entries')
export class JournalEntriesController {
  constructor(public readonly service: JournalEntriesService) {}
  @Post()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.create')
  @HttpCode(HttpStatus.CREATED)
  @WorkflowDocument({
    module: 'finance',
    documentType: 'journal_entry',
    templateCode: 'finance-journal-entry',
    templateName: 'Journal Entry Workflow',
    amountField: 'totalAmount',
    numberField: 'voucherNumber',
  })
  async create(@Body() dto: CreateJournalEntryDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.findAll(Number(p), Number(ps), s);
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('finance.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateJournalEntryDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('finance.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}

@ApiTags('Finance - Cash Book')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('finance/cash-book')
export class CashBookController {
  constructor(public readonly service: CashBookService) {}
  @Post()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCashBookDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.findAll(Number(p), Number(ps), s);
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('finance.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCashBookDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('finance.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}

@ApiTags('Finance - Bank Book')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('finance/bank-book')
export class BankBookController {
  constructor(public readonly service: BankBookService) {}
  @Post()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBankBookDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.findAll(Number(p), Number(ps), s);
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('finance.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBankBookDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('finance.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}

@ApiTags('Finance - Cost Centers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('finance/cost-centers')
export class CostCentersController {
  constructor(public readonly service: CostCentersService) {}
  @Post()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCostCenterDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') p = 1, @Query('ps') ps = 50, @Query('search') s?: string) {
    return this.service.findAll(Number(p), Number(ps), s);
  }
  @Get(':id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('finance.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCostCenterDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.update(id, dto, u?.id);
  }
  @Delete(':id')
  @Roles('admin')
  @Permissions('finance.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}

@ApiTags('Finance - Settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('finance/settings')
export class AccountingSettingsController {
  constructor(public readonly service: AccountingSettingsService) {}
  @Post()
  @Roles('admin')
  @Permissions('finance.create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAccountingSettingsDto, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }
  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('finance.read')
  @HttpCode(HttpStatus.OK)
  async getSettings() {
    const r = await this.service.findAll(1, 1);
    return r.data[0] || {};
  }
  @Put()
  @Roles('admin')
  @Permissions('finance.update')
  @HttpCode(HttpStatus.OK)
  async update(@Body() dto: UpdateAccountingSettingsDto, @CurrentUser() u: { id: string }) {
    const r = await this.service.findAll(1, 1);
    return r.data.length > 0
      ? this.service.update(r.data[0].id as string, dto, u?.id)
      : this.service.create(dto, u?.id);
  }
}

// Settings page ko kholne ke liye password gate (admin dropdown → Settings → seedha form).
// status/verify kisi bhi authenticated user ke liye — page kholne ke liye password hi maangta hai.
@ApiTags('Finance - Settings Security')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('finance/settings/security')
export class SettingsSecurityController {
  constructor(private readonly security: SettingsSecurityService) {}
  @Get('status')
  @HttpCode(HttpStatus.OK)
  async status() {
    return { configured: await this.security.isConfigured() };
  }
  @Post('set')
  @Roles('admin')
  @Permissions('finance.update')
  @HttpCode(HttpStatus.OK)
  async set(@Body() dto: SetSettingsPasswordDto) {
    await this.security.setPassword(dto.password);
    return { configured: true };
  }
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() dto: VerifySettingsPasswordDto) {
    return { valid: await this.security.verifyPassword(dto.password) };
  }
  @Post('change')
  @Roles('admin')
  @Permissions('finance.update')
  @HttpCode(HttpStatus.OK)
  async change(@Body() dto: ChangeSettingsPasswordDto) {
    await this.security.changePassword(dto.currentPassword, dto.newPassword);
    return { message: 'Settings password updated' };
  }
}
