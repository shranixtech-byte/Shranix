import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
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

import { ApplyAdvanceDto, CollectPaymentDto } from './dto';
import { SalesPaymentCollectionService } from './payment-collection.service';

@ApiTags('Sales - Payment Collection')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('sales/payments')
export class SalesPaymentCollectionController {
  constructor(private readonly service: SalesPaymentCollectionService) {}

  @Get('dashboard')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Payment collection dashboard — outstanding, overdue, advance, today' })
  @ApiResponse({ status: 200, description: 'Dashboard summary + recent payments' })
  async getDashboard() {
    return this.service.getDashboard();
  }

  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List payments with filters (customer, mode, date range)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: ['cash', 'upi', 'bank', 'cheque', 'advance', 'all'],
  })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'search', required: false, type: String })
  async list(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('customerId') customerId?: string,
    @Query('mode') mode?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listPayments({
      page: Number(page),
      pageSize: Number(pageSize),
      customerId,
      mode,
      from,
      to,
      search,
    });
  }

  @Get('invoice/:invoiceId')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Payments history for a single invoice' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  async getInvoicePayments(@Param('invoiceId') invoiceId: string) {
    return this.service.getInvoicePayments(invoiceId);
  }

  @Get('customer/:customerId')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer collection summary — due invoices, advance balance, history' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  async getCustomerSummary(@Param('customerId') customerId: string) {
    return this.service.getCustomerSummary(customerId);
  }

  @Post('collect')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Collect payment — cash/UPI/bank/cheque. Allocates to invoices oldest-first; excess becomes advance',
  })
  @ApiBody({ type: CollectPaymentDto })
  async collect(@Body() dto: CollectPaymentDto, @CurrentUser() u: { id: string }) {
    return this.service.collect(dto as any, u?.id);
  }

  @Post('apply-advance')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply customer advance balance to selected invoices' })
  @ApiBody({ type: ApplyAdvanceDto })
  async applyAdvance(@Body() dto: ApplyAdvanceDto, @CurrentUser() u: { id: string }) {
    return this.service.applyAdvance(dto as any, u?.id);
  }
}
