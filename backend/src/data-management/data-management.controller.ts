import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

import { DataManagementService, type ImportResult } from './data-management.service';

@ApiTags('Data Management')
@ApiBearerAuth('access-token')
@UseGuards(PermissionsGuard)
@Controller('data-management')
export class DataManagementController {
  constructor(private readonly service: DataManagementService) {}

  @Get('meta')
  @Permissions('companies.read')
  @ApiOperation({ summary: 'Supported entities for import/export/archive' })
  meta() {
    return this.service.getMeta();
  }

  @Get('export')
  @Permissions('companies.read')
  @ApiOperation({ summary: 'Export master data as Excel / CSV / JSON' })
  @ApiResponse({ status: 200, description: 'Downloadable file' })
  export(
    @Query('entity') entity: string,
    @Query('format') format: string,
  ): Promise<StreamableFile> {
    return this.service.exportData(entity, format).then(
      (r) =>
        new StreamableFile(r.buffer, {
          type: r.mime,
          disposition: `attachment; filename="${r.fileName}"`,
        }),
    );
  }

  @Post('import')
  @Permissions('companies.update')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import master data from Excel / CSV / JSON (insert or upsert)' })
  @HttpCode(HttpStatus.OK)
  import(
    @UploadedFile() file: any,
    @Body('entity') entity: string,
    @Body('mode') mode: 'insert' | 'upsert',
  ): Promise<ImportResult | { success: false; message: string }> {
    if (!file) {
      return Promise.resolve({ success: false, message: 'No file provided' });
    }
    return this.service.importData(
      entity || '',
      file.originalname || '',
      file.buffer,
      mode === 'upsert' ? 'upsert' : 'insert',
    );
  }

  @Get('deleted')
  @Permissions('companies.read')
  @ApiOperation({ summary: 'Soft-deleted record counts per entity' })
  deletedOverview() {
    return this.service.getDeletedOverview();
  }

  @Get('deleted/list')
  @Permissions('companies.read')
  @ApiOperation({ summary: 'List soft-deleted records for an entity' })
  listDeleted(@Query('entity') entity: string, @Query('limit') limit?: string) {
    return this.service.listDeleted(entity || '', Number(limit) || 50);
  }

  @Post('deleted/restore')
  @Permissions('companies.update')
  @ApiOperation({ summary: 'Restore soft-deleted records (all or by id)' })
  @HttpCode(HttpStatus.OK)
  restore(@Body() body: { entity: string; ids?: string[] }) {
    return this.service.restoreDeleted(
      body?.entity || '',
      Array.isArray(body?.ids) ? body.ids : undefined,
    );
  }

  @Post('deleted/purge')
  @Permissions('companies.update')
  @ApiOperation({ summary: 'Permanently delete soft-deleted records (all or by id)' })
  @HttpCode(HttpStatus.OK)
  purge(@Body() body: { entity: string; ids?: string[] }) {
    return this.service.purgeDeleted(
      body?.entity || '',
      Array.isArray(body?.ids) ? body.ids : undefined,
    );
  }

  @Post('cleanup')
  @Permissions('companies.update')
  @ApiOperation({ summary: 'Purge all soft-deleted records and compact the database (VACUUM)' })
  @HttpCode(HttpStatus.OK)
  cleanup() {
    return this.service.cleanupAll();
  }

  @Post('archive')
  @Permissions('companies.update')
  @ApiOperation({ summary: 'Archive old closed transactions to a dated file and soft-delete them' })
  @HttpCode(HttpStatus.OK)
  archive(@Body() body: { entity: string; beforeDate: string }) {
    return this.service.archiveData(body?.entity || '', body?.beforeDate || '');
  }
}
