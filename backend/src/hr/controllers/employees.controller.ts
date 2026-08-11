import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmployeesService } from '../services/employees.service';

@ApiTags('HR')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hr/employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get('dashboard')
  @Permissions('hr.view')
  @ApiOperation({ summary: 'HR dashboard KPIs and charts' })
  @HttpCode(HttpStatus.OK)
  async dashboard() {
    return this.service.dashboard();
  }

  @Get('reports')
  @Permissions('hr.report')
  @ApiOperation({ summary: 'Employee register report' })
  @HttpCode(HttpStatus.OK)
  async reports(@Query('status') status?: string, @Query('departmentId') departmentId?: string) {
    return this.service.reports({ status, departmentId });
  }

  @Get('next-code')
  @Permissions('hr.employee.create')
  @ApiOperation({ summary: 'Next auto employee code (EMP-000001)' })
  @HttpCode(HttpStatus.OK)
  async nextCode() {
    return { nextCode: await this.service.nextEmployeeCode() };
  }

  @Post()
  @Permissions('hr.employee.create')
  @ApiOperation({ summary: 'Create employee' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('hr.view')
  @ApiOperation({ summary: 'List employees' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('ps') ps?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
    @Query('designationId') designationId?: string,
    @Query('employmentType') employmentType?: string,
  ) {
    return this.service.findAll({
      page: Number(page) || 1,
      pageSize: Number(ps) || 20,
      search,
      status,
      departmentId,
      designationId,
      employmentType,
    });
  }

  @Get(':id')
  @Permissions('hr.view')
  @ApiOperation({ summary: 'Employee detail with timeline' })
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @Permissions('hr.employee.update')
  @ApiOperation({ summary: 'Update employee' })
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Post(':id/map-user')
  @Permissions('hr.employee.update')
  @ApiOperation({ summary: 'Map an ERP user to an employee' })
  @HttpCode(HttpStatus.OK)
  async mapUser(
    @Param('id') id: string,
    @Body() body: { userId?: string; username?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.mapUser(id, body?.userId || userId, body?.username);
  }

  @Delete(':id')
  @Permissions('hr.employee.delete')
  @ApiOperation({ summary: 'Delete employee (soft)' })
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.softDelete(id, userId);
  }
}
