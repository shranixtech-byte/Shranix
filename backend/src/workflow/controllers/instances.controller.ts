import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkflowInstancesService, StartWorkflowDto, ExecuteActionDto } from '../services/instances.service';

@ApiTags('Workflow - Instances')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('workflow/instances')
export class WorkflowInstancesController {
  constructor(private readonly service: WorkflowInstancesService) {}

  @Post()
  @Roles('admin', 'manager')
  @Permissions('workflow.create')
  @ApiOperation({ summary: 'Start a new workflow instance' })
  @HttpCode(HttpStatus.CREATED)
  async startWorkflow(@Body() dto: StartWorkflowDto, @CurrentUser() u: { id: string }) {
    return this.service.startWorkflow(dto, u?.id);
  }

  @Get()
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'List workflow instances' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'module', required: false })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('module') module?: string,
  ) {
    return this.service.findAll(Number(page) || 1, Number(limit) || 50, undefined, { status, module });
  }

  @Get(':id')
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'Get workflow instance by ID' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get('by-document/:docType/:docId')
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'Get workflow by document type and ID' })
  @HttpCode(HttpStatus.OK)
  async findByDocument(@Param('docType') docType: string, @Param('docId') docId: string) {
    return this.service.findByDocument(docType, docId);
  }

  @Post(':id/actions')
  @Roles('admin', 'manager')
  @Permissions('workflow.create')
  @ApiOperation({ summary: 'Execute a workflow action (submit, approve, reject, return, etc.)' })
  @HttpCode(HttpStatus.OK)
  async executeAction(
    @Param('id') id: string,
    @Body() dto: ExecuteActionDto,
    @CurrentUser() u: { id: string },
  ) {
    const fullDto: ExecuteActionDto = {
      ...dto,
      userId: u?.id || dto.userId,
    };
    return this.service.executeAction(id, fullDto);
  }

  @Get(':id/state')
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'Get workflow state with available actions and history' })
  @HttpCode(HttpStatus.OK)
  async getWorkflowState(@Param('id') id: string) {
    return this.service.getWorkflowState(id);
  }

  @Get(':id/history')
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'Get workflow history' })
  @HttpCode(HttpStatus.OK)
  async getHistory(@Param('id') id: string) {
    return this.service.getHistory(id);
  }
}
