import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CrmDashboardService } from '../services/crm-dashboard.service';

@ApiTags('CRM - Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm')
export class CrmDashboardController {
  constructor(private readonly service: CrmDashboardService) {}

  @Get('dashboard')
  @Permissions('crm.lead.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'CRM dashboard — KPIs, lead trend, source, pipeline funnel, salesperson performance',
  })
  async dashboard() {
    return this.service.getDashboard();
  }

  @Get('reports')
  @Permissions('crm.lead.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'CRM reports',
    description:
      'Types: lead-register, lead-source, lead-conversion, lead-status, salesperson-performance, follow-up-report, overdue-follow-ups, pipeline, won-lost, lost-reason, opportunities, tasks',
  })
  async reports(
    @Query('type') type: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('status') status?: string,
  ) {
    return this.service.getReport(type, { page: Number(page), pageSize: Number(pageSize), status });
  }
}
