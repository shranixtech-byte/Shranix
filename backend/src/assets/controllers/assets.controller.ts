import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AssetsService } from '../services/assets.service';
import { AssetMaintenanceService } from '../services/maintenance.service';

@ApiTags('Assets')
@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(
    private readonly service: AssetsService,
    private readonly maintenance: AssetMaintenanceService,
  ) {}

  @Get('dashboard')
  @Permissions('asset.view')
  @ApiOperation({ summary: 'Asset dashboard KPIs' })
  async dashboard() {
    return this.service.dashboard();
  }

  @Get('reports')
  @Permissions('asset.report')
  @ApiOperation({ summary: 'Asset register report' })
  async reports(
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.service.reports({ status, categoryId, departmentId });
  }

  @Get('next-code')
  @Permissions('asset.view')
  @ApiOperation({ summary: 'Next auto asset code' })
  async nextCode() {
    return { nextCode: await this.service.nextAssetCode() };
  }

  @Get()
  @Permissions('asset.view')
  @ApiOperation({ summary: 'List assets' })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.service.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      status,
      categoryId,
      employeeId,
      departmentId,
    });
  }

  @Get(':id')
  @Permissions('asset.view')
  @ApiOperation({ summary: 'Get asset by ID' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/maintenance')
  @Permissions('asset.view')
  @ApiOperation({ summary: 'Maintenance history for asset' })
  async maintenanceHistory(@Param('id') id: string) {
    return this.maintenance.findAll({ assetId: id, pageSize: 100 });
  }

  @Post()
  @Permissions('asset.create')
  @ApiOperation({ summary: 'Create asset' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Put(':id')
  @Permissions('asset.edit')
  @ApiOperation({ summary: 'Update asset' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Delete(':id')
  @Permissions('asset.edit')
  @ApiOperation({ summary: 'Delete asset' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.softDelete(id, userId);
  }

  @Post(':id/assign')
  @Permissions('asset.allocate')
  @ApiOperation({ summary: 'Assign asset to employee/department/location' })
  async assign(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.assign(id, body, userId);
  }

  @Post(':id/return')
  @Permissions('asset.allocate')
  @ApiOperation({ summary: 'Return asset from allocation' })
  async returnAsset(
    @Param('id') id: string,
    @Body() body: { allocationId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.returnAsset(id, body.allocationId, userId);
  }

  @Post(':id/transfer')
  @Permissions('asset.transfer')
  @ApiOperation({ summary: 'Request asset transfer' })
  async transfer(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.createTransfer(id, body, userId);
  }

  @Post('transfers/:transferId/approve')
  @Permissions('asset.transfer')
  @ApiOperation({ summary: 'Approve asset transfer' })
  async approveTransfer(
    @Param('transferId') transferId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.approveTransfer(transferId, userId);
  }

  @Post('transfers/:transferId/cancel')
  @Permissions('asset.transfer')
  @ApiOperation({ summary: 'Cancel asset transfer' })
  async cancelTransfer(@Param('transferId') transferId: string, @CurrentUser('id') userId: string) {
    return this.service.cancelTransfer(transferId, userId);
  }

  @Post(':id/depreciate')
  @Permissions('asset.depreciation')
  @ApiOperation({ summary: 'Post depreciation for a period (YYYY-MM)' })
  async depreciate(
    @Param('id') id: string,
    @Body() body: { period: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.calculateDepreciation(id, body.period, userId);
  }

  @Post(':id/dispose')
  @Permissions('asset.dispose')
  @ApiOperation({ summary: 'Dispose asset with gain/loss' })
  async dispose(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.dispose(id, body, userId);
  }
}

@ApiTags('Asset Maintenance')
@Controller('asset-maintenance')
@UseGuards(JwtAuthGuard)
export class AssetMaintenanceController {
  constructor(private readonly service: AssetMaintenanceService) {}

  @Get()
  @Permissions('asset.view')
  @ApiOperation({ summary: 'List maintenance records' })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('assetId') assetId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.service.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      assetId,
      status,
      type,
    });
  }

  @Get('service-schedule')
  @Permissions('asset.view')
  @ApiOperation({ summary: 'Service schedule — due/overdue services' })
  async serviceSchedule(
    @Query('horizonDays') horizonDays?: number,
    @Query('status') status?: string,
  ) {
    return this.service.serviceSchedule({ horizonDays: Number(horizonDays), status });
  }

  @Post()
  @Permissions('asset.maintenance')
  @ApiOperation({ summary: 'Create maintenance record' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Put(':id')
  @Permissions('asset.maintenance')
  @ApiOperation({ summary: 'Update maintenance record' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Delete(':id')
  @Permissions('asset.maintenance')
  @ApiOperation({ summary: 'Delete maintenance record' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.softDelete(id, userId);
  }
}
