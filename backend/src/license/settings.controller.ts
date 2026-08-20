import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

import { LicenseSettingsService } from './settings.service';

@ApiTags('License Management')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('license')
export class LicenseSettingsController {
  constructor(private readonly service: LicenseSettingsService) {}

  @Get()
  @Permissions('finance.read')
  @ApiOperation({
    summary: 'Get license settings + live usage (plan, expiry, key, users/branches/storage)',
  })
  @ApiResponse({ status: 200, description: 'License settings with usage stats' })
  getSettings() {
    return this.service.getSettings();
  }

  @Put()
  @Permissions('finance.update')
  @ApiOperation({ summary: 'Update license settings (KV upsert, whitelisted keys)' })
  @ApiResponse({ status: 200, description: 'Updated license settings' })
  updateSettings(@Body() body: Record<string, unknown>) {
    return this.service.updateSettings(body || {});
  }

  @Post('renew')
  @Permissions('finance.update')
  @ApiOperation({ summary: 'Renew license — extend expiry by N months (default 12)' })
  @ApiResponse({ status: 200, description: 'Renewed license settings' })
  renewLicense(@Body() body: { months?: number }) {
    return this.service.renewLicense(Number(body?.months) || 12);
  }
}
