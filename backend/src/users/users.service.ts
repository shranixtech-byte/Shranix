import { Injectable, Logger } from '@nestjs/common';
import { UserRecord } from '@shranix/database';

// NestJS DI needs runtime import for constructor injection token
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DatabaseService } from '../database/database.service';

import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly database: DatabaseService) {}

  async create(dto: CreateUserDto): Promise<UserRecord> {
    const user = await this.database.users.create({
      email: dto.email,
      passwordHash: dto.passwordHash,
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
    this.logger.log(`User created: ${user.email} (${user.id})`);
    return user;
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
