import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmployeesService } from '../services/employees.service';

@ApiTags('HR')
@Controller('hr/employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Post() @Permissions('hr.employee.create') @ApiOperation({ summary: 'Create employee' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) { return this.service.create(body, userId); }

  @Get() @Permissions('hr.employee.read') @ApiOperation({ summary: 'List employees' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20, @Query('status') status?: string) {
    return this.service.findAll({ page: Number(page), pageSize: Number(pageSize), status });
  }

  @Get(':id') @Permissions('hr.employee.read') async findById(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('hr.employee.update') @ApiOperation({ summary: 'Update employee' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) { return this.service.update(id, body, userId); }

  @Delete(':id') @Permissions('hr.employee.delete') @ApiOperation({ summary: 'Delete employee' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) { await this.service.softDelete(id, userId); return { deleted: true }; }
}
