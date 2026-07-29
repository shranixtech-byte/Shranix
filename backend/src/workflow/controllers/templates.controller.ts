import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkflowTemplatesService } from '../services/templates.service';

@ApiTags('Workflow - Templates')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('workflow/templates')
export class WorkflowTemplatesController {
  constructor(private readonly service: WorkflowTemplatesService) {}

  @Post()
  @Roles('admin')
  @Permissions('workflow.create')
  @ApiOperation({ summary: 'Create a workflow template' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: any, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }

  @Get()
  @Roles('admin', 'manager')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'List workflow templates' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'module', required: false })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('module') module?: string,
  ) {
    return this.service.findAll(Number(page) || 1, Number(limit) || 50, search, module);
  }

  @Get(':id')
  @Roles('admin', 'manager')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'Get workflow template by ID' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @Roles('admin')
  @Permissions('workflow.update')
  @ApiOperation({ summary: 'Update workflow template' })
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: { id: string }) {
    return this.service.update(id, dto, u?.id);
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('workflow.delete')
  @ApiOperation({ summary: 'Soft delete workflow template' })
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }

  @Get('defaults/states')
  @Roles('admin', 'manager')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'Get default workflow states' })
  @HttpCode(HttpStatus.OK)
  async getDefaultStates() {
    return this.service.getDefaultStates();
  }

  @Get('defaults/transitions')
  @Roles('admin', 'manager')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'Get default workflow transitions' })
  @HttpCode(HttpStatus.OK)
  async getDefaultTransitions() {
    return this.service.getDefaultTransitions();
  }
}
