import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WebhooksService } from '../services/webhooks.service';

@ApiTags('Integrations')
@Controller('integrations/webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post()
  @Permissions('integration.webhook.create')
  @ApiOperation({ summary: 'Create webhook' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Get()
  @Permissions('integration.webhook.read')
  @ApiOperation({ summary: 'List webhooks' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20) {
    return this.service.findAll({ page: Number(page), pageSize: Number(pageSize) });
  }

  @Get(':id') @Permissions('integration.webhook.read') async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @Permissions('integration.webhook.update')
  @ApiOperation({ summary: 'Update webhook' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Delete(':id')
  @Permissions('integration.webhook.delete')
  @ApiOperation({ summary: 'Delete webhook' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.service.delete(id, userId);
    return { deleted: true };
  }

  @Post(':id/test')
  @Permissions('integration.webhook.test')
  @ApiOperation({ summary: 'Test webhook delivery' })
  async test(@Param('id') id: string) {
    return this.service.test(id);
  }
}
