import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LicenseActivationsService } from '../services/license-activations.service';
import { LicenseDashboardService } from '../services/license-dashboard.service';
import { LicenseDevicesService } from '../services/license-devices.service';
import { LicenseEventsService } from '../services/license-events.service';
import { LicenseReportsService } from '../services/license-reports.service';
import { LicenseTokensService } from '../services/license-tokens.service';
import { LicenseValidationService } from '../services/license-validation.service';
import { LicensesService } from '../services/licenses.service';

/**
 * INTERNAL ADMIN license endpoints. Customer users must never reach these —
 * the customer-facing surface lives under /portal/license with the portal
 * guard. Never trust ids from the frontend for authorization.
 */
@ApiTags('License Management')
@Controller('licenses')
@UseGuards(JwtAuthGuard)
export class LicenseAdminController {
  constructor(
    private readonly licenses: LicensesService,
    private readonly devices: LicenseDevicesService,
    private readonly activations: LicenseActivationsService,
    private readonly validation: LicenseValidationService,
    private readonly tokens: LicenseTokensService,
    private readonly events: LicenseEventsService,
    private readonly dashboard: LicenseDashboardService,
    private readonly reports: LicenseReportsService,
  ) {}

  // ── Dashboard + reports (declared before :id routes) ──
  @Get('dashboard')
  @Permissions('license.view')
  @ApiOperation({ summary: 'License dashboard KPIs' })
  async dashboardData() {
    return this.dashboard.getDashboard();
  }

  @Get('reports/register')
  @Permissions('license.reports')
  @ApiOperation({ summary: 'License register' })
  async reportRegister(@Query('status') status?: string) {
    return this.reports.register({ status });
  }

  @Get('reports/by-status')
  @Permissions('license.reports')
  @ApiOperation({ summary: 'Licenses grouped by status' })
  async reportByStatus() {
    return this.reports.byStatus();
  }

  @Get('reports/device-utilization')
  @Permissions('license.reports')
  @ApiOperation({ summary: 'Device utilization report' })
  async reportDevices() {
    return this.reports.deviceUtilization();
  }

  @Get('reports/activations')
  @Permissions('license.reports')
  @ApiOperation({ summary: 'Activation report' })
  async reportActivations() {
    return this.reports.activationReport();
  }

  @Get('reports/transfers')
  @Permissions('license.reports')
  @ApiOperation({ summary: 'Transfer report' })
  async reportTransfers() {
    return this.reports.transferReport();
  }

  @Get('reports/expiry-forecast')
  @Permissions('license.reports')
  @ApiOperation({ summary: 'License expiry forecast by month' })
  async reportExpiryForecast() {
    return this.reports.expiryForecast();
  }

  @Get('reports/plan-wise')
  @Permissions('license.reports')
  @ApiOperation({ summary: 'Plan-wise license report' })
  async reportPlanWise() {
    return this.reports.planWise();
  }

  // ── CRUD ───────────────────────────────────────────────
  @Get()
  @Permissions('license.view')
  @ApiOperation({ summary: 'List licenses (search + filters)' })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('planId') planId?: string,
    @Query('search') search?: string,
    @Query('expiringWithinDays') expiringWithinDays?: string,
  ) {
    return this.licenses.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      customerId,
      planId,
      search,
      expiringWithinDays: expiringWithinDays ? Number(expiringWithinDays) : undefined,
    });
  }

  @Get(':id')
  @Permissions('license.view')
  @ApiOperation({ summary: 'Get license detail' })
  async findById(@Param('id') id: string) {
    return this.licenses.findById(id);
  }

  @Post()
  @Permissions('license.manage')
  @ApiOperation({ summary: 'Create license from a subscription' })
  async create(
    @Body() body: { subscriptionId: string; force?: boolean },
    @CurrentUser('id') userId: string,
  ) {
    if (!body?.subscriptionId) {
      throw new BadRequestException('subscriptionId is required');
    }
    return this.licenses.createFromSubscription(body.subscriptionId, {
      userId,
      force: Boolean(body.force),
    });
  }

  // ── Validation / tokens ────────────────────────────────
  @Post(':id/validate')
  @Permissions('license.view')
  @ApiOperation({ summary: 'Validate license (controlled response)' })
  async validate(@Param('id') id: string, @Body() body: any) {
    const license = await this.licenses.findById(id);
    return this.validation.validateLicense({
      licenseReference: license.licensePublicId,
      installationId: body?.installationId,
      deviceIdentifierHash: body?.deviceIdentifierHash,
      applicationVersion: body?.applicationVersion,
      source: 'admin',
    });
  }

  @Post(':id/token')
  @Permissions('license.manage')
  @ApiOperation({ summary: 'Issue a signed license token' })
  async issueToken(@Param('id') id: string, @Body() body: { ttlDays?: number; purpose?: string }) {
    const license = await this.licenses.findById(id);
    return this.tokens.issueToken(license, { ttlDays: body?.ttlDays, purpose: body?.purpose });
  }

  // ── Lifecycle actions ──────────────────────────────────
  @Post(':id/revoke')
  @Permissions('license.revoke')
  @ApiOperation({ summary: 'Revoke license (reason required, history preserved)' })
  async revoke(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.licenses.revoke(id, { reason: body?.reason, userId });
  }

  @Post(':id/reactivate')
  @Permissions('license.revoke')
  @ApiOperation({ summary: 'Reactivate license (subscription must be eligible)' })
  async reactivate(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.licenses.reactivate(id, { reason: body?.reason, userId });
  }

  @Post(':id/check-downgrade')
  @Permissions('license.manage')
  @ApiOperation({ summary: 'Downgrade guard — device resolution check' })
  async checkDowngrade(@Param('id') id: string, @Body() body: { planId: string }) {
    return this.licenses.validateDowngrade(id, body?.planId);
  }

  // ── Devices / activations / events ─────────────────────
  @Get(':id/devices')
  @Permissions('license.view')
  @ApiOperation({ summary: 'List license devices' })
  async devicesList(@Param('id') id: string) {
    return this.devices.listDevices(id);
  }

  @Post(':id/devices/deactivate')
  @Permissions('license.devices')
  @ApiOperation({ summary: 'Deactivate a device (frees a slot)' })
  async deactivateDevice(
    @Param('id') id: string,
    @Body() body: { devicePublicId: string; reason?: string },
    @CurrentUser('id') userId: string,
  ) {
    const license = await this.licenses.findById(id);
    return this.devices.deactivateDevice(license.licensePublicId, body?.devicePublicId, {
      reason: body?.reason,
      userId,
    });
  }

  @Post(':id/devices/transfer')
  @Permissions('license.devices')
  @ApiOperation({ summary: 'Request a device transfer' })
  async requestTransfer(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser('id') userId: string,
  ) {
    const license = await this.licenses.findById(id);
    return this.devices.requestTransfer(license.licensePublicId, { ...body, userId });
  }

  @Post(':id/devices/transfer/:transferId/approve')
  @Permissions('license.devices')
  @ApiOperation({ summary: 'Approve a pending device transfer' })
  async approveTransfer(
    @Param('transferId') transferId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.devices.approveTransfer(transferId, { userId });
  }

  @Get(':id/activations')
  @Permissions('license.view')
  @ApiOperation({ summary: 'List license activations' })
  async activationsList(@Param('id') id: string) {
    return this.activations.list(id);
  }

  @Post(':id/activations/:activationId/approve')
  @Permissions('license.devices')
  @ApiOperation({ summary: 'Approve a pending activation' })
  async approveActivation(
    @Param('activationId') activationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.activations.approve(activationId, { userId });
  }

  @Post(':id/activations/:activationId/reject')
  @Permissions('license.devices')
  @ApiOperation({ summary: 'Reject a pending activation' })
  async rejectActivation(
    @Param('activationId') activationId: string,
    @Body() body: { reason?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.activations.reject(activationId, { reason: body?.reason, userId });
  }

  @Get(':id/events')
  @Permissions('license.view')
  @ApiOperation({ summary: 'Immutable license event history' })
  async eventsList(@Param('id') id: string) {
    return this.events.list(id);
  }
}
