import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuditService } from '../common/services/audit.service';

import { CommunicationSchedulerService } from './communication-scheduler.service';
import { CommunicationService } from './communication.service';
import { CommunicationSettingsService } from './settings.service';

@ApiTags('Communication')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('communications')
export class CommunicationController {
  constructor(
    private readonly communications: CommunicationService,
    private readonly scheduler: CommunicationSchedulerService,
    private readonly settings: CommunicationSettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('admin', 'manager', 'accountant', 'employee')
  @Permissions('communication.view')
  @ApiOperation({ summary: 'List communication history' })
  @HttpCode(HttpStatus.OK)
  async list(
    @Query('page') page?: number,
    @Query('ps') ps?: number,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('referenceType') referenceType?: string,
    @Query('referenceId') referenceId?: string,
    @Query('recipientId') recipientId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.communications.list({
      page: Number(page) || 1,
      pageSize: Number(ps) || 20,
      channel,
      status,
      referenceType,
      referenceId,
      recipientId,
      dateFrom,
      dateTo,
    });
  }

  @Get('reports')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('communication.report')
  @ApiOperation({ summary: 'Communication delivery reports' })
  @HttpCode(HttpStatus.OK)
  async reports(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.communications.reports({ dateFrom, dateTo });
  }

  @Get('settings')
  @Roles('admin')
  @Permissions('communication.settings')
  @ApiOperation({ summary: 'Get provider settings (secrets masked)' })
  @HttpCode(HttpStatus.OK)
  async getSettings() {
    return this.settings.getPublicSettings();
  }

  @Post('settings')
  @Roles('admin')
  @Permissions('communication.settings')
  @ApiOperation({ summary: 'Update provider settings' })
  @HttpCode(HttpStatus.OK)
  async updateSettings(@Body() payload: Record<string, unknown>, @CurrentUser() u: { id: string }) {
    const result = await this.settings.updateSettings(payload);
    // Audit the change WITHOUT logging secret values — only key names.
    const changedKeys = Object.keys(payload || {}).filter(
      (k) =>
        !k.toLowerCase().includes('password') &&
        !k.toLowerCase().includes('key') &&
        !k.toLowerCase().includes('token'),
    );
    await this.audit
      .log({
        userId: u?.id,
        event: 'communication.settings_changed',
        resource: 'communication',
        action: 'update',
        details: { changedKeys },
      })
      .catch(() => undefined);
    return result;
  }

  @Post('send')
  @Roles('admin', 'manager', 'accountant', 'employee')
  @Permissions('communication.send')
  @ApiOperation({ summary: 'Send a communication (email/sms/whatsapp via template)' })
  @HttpCode(HttpStatus.CREATED)
  async send(@Body() body: any, @CurrentUser() u: { id: string }) {
    return this.communications.send({
      ...body,
      userId: u?.id,
    });
  }

  @Post('retry/:id')
  @Roles('admin', 'manager')
  @Permissions('communication.retry')
  @ApiOperation({ summary: 'Retry a failed communication' })
  @HttpCode(HttpStatus.OK)
  async retry(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.communications.retry(id, u?.id);
  }

  @Post('worker/run-now')
  @Roles('admin')
  @Permissions('communication.settings')
  @ApiOperation({ summary: 'Run the communication worker + reminders now' })
  @HttpCode(HttpStatus.OK)
  async runNow() {
    return this.scheduler.runNow();
  }

  @Get('preferences')
  @Roles('admin', 'manager', 'employee')
  @Permissions('communication.view')
  @ApiOperation({ summary: 'Get communication preferences for an entity' })
  @HttpCode(HttpStatus.OK)
  async getPreferences(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.communications.getPreferences(entityType || 'user', entityId || '');
  }

  @Post('preferences')
  @Roles('admin', 'manager', 'employee')
  @Permissions('communication.send')
  @ApiOperation({ summary: 'Set communication preferences' })
  @HttpCode(HttpStatus.OK)
  async setPreferences(
    @Body() body: { entityType?: string; entityId?: string; rows: any[] },
    @CurrentUser() u: { id: string },
  ) {
    return this.communications.setPreferences(
      body.entityType || 'user',
      body.entityId || u?.id,
      body.rows || [],
      u?.id,
    );
  }

  // ── Campaigns (bulk) ──────────────────────────────────────
  @Get('campaigns')
  @Roles('admin', 'manager')
  @Permissions('communication.bulk')
  @ApiOperation({ summary: 'List communication campaigns' })
  @HttpCode(HttpStatus.OK)
  async listCampaigns(@Query('page') page?: number, @Query('ps') ps?: number) {
    return this.communications.listCampaigns({
      page: Number(page) || 1,
      pageSize: Number(ps) || 20,
    });
  }

  @Post('campaigns')
  @Roles('admin', 'manager')
  @Permissions('communication.bulk')
  @ApiOperation({ summary: 'Create a bulk communication campaign' })
  @HttpCode(HttpStatus.CREATED)
  async createCampaign(@Body() body: any, @CurrentUser() u: { id: string }) {
    return this.communications.createCampaign(body, u?.id);
  }

  @Post('campaigns/:id/run')
  @Roles('admin', 'manager')
  @Permissions('communication.bulk')
  @ApiOperation({ summary: 'Execute a campaign' })
  @HttpCode(HttpStatus.OK)
  async runCampaign(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.communications.runCampaign(id, u?.id);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'accountant', 'employee')
  @Permissions('communication.view')
  @ApiOperation({ summary: 'Get a communication log row' })
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.communications.findById(id);
  }
}
