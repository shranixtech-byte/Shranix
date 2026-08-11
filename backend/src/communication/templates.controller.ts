import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { TemplateEngineService } from './template-engine.service';

@ApiTags('Communication - Templates')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('communications/templates')
export class CommunicationTemplatesController {
  constructor(private readonly templates: TemplateEngineService) {}

  @Get()
  @Roles('admin', 'manager', 'accountant', 'employee')
  @Permissions('communication.view')
  @ApiOperation({ summary: 'List communication templates' })
  @HttpCode(HttpStatus.OK)
  async list(
    @Query('page') page?: number,
    @Query('ps') ps?: number,
    @Query('channel') channel?: string,
    @Query('search') search?: string,
  ) {
    return this.templates.list({
      page: Number(page) || 1,
      pageSize: Number(ps) || 50,
      channel,
      search,
    });
  }

  @Get(':id')
  @Roles('admin', 'manager', 'accountant', 'employee')
  @Permissions('communication.view')
  @ApiOperation({ summary: 'Get a template' })
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.templates.findById(id);
  }

  @Post()
  @Roles('admin', 'manager')
  @Permissions('communication.template')
  @ApiOperation({ summary: 'Create a template' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @CurrentUser() u: { id: string }) {
    return this.templates.create(body, u?.id);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('communication.template')
  @ApiOperation({ summary: 'Update a template' })
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() u: { id: string }) {
    return this.templates.update(id, body, u?.id);
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('communication.template')
  @ApiOperation({ summary: 'Delete a template (soft)' })
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.templates.remove(id, u?.id);
  }
}
