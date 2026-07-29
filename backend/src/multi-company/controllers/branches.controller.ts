import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BranchesService } from '../services/branches.service';

@ApiTags('Multi-Company')
@Controller('branches')
@UseGuards(JwtAuthGuard)
export class BranchesController {
  constructor(private readonly service: BranchesService) {}

  @Post() @Permissions('branch.create') @ApiOperation({ summary: 'Create branch' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) { return this.service.create(body, userId); }

  @Get() @Permissions('branch.read') @ApiOperation({ summary: 'List branches' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20, @Query('companyId') companyId?: string) {
    return this.service.findAll({ page: Number(page), pageSize: Number(pageSize), companyId });
  }

  @Get(':id') @Permissions('branch.read') @ApiOperation({ summary: 'Get branch by ID' })
  async findById(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('branch.update') @ApiOperation({ summary: 'Update branch' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) { return this.service.update(id, body, userId); }

  @Delete(':id') @Permissions('branch.delete') @ApiOperation({ summary: 'Delete branch' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) { await this.service.softDelete(id, userId); return { deleted: true }; }
}
