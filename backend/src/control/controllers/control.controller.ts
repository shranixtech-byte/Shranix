import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessControlService } from '../services/business-control.service';
import { BusinessRulesService } from '../services/business-rules.service';
import { CustomFieldsService } from '../services/custom-fields.service';
import { GlobalSearchService } from '../services/global-search.service';
import { TagsService } from '../services/tags.service';

// ═════════════════════════════════════════════════════════
// BUSINESS RULES
// ═════════════════════════════════════════════════════════
@ApiTags('Business Rules')
@Controller('business-rules')
@UseGuards(JwtAuthGuard)
export class BusinessRulesController {
  constructor(private readonly service: BusinessRulesService) {}

  @Get()
  @Permissions('business_rules.view')
  @ApiOperation({ summary: 'List business rules' })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('module') module?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      module,
      status,
      search,
    });
  }

  @Get(':id')
  @Permissions('business_rules.view')
  @ApiOperation({ summary: 'Get business rule by ID' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Permissions('business_rules.create')
  @ApiOperation({ summary: 'Create business rule' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Post('evaluate')
  @Permissions('business_rules.view')
  @ApiOperation({ summary: 'Evaluate a document against active rules' })
  async evaluate(@Body() body: any) {
    return this.service.evaluate(body);
  }

  @Put(':id')
  @Permissions('business_rules.edit')
  @ApiOperation({ summary: 'Update business rule' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Delete(':id')
  @Permissions('business_rules.delete')
  @ApiOperation({ summary: 'Delete business rule' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.delete(id, userId);
  }
}

// ═════════════════════════════════════════════════════════
// CUSTOM FIELDS
// ═════════════════════════════════════════════════════════
@ApiTags('Custom Fields')
@Controller('custom-fields')
@UseGuards(JwtAuthGuard)
export class CustomFieldsController {
  constructor(private readonly service: CustomFieldsService) {}

  @Get()
  @Permissions('custom_fields.view')
  @ApiOperation({ summary: 'List custom field definitions' })
  async list(@Query('module') module?: string, @Query('documentType') documentType?: string) {
    return this.service.listDefinitions(module, documentType);
  }

  @Post()
  @Permissions('custom_fields.configure')
  @ApiOperation({ summary: 'Create custom field definition' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.createDefinition(body, userId);
  }

  @Put(':id')
  @Permissions('custom_fields.configure')
  @ApiOperation({ summary: 'Update custom field definition' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.updateDefinition(id, body, userId);
  }

  @Delete(':id')
  @Permissions('custom_fields.configure')
  @ApiOperation({ summary: 'Delete custom field definition' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.deleteDefinition(id, userId);
  }

  @Get('values/:documentType/:recordId')
  @Permissions('custom_fields.view')
  @ApiOperation({ summary: 'Get custom field values for a record' })
  async getValues(
    @Param('documentType') documentType: string,
    @Param('recordId') recordId: string,
  ) {
    return this.service.getValues(documentType, recordId);
  }

  @Put('values/:documentType/:recordId')
  @Permissions('custom_fields.view')
  @ApiOperation({ summary: 'Save custom field values for a record' })
  async saveValues(
    @Param('documentType') documentType: string,
    @Param('recordId') recordId: string,
    @Body() body: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.saveValues(documentType, recordId, body, userId);
  }
}

// ═════════════════════════════════════════════════════════
// TAGS
// ═════════════════════════════════════════════════════════
@ApiTags('Tags')
@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(private readonly service: TagsService) {}

  @Get()
  @Permissions('tags.view')
  @ApiOperation({ summary: 'List tags' })
  async findAll(@Query('search') search?: string) {
    return this.service.findAll({ search });
  }

  @Post()
  @Permissions('tags.configure')
  @ApiOperation({ summary: 'Create tag' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.create(body, userId);
  }

  @Put(':id')
  @Permissions('tags.configure')
  @ApiOperation({ summary: 'Update tag' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Delete(':id')
  @Permissions('tags.configure')
  @ApiOperation({ summary: 'Delete tag' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.delete(id, userId);
  }

  @Get('record/:recordType/:recordId')
  @Permissions('tags.view')
  @ApiOperation({ summary: 'Tags for a record' })
  async recordTags(@Param('recordType') recordType: string, @Param('recordId') recordId: string) {
    return this.service.getTagsForRecord(recordType, recordId);
  }

  @Post('assign')
  @Permissions('tags.view')
  @ApiOperation({ summary: 'Assign tag to a record' })
  async assign(
    @Body() body: { tagId: string; recordType: string; recordId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.assign(body.tagId, body.recordType, body.recordId, userId);
  }

  @Delete('assign')
  @Permissions('tags.view')
  @ApiOperation({ summary: 'Unassign tag from a record' })
  async unassign(
    @Body() body: { tagId: string; recordType: string; recordId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.unassign(body.tagId, body.recordType, body.recordId, userId);
  }
}

// ═════════════════════════════════════════════════════════
// GLOBAL SEARCH
// ═════════════════════════════════════════════════════════
@ApiTags('Global Search')
@Controller('global-search')
@UseGuards(JwtAuthGuard)
export class GlobalSearchController {
  constructor(private readonly service: GlobalSearchService) {}

  @Get()
  @Permissions('global_search.view')
  @ApiOperation({ summary: 'Search across all modules' })
  async search(@Query('q') q = '', @Query('limit') limit?: number) {
    return this.service.search(q, { limit: limit ? Number(limit) : undefined });
  }
}

// ═════════════════════════════════════════════════════════
// BUSINESS CONTROL CENTER
// ═════════════════════════════════════════════════════════
@ApiTags('Business Control')
@Controller('business-control')
@UseGuards(JwtAuthGuard)
export class BusinessControlController {
  constructor(private readonly service: BusinessControlService) {}

  @Get('dashboard')
  @Permissions('business_control.view')
  @ApiOperation({ summary: 'Business control center dashboard' })
  async dashboard(@CurrentUser('id') userId: string) {
    return this.service.dashboard(userId);
  }

  @Get('violations')
  @Permissions('business_control.view')
  @ApiOperation({ summary: 'Rule violation report' })
  async violations() {
    return this.service.violationsReport();
  }

  @Post('evaluate')
  @Permissions('business_control.view')
  @ApiOperation({ summary: 'Evaluate a document against rules' })
  async evaluate(@Body() body: any) {
    return this.service.evaluateDocument(body);
  }
}
