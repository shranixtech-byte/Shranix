import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ImportExportService } from '../services/import-export.service';

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class ImportExportController {
  constructor(private readonly service: ImportExportService) {}

  @Post('import') @Permissions('integration.import') @ApiOperation({ summary: 'Import data' })
  async import(@Body() body: { module: string; fileType: string; data: any[] }, @CurrentUser('id') userId: string) {
    return this.service.importData(body.module, body.fileType, body.data, userId);
  }

  @Post('export/:module') @Permissions('integration.export') @ApiOperation({ summary: 'Export data' })
  async export(@Param('module') module: string, @Body() body: { format: string }, @Query() params: any) {
    return this.service.exportData(module, body.format, params);
  }

  @Get('import-logs') @Permissions('integration.import') @ApiOperation({ summary: 'Get import logs' })
  async getLogs(@Query('page') page = 1, @Query('pageSize') pageSize = 20) { return this.service.getImportLogs({ page: Number(page), pageSize: Number(pageSize) }); }
}
