import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RolesService } from './roles.service';

@ApiTags('Roles & Permissions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles('admin')
  @Permissions('roles.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all roles' })
  async findAll() {
    const roles = await this.rolesService.getAllRoles();
    return { data: roles };
  }

  @Get(':id')
  @Roles('admin')
  @Permissions('roles.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get role by ID' })
  async findOne(@Param('id') id: string) {
    const role = await this.rolesService.getRoleById(id);
    return { data: role };
  }

  @Post()
  @Roles('admin')
  @Permissions('roles.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  async create(
    @Body() dto: { name: string; description?: string },
    @CurrentUser() user: { id: string },
  ) {
    const role = await this.rolesService.createRole(dto, user.id);
    return { data: role };
  }

  @Put(':id')
  @Roles('admin')
  @Permissions('roles.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a role (name / description)' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string },
    @CurrentUser() user: { id: string },
  ) {
    const role = await this.rolesService.updateRole(id, dto, user.id);
    return { data: role };
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('roles.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a role (system roles protected)' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  async remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.rolesService.deleteRole(id, user.id);
  }

  @Get(':id/role-permissions')
  @Roles('admin')
  @Permissions('roles.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all permissions granted to a role' })
  @ApiResponse({ status: 200, description: 'Role permissions' })
  async getRolePermissions(@Param('id') id: string) {
    const permissions = await this.rolesService.getRolePermissions(id);
    return { data: permissions };
  }

  @Put(':id/role-permissions')
  @Roles('admin')
  @Permissions('roles.assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace role permissions from the matrix (permission names)' })
  @ApiResponse({ status: 200, description: 'Updated permission count' })
  async setRolePermissions(
    @Param('id') id: string,
    @Body() body: { permissions?: string[] },
    @CurrentUser() user: { id: string },
  ) {
    return this.rolesService.setRolePermissions(
      id,
      Array.isArray(body?.permissions) ? body.permissions : [],
      user.id,
    );
  }

  @Get(':id/users')
  @Roles('admin')
  @Permissions('roles.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user IDs that have this role' })
  @ApiResponse({ status: 200, description: 'User IDs' })
  async getRoleUsers(@Param('id') id: string) {
    const userIds = await this.rolesService.getRoleUsers(id);
    return { data: userIds };
  }

  @Post(':userId/assign/:roleId')
  @Roles('admin')
  @Permissions('roles.assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign role to user' })
  async assignRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.rolesService.assignRole(userId, roleId, user.id);
    return { message: 'Role assigned successfully' };
  }

  @Delete(':userId/assign/:roleId')
  @Roles('admin')
  @Permissions('roles.assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove role from user' })
  async removeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.rolesService.removeRole(userId, roleId, user.id);
    return { message: 'Role removed successfully' };
  }

  @Get(':userId/permissions')
  @Roles('admin')
  @Permissions('roles.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user permissions' })
  async getUserPermissions(@Param('userId') userId: string) {
    const permissions = await this.rolesService.getUserPermissions(userId);
    return { data: permissions };
  }

  @Post(':roleId/assign-permission/:permissionId')
  @Roles('admin')
  @Permissions('roles.assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign permission to role' })
  async assignPermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.rolesService.assignPermission(roleId, permissionId, user.id);
    return { message: 'Permission assigned to role successfully' };
  }

  @Delete(':roleId/assign-permission/:permissionId')
  @Roles('admin')
  @Permissions('roles.assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove permission from role' })
  async removePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.rolesService.removePermission(roleId, permissionId, user.id);
    return { message: 'Permission removed from role successfully' };
  }
}
