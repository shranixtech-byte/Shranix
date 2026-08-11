import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PortalAdminService } from '../services/portal-admin.service';

@ApiTags('Portal Admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('portal-admin')
export class PortalAdminController {
  constructor(private readonly admin: PortalAdminService) {}

  @Post('users')
  @Permissions('portal.manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a portal user for a customer' })
  async createUser(@Body() body: any, @CurrentUser() u: any) {
    return this.admin.createPortalUser(body, u?.id);
  }

  @Get('users')
  @Permissions('portal.manage')
  @ApiOperation({ summary: 'List portal users' })
  async listUsers(@Query('customerId') customerId?: string, @Query('status') status?: string) {
    return this.admin.listPortalUsers(customerId, status);
  }

  @Patch('users/:id')
  @Permissions('portal.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update portal user (status / role / password)' })
  async updateUser(@Param('id') id: string, @Body() body: any, @CurrentUser() u: any) {
    return this.admin.updatePortalUser(id, body, u?.id);
  }

  @Get('analytics')
  @Permissions('portal.analytics')
  @ApiOperation({ summary: 'Portal adoption / usage analytics' })
  async analytics() {
    return this.admin.analytics();
  }
}
