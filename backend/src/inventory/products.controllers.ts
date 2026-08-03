import { Controller, Get, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { ProductsService } from './products.service';

/**
 * Billing / product-selection screen endpoints.
 *
 * The frontend searches products through `/inventory/products`, plus
 * `/inventory/products/recent` and `/inventory/products/frequent` for the
 * quick-pick chips. Previously these routes 404'd (only `inventory/items`
 * existed), so the product search box could never show results.
 */
@ApiTags('Inventory - Products (Billing Search)')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('inventory/products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @Roles('admin', 'manager', 'accountant', 'salesman', 'sales')
  @Permissions('items.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search products (billing screen)' })
  @ApiResponse({ status: 200, description: 'Product records' })
  async search(
    @Query('search') search?: string,
    @Query('searchField') searchField?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.search({
      search,
      searchField,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Get('lookup')
  @Roles('admin', 'manager', 'accountant', 'salesman', 'sales')
  @Permissions('items.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lookup product by scanned barcode / QR code (scanner gun)' })
  @ApiResponse({ status: 200, description: 'Matching product or null' })
  async lookup(@Query('code') code?: string) {
    return this.service.lookupByCode(code || '');
  }

  @Get('recent')
  @Roles('admin', 'manager', 'accountant', 'salesman', 'sales')
  @Permissions('items.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recently used products' })
  @ApiResponse({ status: 200, description: 'Recent product records' })
  async recent(@Query('limit') limit?: string) {
    return this.service.recent(Number(limit) || 5);
  }

  @Get('frequent')
  @Roles('admin', 'manager', 'accountant', 'salesman', 'sales')
  @Permissions('items.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Frequently sold products' })
  @ApiResponse({ status: 200, description: 'Frequent product records' })
  async frequent(@Query('limit') limit?: string) {
    return this.service.frequent(Number(limit) || 5);
  }
}
