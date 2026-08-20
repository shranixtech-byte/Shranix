import { Controller, Get, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

import { AuditTrailService } from './audit-trail.service';

@ApiTags('Audit Trail')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-trail')
export class AuditTrailController {
  constructor(private readonly service: AuditTrailService) {}

  @Get()
  @Permissions('companies.read')
  @ApiOperation({ summary: 'Audit trail — who changed what, with old/new values, IP and device' })
  @ApiResponse({ status: 200, description: 'Paginated audit trail' })
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('module') module?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('actionType') actionType?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 50,
      search,
      module,
      entityType,
      action,
      actionType,
      userId,
      from,
      to,
    });
  }

  @Get('meta')
  @Permissions('companies.read')
  @ApiOperation({ summary: 'Distinct filter values for the audit trail viewer' })
  meta() {
    return this.service.getMeta();
  }

  @Get('export')
  @Permissions('companies.read')
  @ApiOperation({ summary: 'Export the audit trail (with current filters) as CSV' })
  @ApiResponse({ status: 200, description: 'CSV download' })
  async export(
    @Query('search') search?: string,
    @Query('module') module?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('actionType') actionType?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<StreamableFile> {
    const csv = await this.service.exportCsv({
      page: 1,
      pageSize: 500,
      search,
      module,
      entityType,
      action,
      actionType,
      userId,
      from,
      to,
    });
    return new StreamableFile(Buffer.from(csv, 'utf8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="audit-trail-${new Date().toISOString().slice(0, 10)}.csv"`,
    });
  }
}
