import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubscriptionsService } from '../services/subscriptions.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get()
  @Permissions('commercial.view')
  @ApiOperation({ summary: 'List subscriptions' })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      customerId,
      search,
    });
  }

  @Get(':id')
  @Permissions('commercial.view')
  @ApiOperation({ summary: 'Get subscription' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/history')
  @Permissions('commercial.view')
  @ApiOperation({ summary: 'Subscription lifecycle history' })
  async getHistory(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  @Post()
  @Permissions('commercial.subscriptions')
  @ApiOperation({ summary: 'Create subscription (admin)' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Post(':id/activate')
  @Permissions('commercial.subscriptions')
  @ApiOperation({ summary: 'Activate subscription (post-payment or manual)' })
  async activate(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.activate(id, userId);
  }

  @Post(':id/renew')
  @Permissions('commercial.subscriptions')
  @ApiOperation({ summary: 'Renew subscription (extends + invoice)' })
  async renew(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.renew(id, { userId });
  }

  @Post(':id/upgrade')
  @Permissions('commercial.subscriptions')
  @ApiOperation({ summary: 'Upgrade plan (immediate or scheduled)' })
  async upgrade(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.upgrade(id, { ...body, userId });
  }

  @Post(':id/downgrade')
  @Permissions('commercial.subscriptions')
  @ApiOperation({ summary: 'Downgrade plan (immediate or scheduled)' })
  async downgrade(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.downgrade(id, { ...body, userId });
  }

  @Post(':id/cancel')
  @Permissions('commercial.subscriptions')
  @ApiOperation({ summary: 'Cancel subscription (immediate or end of period)' })
  async cancel(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.cancel(id, { ...body, userId });
  }
}
