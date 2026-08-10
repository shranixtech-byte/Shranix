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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { CustomersService } from './customers.service';
import { CustomerCategoryDto, CustomerGroupDto } from './dto';

/** Customer Groups — Retail / Wholesale / Farmer / Dealer / Corporate / Government. */
@ApiTags('Sales - Customer Groups')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('customer-groups')
export class CustomerGroupsController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List customer groups' })
  async list() {
    return this.service.listGroups();
  }

  @Post()
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a customer group' })
  @ApiBody({ type: CustomerGroupDto })
  async create(@Body() dto: CustomerGroupDto, @CurrentUser() u: { id: string }) {
    return this.service.createGroup(dto, u?.id);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a customer group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  async update(
    @Param('id') id: string,
    @Body() dto: CustomerGroupDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.updateGroup(id, dto, u?.id);
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('sales.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a customer group (system groups are protected)' })
  async remove(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.deleteGroup(id, u?.id);
  }
}

/** Customer Categories — A / B / C / Premium / VIP. */
@ApiTags('Sales - Customer Categories')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('customer-categories')
export class CustomerCategoriesController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List customer categories' })
  async list() {
    return this.service.listCategories();
  }

  @Post()
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a customer category' })
  @ApiBody({ type: CustomerCategoryDto })
  async create(@Body() dto: CustomerCategoryDto, @CurrentUser() u: { id: string }) {
    return this.service.createCategory(dto, u?.id);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a customer category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  async update(
    @Param('id') id: string,
    @Body() dto: CustomerCategoryDto,
    @CurrentUser() u: { id: string },
  ) {
    return this.service.updateCategory(id, dto, u?.id);
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('sales.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a customer category' })
  async remove(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.service.deleteCategory(id, u?.id);
  }
}
