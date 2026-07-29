import { vi } from 'vitest';

import { CreateUserDto } from '../dto/create-user.dto';
import { UsersService } from '../users.service';

describe('UsersService', () => {
  let service: UsersService;

  const createMockDb = () => ({
    users: {
      create: vi.fn().mockImplementation((data: any) => ({
        id: 'test-id',
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        isDeleted: false,
      })),
      findById: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn().mockResolvedValue(null),
      findAll: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrevious: false }),
      updateLastLogin: vi.fn().mockResolvedValue(undefined),
      resetFailedAttempts: vi.fn().mockResolvedValue(undefined),
      incrementFailedAttempts: vi.fn().mockResolvedValue(undefined),
      lockAccount: vi.fn().mockResolvedValue(undefined),
      incrementTokenVersion: vi.fn().mockResolvedValue(undefined),
    },
    roles: {
      getUserPermissions: vi.fn().mockResolvedValue([]),
    },
    refreshTokens: {
      create: vi.fn().mockResolvedValue(undefined),
    },
  });

  beforeEach(() => {
    const mockDb = createMockDb();
    service = new UsersService(mockDb as any);
  });

  const createDto: CreateUserDto = {
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    phone: '1234567890',
  };

  describe('create', () => {
    it('should create a new user', async () => {
      const user = await service.create(createDto);
      expect(user.email).toBe(createDto.email);
      expect(user.firstName).toBe(createDto.firstName);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      (service as any).database.users.findByEmail = vi.fn().mockResolvedValue({ ...createDto, id: 'test-id' });
      const found = await service.findByEmail(createDto.email);
      expect(found).not.toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return users', async () => {
      (service as any).database.users.findAll = vi.fn().mockResolvedValue({
        data: [{ ...createDto, id: '1' }],
        total: 1, page: 1, pageSize: 20, totalPages: 1, hasNext: false, hasPrevious: false,
      });
      const users = await service.findAll();
      expect(users.length).toBeGreaterThanOrEqual(1);
    });
  });
});
