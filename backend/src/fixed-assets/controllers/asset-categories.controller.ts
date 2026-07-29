import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AssetCategoriesService } from '../services/asset-categories.service';

@ApiTags('Fixed Assets')
@Controller('asset-categories')
@UseGuards(JwtAuthGuard)
export class AssetCategoriesController {
  constructor(private readonly service: AssetCategoriesService) {}

  @Post() @Permissions('asset.category.create') @ApiOperation({ summary: 'Create asset category' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) { return this.service.create(body, userId); }

  @Get() @Permissions('asset.category.read') @ApiOperation({ summary: 'List asset categories' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20) { return this.service.findAll({ page: Number(page), pageSize: Number(pageSize) }); }

  @Get(':id') @Permissions('asset.category.read') @ApiOperation({ summary: 'Get category by ID' }) async findById(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('asset.category.update') @ApiOperation({ summary: 'Update category' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) { return this.service.update(id, body, userId); }

  @Delete(':id') @Permissions('asset.category.delete') @ApiOperation({ summary: 'Delete category' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) { await this.service.softDelete(id, userId); return { deleted: true }; }
}
