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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PortalJwtAuthGuard } from '../guards/portal-auth.guard';
import { PortalTicketsService } from '../services/portal-tickets.service';
import type { PortalJwtPayload } from '../strategies/portal-jwt.strategy';

@ApiTags('Portal Tickets')
@ApiBearerAuth('access-token')
@Controller('portal')
export class PortalTicketsController {
  constructor(private readonly tickets: PortalTicketsService) {}

  // ── Customer-facing (portal token) ─────────────────────
  @UseGuards(PortalJwtAuthGuard)
  @Get('tickets')
  @ApiOperation({ summary: 'My support tickets' })
  async list(@Req() req: any) {
    const user: PortalJwtPayload = req.user;
    return this.tickets.listTickets(user.customerId);
  }

  @UseGuards(PortalJwtAuthGuard)
  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a support ticket' })
  async create(@Req() req: any, @Body() body: any) {
    const user: PortalJwtPayload = req.user;
    return this.tickets.createTicket(user.customerId, user.sub, body);
  }

  @UseGuards(PortalJwtAuthGuard)
  @Get('tickets/:id')
  @ApiOperation({ summary: 'Ticket detail (customer-safe messages only)' })
  async detail(@Req() req: any, @Param('id') id: string) {
    const user: PortalJwtPayload = req.user;
    return this.tickets.getTicket(user.customerId, id);
  }

  @UseGuards(PortalJwtAuthGuard)
  @Post('tickets/:id/reply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Customer replies on a ticket' })
  async reply(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { message: string; attachment?: any },
  ) {
    const user: PortalJwtPayload = req.user;
    return this.tickets.reply(user.customerId, user.sub, id, body?.message, body?.attachment);
  }

  // ── Internal (ERP user token) ──────────────────────────
  @UseGuards(JwtAuthGuard)
  @Permissions('portal.tickets')
  @Get('portal-admin/tickets')
  @ApiOperation({ summary: 'Internal — list all customer tickets' })
  async internalList(@Query('status') status?: string, @Query('assignedTo') assignedTo?: string) {
    return this.tickets.internalListTickets(status, assignedTo);
  }

  @UseGuards(JwtAuthGuard)
  @Permissions('portal.tickets')
  @Get('portal-admin/tickets/:id')
  @ApiOperation({ summary: 'Internal — ticket detail incl. internal notes' })
  async internalDetail(@Param('id') id: string) {
    return this.tickets.internalGetTicket(id);
  }

  @UseGuards(JwtAuthGuard)
  @Permissions('portal.tickets')
  @Post('portal-admin/tickets/:id/reply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Internal — reply (isInternal=true stays hidden from customer)' })
  async internalReply(
    @Param('id') id: string,
    @CurrentUser() u: any,
    @Body() body: { message: string; isInternal?: boolean; attachment?: any },
  ) {
    return this.tickets.internalReply(
      id,
      u?.id,
      body?.message,
      !!body?.isInternal,
      body?.attachment,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Permissions('portal.tickets')
  @Patch('portal-admin/tickets/:id/status')
  @ApiOperation({ summary: 'Internal — update ticket status' })
  async internalStatus(
    @Param('id') id: string,
    @CurrentUser() u: any,
    @Body() body: { status: string },
  ) {
    return this.tickets.internalUpdateStatus(id, u?.id, body?.status);
  }

  @UseGuards(JwtAuthGuard)
  @Permissions('portal.tickets')
  @Get('portal-admin/tickets/dashboard/counts')
  @ApiOperation({ summary: 'Internal — support ticket dashboard counts' })
  async internalDashboard() {
    return this.tickets.dashboard();
  }
}
