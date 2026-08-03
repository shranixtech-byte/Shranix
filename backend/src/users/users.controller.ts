import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRecord } from '@shranix/database';

import { UpdateUserDto } from '../auth/dto/update-user.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';

import { CreateUserDto } from './dto/create-user.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // passwordHash kabhi client ko mat bhejo; allowedModules JSON string → array
  private sanitize(user: UserRecord | null | undefined) {
    if (!user) {
      return user;
    }
    const {
      passwordHash: _passwordHash,
      refreshTokenVersion: _rtv,
      allowedModules: rawModules,
      ...rest
    } = user as any;
    let allowedModules: string[] | null = null;
    if (typeof rawModules === 'string' && rawModules) {
      try {
        const parsed = JSON.parse(rawModules);
        if (Array.isArray(parsed)) {
          allowedModules = parsed.filter((m: unknown) => typeof m === 'string');
        }
      } catch {
        // invalid JSON — no restriction
      }
    } else if (Array.isArray(rawModules)) {
      allowedModules = rawModules.filter((m: unknown) => typeof m === 'string');
    }
    return { ...rest, allowedModules };
  }

  @Post()
  @Roles('admin')
  @Permissions('users.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  async create(@Body() dto: CreateUserDto) {
    return this.sanitize(await this.usersService.create(dto));
  }

  @Get()
  @Roles('admin')
  @Permissions('users.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all users' })
  async findAll() {
    const result = await this.usersService.findAll();
    return { data: result.map((u) => this.sanitize(u)), total: result.length };
  }

  @Get(':id')
  @Roles('admin')
  @Permissions('users.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      return { message: 'User not found' };
    }
    return { data: this.sanitize(user) };
  }

  @Put(':id')
  @Roles('admin')
  @Permissions('users.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user' })
  async update(@Param('id') id: string, @Body() _dto: UpdateUserDto) {
    return { message: 'User update endpoint', id };
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('users.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete user' })
  async remove(@Param('id') id: string) {
    return { message: 'User delete endpoint', id };
  }
}
