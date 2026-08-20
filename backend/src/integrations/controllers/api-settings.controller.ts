import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ApiSettingsService } from '../services/api-settings.service';

@ApiTags('Integrations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('integrations/settings')
export class ApiSettingsController {
  constructor(private readonly service: ApiSettingsService) {}

  @Get()
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Get API settings (developer access, OAuth, third-party credentials)' })
  @ApiResponse({ status: 200, description: 'API settings object' })
  getSettings() {
    return this.service.getSettings();
  }

  @Put()
  @Permissions('finance.update')
  @ApiOperation({ summary: 'Update API settings (KV upsert, whitelisted keys)' })
  @ApiResponse({ status: 200, description: 'Updated API settings' })
  updateSettings(@Body() body: Record<string, unknown>) {
    return this.service.updateSettings(body || {});
  }
}
