import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompaniesService } from '../services/companies.service';

@ApiTags('Multi-Company')
@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Post()
  @Permissions('company.create')
  @ApiOperation({ summary: 'Create a new company' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('company.read')
  @ApiOperation({ summary: 'List all companies' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20, @Query('search') search?: string) {
    return this.service.findAll({ page: Number(page), pageSize: Number(pageSize), search });
  }

  @Get(':id')
  @Permissions('company.read')
  @ApiOperation({ summary: 'Get company by ID' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @Permissions('company.update')
  @ApiOperation({ summary: 'Update a company' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Delete(':id')
  @Permissions('company.delete')
  @ApiOperation({ summary: 'Soft delete a company' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.service.softDelete(id, userId);
    return { deleted: true };
  }

  @Post(':id/switch')
  @Permissions('company.switch')
  @ApiOperation({ summary: 'Switch active company context' })
  async switchCompany(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.service.switchCompany(userId, id);
    return { switched: true, companyId: id };
  }
}
