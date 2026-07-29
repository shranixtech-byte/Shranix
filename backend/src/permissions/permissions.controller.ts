import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PermissionCacheService } from '../common/services/permission-cache.service';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PermissionsService } from './permissions.service';

@ApiTags('Permissions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly cache: PermissionCacheService,
  ) {}

  @Get()
  @Roles('admin')
  @Permissions('permissions.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all permissions (paginated)' })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
  ) {
    return this.permissionsService.findAll(Number(page), Number(pageSize));
  }

  @Post()
  @Roles('admin')
  @Permissions('permissions.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new permission' })
  async create(
    @Body() dto: { name: string; description?: string; resource: string; action: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.permissionsService.create(dto, user.id);
  }

  @Get(':id')
  @Roles('admin')
  @Permissions('permissions.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get permission by ID' })
  async findOne(@Param('id') id: string) {
    const result = await this.permissionsService.findById(id);
    if (!result) {
      return { message: 'Permission not found' };
    }
    return result;
  }

  @Put(':id')
  @Roles('admin')
  @Permissions('permissions.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a permission' })
  async update(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; resource?: string; action?: string },
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.permissionsService.update(id, dto, user.id);
    if (!result) {
      return { message: 'Permission not found' };
    }
    return result;
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('permissions.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a permission' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.permissionsService.delete(id, user.id);
    return { message: 'Permission deleted successfully' };
  }

  @Post(':permissionId/assign/:roleId')
  @Roles('admin')
  @Permissions('permissions.assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign permission to role' })
  async assignToRole(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @CurrentUser() _user: { id: string },
  ) {
    await this.permissionsService.assignToRole(roleId, permissionId);
    return { message: 'Permission assigned to role successfully' };
  }

  @Delete(':permissionId/assign/:roleId')
  @Roles('admin')
  @Permissions('permissions.assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove permission from role' })
  async removeFromRole(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @CurrentUser() _user: { id: string },
  ) {
    await this.permissionsService.removeFromRole(roleId, permissionId);
    return { message: 'Permission removed from role successfully' };
  }

  @Get('cache/stats')
  @Roles('admin')
  @Permissions('permissions.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get permission cache statistics' })
  async cacheStats() {
    return { cacheSize: this.cache.size };
  }

  @Post('cache/invalidate')
  @Roles('admin')
  @Permissions('permissions.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate permission cache' })
  async invalidateCache() {
    this.cache.invalidateAllPermissionCaches();
    return { message: 'Permission cache invalidated' };
  }
}
