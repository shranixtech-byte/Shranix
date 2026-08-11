import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PortalJwtAuthGuard } from '../guards/portal-auth.guard';
import { PortalBillingService } from '../services/portal-billing.service';

/**
 * Customer portal billing — customer identity always derived from the portal
 * token. Never trust customerId from the frontend.
 */
@ApiTags('Portal Billing')
@Controller('portal/billing')
@UseGuards(PortalJwtAuthGuard)
export class PortalBillingController {
  constructor(private readonly service: PortalBillingService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Portal billing overview — plan, invoices, payments, history' })
  async overview(@CurrentUser('customerId') customerId: string) {
    return this.service.getOverview(customerId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Public sellable plans for checkout' })
  async plans() {
    return this.service.getPlans();
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Customer billing invoices' })
  async invoices(@CurrentUser('customerId') customerId: string) {
    return this.service.getInvoices(customerId);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Customer billing payments' })
  async payments(@CurrentUser('customerId') customerId: string) {
    return this.service.getPayments(customerId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Customer subscription lifecycle history' })
  async history(@CurrentUser('customerId') customerId: string) {
    return this.service.getHistory(customerId);
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to a plan (payment required unless trial)' })
  async subscribe(
    @CurrentUser('customerId') customerId: string,
    @CurrentUser('id') portalUserId: string,
    @Body() body: any,
  ) {
    return this.service.subscribe(customerId, portalUserId, body);
  }

  @Post('payments/:id/verify')
  @ApiOperation({ summary: 'Verify a portal-initiated subscription payment' })
  async verifyPayment(
    @CurrentUser('customerId') customerId: string,
    @CurrentUser('id') portalUserId: string,
    @Param('id') paymentId: string,
    @Body() body: any,
  ) {
    return this.service.verifyPayment(customerId, portalUserId, paymentId, body);
  }
}
