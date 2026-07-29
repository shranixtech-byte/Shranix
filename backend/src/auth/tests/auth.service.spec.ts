import { JwtService } from '@nestjs/jwt';
import { UserRecord } from '@shranix/database';
import { vi } from 'vitest';

import { AuthService } from '../auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser: Partial<UserRecord> = {
    id: 'test-id-123',
    email: 'test@example.com',
    passwordHash: '',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    isEmailVerified: false,
    failedLoginAttempts: 0,
    refreshTokenVersion: 0,
    phone: null,
    lastLoginAt: null,
    lockedUntil: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    isDeleted: false,
  };

  const createMockDb = () => ({
    users: {
      findById: vi.fn().mockResolvedValue(mockUser),
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((data) => ({ ...mockUser, ...data, id: 'new-id' })),
      update: vi.fn().mockResolvedValue(mockUser),
      incrementFailedAttempts: vi.fn().mockResolvedValue(undefined),
      lockAccount: vi.fn().mockResolvedValue(undefined),
      resetFailedAttempts: vi.fn().mockResolvedValue(undefined),
      updateLastLogin: vi.fn().mockResolvedValue(undefined),
      incrementTokenVersion: vi.fn().mockResolvedValue(undefined),
      findAll: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    },
    roles: {
      getUserRoles: vi.fn().mockResolvedValue([]),
      getUserPermissions: vi.fn().mockResolvedValue([]),
      findRoleById: vi.fn().mockResolvedValue(null),
    },
    refreshTokens: {
      create: vi.fn().mockResolvedValue(undefined),
      findByTokenHash: vi.fn().mockResolvedValue(null),
      revoke: vi.fn().mockResolvedValue(undefined),
      revokeAllForUser: vi.fn().mockResolvedValue(undefined),
    },
    auditLogs: {
      create: vi.fn().mockResolvedValue(undefined),
    },
  });

  beforeEach(() => {
    const mockDb = createMockDb();
    const mockJwt = new JwtService({ secret: 'test-secret' });
    const mockAudit = {
      log: vi.fn().mockResolvedValue(undefined),
      logLogin: vi.fn().mockResolvedValue(undefined),
      logLogout: vi.fn().mockResolvedValue(undefined),
      logPasswordChange: vi.fn().mockResolvedValue(undefined),
    };
    service = new AuthService(mockDb as any, mockJwt, mockAudit as any);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const dto = { email: 'new@example.com', password: 'Password123!', firstName: 'New', lastName: 'User' };
      const result = await service.register(dto);
      expect(result.user.email).toBe(dto.email);
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('should throw if email exists', async () => {
      const dto = { email: 'exists@example.com', password: 'Password123!', firstName: 'Test', lastName: 'User' };
      (service as any).database.users.findByEmail = vi.fn().mockResolvedValue(mockUser);
      await expect(service.register(dto)).rejects.toThrow('User with this email already exists');
    });
  });

  describe('login', () => {
    it('should throw for non-existent user', async () => {
      (service as any).database.users.findByEmail = vi.fn().mockResolvedValue(null);
      const dto = { email: 'nobody@example.com', password: 'wrong' };
      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should return cookie config', async () => {
      const result = await service.logout('test-id-123');
      expect(result.cookie.name).toBe('refresh_token');
      expect(result.cookie.value).toBe('');
    });
  });
});
