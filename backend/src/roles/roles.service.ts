import { Injectable, Logger } from '@nestjs/common';
import { PermissionRecord, RoleRecord } from '@shranix/database';

// NestJS DI needs runtime import for constructor injection token
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditService, AuditEvent } from '../common/services/audit.service';
import { PermissionCacheService } from '../common/services/permission-cache.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly cache: PermissionCacheService,
    private readonly audit: AuditService,
  ) {}

  async getAllRoles(): Promise<RoleRecord[]> {
    const result = await this.database.roles.findAllRoles({ page: 1, pageSize: 100 });
    return result.data;
  }

  async getRoleById(id: string): Promise<RoleRecord | null> {
    return this.database.roles.findRoleById(id);
  }

  async getUserRoles(userId: string): Promise<RoleRecord[]> {
    return this.database.roles.getUserRoles(userId);
  }

  async getUserPermissions(userId: string): Promise<PermissionRecord[]> {
    return this.database.roles.getUserPermissions(userId);
  }

  async userHasPermission(userId: string, requiredPermission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    const userPermStrings = permissions.map((p) => `${p.resource}.${p.action}`);
    return userPermStrings.includes(requiredPermission) || userPermStrings.includes('*.manage') || userPermStrings.includes('*.*');
  }

  async assignRole(userId: string, roleId: string, actorId?: string): Promise<void> {
    await this.database.roles.assignRoleToUser(userId, roleId);
    this.cache.invalidateByPrefix(`user_roles:${userId}`);
    this.cache.invalidateByPrefix(`user_permissions:${userId}`);
    if (actorId) {
      await this.audit.log({
        userId: actorId,
        event: AuditEvent.ROLE_ASSIGNED,
        resource: 'roles',
        action: 'assign',
        details: { targetUserId: userId, roleId },
      });
    }
    this.logger.log(`Role ${roleId} assigned to user ${userId}`);
  }

  async removeRole(userId: string, roleId: string, actorId?: string): Promise<void> {
    await this.database.roles.removeRoleFromUser(userId, roleId);
    this.cache.invalidateByPrefix(`user_roles:${userId}`);
    this.cache.invalidateByPrefix(`user_permissions:${userId}`);
    if (actorId) {
      await this.audit.log({
        userId: actorId,
        event: AuditEvent.ROLE_REMOVED,
        resource: 'roles',
        action: 'remove',
        details: { targetUserId: userId, roleId },
      });
    }
    this.logger.log(`Role ${roleId} removed from user ${userId}`);
  }

  async assignPermission(roleId: string, permissionId: string, actorId?: string): Promise<void> {
    await this.database.roles.assignPermissionToRole(roleId, permissionId);
    this.cache.invalidateAllPermissionCaches();
    if (actorId) {
      await this.audit.log({
        userId: actorId,
        event: AuditEvent.PERMISSION_ASSIGNED,
        resource: 'permissions',
        action: 'assign',
        details: { roleId, permissionId },
      });
    }
    this.logger.log(`Permission ${permissionId} assigned to role ${roleId}`);
  }

  async removePermission(roleId: string, permissionId: string, actorId?: string): Promise<void> {
    await this.database.roles.removePermissionFromRole(roleId, permissionId);
    this.cache.invalidateAllPermissionCaches();
    if (actorId) {
      await this.audit.log({
        userId: actorId,
        event: AuditEvent.PERMISSION_REVOKED,
        resource: 'permissions',
        action: 'revoke',
        details: { roleId, permissionId },
      });
    }
    this.logger.log(`Permission ${permissionId} removed from role ${roleId}`);
  }
}
