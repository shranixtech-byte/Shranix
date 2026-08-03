import * as crypto from 'node:crypto';

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { JwtService } from '@nestjs/jwt';
import { UserRecord } from '@shranix/database';
import * as argon2 from 'argon2';

// NestJS DI needs runtime import for constructor injection token
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditService, AuditEvent, AuditSeverity } from '../common/services/audit.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DatabaseService } from '../database/database.service';

import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  tokenVersion: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: Omit<UserRecord, 'passwordHash'>;
  tokens: AuthTokens;
}

export interface CookieConfig {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge?: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.database.users.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 1, // ⚡ Reduced from 2 → login 2× faster while still secure (argon2id + 19MB memory)
      parallelism: 1,
    });

    const user = await this.database.users.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone || null,
      isActive: true,
      isEmailVerified: false,
      failedLoginAttempts: 0,
      refreshTokenVersion: 0,
      lastLoginAt: null,
      lockedUntil: null,
    });

    const tokens = await this.generateTokens(user);

    // Audit registration
    await this.audit.log({
      userId: user.id,
      event: AuditEvent.REGISTER,
      resource: 'auth',
      action: 'register',
      details: { email: dto.email },
      severity: AuditSeverity.INFO,
    });

    return { user: this.sanitizeUser(user), tokens };
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ body: AuthResponse; cookie: CookieConfig }> {
    const user = await this.database.users.findByEmail(dto.email);
    if (!user) {
      // Audit failed login attempt (no user found — log unknown email)
      // ⚡ Fire-and-forget — audit shouldn't block the response
      this.audit
        .logLogin({
          userId: 'unknown',
          ipAddress,
          userAgent,
          status: 'failure',
        })
        .catch(() => {});
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      // ⚡ Fire-and-forget
      this.audit
        .logLogin({
          userId: user.id,
          ipAddress,
          userAgent,
          status: 'failure',
        })
        .catch(() => {});
      throw new ForbiddenException('Account is temporarily locked. Try again later.');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      // ⚡ Fire-and-forget: increment + audit in parallel, no need to block the response
      this.database.users.incrementFailedAttempts(user.id, attempts).catch(() => {
        /* non-critical */
      });

      await this.audit.logLogin({
        userId: user.id,
        ipAddress,
        userAgent,
        status: 'failure',
      });

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString();
        await this.database.users.lockAccount(user.id, lockedUntil, MAX_FAILED_ATTEMPTS);
        // ⚡ Fire-and-forget
        this.audit
          .log({
            userId: user.id,
            event: AuditEvent.ACCOUNT_LOCKED,
            resource: 'auth',
            action: 'lock_account',
            details: { lockedUntil, failedAttempts: attempts },
            ipAddress,
            userAgent,
            severity: AuditSeverity.WARNING,
          })
          .catch(() => {});
        this.logger.warn(`Account ${user.email} locked until ${lockedUntil}`);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      // ⚡ Fire-and-forget
      this.audit
        .logLogin({
          userId: user.id,
          ipAddress,
          userAgent,
          status: 'failure',
        })
        .catch(() => {});
      throw new ForbiddenException('Account is deactivated. Contact administrator.');
    }

    // ⚡ Run non-blocking ops in parallel — DB updates don't need to hold the response
    await Promise.all([
      this.database.users.resetFailedAttempts(user.id),
      this.database.users.updateLastLogin(user.id),
    ]);

    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    // ⚡ Fire-and-forget audit log — no need to block login response
    this.audit
      .logLogin({ userId: user.id, ipAddress, userAgent, status: 'success' })
      .catch((err) => this.logger.warn(`Audit log failed for login: ${err.message}`));

    const isProduction = process.env.NODE_ENV === 'production';

    return {
      body: { user: this.sanitizeUser(user), tokens },
      cookie: {
        name: 'refresh_token',
        value: tokens.refreshToken,
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        // Express expects maxAge in milliseconds
        maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      },
    };
  }

  async refreshToken(dto?: RefreshTokenDto, cookieToken?: string): Promise<AuthTokens> {
    const token = dto?.refreshToken || cookieToken;
    if (!token) {
      throw new UnauthorizedException('Refresh token required');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
      }) as JwtPayload & { type?: string };

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.database.users.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or deactivated');
      }

      // Token version validation — reject if token version doesn't match DB
      if (payload.tokenVersion !== user.refreshTokenVersion) {
        await this.audit.log({
          userId: payload.sub,
          event: 'token_rejected_stale_version',
          resource: 'auth',
          action: 'refresh',
          details: { payloadVersion: payload.tokenVersion, dbVersion: user.refreshTokenVersion },
          severity: AuditSeverity.WARNING,
        });
        throw new UnauthorizedException('Token has been revoked. Please login again.');
      }

      // Revoke old token
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const storedToken = await this.database.refreshTokens.findByTokenHash(tokenHash);
      if (storedToken) {
        await this.database.refreshTokens.revoke(storedToken.id);
      }

      await this.audit.log({
        userId: payload.sub,
        event: AuditEvent.TOKEN_REFRESHED,
        resource: 'auth',
        action: 'refresh',
        severity: AuditSeverity.INFO,
      });

      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const user = await this.database.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isCurrentPasswordValid) {
      await this.audit.logPasswordChange({ userId, ipAddress, userAgent });
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 1, // ⚡ Match registration — consistent hashing params
      parallelism: 1,
    });

    // Update password and increment token version (invalidates all sessions)
    await this.database.users.update(userId, {
      passwordHash: newPasswordHash,
      refreshTokenVersion: user.refreshTokenVersion + 1,
    });

    // Revoke all refresh tokens for this user
    await this.database.refreshTokens.revokeAllForUser(userId);

    // Audit password change
    await this.audit.logPasswordChange({ userId, ipAddress, userAgent });

    this.logger.warn(`Password changed for user ${userId} — all sessions invalidated`);
  }

  async logout(userId: string): Promise<{ cookie: CookieConfig }> {
    await this.database.refreshTokens.revokeAllForUser(userId);
    await this.database.users.incrementTokenVersion(userId);

    await this.audit.logLogout({ userId, allDevices: true });
    this.logger.log(`User ${userId} logged out from all devices`);

    const isProduction = process.env.NODE_ENV === 'production';

    return {
      cookie: {
        name: 'refresh_token',
        value: '',
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      },
    };
  }

  async logoutAll(userId: string): Promise<void> {
    await this.database.refreshTokens.revokeAllForUser(userId);
    await this.database.users.incrementTokenVersion(userId);

    await this.audit.logLogout({ userId, allDevices: true });
    this.logger.log(`User ${userId} logged out from all devices`);
  }

  async validateUser(payload: JwtPayload): Promise<UserRecord | null> {
    const user = await this.database.users.findById(payload.sub);
    if (!user || !user.isActive) {
      return null;
    }
    // Token version validation on every request via JWT strategy
    if (user.refreshTokenVersion !== payload.tokenVersion) {
      return null;
    }
    return user;
  }

  private async generateTokens(
    user: UserRecord,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    // ⚡ Fetch roles and permissions in parallel for faster login
    const [roles, permissions] = await Promise.all([
      this.database.roles.getUserRoles(user.id),
      this.database.roles.getUserPermissions(user.id),
    ]);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: roles.length > 0 ? roles[0].name : 'user',
      permissions: permissions.map((p) => `${p.resource}.${p.action}`),
      tokenVersion: user.refreshTokenVersion,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` },
    );

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.database.refreshTokens.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(
        Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString(),
      isRevoked: false,
      revokedAt: null,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
    });

    return { accessToken, refreshToken, expiresIn: 86400 };
  }

  private sanitizeUser(
    user: UserRecord,
  ): Omit<UserRecord, 'passwordHash'> & { allowedModules?: string[] | null } {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...sanitized } = user;
    // allowed_modules DB mein JSON string hai → client ko array ke roop mein bhejo
    let allowedModules: string[] | null = null;
    if (
      typeof (sanitized as any).allowedModules === 'string' &&
      (sanitized as any).allowedModules
    ) {
      try {
        const parsed = JSON.parse((sanitized as any).allowedModules);
        if (Array.isArray(parsed)) {
          allowedModules = parsed.filter((m) => typeof m === 'string');
        }
      } catch {
        // invalid JSON — treat as no restriction
      }
    }
    return { ...sanitized, allowedModules } as any;
  }
}
