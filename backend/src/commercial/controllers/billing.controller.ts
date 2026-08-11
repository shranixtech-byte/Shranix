import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BillingPaymentsService } from '../services/billing-payments.service';
import { BillingService } from '../services/billing.service';

@ApiTags('Billing')
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly payments: BillingPaymentsService,
  ) {}

  // ── Invoices ───────────────────────────────────────────
  @Get('invoices')
  @Permissions('commercial.billing')
  @ApiOperation({ summary: 'List billing invoices' })
  async getInvoices(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('subscriptionId') subscriptionId?: string,
  ) {
    return this.billing.getInvoices({
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      customerId,
      subscriptionId,
    });
  }

  @Get('invoices/:id')
  @Permissions('commercial.billing')
  @ApiOperation({ summary: 'Get billing invoice' })
  async getInvoice(@Param('id') id: string) {
    return this.billing.getInvoiceById(id);
  }

  @Post('invoices/:id/cancel')
  @Permissions('commercial.billing')
  @ApiOperation({ summary: 'Cancel unpaid billing invoice' })
  async cancelInvoice(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.billing.cancelInvoice(id, { reason: body?.reason, userId });
  }

  // ── Payments ───────────────────────────────────────────
  @Get('payments')
  @Permissions('commercial.billing')
  @ApiOperation({ summary: 'List billing payments' })
  async getPayments(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('subscriptionId') subscriptionId?: string,
  ) {
    return this.payments.getPayments({
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      customerId,
      subscriptionId,
    });
  }

  @Get('payments/:id')
  @Permissions('commercial.billing')
  @ApiOperation({ summary: 'Get billing payment' })
  async getPayment(@Param('id') id: string) {
    return this.payments.getPaymentById(id);
  }

  @Post('payments/create')
  @Permissions('commercial.billing')
  @ApiOperation({ summary: 'Initiate payment (amount resolved server-side)' })
  async createPayment(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.payments.create({ ...body, userId });
  }

  @Post('payments/:id/verify')
  @Permissions('commercial.billing')
  @ApiOperation({ summary: 'Server-side payment verification' })
  async verifyPayment(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.payments.verify(id, { ...body, userId });
  }

  @Post('payments/:id/refund')
  @Permissions('commercial.billing')
  @ApiOperation({ summary: 'Refund a successful payment' })
  async refund(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.payments.refund(id, { ...body, userId });
  }

  // ── Webhook (no JWT — authenticated by signature) ──────
  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Payment gateway webhook (signature-authenticated)' })
  async webhook(@Body() body: any) {
    return this.payments.webhook(body);
  }
}
