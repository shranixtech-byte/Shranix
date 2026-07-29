import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApprovalMatrixService } from '../services/approval-matrix.service';

@ApiTags('Workflow - Approval Matrix')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('workflow/approval-matrix')
export class ApprovalController {
  constructor(private readonly service: ApprovalMatrixService) {}

  @Post()
  @Roles('admin')
  @Permissions('workflow.create')
  @ApiOperation({ summary: 'Create approval matrix entry' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: any, @CurrentUser() u: { id: string }) {
    return this.service.create(dto, u?.id);
  }

  @Get()
  @Roles('admin', 'manager')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'List approval matrix entries' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'documentType', required: false })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('module') module?: string,
    @Query('documentType') docType?: string,
  ) {
    return this.service.findAll(Number(page) || 1, Number(limit) || 50, undefined, module, docType);
  }

  @Get(':id')
  @Roles('admin', 'manager')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'Get approval matrix entry by ID' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @Roles('admin')
  @Permissions('workflow.update')
  @ApiOperation({ summary: 'Update approval matrix entry' })
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: { id: string }) {
    return this.service.update(id, dto, u?.id);
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('workflow.delete')
  @ApiOperation({ summary: 'Delete approval matrix entry' })
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.delete(id, u?.id);
  }
}
