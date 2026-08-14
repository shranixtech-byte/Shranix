import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { SECURITY_EVENT_TYPES, SecurityEventsService } from './security-events.service';

/**
 * PHASE 15 — Security dashboard (15.32).
 * Admin-only. Customer users never reach these endpoints.
 */
@ApiTags('Security')
@Controller('security/events')
@UseGuards(JwtAuthGuard)
export class SecurityController {
  constructor(private readonly events: SecurityEventsService) {}

  @Get()
  @Permissions('security.view')
  @ApiOperation({
    summary: 'Security events log (filters: severity, type, customer, license, device, date)',
  })
  async list(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('severity') severity?: string,
    @Query('eventType') eventType?: string,
    @Query('customerId') customerId?: string,
    @Query('licenseId') licenseId?: string,
    @Query('deviceRef') deviceRef?: string,
    @Query('source') source?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.events.query({
      page: Number(page),
      pageSize: Number(pageSize),
      severity,
      eventType,
      customerId,
      licenseId,
      deviceRef,
      source,
      search,
      from,
      to,
    });
  }

  @Get('summary')
  @Permissions('security.view')
  @ApiOperation({ summary: 'Security summary — counts by severity, top types, recent criticals' })
  async summary(@Query('days') days = 7) {
    return this.events.summary(Number(days) || 7);
  }

  @Get('types')
  @Permissions('security.view')
  @ApiOperation({ summary: 'Supported security event types' })
  async types() {
    return Object.values(SECURITY_EVENT_TYPES);
  }
}
