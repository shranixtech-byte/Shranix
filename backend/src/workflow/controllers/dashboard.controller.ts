import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DatabaseService } from '../../database/database.service';
import { NotificationEngineService } from '../services/notification-engine.service';

@ApiTags('Workflow - Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('workflow/dashboard')
export class WorkflowDashboardController {
  constructor(
    private readonly database: DatabaseService,
    private readonly notificationEngine: NotificationEngineService,
  ) {}

  @Get()
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'Get workflow dashboard data' })
  @HttpCode(HttpStatus.OK)
  async getDashboard(@CurrentUser() u: { id: string }) {
    const instances = await this.database.workflowInstances.findAll({
      page: 1,
      pageSize: 1000,
    } as any);
    const tasks = await this.database.workflowTasks.findAll({ page: 1, pageSize: 1000 } as any);
    const rules = await this.database.escalationRules.findAll({ page: 1, pageSize: 100 } as any);

    const allInstances = (instances as any).data || [];
    const allTasks = (tasks as any).data || [];

    return {
      summary: {
        totalInstances: allInstances.length,
        activeInstances: allInstances.filter((i: any) => i.status === 'active').length,
        completedInstances: allInstances.filter((i: any) => i.status === 'completed').length,
        cancelledInstances: allInstances.filter((i: any) => i.status === 'cancelled').length,
      },
      tasks: {
        total: allTasks.length,
        pending: allTasks.filter((t: any) => t.status === 'pending').length,
        completed: allTasks.filter((t: any) => t.status === 'completed').length,
        overdue: allTasks.filter((t: any) => t.isOverdue).length,
        delegated: allTasks.filter((t: any) => t.status === 'delegated').length,
        myPending: allTasks.filter((t: any) => t.assignedToId === u?.id && t.status === 'pending')
          .length,
      },
      escalation: {
        totalRules: ((rules as any).data || []).length,
        activeRules: ((rules as any).data || []).filter((r: any) => r.isActive).length,
      },
      notifications: await this.notificationEngine.getUnreadCount(u?.id),
    };
  }

  @Get('my')
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'Get my personal workflow dashboard' })
  @HttpCode(HttpStatus.OK)
  async getMyDashboard(@CurrentUser() u: { id: string }) {
    // NOTE: `filters` array form — a plain `filter` object is silently ignored
    // and would return EVERY workflow instance/task (cross-user leak, H2).
    const myInstances = await this.database.workflowInstances.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'initiatorId', operator: 'eq', value: u?.id }],
    } as any);
    const myTasks = await this.database.workflowTasks.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'assignedToId', operator: 'eq', value: u?.id }],
    } as any);

    const instances = (myInstances as any).data || [];
    const tasks = (myTasks as any).data || [];

    return {
      myInstances: {
        total: instances.length,
        active: instances.filter((i: any) => i.status === 'active').length,
        completed: instances.filter((i: any) => i.status === 'completed').length,
      },
      myTasks: {
        total: tasks.length,
        pending: tasks.filter((t: any) => t.status === 'pending').length,
        completed: tasks.filter((t: any) => t.status === 'completed').length,
        overdue: tasks.filter((t: any) => t.isOverdue).length,
      },
    };
  }
}
