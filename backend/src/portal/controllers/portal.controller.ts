import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { PortalJwtAuthGuard } from '../guards/portal-auth.guard';
import { PortalAuthService } from '../services/portal-auth.service';
import { PortalService } from '../services/portal.service';
import type { PortalJwtPayload } from '../strategies/portal-jwt.strategy';

@ApiTags('Customer Portal')
@ApiBearerAuth('access-token')
@UseGuards(PortalJwtAuthGuard)
@Controller('portal')
export class PortalController {
  constructor(
    private readonly portal: PortalService,
    private readonly portalAuth: PortalAuthService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Customer portal dashboard' })
  async dashboard(@Req() req: any) {
    const user: PortalJwtPayload = req.user;
    return this.portal.getDashboard(user.customerId, user.sub);
  }

  // ── Quotations ─────────────────────────────────────────
  @Get('quotations')
  @ApiOperation({ summary: 'My quotations' })
  async quotations(@Req() req: any) {
    const user: PortalJwtPayload = req.user;
    return this.portal.listQuotations(user.customerId);
  }

  @Get('quotations/:id')
  @ApiOperation({ summary: 'Quotation detail (ownership-checked)' })
  async quotationDetail(@Req() req: any, @Param('id') id: string) {
    const user: PortalJwtPayload = req.user;
    return this.portal.getQuotation(user.customerId, id);
  }

  @Post('quotations/:id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer accepts / rejects / requests changes on a quotation' })
  async respondQuotation(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { action: string; comment?: string },
  ) {
    const user: PortalJwtPayload = req.user;
    if (!['accept', 'reject', 'request_changes'].includes(String(body?.action || ''))) {
      return { error: 'Action must be accept, reject or request_changes' };
    }
    return this.portal.respondQuotation(
      user.customerId,
      user.sub,
      id,
      body.action as any,
      body?.comment,
    );
  }

  // ── Orders ─────────────────────────────────────────────
  @Get('orders')
  @ApiOperation({ summary: 'My sales orders' })
  async orders(@Req() req: any) {
    const user: PortalJwtPayload = req.user;
    return this.portal.listOrders(user.customerId);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Sales order detail (ownership-checked)' })
  async orderDetail(@Req() req: any, @Param('id') id: string) {
    const user: PortalJwtPayload = req.user;
    return this.portal.getOrder(user.customerId, id);
  }

  // ── Invoices ───────────────────────────────────────────
  @Get('invoices')
  @ApiOperation({ summary: 'My invoices' })
  async invoices(@Req() req: any) {
    const user: PortalJwtPayload = req.user;
    return this.portal.listInvoices(user.customerId);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Invoice detail (ownership-checked)' })
  async invoiceDetail(@Req() req: any, @Param('id') id: string) {
    const user: PortalJwtPayload = req.user;
    return this.portal.getInvoice(user.customerId, id);
  }

  // ── Payments / outstanding / ledger ────────────────────
  @Get('payments')
  @ApiOperation({ summary: 'My payment history' })
  async payments(@Req() req: any) {
    const user: PortalJwtPayload = req.user;
    return this.portal.listPayments(user.customerId);
  }

  @Get('outstanding')
  @ApiOperation({ summary: 'Outstanding + ageing buckets' })
  async outstanding(@Req() req: any) {
    const user: PortalJwtPayload = req.user;
    return this.portal.getOutstanding(user.customerId);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Customer ledger (date-filtered, paginated)' })
  async ledger(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const user: PortalJwtPayload = req.user;
    return this.portal.getLedger(user.customerId, {
      from,
      to,
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 50, 200),
    });
  }

  // ── Documents (server-generated PDFs) ───────────────────
  @Get('documents/:documentType/:id')
  @ApiOperation({ summary: 'Download customer-safe PDF (invoice / quotation / order)' })
  async document(
    @Req() req: any,
    @Param('documentType') type: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const user: PortalJwtPayload = req.user;
    const buffer = await this.portal.getDocument(user.customerId, user.sub, type, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${type}-${id.slice(0, 8)}.pdf"`,
      'Content-Length': buffer.length,
    });
    return new StreamableFile(buffer);
  }

  // ── Notifications ──────────────────────────────────────
  @Get('notifications')
  @ApiOperation({ summary: 'My portal notifications' })
  async notifications(@Req() req: any, @Query('limit') limit?: string) {
    const user: PortalJwtPayload = req.user;
    return this.portal.listNotifications(user.sub, Number(limit) || 20);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark a portal notification read' })
  async markRead(@Req() req: any, @Param('id') id: string) {
    const user: PortalJwtPayload = req.user;
    return this.portal.markNotificationRead(user.sub, id);
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Mark all portal notifications read' })
  async markAllRead(@Req() req: any) {
    const user: PortalJwtPayload = req.user;
    return this.portal.markAllNotificationsRead(user.sub);
  }

  // ── Profile ────────────────────────────────────────────
  @Get('profile')
  @ApiOperation({ summary: 'Profile + customer-safe master data' })
  async profile(@Req() req: any) {
    const user: PortalJwtPayload = req.user;
    return this.portalAuth.getProfile(user.sub);
  }
}
