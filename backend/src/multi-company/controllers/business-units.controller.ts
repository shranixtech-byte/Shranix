import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessUnitsService } from '../services/business-units.service';

@ApiTags('Multi-Company')
@Controller('business-units')
@UseGuards(JwtAuthGuard)
export class BusinessUnitsController {
  constructor(private readonly service: BusinessUnitsService) {}
  @Post() @Permissions('company.business_unit.create') @ApiOperation({ summary: 'Create business unit' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) { return this.service.create(body, userId); }
  @Get() @Permissions('company.business_unit.read') @ApiOperation({ summary: 'List business units' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20) { return this.service.findAll({ page: Number(page), pageSize: Number(pageSize) }); }
  @Get(':id') @Permissions('company.business_unit.read') async findById(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Permissions('company.business_unit.update') async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) { return this.service.update(id, body, userId); }
  @Delete(':id') @Permissions('company.business_unit.delete') async delete(@Param('id') id: string) { await this.service.softDelete(id); return { deleted: true }; }
}
