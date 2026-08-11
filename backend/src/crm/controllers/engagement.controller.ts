import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ActivitiesService,
  CallLogsService,
  CrmNotesService,
  CrmTasksService,
  FollowUpsService,
  MeetingsService,
} from '../services/engagement.service';

// ═══════════════════════════════════════════════════════════════════
// FOLLOW-UPS
// ═══════════════════════════════════════════════════════════════════
@ApiTags('CRM - Follow-ups')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/follow-ups')
export class FollowUpsController {
  constructor(private readonly service: FollowUpsService) {}

  @Post()
  @Permissions('crm.followup.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Schedule a follow-up' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('crm.followup.read')
  @ApiOperation({ summary: 'List follow-ups' })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('status') status?: string,
    @Query('leadId') leadId?: string,
    @Query('customerId') customerId?: string,
    @Query('salesperson') salesperson?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      leadId,
      customerId,
      salesperson,
      dateFrom,
      dateTo,
    });
  }

  @Get('reminders')
  @Permissions('crm.followup.read')
  @ApiOperation({ summary: 'Reminder buckets — upcoming / due today / overdue / missed' })
  async reminders() {
    return this.service.reminders();
  }

  @Put(':id')
  @Permissions('crm.followup.edit')
  @ApiOperation({ summary: 'Update follow-up' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Post(':id/complete')
  @Permissions('crm.followup.edit')
  @ApiOperation({ summary: 'Complete a follow-up (optionally creates the next one)' })
  async complete(
    @Param('id') id: string,
    @Body() body: { outcome?: string; nextFollowUpAt?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.complete(id, userId, body);
  }

  @Post(':id/missed')
  @Permissions('crm.followup.edit')
  @ApiOperation({ summary: 'Mark follow-up as missed' })
  async markMissed(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.markMissed(id, userId);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CRM TASKS
// ═══════════════════════════════════════════════════════════════════
@ApiTags('CRM - Tasks')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/tasks')
export class CrmTasksController {
  constructor(private readonly service: CrmTasksService) {}

  @Post()
  @Permissions('crm.task.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create CRM task' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('crm.task.read')
  @ApiOperation({ summary: 'List tasks' })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('status') status?: string,
    @Query('leadId') leadId?: string,
    @Query('customerId') customerId?: string,
    @Query('salesperson') salesperson?: string,
  ) {
    return this.service.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      leadId,
      customerId,
      salesperson,
    });
  }

  @Put(':id')
  @Permissions('crm.task.edit')
  @ApiOperation({ summary: 'Update task (status → completed sets timestamps)' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Delete(':id')
  @Permissions('crm.task.delete')
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.service.softDelete(id, userId);
    return { deleted: true };
  }
}

// ═══════════════════════════════════════════════════════════════════
// CALL LOGS
// ═══════════════════════════════════════════════════════════════════
@ApiTags('CRM - Call Logs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/calls')
export class CallLogsController {
  constructor(private readonly service: CallLogsService) {}

  @Post()
  @Permissions('crm.followup.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log a call' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('crm.followup.read')
  @ApiOperation({ summary: 'List call logs' })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('leadId') leadId?: string,
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      leadId,
      customerId,
      dateFrom,
      dateTo,
    });
  }

  @Put(':id')
  @Permissions('crm.followup.edit')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }
}

// ═══════════════════════════════════════════════════════════════════
// MEETINGS
// ═══════════════════════════════════════════════════════════════════
@ApiTags('CRM - Meetings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/meetings')
export class MeetingsController {
  constructor(private readonly service: MeetingsService) {}

  @Post()
  @Permissions('crm.followup.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Schedule a meeting' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('crm.followup.read')
  @ApiOperation({ summary: 'List meetings' })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('status') status?: string,
    @Query('leadId') leadId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.service.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      leadId,
      customerId,
    });
  }

  @Put(':id')
  @Permissions('crm.followup.edit')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CRM NOTES
// ═══════════════════════════════════════════════════════════════════
@ApiTags('CRM - Notes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/notes')
export class CrmNotesController {
  constructor(private readonly service: CrmNotesService) {}

  @Post()
  @Permissions('crm.lead.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an internal CRM note' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('crm.lead.read')
  @ApiOperation({ summary: 'List notes (filter by lead/customer/opportunity/quotation/order)' })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('leadId') leadId?: string,
    @Query('customerId') customerId?: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('quotationId') quotationId?: string,
    @Query('salesOrderId') salesOrderId?: string,
  ) {
    return this.service.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      leadId,
      customerId,
      opportunityId,
      quotationId,
      salesOrderId,
    });
  }

  @Delete(':id')
  @Permissions('crm.lead.delete')
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.service.softDelete(id, userId);
    return { deleted: true };
  }
}

// ═══════════════════════════════════════════════════════════════════
// ACTIVITY TIMELINE + CUSTOMER 360
// ═══════════════════════════════════════════════════════════════════
@ApiTags('CRM - Activities')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm')
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Get('activities')
  @Permissions('crm.lead.read')
  @ApiOperation({ summary: 'Unified activity timeline (filter by lead or customer)' })
  async timeline(
    @Query('leadId') leadId?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
  ) {
    return this.service.timeline({
      leadId,
      customerId,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get('customers/:id/360')
  @Permissions('crm.lead.read')
  @ApiOperation({ summary: 'Customer 360 — customer + transactions + CRM engagement + timeline' })
  async customer360(@Param('id') id: string) {
    return this.service.customer360(id);
  }
}
