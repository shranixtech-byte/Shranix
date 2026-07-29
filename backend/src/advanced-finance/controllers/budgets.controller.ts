import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BudgetsService } from '../services/budgets.service';

@ApiTags('Advanced Finance')
@Controller('finance/budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  @Post() @Permissions('finance.budget.create') @ApiOperation({ summary: 'Create budget' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) { return this.service.create(body, userId); }

  @Get() @Permissions('finance.budget.read') @ApiOperation({ summary: 'List budgets' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20, @Query('fiscalYear') fiscalYear?: string) {
    return this.service.findAll({ page: Number(page), pageSize: Number(pageSize), fiscalYear });
  }

  @Get(':id') @Permissions('finance.budget.read') async findById(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('finance.budget.update') @ApiOperation({ summary: 'Update budget' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) { return this.service.update(id, body, userId); }

  @Delete(':id') @Permissions('finance.budget.delete') @ApiOperation({ summary: 'Delete budget' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) { await this.service.softDelete(id, userId); return { deleted: true }; }

  @Post(':id/approve') @Permissions('finance.budget.approve') @ApiOperation({ summary: 'Approve budget' })
  async approve(@Param('id') id: string, @CurrentUser('id') userId: string) { return this.service.approve(id, userId); }

  @Get(':id/variance') @Permissions('finance.budget.read') @ApiOperation({ summary: 'Get budget variance' })
  async variance(@Param('id') id: string) { return this.service.calculateVariance(id); }
}
