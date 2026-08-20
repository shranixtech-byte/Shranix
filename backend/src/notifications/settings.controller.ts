import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

import { NotificationSettingsService } from './settings.service';

@ApiTags('Notification Settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notifications/settings')
export class NotificationSettingsController {
  constructor(private readonly service: NotificationSettingsService) {}

  @Get()
  @Permissions('finance.read')
  @ApiOperation({ summary: 'Get notification settings (channels + alerts, KV)' })
  @ApiResponse({ status: 200, description: 'Notification settings object' })
  getSettings() {
    return this.service.getSettings();
  }

  @Put()
  @Permissions('finance.update')
  @ApiOperation({ summary: 'Update notification settings (KV upsert, whitelisted keys)' })
  @ApiResponse({ status: 200, description: 'Updated settings' })
  updateSettings(@Body() body: Record<string, unknown>) {
    return this.service.updateSettings(body || {});
  }
}
