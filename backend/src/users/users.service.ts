import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { UserRecord } from '@shranix/database';
import * as argon2 from 'argon2';

// NestJS DI needs runtime import for constructor injection token
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DatabaseService } from '../database/database.service';

import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly database: DatabaseService) {}

  async create(dto: CreateUserDto): Promise<UserRecord> {
    const existing = await this.database.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }
    // Plain password → argon2 hash (auth.register ke same params)
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 1,
      parallelism: 1,
    });
    const user = await this.database.users.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone || null,
      allowedModules: dto.allowedModules?.length ? JSON.stringify(dto.allowedModules) : null,
      isActive: true,
      isEmailVerified: false,
      failedLoginAttempts: 0,
      refreshTokenVersion: 0,
      lastLoginAt: null,
      lockedUntil: null,
    });
    // Ticked user ko admin role assign karo — UI sirf ticked modules dikhayega,
    // par backend @Roles('admin') guards ko bhi pass karna hoga (API 403 na ho).
    if (dto.allowedModules?.length) {
      await this.assignAdminRoleIfNeeded(user);
    }
    this.logger.log(`User created: ${user.email} (${user.id})`);
    return user;
  }

  private async assignAdminRoleIfNeeded(user: UserRecord): Promise<void> {
    try {
      const adminRole = await this.database.roles.findRoleByName('admin');
      if (!adminRole) {
        this.logger.warn('Admin role not found — skipping role assignment');
        return;
      }
      const roles = await this.database.roles.getUserRoles(user.id);
      if (roles.some((r) => r.id === adminRole.id)) {
        return;
      }
      await this.database.roles.assignRoleToUser(user.id, adminRole.id);
      this.logger.log(`Admin role assigned to ${user.email}`);
    } catch (error) {
      this.logger.warn(`Failed to assign admin role to ${user.email}: ${(error as Error).message}`);
    }
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.database.users.findById(id);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.database.users.findByEmail(email);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.database.users.updateLastLogin(id);
  }

  async resetFailedAttempts(id: string): Promise<void> {
    await this.database.users.resetFailedAttempts(id);
  }

  async incrementFailedAttempts(id: string, attempts: number): Promise<void> {
    await this.database.users.incrementFailedAttempts(id, attempts);
  }

  async lockAccount(id: string, lockedUntil: Date, attempts: number): Promise<void> {
    await this.database.users.lockAccount(id, lockedUntil.toISOString(), attempts);
  }

  async incrementTokenVersion(id: string): Promise<void> {
    await this.database.users.incrementTokenVersion(id);
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const permissions = await this.database.roles.getUserPermissions(userId);
    return permissions.map((p) => `${p.resource}.${p.action}`);
  }

  async saveRefreshToken(
    userId: string,
    tokenHash: string,
    expiryDays: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.database.refreshTokens.create({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
      isRevoked: false,
      revokedAt: null,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
    });
  }

  async findAll(): Promise<UserRecord[]> {
    const result = await this.database.users.findAll({ page: 1, pageSize: 1000 });
    return result.data;
  }
}
