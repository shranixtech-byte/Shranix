import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DesignationsService } from '../services/designations.service';

@ApiTags('HR')
@Controller('hr/designations')
@UseGuards(JwtAuthGuard)
export class DesignationsController {
  constructor(private readonly service: DesignationsService) {}

  @Post() @Permissions('hr.designation.create') @ApiOperation({ summary: 'Create designation' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) { return this.service.create(body, userId); }

  @Get() @Permissions('hr.designation.read') @ApiOperation({ summary: 'List designations' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20) { return this.service.findAll({ page: Number(page), pageSize: Number(pageSize) }); }

  @Get(':id') @Permissions('hr.designation.read') async findById(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Permissions('hr.designation.update') @ApiOperation({ summary: 'Update designation' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) { return this.service.update(id, body, userId); }
  @Delete(':id') @Permissions('hr.designation.delete') @ApiOperation({ summary: 'Delete designation' })
  async delete(@Param('id') id: string) { await this.service.softDelete(id); return { deleted: true }; }
}
