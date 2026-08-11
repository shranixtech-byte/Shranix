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
import { LeadsService } from '../services/leads.service';

@ApiTags('CRM - Leads')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Post()
  @Permissions('crm.lead.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create lead' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('crm.lead.read')
  @ApiOperation({ summary: 'List leads (search + filters)' })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('salesperson') salesperson?: string,
    @Query('priority') priority?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      status,
      source,
      salesperson,
      priority,
      dateFrom,
      dateTo,
    });
  }

  @Get('next-number')
  @Permissions('crm.lead.read')
  @ApiOperation({ summary: 'Next auto lead number' })
  async nextNumber() {
    return { nextNumber: await this.service.nextLeadNumber() };
  }

  @Get(':id')
  @Permissions('crm.lead.read')
  @ApiOperation({ summary: 'Lead detail with activities, follow-ups, tasks, notes, opportunities' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @Permissions('crm.lead.update')
  @ApiOperation({ summary: 'Update lead (status/assignment changes are logged)' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Delete(':id')
  @Permissions('crm.lead.delete')
  @ApiOperation({ summary: 'Delete lead' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.service.softDelete(id, userId);
    return { deleted: true };
  }

  @Post(':id/assign')
  @Permissions('crm.lead.assign')
  @ApiOperation({ summary: 'Assign/reassign lead to a salesperson' })
  async assign(
    @Param('id') id: string,
    @Body() body: { assignedTo: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.assign(id, userId, body.assignedTo);
  }

  @Post(':id/status')
  @Permissions('crm.lead.update')
  @ApiOperation({ summary: 'Move lead through pipeline statuses' })
  async changeStatus(
    @Param('id') id: string,
    @Body() body: { status: string; lostReason?: string; wonValue?: number },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.update(id, body, userId);
  }

  @Get(':id/duplicates')
  @Permissions('crm.lead.read')
  @ApiOperation({ summary: 'Find existing customers matching this lead (mobile/gstin/email/name)' })
  async duplicates(@Param('id') id: string) {
    const lead = await this.service.findById(id);
    return this.service.findDuplicateCustomers(lead);
  }

  @Post(':id/convert')
  @Permissions('crm.lead.convert')
  @ApiOperation({
    summary: 'Convert lead to customer (existing via matchCustomerId, or create new)',
  })
  async convert(
    @Param('id') id: string,
    @Body() body: { matchCustomerId?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.convert(id, userId, body.matchCustomerId);
  }
}
