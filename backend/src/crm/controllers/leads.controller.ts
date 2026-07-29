import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LeadsService } from '../services/leads.service';

@ApiTags('CRM')
@Controller('crm/leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Post() @Permissions('crm.lead.create') @ApiOperation({ summary: 'Create lead' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) { return this.service.create(body, userId); }

  @Get() @Permissions('crm.lead.read') @ApiOperation({ summary: 'List leads' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20, @Query('status') status?: string) {
    return this.service.findAll({ page: Number(page), pageSize: Number(pageSize), status });
  }

  @Get(':id') @Permissions('crm.lead.read') async findById(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('crm.lead.update') @ApiOperation({ summary: 'Update lead' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) { return this.service.update(id, body, userId); }

  @Delete(':id') @Permissions('crm.lead.delete') @ApiOperation({ summary: 'Delete lead' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) { await this.service.softDelete(id, userId); return { deleted: true }; }

  @Post(':id/convert') @Permissions('crm.lead.convert') @ApiOperation({ summary: 'Convert lead to customer' })
  async convert(@Param('id') id: string, @CurrentUser('id') userId: string) { return this.service.convertToCustomer(id, userId); }
}
