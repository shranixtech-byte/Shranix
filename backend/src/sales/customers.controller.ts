import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { CreateCustomerDto, UpdateCustomerDto } from './dto';
import { CustomersService } from './customers.service';

@ApiTags('Sales - Customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(public readonly service: CustomersService) {}

  @Post()
  @Roles('admin','manager')
  @Permissions('sales.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a customer' })
  @ApiResponse({ status: 201, description: 'Customer created' })
  async create(@Body() dto: CreateCustomerDto, @CurrentUser() u: {id:string}) {
    return this.service.create(dto, u?.id);
  }

  @Get()
  @Roles('admin','manager','accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List customers with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'ps', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of customers' })
  async findAll(@Query('page') p=1, @Query('ps') ps=50, @Query('search') s?: string) {
    return this.service.findAll(Number(p), Number(ps), s);
  }

  @Get(':id')
  @Roles('admin','manager','accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer found' })
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @Roles('admin','manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() u: {id:string}) {
    return this.service.update(id, dto, u?.id);
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('sales.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer deleted' })
  async delete(@Param('id') id: string, @CurrentUser() u: {id:string}) {
    return this.service.delete(id, u?.id);
  }

  @Post(':id/restore')
  @Roles('admin')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer restored' })
  async restore(@Param('id') id: string, @CurrentUser() u: {id:string}) {
    return this.service.restore(id, u?.id);
  }
}
