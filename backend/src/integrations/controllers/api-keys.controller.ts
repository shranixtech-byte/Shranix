import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiKeysService } from '../services/api-keys.service';

@ApiTags('Integrations')
@Controller('integrations/api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly service: ApiKeysService) {}

  @Post() @Permissions('integration.api_key.create') @ApiOperation({ summary: 'Create API key' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) { return this.service.create(body, userId); }
  @Get() @Permissions('integration.api_key.read') @ApiOperation({ summary: 'List API keys' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20) { return this.service.findAll({ page: Number(page), pageSize: Number(pageSize) }); }
  @Get(':id') @Permissions('integration.api_key.read') async findById(@Param('id') id: string) { return this.service.findById(id); }
  @Put(':id') @Permissions('integration.api_key.update') @ApiOperation({ summary: 'Update API key' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) { return this.service.update(id, body, userId); }
  @Delete(':id') @Permissions('integration.api_key.delete') @ApiOperation({ summary: 'Delete API key' })
  async delete(@Param('id') id: string) { await this.service.delete(id); return { deleted: true }; }
}
