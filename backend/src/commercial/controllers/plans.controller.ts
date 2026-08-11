import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlansService } from '../services/plans.service';

@ApiTags('Commercial Plans')
@Controller('commercial/plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(private readonly service: PlansService) {}

  @Get()
  @Permissions('commercial.view')
  @ApiOperation({ summary: 'List commercial plans' })
  async findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.service.findAll({ status, search });
  }

  @Get('matrix')
  @Permissions('commercial.view')
  @ApiOperation({ summary: 'Plan feature matrix' })
  async getMatrix() {
    return this.service.getMatrix();
  }

  @Get('public')
  @Permissions('commercial.view')
  @ApiOperation({ summary: 'Public sellable plans' })
  async getPublic() {
    return this.service.getPublicPlans();
  }

  @Get(':id')
  @Permissions('commercial.view')
  @ApiOperation({ summary: 'Get plan with versions' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Permissions('commercial.manage')
  @ApiOperation({ summary: 'Create plan with initial version' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Put(':id')
  @Permissions('commercial.manage')
  @ApiOperation({ summary: 'Update plan master fields' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Post(':id/version')
  @Permissions('commercial.manage')
  @ApiOperation({ summary: 'Create a new plan version (supersedes active)' })
  async createVersion(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.createVersion(id, body, userId);
  }

  @Post(':id/status')
  @Permissions('commercial.manage')
  @ApiOperation({ summary: 'Activate/deactivate plan' })
  async setStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.setStatus(id, body.status, userId);
  }
}
