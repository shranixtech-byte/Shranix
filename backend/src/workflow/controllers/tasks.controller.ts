import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TaskEngineService } from '../services/task-engine.service';

@ApiTags('Workflow - Tasks')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('workflow/tasks')
export class TasksController {
  constructor(private readonly taskEngine: TaskEngineService) {}

  @Get()
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'List workflow tasks' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignedToId', required: false })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('assignedToId') assignedToId?: string,
  ) {
    return this.taskEngine.findAll(Number(page) || 1, Number(limit) || 50, { status, assignedToId });
  }

  @Get('my')
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'Get my pending tasks' })
  @HttpCode(HttpStatus.OK)
  async getMyTasks(@CurrentUser() u: { id: string }) {
    return this.taskEngine.findPendingByUser(u?.id);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'Get task by ID' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.taskEngine.findById(id);
  }

  @Post(':id/complete')
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.create')
  @ApiOperation({ summary: 'Mark task as completed' })
  @HttpCode(HttpStatus.OK)
  async completeTask(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.taskEngine.completeTask(id, u?.id, 'completed');
  }

  @Post(':id/delegate')
  @Roles('admin', 'manager')
  @Permissions('workflow.create')
  @ApiOperation({ summary: 'Delegate task to another user' })
  @HttpCode(HttpStatus.OK)
  async delegateTask(
    @Param('id') id: string,
    @Body() dto: { toUserId: string },
    @CurrentUser() u: { id: string },
  ) {
    return this.taskEngine.delegateTask(id, u?.id, dto.toUserId);
  }

  @Post('mark-overdue')
  @Roles('admin')
  @Permissions('workflow.create')
  @ApiOperation({ summary: 'Mark overdue tasks' })
  @HttpCode(HttpStatus.OK)
  async markOverdue() {
    const count = await this.taskEngine.markOverdue();
    return { message: `${count} tasks marked as overdue` };
  }
}
