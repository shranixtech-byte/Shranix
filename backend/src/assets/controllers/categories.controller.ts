import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AssetCategoriesService } from '../services/categories.service';

@ApiTags('Asset Categories')
@Controller('asset-categories')
@UseGuards(JwtAuthGuard)
export class AssetCategoriesController {
  constructor(private readonly service: AssetCategoriesService) {}

  @Get()
  @Permissions('asset.view')
  @ApiOperation({ summary: 'List asset categories' })
  async findAll() {
    return this.service.findAll();
  }

  @Post()
  @Permissions('asset.create')
  @ApiOperation({ summary: 'Create asset category' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Put(':id')
  @Permissions('asset.edit')
  @ApiOperation({ summary: 'Update asset category' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Delete(':id')
  @Permissions('asset.edit')
  @ApiOperation({ summary: 'Delete asset category' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.softDelete(id, userId);
  }
}
