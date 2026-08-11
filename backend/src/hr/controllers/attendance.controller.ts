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
import { AttendanceService } from '../services/attendance.service';

@ApiTags('HR')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hr/attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post()
  @Permissions('hr.attendance')
  @ApiOperation({ summary: 'Mark attendance (upsert per employee+date)' })
  @HttpCode(HttpStatus.CREATED)
  async mark(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.mark(body, userId);
  }

  @Get('summary')
  @Permissions('hr.view')
  @ApiOperation({ summary: 'Daily attendance summary' })
  @HttpCode(HttpStatus.OK)
  async summary(@Query('date') date?: string) {
    return this.service.dailySummary(date || new Date().toISOString().slice(0, 10));
  }

  @Get()
  @Permissions('hr.view')
  @ApiOperation({ summary: 'List attendance with filters' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('ps') ps?: number,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('month') month?: string,
  ) {
    return this.service.findAll({
      page: Number(page) || 1,
      pageSize: Number(ps) || 50,
      employeeId,
      status,
      dateFrom,
      dateTo,
      month,
    });
  }

  @Delete(':id')
  @Permissions('hr.attendance.edit')
  @ApiOperation({ summary: 'Delete attendance record' })
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.remove(id, userId);
  }
}
