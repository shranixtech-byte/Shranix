import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuditService, AuditEvent, AuditSeverity } from '../common/services/audit.service';
import {
  THROTTLE_BACKUP,
  THROTTLE_BACKUP_DOWNLOAD,
  throttle,
} from '../common/utils/rate-limit-policies';

import { BackupService } from './backup.service';

@ApiTags('Backup & Restore')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('backup')
export class BackupController {
  constructor(
    private readonly service: BackupService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Permissions('companies.read')
  @ApiOperation({ summary: 'Backup overview — folder, DB size & backup history' })
  @ApiResponse({ status: 200, description: 'Backup overview' })
  overview() {
    return this.service.overview();
  }

  @Post()
  @Permissions('companies.update')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(throttle(THROTTLE_BACKUP))
  @ApiOperation({ summary: 'Create a manual backup now' })
  @ApiResponse({ status: 201, description: 'Backup created' })
  async create(@CurrentUser() user: { id: string }) {
    const result = await this.service.createBackup('manual');
    // H17: Audit backup creation
    this.audit
      .log({
        userId: user.id,
        event: AuditEvent.BACKUP_CREATED,
        resource: 'backup',
        action: 'create',
        details: { type: 'manual' },
        severity: AuditSeverity.INFO,
      })
      .catch(() => {});
    return result;
  }

  @Get('settings')
  @Permissions('companies.read')
  @ApiOperation({ summary: 'Get auto-backup settings (KV)' })
  getSettings() {
    return this.service.getSettings();
  }

  @Put('settings')
  @Permissions('companies.update')
  @ApiOperation({ summary: 'Update auto-backup settings (KV upsert)' })
  updateSettings(@Body() body: Record<string, unknown>) {
    return this.service.updateSettings(body || {});
  }

  @Get(':name/download')
  @Permissions('companies.read')
  @Throttle(throttle(THROTTLE_BACKUP_DOWNLOAD))
  @ApiOperation({ summary: 'Download a backup file' })
  @ApiResponse({ status: 200, description: 'Backup file stream' })
  download(@Param('name') name: string, @CurrentUser() user: { id: string }): StreamableFile {
    // H17: Audit backup download
    this.audit
      .log({
        userId: user.id,
        event: AuditEvent.BACKUP_DOWNLOADED,
        resource: 'backup',
        action: 'download',
        details: { name },
        severity: AuditSeverity.INFO,
      })
      .catch(() => {});
    return this.service.downloadBackup(name);
  }

  @Post(':name/restore')
  @Permissions('companies.update')
  @HttpCode(HttpStatus.OK)
  @Throttle(throttle(THROTTLE_BACKUP))
  @ApiOperation({ summary: 'Restore the database from a backup (online, no restart needed)' })
  @ApiResponse({ status: 200, description: 'Restore result' })
  async restore(@Param('name') name: string, @CurrentUser() user: { id: string }) {
    const result = await this.service.restoreBackup(name);
    // H17: Audit backup restore
    this.audit
      .log({
        userId: user.id,
        event: AuditEvent.BACKUP_RESTORED,
        resource: 'backup',
        action: 'restore',
        details: { name },
        severity: AuditSeverity.CRITICAL,
      })
      .catch(() => {});
    return result;
  }

  @Delete(':name')
  @Permissions('companies.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a backup file' })
  @ApiResponse({ status: 200, description: 'Backup deleted' })
  delete(@Param('name') name: string) {
    return this.service.deleteBackup(name);
  }
}
