import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PortalJwtAuthGuard } from '../guards/portal-auth.guard';
import { PortalPaymentsService } from '../services/portal-payments.service';
import type { PortalJwtPayload } from '../strategies/portal-jwt.strategy';

@ApiTags('Portal Payments')
@ApiBearerAuth('access-token')
@UseGuards(PortalJwtAuthGuard)
@Controller('portal/payments')
export class PortalPaymentsController {
  constructor(private readonly payments: PortalPaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'My portal payment attempts' })
  async list(@Req() req: any) {
    const user: PortalJwtPayload = req.user;
    return this.payments.listPortalPayments(user.customerId);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate a payment (idempotent via idempotencyKey)' })
  async create(@Req() req: any, @Body() body: any) {
    const user: PortalJwtPayload = req.user;
    return this.payments.createPayment(user.customerId, user.sub, body);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Server-side payment verification → records through the existing payment flow',
  })
  async verify(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const user: PortalJwtPayload = req.user;
    return this.payments.verifyPayment(user.customerId, user.sub, id, body || {});
  }
}
