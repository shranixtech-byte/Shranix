import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LeaveRequestsService } from '../services/leave-requests.service';

@ApiTags('HR')
@Controller('hr/leave-requests')
@UseGuards(JwtAuthGuard)
export class LeaveRequestsController {
  constructor(private readonly service: LeaveRequestsService) {}

  @Post() @Permissions('hr.leave.create') @ApiOperation({ summary: 'Create leave request' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) { return this.service.create(body, userId); }

  @Get() @Permissions('hr.leave.read') @ApiOperation({ summary: 'List leave requests' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20, @Query('status') status?: string) {
    return this.service.findAll({ page: Number(page), pageSize: Number(pageSize), status });
  }

  @Get(':id') @Permissions('hr.leave.read') async findById(@Param('id') id: string) { return this.service.findById(id); }

  @Put(':id') @Permissions('hr.leave.update') @ApiOperation({ summary: 'Update leave request' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) { return this.service.update(id, body, userId); }

  @Delete(':id') @Permissions('hr.leave.delete') @ApiOperation({ summary: 'Delete leave request' })
  async delete(@Param('id') id: string) { await this.service.softDelete(id); return { deleted: true }; }

  @Post(':id/approve') @Permissions('hr.leave.approve') @ApiOperation({ summary: 'Approve leave request' })
  async approve(@Param('id') id: string, @CurrentUser('id') userId: string) { return this.service.approve(id, userId); }

  @Post(':id/reject') @Permissions('hr.leave.reject') @ApiOperation({ summary: 'Reject leave request' })
  async reject(@Param('id') id: string, @CurrentUser('id') userId: string) { return this.service.reject(id, userId); }
}
