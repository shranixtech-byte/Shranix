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

import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

import { BackupService } from './backup.service';

@ApiTags('Backup & Restore')
@ApiBearerAuth('access-token')
@UseGuards(PermissionsGuard)
@Controller('backup')
export class BackupController {
  constructor(private readonly service: BackupService) {}

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
  @ApiOperation({ summary: 'Create a manual backup now' })
  @ApiResponse({ status: 201, description: 'Backup created' })
  create() {
    return this.service.createBackup('manual');
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
  @ApiOperation({ summary: 'Download a backup file' })
  @ApiResponse({ status: 200, description: 'Backup file stream' })
  download(@Param('name') name: string): StreamableFile {
    return this.service.downloadBackup(name);
  }

  @Post(':name/restore')
  @Permissions('companies.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore the database from a backup (online, no restart needed)' })
  @ApiResponse({ status: 200, description: 'Restore result' })
  restore(@Param('name') name: string) {
    return this.service.restoreBackup(name);
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
