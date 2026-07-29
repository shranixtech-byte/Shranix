import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DepartmentsService } from '../services/departments.service';

@ApiTags('Multi-Company')
@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}
  @Post() @Permissions('company.department.create') @ApiOperation({ summary: 'Create department' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) { return this.service.create(body, userId); }
  @Get() @Permissions('company.department.read') @ApiOperation({ summary: 'List departments' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20) { return this.service.findAll({ page: Number(page), pageSize: Number(pageSize) }); }
  @Get(':id') @Permissions('company.department.read') async findById(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Permissions('company.department.update') async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) { return this.service.update(id, body, userId); }
  @Delete(':id') @Permissions('company.department.delete') async delete(@Param('id') id: string) { await this.service.softDelete(id); return { deleted: true }; }
}
