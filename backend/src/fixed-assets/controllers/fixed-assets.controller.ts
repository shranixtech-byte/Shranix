import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FixedAssetsService } from '../services/fixed-assets.service';

@ApiTags('Fixed Assets')
@Controller('fixed-assets')
@UseGuards(JwtAuthGuard)
export class FixedAssetsController {
  constructor(private readonly service: FixedAssetsService) {}

  @Post() @Permissions('asset.create') @ApiOperation({ summary: 'Create fixed asset' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) { return this.service.create(body, userId); }

  @Get() @Permissions('asset.read') @ApiOperation({ summary: 'List fixed assets' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20, @Query('search') search?: string) {
    return this.service.findAll({ page: Number(page), pageSize: Number(pageSize), search });
  }

  @Get(':id') @Permissions('asset.read') @ApiOperation({ summary: 'Get asset by ID' })
  async findById(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('asset.update') @ApiOperation({ summary: 'Update asset' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) { return this.service.update(id, body, userId); }

  @Delete(':id') @Permissions('asset.delete') @ApiOperation({ summary: 'Delete asset' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) { await this.service.softDelete(id, userId); return { deleted: true }; }

  @Post(':id/depreciate') @Permissions('asset.depreciate') @ApiOperation({ summary: 'Calculate and post depreciation' })
  async depreciate(@Param('id') id: string, @Body() body: { period: string }) { return this.service.calculateDepreciation(id, body.period); }

  @Post(':id/transfer') @Permissions('asset.transfer') @ApiOperation({ summary: 'Transfer asset to another branch' })
  async transfer(@Param('id') id: string, @Body() body: { toBranchId: string; notes?: string }, @CurrentUser('id') userId: string) {
    return this.service.transferAsset(id, body.toBranchId, body.notes, userId);
  }

  @Post(':id/dispose') @Permissions('asset.dispose') @ApiOperation({ summary: 'Dispose asset' })
  async dispose(@Param('id') id: string, @Body() body: { disposalValue: number; notes?: string }, @CurrentUser('id') userId: string) {
    return this.service.disposeAsset(id, body.disposalValue, body.notes, userId);
  }

  @Get(':id/depreciation') @Permissions('asset.read') @ApiOperation({ summary: 'Get depreciation history' })
  async getDepreciation(@Param('id') id: string) { return this.service.getDepreciationHistory(id); }
}
