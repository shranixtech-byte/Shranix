import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OpportunitiesService } from '../services/opportunities.service';

@ApiTags('CRM')
@Controller('crm/opportunities')
@UseGuards(JwtAuthGuard)
export class OpportunitiesController {
  constructor(private readonly service: OpportunitiesService) {}

  @Post() @Permissions('crm.opportunity.create') @ApiOperation({ summary: 'Create opportunity' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) { return this.service.create(body, userId); }

  @Get() @Permissions('crm.opportunity.read') @ApiOperation({ summary: 'List opportunities' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20, @Query('stage') stage?: string) {
    return this.service.findAll({ page: Number(page), pageSize: Number(pageSize), stage });
  }

  @Get(':id') @Permissions('crm.opportunity.read') async findById(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('crm.opportunity.update') @ApiOperation({ summary: 'Update opportunity' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) { return this.service.update(id, body, userId); }

  @Delete(':id') @Permissions('crm.opportunity.delete') @ApiOperation({ summary: 'Delete opportunity' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) { await this.service.softDelete(id, userId); return { deleted: true }; }

  @Put(':id/stage') @Permissions('crm.opportunity.update') @ApiOperation({ summary: 'Update opportunity stage' })
  async updateStage(@Param('id') id: string, @Body() body: { stage: string }, @CurrentUser('id') userId: string) { return this.service.updateStage(id, body.stage, userId); }
}
