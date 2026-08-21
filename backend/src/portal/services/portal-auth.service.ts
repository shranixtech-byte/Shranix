import * as crypto from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { AuditService } from '../../common/services/audit.service';
import { CommunicationService } from '../../communication/communication.service';
import { DatabaseService } from '../../database/database.service';
import type { PortalJwtPayload } from '../strategies/portal-jwt.strategy';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const RESET_TOKEN_HOURS = 24;
const RESET_COOLDOWN_MS = 60_000; // H9: 60s rate limit per email

@Injectable()
export class PortalAuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly jwtService: JwtService,
    private readonly communication?: CommunicationService,
  ) {}

  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const user = await this.database.portalUsers
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [
          {
            field: 'email',
            operator: 'eq',
            value: String(email || '')
              .toLowerCase()
              .trim(),
          },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    const record = (user.data || [])[0];

    if (!record) {
      await this.audit
        .logLogin({ userId: 'portal-unknown', ipAddress, userAgent, status: 'failure' })
        .catch(() => {});
      throw new UnauthorizedException('Invalid email or password');
    }

    if (record.status === 'blocked') {
      throw new ForbiddenException('Account is blocked. Contact support.');
    }
    if (record.status === 'inactive') {
      throw new ForbiddenException('Account is inactive');
    }
    if (record.lockedUntil && new Date(record.lockedUntil) > new Date()) {
      await this.audit
        .logLogin({ userId: record.id, ipAddress, userAgent, status: 'failure' })
        .catch(() => {});
      throw new ForbiddenException('Account is temporarily locked. Try again later.');
    }

    const valid = await argon2.verify(record.passwordHash, password).catch(() => false);
    if (!valid) {
      const attempts = (Number(record.failedLoginAttempts) || 0) + 1;
      const lockedUntil =
        attempts >= MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
          : null;
      await this.database.portalUsers
        .update(record.id, { failedLoginAttempts: attempts, lockedUntil } as any)
        .catch(() => {});
      await this.audit
        .logLogin({ userId: record.id, ipAddress, userAgent, status: 'failure' })
        .catch(() => {});
      if (lockedUntil) {
        throw new ForbiddenException('Too many failed attempts. Account locked for 15 minutes.');
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed attempts on success
    await this.database.portalUsers
      .update(record.id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date().toISOString(),
        lastLoginIp: ipAddress || null,
      } as any)
      .catch(() => {});

    await this.audit
      .logLogin({ userId: record.id, ipAddress, userAgent, status: 'success' })
      .catch(() => {});

    return this.issueTokens(record);
  }

  private async issueTokens(record: any) {
    const payload: PortalJwtPayload = {
      sub: record.id,
      email: record.email,
      customerId: record.customerId,
      role: record.role,
      type: 'portal',
      tokenVersion: Number(record.tokenVersion) || 0,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '8h' });
    return {
      accessToken,
      user: {
        id: record.id,
        email: record.email,
        name: record.name,
        role: record.role,
        customerId: record.customerId,
        status: record.status,
      },
    };
  }

  async logout(userId: string) {
    await this.audit
      .log({ userId, event: 'portal.logout', resource: 'portal', action: 'logout' })
      .catch(() => {});
    return { loggedOut: true };
  }

  // H9: Simple per-email rate limit for forgotPassword
  private readonly resetCooldowns = new Map<string, number>();

  /** Create a hashed reset token, expire in 24h, attempt email via communication engine. */
  async forgotPassword(email: string, ipAddress?: string) {
    // H9: Rate limit — 1 request per 60s per email
    const normalizedEmail = String(email || '')
      .toLowerCase()
      .trim();
    const lastRequest = this.resetCooldowns.get(normalizedEmail);
    if (lastRequest && Date.now() - lastRequest < RESET_COOLDOWN_MS) {
      // Return same response as success to prevent email enumeration
      return { sent: true };
    }
    this.resetCooldowns.set(normalizedEmail, Date.now());
    // Evict stale entries periodically
    if (this.resetCooldowns.size > 1000) {
      const cutoff = Date.now() - RESET_COOLDOWN_MS;
      for (const [key, ts] of this.resetCooldowns) {
        if (ts < cutoff) {
          this.resetCooldowns.delete(key);
        }
      }
    }

    const user = await this.database.portalUsers
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [
          {
            field: 'email',
            operator: 'eq',
            value: String(email || '')
              .toLowerCase()
              .trim(),
          },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    const record = (user.data || [])[0];
    if (!record) {
      // Do not reveal whether the email exists
      return { sent: true };
    }

    // H16: Invalidate any previous unused reset tokens for this user
    try {
      const existingTokens = await this.database.portalResetTokens
        .findAll({
          page: 1,
          pageSize: 50,
          filters: [
            { field: 'portalUserId', operator: 'eq', value: record.id },
            { field: 'usedAt', operator: 'null', value: '' },
          ],
        } as any)
        .catch(() => ({ data: [] }));
      for (const t of (existingTokens.data || []) as any[]) {
        await this.database.portalResetTokens
          .update(t.id, { usedAt: new Date().toISOString() } as any)
          .catch(() => {});
      }
    } catch {
      // Non-critical — don't block the flow
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await this.database.portalResetTokens.create({
      portalUserId: record.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000).toISOString(),
      ipAddress: ipAddress || null,
    } as any);

    await this.audit
      .log({
        userId: record.id,
        event: 'portal.password_reset_requested',
        resource: 'portal',
        action: 'password_reset',
      })
      .catch(() => {});

    // Fire-and-forget email via existing communication engine — never blocks login flow.
    this.communication
      ?.send({
        channel: 'email',
        to: record.email,
        subject: 'SHRANIX ERP — Reset your portal password',
        message: `Your portal password reset token: ${rawToken}\nThis token expires in 24 hours.`,
        referenceType: 'portal_reset',
        referenceId: record.id,
        skipPreference: true,
      } as any)
      .catch(() => {});

    return { sent: true };
  }

  /** Validate reset token, set a new password, invalidate all sessions. */
  async resetPassword(token: string, newPassword: string) {
    if (!token || String(newPassword || '').length < 6) {
      throw new BadRequestException(
        'Valid token and a password of at least 6 characters are required',
      );
    }
    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const res = await this.database.portalResetTokens
      .findAll({
        page: 1,
        pageSize: 5,
        filters: [{ field: 'tokenHash', operator: 'eq', value: tokenHash }],
      } as any)
      .catch(() => ({ data: [] }));
    const resetRow = (res.data || []).find(
      (t: any) => !t.usedAt && new Date(t.expiresAt) > new Date(),
    );
    if (!resetRow) {
      throw new BadRequestException('Reset token is invalid or expired');
    }

    const user = await this.database.portalUsers.findById(resetRow.portalUserId).catch(() => null);
    if (!user) {
      throw new BadRequestException('Reset token is invalid or expired');
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 1,
      parallelism: 1,
    });
    const tokenVersion = (Number(user.tokenVersion) || 0) + 1;
    await this.database.portalUsers.update(user.id, {
      passwordHash,
      tokenVersion,
      failedLoginAttempts: 0,
      lockedUntil: null,
    } as any);
    await this.database.portalResetTokens.update(resetRow.id, {
      usedAt: new Date().toISOString(),
    } as any);

    // H16: Invalidate all other unused reset tokens for this user
    try {
      const otherTokens = await this.database.portalResetTokens
        .findAll({
          page: 1,
          pageSize: 50,
          filters: [
            { field: 'portalUserId', operator: 'eq', value: user.id },
            { field: 'usedAt', operator: 'nullorempty', value: '' },
          ],
        } as any)
        .catch(() => ({ data: [] }));
      for (const t of (otherTokens.data || []) as any[]) {
        if (t.id !== resetRow.id) {
          await this.database.portalResetTokens
            .update(t.id, { usedAt: new Date().toISOString() } as any)
            .catch(() => {});
        }
      }
    } catch {
      // Non-critical
    }

    await this.audit
      .log({
        userId: user.id,
        event: 'portal.password_reset',
        resource: 'portal',
        action: 'password_reset',
      })
      .catch(() => {});
    return { reset: true };
  }

  /** Change password while logged in (requires current password). */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.database.portalUsers.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Account not found');
    }
    const valid = await argon2.verify(user.passwordHash, currentPassword).catch(() => false);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (String(newPassword || '').length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }
    // H16: Prevent reusing the current password
    const isNewPasswordSame = await argon2
      .verify(user.passwordHash, newPassword)
      .catch(() => false);
    if (isNewPasswordSame) {
      throw new BadRequestException('New password must be different from current password');
    }
    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 1,
      parallelism: 1,
    });
    const tokenVersion = (Number(user.tokenVersion) || 0) + 1;
    await this.database.portalUsers.update(user.id, { passwordHash, tokenVersion } as any);
    await this.audit
      .log({
        userId,
        event: 'portal.password_changed',
        resource: 'portal',
        action: 'password_changed',
      })
      .catch(() => {});
    return { changed: true };
  }

  /** Profile: portal user + customer-safe master data. */
  async getProfile(userId: string) {
    const user = await this.database.portalUsers.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Account not found');
    }
    const customer = await this.database.customers.findById(user.customerId).catch(() => null);
    const addresses = customer
      ? (
          await this.database.customerAddresses
            .findAll({
              page: 1,
              pageSize: 10,
              filters: [{ field: 'customerId', operator: 'eq', value: user.customerId }],
            } as any)
            .catch(() => ({ data: [] }))
        )?.data || []
      : [];
    const contacts = customer
      ? (
          await this.database.customerContacts
            .findAll({
              page: 1,
              pageSize: 10,
              filters: [{ field: 'customerId', operator: 'eq', value: user.customerId }],
            } as any)
            .catch(() => ({ data: [] }))
        )?.data || []
      : [];

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        status: user.status,
        isVerified: !!user.isVerified,
        lastLoginAt: user.lastLoginAt,
      },
      customer: customer
        ? {
            id: customer.id,
            customerCode: customer.customerCode,
            name: customer.name,
            firmName: customer.firmName,
            customerType: customer.customerType,
            mobile: customer.mobile,
            email: customer.email,
            gstin: customer.gstin,
            pan: customer.pan,
            whatsapp: customer.whatsapp,
            creditDays: customer.creditDays,
          }
        : null,
      addresses: (addresses || []).map((a: any) => ({
        id: a.id,
        addressType: a.addressType,
        address: a.address,
        village: a.village,
        taluka: a.taluka,
        district: a.district,
        state: a.state,
        pincode: a.pincode,
        isDefault: !!a.isDefault,
      })),
      contacts: (contacts || []).map((c: any) => ({
        id: c.id,
        contactType: c.contactType,
        name: c.name,
        mobile: c.mobile,
        email: c.email,
        designation: c.designation,
        isPrimary: !!c.isPrimary,
      })),
    };
  }
}
