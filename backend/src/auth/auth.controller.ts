import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CsrfService } from '../common/services/csrf.service';
import {
  THROTTLE_AUTH_LOGIN,
  THROTTLE_AUTH_REGISTER,
  THROTTLE_AUTH_REFRESH,
  THROTTLE_AUTH_CHANGE_PASSWORD,
  throttle,
} from '../common/utils/rate-limit-policies';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly csrfService: CsrfService,
  ) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle(throttle(THROTTLE_AUTH_REGISTER))
  @ApiOperation({ summary: 'Register a new user account' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.tokens.refreshToken);
    return result;
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(throttle(THROTTLE_AUTH_LOGIN))
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(dto, ipAddress, userAgent);

    // Set JWT as HTTP-only secure cookie
    const { name, value, ...cookieOpts } = result.cookie;
    res.cookie(name, value, cookieOpts);

    // Set CSRF token
    const csrfToken = this.csrfService.generateToken();
    res.cookie('csrf_token', csrfToken, this.csrfService.getCookieOptions());

    return result.body;
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(throttle(THROTTLE_AUTH_REFRESH))
  @ApiOperation({ summary: 'Refresh access token using refresh token from cookie or body' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieToken = req.cookies?.refresh_token;
    const tokens = await this.authService.refreshToken(dto, cookieToken);
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @Throttle(throttle(THROTTLE_AUTH_CHANGE_PASSWORD))
  @ApiOperation({ summary: 'Change password and invalidate all existing sessions' })
  async changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    await this.authService.changePassword(user.id, dto, ipAddress, userAgent);
    return { message: 'Password changed successfully. All other sessions have been invalidated.' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and clear refresh token cookie' })
  async logout(@CurrentUser() user: { id: string }, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout(user.id);
    const { name, value, ...cookieOpts } = result.cookie;
    res.cookie(name, value, cookieOpts);
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices' })
  async logoutAll(@CurrentUser() user: { id: string }) {
    await this.authService.logoutAll(user.id);
    return { message: 'Logged out from all devices' };
  }

  @Post('csrf')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get CSRF token' })
  async getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const csrfToken = this.csrfService.generateToken();
    res.cookie('csrf_token', csrfToken, this.csrfService.getCookieOptions());
    return { csrfToken };
  }

  // ── First-Run Setup (Offline V1) ──────────────────────

  @Get('setup/status')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if first-run setup is needed' })
  async setupStatus() {
    const users = await this.authService.getSetupStatus();
    return {
      needsSetup: users === 0,
      userCount: users,
    };
  }

  @Post('setup')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'First-run setup: create admin user + company' })
  async setup(
    @Body()
    dto: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      companyName: string;
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.firstRunSetup(dto);
    this.setRefreshCookie(res, result.tokens.refreshToken);
    const csrfToken = this.csrfService.generateToken();
    res.cookie('csrf_token', csrfToken, this.csrfService.getCookieOptions());
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: Record<string, unknown>) {
    return user;
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
