import { vi } from 'vitest';

import { RolesService } from '../roles.service';

describe('RolesService', () => {
  let service: RolesService;

  const createMockDb = () => ({
    roles: {
      findAllRoles: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0, hasNext: false, hasPrevious: false }),
      findRoleById: vi.fn().mockResolvedValue(null),
      findRoleByName: vi.fn().mockResolvedValue(null),
      getUserRoles: vi.fn().mockResolvedValue([]),
      getUserPermissions: vi.fn().mockResolvedValue([]),
      assignRoleToUser: vi.fn().mockResolvedValue(undefined),
      removeRoleFromUser: vi.fn().mockResolvedValue(undefined),
      assignPermissionToRole: vi.fn().mockResolvedValue(undefined),
      removePermissionFromRole: vi.fn().mockResolvedValue(undefined),
    },
    permissions: {},
    auditLogs: {},
    users: {},
    refreshTokens: {},
  });

  const createMockCache = () => ({
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    invalidate: vi.fn(),
    invalidateByPrefix: vi.fn(),
    invalidateAll: vi.fn(),
    invalidateAllPermissionCaches: vi.fn(),
  });

  const createMockAudit = () => ({
    log: vi.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    const mockDb = createMockDb();
    const mockCache = createMockCache();
    const mockAudit = createMockAudit();
    service = new RolesService(mockDb as any, mockCache as any, mockAudit as any);
  });

  describe('getAllRoles', () => {
    it('should return empty list', async () => {
      const roles = await service.getAllRoles();
      expect(roles).toEqual([]);
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles', async () => {
      const roles = await service.getUserRoles('test-id');
      expect(roles).toEqual([]);
    });
  });

  describe('userHasPermission', () => {
    it('should return false for user without permissions', async () => {
      const result = await service.userHasPermission('test-id', 'users.create');
      expect(result).toBe(false);
    });
  });
});
