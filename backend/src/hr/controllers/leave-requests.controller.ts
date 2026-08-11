import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LeaveRequestsService } from '../services/leave.service';

@ApiTags('HR')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hr/leave')
export class LeaveRequestsController {
  constructor(private readonly service: LeaveRequestsService) {}

  @Get('balances')
  @Permissions('hr.view')
  @ApiOperation({ summary: 'Leave balances for an employee' })
  @HttpCode(HttpStatus.OK)
  async balances(@Query('employeeId') employeeId: string) {
    return this.service.balances(employeeId);
  }

  @Post('allocate')
  @Permissions('hr.leave')
  @ApiOperation({ summary: 'Allocate leave days (opening or annual)' })
  @HttpCode(HttpStatus.OK)
  async allocate(
    @Body() body: { employeeId: string; leaveType: string; days: number; opening?: boolean },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.allocate(
      body.employeeId,
      body.leaveType,
      Number(body.days) || 0,
      body.opening === true,
      userId,
    );
  }

  @Post()
  @Permissions('hr.leave')
  @ApiOperation({ summary: 'Submit leave request' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('hr.view')
  @ApiOperation({ summary: 'List leave requests' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('ps') ps?: number,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('leaveType') leaveType?: string,
  ) {
    return this.service.findAll({
      page: Number(page) || 1,
      pageSize: Number(ps) || 20,
      employeeId,
      status,
      leaveType,
    });
  }

  @Get(':id')
  @Permissions('hr.view')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post(':id/approve')
  @Permissions('hr.leave.approve')
  @ApiOperation({ summary: 'Approve leave request' })
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @Body() body: { remarks?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.approve(id, userId, body?.remarks);
  }

  @Post(':id/reject')
  @Permissions('hr.leave.approve')
  @ApiOperation({ summary: 'Reject leave request' })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @Body() body: { remarks?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.reject(id, userId, body?.remarks);
  }

  @Post(':id/cancel')
  @Permissions('hr.leave')
  @ApiOperation({ summary: 'Cancel leave request' })
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.cancel(id, userId);
  }

  @Delete(':id')
  @Permissions('hr.leave')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.softDelete(id, userId);
  }
}
