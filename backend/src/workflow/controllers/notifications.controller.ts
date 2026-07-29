import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EscalationEngineService } from '../services/escalation-engine.service';
import { NotificationEngineService } from '../services/notification-engine.service';

@ApiTags('Workflow - Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('workflow/notifications')
export class NotificationController {
  constructor(
    private readonly notificationEngine: NotificationEngineService,
    private readonly escalationEngine: EscalationEngineService,
  ) {}

  @Get()
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'unreadOnly', required: false })
  @HttpCode(HttpStatus.OK)
  async getNotifications(
    @CurrentUser() u: { id: string },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationEngine.getUserNotifications(u?.id, Number(page) || 1, Number(limit) || 20, unreadOnly === 'true');
  }

  @Get('unread-count')
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'Get unread notification count' })
  @HttpCode(HttpStatus.OK)
  async getUnreadCount(@CurrentUser() u: { id: string }) {
    return this.notificationEngine.getUnreadCount(u?.id);
  }

  @Post(':id/read')
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.create')
  @ApiOperation({ summary: 'Mark notification as read' })
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id') id: string) {
    return this.notificationEngine.markAsRead(id);
  }

  @Post('mark-all-read')
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.create')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() u: { id: string }) {
    return this.notificationEngine.markAllAsRead(u?.id);
  }

  @Post('escalation-rules')
  @Roles('admin')
  @Permissions('workflow.create')
  @ApiOperation({ summary: 'Create escalation rule' })
  @HttpCode(HttpStatus.CREATED)
  async createEscalationRule(@Body() dto: any, @CurrentUser() u: { id: string }) {
    return this.escalationEngine.createRule(dto, u?.id);
  }

  @Get('escalation-rules')
  @Roles('admin', 'manager')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'List escalation rules' })
  @HttpCode(HttpStatus.OK)
  async getEscalationRules() {
    return this.escalationEngine.findAllRules();
  }

  @Post('escalation-rules/process')
  @Roles('admin')
  @Permissions('workflow.create')
  @ApiOperation({ summary: 'Process escalations manually' })
  @HttpCode(HttpStatus.OK)
  async processEscalations() {
    return this.escalationEngine.processEscalations();
  }

  @Post('escalation-rules/:id')
  @Roles('admin')
  @Permissions('workflow.update')
  @ApiOperation({ summary: 'Update escalation rule' })
  @HttpCode(HttpStatus.OK)
  async updateEscalationRule(@Param('id') id: string, @Body() dto: any) {
    return this.escalationEngine.updateRule(id, dto);
  }

  @Post('escalation-rules/:id/delete')
  @Roles('admin')
  @Permissions('workflow.delete')
  @ApiOperation({ summary: 'Delete escalation rule' })
  @HttpCode(HttpStatus.OK)
  async deleteEscalationRule(@Param('id') id: string) {
    return this.escalationEngine.deleteRule(id);
  }
}
