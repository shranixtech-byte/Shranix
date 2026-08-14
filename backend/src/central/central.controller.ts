import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { CentralKpisService } from './central-kpis.service';

/**
 * PHASE 16 — Central administration surface (16.3).
 * Aggregated commercial/license/security/update KPIs, trends, admin search and
 * system health. Admin-only — customers never reach these endpoints and can
 * never see another tenant's data (all aggregations are server-side).
 */
@ApiTags('Central')
@Controller('central')
@UseGuards(JwtAuthGuard)
export class CentralController {
  constructor(private readonly service: CentralKpisService) {}

  @Get('kpis')
  @Permissions('license.view')
  @ApiOperation({ summary: 'Central commercial/license/security/update KPIs' })
  async kpis(@Query('securityDays') securityDays = 30) {
    const [commercial, license, security, update] = await Promise.all([
      this.service.commercialKpis(),
      this.service.licenseKpis(),
      this.service.securityKpis(Number(securityDays) || 30),
      this.service.updateKpis(),
    ]);
    return { generatedAt: new Date().toISOString(), commercial, license, security, update };
  }

  @Get('trends')
  @Permissions('license.view')
  @ApiOperation({ summary: 'Daily trend series (7/30/90 days)' })
  async trends(@Query('days') days = 7) {
    return this.service.trends(Number(days) || 7);
  }

  @Get('search')
  @Permissions('license.view')
  @ApiOperation({
    summary:
      'Admin search across customers/licenses/subscriptions/devices/installations/activations/payments/releases',
  })
  async search(@Query('q') q?: string, @Query('type') type?: string) {
    return this.service.search(q || '', type);
  }

  @Get('system-health')
  @Permissions('license.view')
  @ApiOperation({ summary: 'System health — API, database, webhooks, validation, activation' })
  async systemHealth() {
    return this.service.systemHealth();
  }
}
