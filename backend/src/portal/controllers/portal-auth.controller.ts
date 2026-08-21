import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../../common/decorators/public.decorator';
import {
  THROTTLE_PORTAL_LOGIN,
  THROTTLE_PORTAL_FORGOT_PASSWORD,
  THROTTLE_PORTAL_RESET_PASSWORD,
  throttle,
} from '../../common/utils/rate-limit-policies';
import { PortalJwtAuthGuard } from '../guards/portal-auth.guard';
import { PortalAuthService } from '../services/portal-auth.service';
import type { PortalJwtPayload } from '../strategies/portal-jwt.strategy';

@ApiTags('Portal Auth')
@Controller('portal/auth')
export class PortalAuthController {
  constructor(private readonly auth: PortalAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(throttle(THROTTLE_PORTAL_LOGIN))
  @ApiOperation({ summary: 'Customer portal login (email + password)' })
  async login(@Body() body: { email: string; password: string }, @Req() req: any) {
    return this.auth.login(body?.email, body?.password, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(throttle(THROTTLE_PORTAL_FORGOT_PASSWORD))
  @ApiOperation({ summary: 'Request a portal password reset token' })
  async forgotPassword(@Body() body: { email: string }, @Req() req: any) {
    return this.auth.forgotPassword(body?.email, req.ip);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(throttle(THROTTLE_PORTAL_RESET_PASSWORD))
  @ApiOperation({ summary: 'Reset portal password using a reset token' })
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.auth.resetPassword(body?.token, body?.newPassword);
  }

  @UseGuards(PortalJwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Current portal profile + customer-safe master data' })
  async me(@Req() req: any) {
    const user: PortalJwtPayload = req.user;
    return this.auth.getProfile(user.sub);
  }

  @UseGuards(PortalJwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Portal logout (audited)' })
  async logout(@Req() req: any) {
    const user: PortalJwtPayload = req.user;
    return this.auth.logout(user.sub);
  }

  @UseGuards(PortalJwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change portal password (requires current password)' })
  async changePassword(
    @Req() req: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const user: PortalJwtPayload = req.user;
    return this.auth.changePassword(user.sub, body?.currentPassword, body?.newPassword);
  }
}
