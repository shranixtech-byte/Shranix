import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LegalHoldsService } from '../services/legal-holds.service';

@ApiTags('Governance')
@Controller('governance/legal-holds')
@UseGuards(JwtAuthGuard)
export class LegalHoldsController {
  constructor(private readonly service: LegalHoldsService) {}

  @Post() @Permissions('governance.legal_hold.create') @ApiOperation({ summary: 'Create legal hold' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) { return this.service.create(body, userId); }
  @Get() @Permissions('governance.legal_hold.read') @ApiOperation({ summary: 'List legal holds' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20) { return this.service.findAll({ page: Number(page), pageSize: Number(pageSize) }); }
  @Get(':id') @Permissions('governance.legal_hold.read') async findById(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Permissions('governance.legal_hold.update') @ApiOperation({ summary: 'Update legal hold' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) { return this.service.update(id, body, userId); }
  @Delete(':id') @Permissions('governance.legal_hold.delete') @ApiOperation({ summary: 'Delete legal hold' })
  async delete(@Param('id') id: string) { await this.service.delete(id); return { deleted: true }; }
}
