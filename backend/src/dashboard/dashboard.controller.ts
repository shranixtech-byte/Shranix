import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { DashboardService } from './dashboard.service';

@ApiTags('Enterprise Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @Permissions('reports.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get live enterprise dashboard metrics' })
  getDashboard(@CurrentUser() user: { id: string }) {
    return this.dashboard.getDashboard(user.id);
  }
}
