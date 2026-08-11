import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CouponsService } from '../services/coupons.service';

@ApiTags('Commercial Coupons')
@Controller('commercial/coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  @Get()
  @Permissions('commercial.coupons')
  @ApiOperation({ summary: 'List coupons' })
  async findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.service.findAll({ status, search });
  }

  @Get(':id')
  @Permissions('commercial.coupons')
  @ApiOperation({ summary: 'Get coupon' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Permissions('commercial.coupons')
  @ApiOperation({ summary: 'Create coupon' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Put(':id')
  @Permissions('commercial.coupons')
  @ApiOperation({ summary: 'Update coupon' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Delete(':id')
  @Permissions('commercial.coupons')
  @ApiOperation({ summary: 'Delete coupon' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.delete(id, userId);
  }

  @Post('validate')
  @Permissions('commercial.coupons')
  @ApiOperation({ summary: 'Validate a coupon for a customer/plan/amount' })
  async validate(@Body() body: any) {
    return this.service.validateCoupon(body);
  }
}
