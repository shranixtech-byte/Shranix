import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RetentionPoliciesService } from '../services/retention-policies.service';

@ApiTags('Governance')
@Controller('governance/retention-policies')
@UseGuards(JwtAuthGuard)
export class RetentionPoliciesController {
  constructor(private readonly service: RetentionPoliciesService) {}

  @Post() @Permissions('governance.retention.create') @ApiOperation({ summary: 'Create retention policy' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) { return this.service.create(body, userId); }

  @Get() @Permissions('governance.retention.read') @ApiOperation({ summary: 'List retention policies' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20) { return this.service.findAll({ page: Number(page), pageSize: Number(pageSize) }); }

  @Get(':id') @Permissions('governance.retention.read') async findById(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('governance.retention.update') @ApiOperation({ summary: 'Update retention policy' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) { return this.service.update(id, body, userId); }

  @Delete(':id') @Permissions('governance.retention.delete') @ApiOperation({ summary: 'Delete retention policy' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) { await this.service.delete(id, userId); return { deleted: true }; }
}
