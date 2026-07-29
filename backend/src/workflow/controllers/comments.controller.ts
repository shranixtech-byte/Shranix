import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CommentsService } from '../services/comments.service';

@ApiTags('Workflow - Comments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('workflow/comments')
export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  @Get('instance/:instanceId')
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.read')
  @ApiOperation({ summary: 'Get comments for a workflow instance' })
  @HttpCode(HttpStatus.OK)
  async findByInstance(@Param('instanceId') instanceId: string) {
    return this.service.findByInstance(instanceId);
  }

  @Post()
  @Roles('admin', 'manager', 'employee')
  @Permissions('workflow.create')
  @ApiOperation({ summary: 'Add a comment to a workflow instance' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: any, @CurrentUser() u: { id: string }) {
    return this.service.createComment({
      ...dto,
      userId: u?.id || dto.userId,
    });
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('workflow.delete')
  @ApiOperation({ summary: 'Delete a comment' })
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    return this.service.deleteComment(id);
  }
}
