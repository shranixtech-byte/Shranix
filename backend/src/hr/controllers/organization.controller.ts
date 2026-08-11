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
import {
  DepartmentsService,
  DesignationsService,
  HolidaysService,
  ShiftsService,
} from '../services/organization.service';

@ApiTags('HR')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hr/departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Post()
  @Permissions('hr.employee.create')
  @ApiOperation({ summary: 'Create department' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('hr.view')
  @ApiOperation({ summary: 'List departments' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('ps') ps?: number,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({ page: Number(page) || 1, pageSize: Number(ps) || 50, search });
  }

  @Get(':id')
  @Permissions('hr.view')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @Permissions('hr.employee.update')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Delete(':id')
  @Permissions('hr.employee.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.softDelete(id, userId);
  }
}

@ApiTags('HR')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hr/designations')
export class DesignationsController {
  constructor(private readonly service: DesignationsService) {}

  @Post()
  @Permissions('hr.employee.create')
  @ApiOperation({ summary: 'Create designation' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('hr.view')
  @ApiOperation({ summary: 'List designations' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('ps') ps?: number,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.service.findAll({
      page: Number(page) || 1,
      pageSize: Number(ps) || 50,
      search,
      departmentId,
    });
  }

  @Get(':id')
  @Permissions('hr.view')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @Permissions('hr.employee.update')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Delete(':id')
  @Permissions('hr.employee.delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.softDelete(id, userId);
  }
}

@ApiTags('HR')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hr/shifts')
export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  @Post()
  @Permissions('hr.attendance')
  @ApiOperation({ summary: 'Create shift' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any) {
    return this.service.create(body);
  }

  @Get()
  @Permissions('hr.view')
  @ApiOperation({ summary: 'List shifts' })
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') page?: number, @Query('ps') ps?: number) {
    return this.service.findAll({ page: Number(page) || 1, pageSize: Number(ps) || 50 });
  }

  @Put(':id')
  @Permissions('hr.attendance.edit')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Permissions('hr.attendance.edit')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}

@ApiTags('HR')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hr/holidays')
export class HolidaysController {
  constructor(private readonly service: HolidaysService) {}

  @Post()
  @Permissions('hr.attendance')
  @ApiOperation({ summary: 'Create holiday' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('hr.view')
  @ApiOperation({ summary: 'List holidays' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('ps') ps?: number,
    @Query('year') year?: string,
  ) {
    return this.service.findAll({ page: Number(page) || 1, pageSize: Number(ps) || 100, year });
  }

  @Delete(':id')
  @Permissions('hr.attendance.edit')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.softDelete(id, userId);
  }
}
