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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DatabaseService } from '../database/database.service';

import { SalesReturnEngineService } from './return-engine.service';

@ApiTags('Sales - Returns Engine')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('sales/returns/engine')
export class SalesReturnEngineController {
  constructor(
    private readonly engine: SalesReturnEngineService,
    private readonly database: DatabaseService,
  ) {}

  // ═════════════════════════════════════════════════════════
  // RETURN REASONS
  // ═════════════════════════════════════════════════════════
  @Get('reasons')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get list of return reasons' })
  getReasons() {
    return this.engine.getReturnReasons();
  }

  // ═════════════════════════════════════════════════════════
  // VALIDATE RETURN
  // ═════════════════════════════════════════════════════════
  @Post('validate')
  @Roles('admin', 'manager')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate return items against invoice' })
  @ApiBody({ description: 'Validation payload with invoiceId and items', required: true })
  async validate(
    @Body() dto: { invoiceId: string; items: any[] },
    @CurrentUser() _u: { id: string; name?: string },
  ) {
    const invoice = await this.database.salesInvoices.findById(dto.invoiceId);
    return this.engine.validateReturn(dto.items, invoice);
  }

  // ═════════════════════════════════════════════════════════
  // CREATE RETURN
  // ═════════════════════════════════════════════════════════
  @Post()
  @Roles('admin', 'manager')
  @Permissions('sales.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new sales return with items and auto credit note' })
  @ApiBody({ description: 'Return creation payload', required: true })
  @ApiResponse({ status: 201, description: 'Return created with auto-generated credit note' })
  async createReturn(@Body() dto: any, @CurrentUser() u: { id: string }) {
    return this.engine.createReturn({ ...dto, createdBy: u.id });
  }

  // ═════════════════════════════════════════════════════════
  // POST RETURN
  // ═════════════════════════════════════════════════════════
  @Post(':id/post')
  @Roles('admin', 'manager')
  @Permissions('sales.create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Post a return — applies inventory reversal + accounting reversal' })
  @ApiParam({ name: 'id', description: 'Return ID' })
  async postReturn(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.engine.postReturn(id, u.id);
  }

  // ═════════════════════════════════════════════════════════
  // CREDIT NOTES
  // ═════════════════════════════════════════════════════════
  @Post('credit-notes')
  @Roles('admin', 'manager')
  @Permissions('sales.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a credit note manually' })
  async createCreditNote(@Body() dto: any, @CurrentUser() u: { id: string }) {
    return this.engine.createCreditNote({ ...dto, createdBy: u.id });
  }

  @Get('credit-notes')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all credit notes' })
  async getAllCreditNotes() {
    return this.engine.findAllCreditNotes();
  }

  @Post('credit-notes/:id/post')
  @Roles('admin', 'manager')
  @Permissions('sales.create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Post a credit note' })
  async postCreditNote(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.engine.postCreditNote(id, u.id);
  }

  // ═════════════════════════════════════════════════════════
  // DEBIT NOTES
  // ═════════════════════════════════════════════════════════
  @Post('debit-notes')
  @Roles('admin', 'manager')
  @Permissions('sales.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a debit note' })
  async createDebitNote(@Body() dto: any, @CurrentUser() u: { id: string }) {
    return this.engine.createDebitNote({ ...dto, createdBy: u.id });
  }

  @Get('debit-notes')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all debit notes' })
  async getAllDebitNotes() {
    return this.engine.findAllDebitNotes();
  }

  @Post('debit-notes/:id/post')
  @Roles('admin', 'manager')
  @Permissions('sales.create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Post a debit note' })
  async postDebitNote(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.engine.postDebitNote(id, u.id);
  }

  // ═════════════════════════════════════════════════════════
  // REPORTS
  // ═════════════════════════════════════════════════════════
  @Get('reports/register')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sales return register' })
  async getReturnRegister(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.engine.getReturnRegister({
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      status,
    });
  }

  @Get('reports/summary')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return summary dashboard' })
  async getReturnSummary() {
    return this.engine.getReturnSummary();
  }

  @Get('reports/reason-analysis')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return reason analysis' })
  async getReasonAnalysis() {
    return this.engine.getReasonAnalysis();
  }

  @Get('reports/credit-note-register')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Credit note register' })
  async getCreditNoteRegister() {
    return this.engine.getCreditNoteRegister();
  }

  @Get('reports/debit-note-register')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Debit note register' })
  async getDebitNoteRegister() {
    return this.engine.getDebitNoteRegister();
  }

  @Get('reports/customer/:customerId')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer-specific return report' })
  async getCustomerReturnReport(@Param('customerId') customerId: string) {
    return this.engine.getCustomerReturnReport(customerId);
  }
}
