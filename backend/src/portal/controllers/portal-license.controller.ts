import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PortalJwtAuthGuard } from '../guards/portal-auth.guard';
import { PortalLicenseService } from '../services/portal-license.service';

/**
 * Customer portal license — customer identity always derived from the portal
 * token. Never trust customerId / licenseId / deviceId from the frontend.
 */
@ApiTags('Portal License')
@Controller('portal/license')
@UseGuards(PortalJwtAuthGuard)
export class PortalLicenseController {
  constructor(private readonly service: PortalLicenseService) {}

  @Get()
  @ApiOperation({ summary: 'Portal license overview — license, devices, slots, events' })
  async overview(@CurrentUser('customerId') customerId: string) {
    return this.service.getOverview(customerId);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Customer device list (no raw identifiers)' })
  async devices(@CurrentUser('customerId') customerId: string) {
    return this.service.getDevices(customerId);
  }

  @Post('devices/deactivate')
  @ApiOperation({ summary: 'Deactivate one of the customer\u2019s own devices' })
  async deactivateDevice(
    @CurrentUser('customerId') customerId: string,
    @CurrentUser('id') portalUserId: string,
    @Body() body: { devicePublicId: string; reason?: string },
  ) {
    return this.service.deactivateDevice(customerId, portalUserId, body || {});
  }

  @Post('devices/transfer')
  @ApiOperation({ summary: 'Request a device transfer (admin approval)' })
  async requestTransfer(
    @CurrentUser('customerId') customerId: string,
    @CurrentUser('id') portalUserId: string,
    @Body() body: any,
  ) {
    return this.service.requestTransfer(customerId, portalUserId, body || {});
  }

  @Post('reactivate')
  @ApiOperation({ summary: 'Request license reactivation (admin review)' })
  async requestReactivation(
    @CurrentUser('customerId') customerId: string,
    @CurrentUser('id') portalUserId: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.requestReactivation(customerId, portalUserId, body || {});
  }
}
