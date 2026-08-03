import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PermissionRecord, RoleRecord } from '@shranix/database';

// NestJS DI needs runtime import for constructor injection token
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditService, AuditEvent } from '../common/services/audit.service';
import { PermissionCacheService } from '../common/services/permission-cache.service';
import { DatabaseService } from '../database/database.service';

// Permission matrix domain — Settings Hub ke 'User Roles' tab ke liye.
// Ye 9 canonical actions app ke asli guard codes se map hote hain:
//   View→read · Create→create · Edit→update · Delete→delete · Approve→approve
//   Export→export · Print→print · Cancel→cancel · Restore→restore
export const MATRIX_ACTIONS = [
  'read',
  'create',
  'update',
  'delete',
  'approve',
  'export',
  'print',
  'cancel',
  'restore',
] as const;
export const MATRIX_RESOURCES = [
  'sales',
  'purchase',
  'inventory',
  'finance',
  'gst',
  'items',
  'companies',
  'users',
  'roles',
  'reports',
  'workflow',
  'dms',
  'ai',
] as const;

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly cache: PermissionCacheService,
    private readonly audit: AuditService,
  ) {}

  // ── Role CRUD ────────────────────────────────────────
  async createRole(
    dto: { name: string; description?: string },
    actorId?: string,
  ): Promise<RoleRecord> {
    const name = String(dto.name || '').trim();
    if (!name) {
      throw new ConflictException('Role name is required');
    }
    const existing = await this.database.roles.findRoleByName(name);
    if (existing) {
      throw new ConflictException(`Role "${name}" already exists`);
    }
    const role = await this.database.roles.createRole({
      name,
      description: dto.description ?? '',
      isSystem: false,
    });
    if (actorId) {
      await this.audit.log({
        userId: actorId,
        event: 'role_created' as any,
        resource: 'roles',
        action: 'create',
        details: { roleId: role.id, name },
      });
    }
    this.logger.log(`Role created: ${name}`);
    return role;
  }

  async updateRole(
    id: string,
    dto: { name?: string; description?: string },
    actorId?: string,
  ): Promise<RoleRecord> {
    const role = await this.database.roles.findRoleById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    const patch: { name?: string; description?: string } = {};
    if (dto.name !== undefined) {
      const name = String(dto.name).trim();
      if (!name) {
        throw new ConflictException('Role name is required');
      }
      const dup = await this.database.roles.findRoleByName(name);
      if (dup && dup.id !== id) {
        throw new ConflictException(`Role "${name}" already exists`);
      }
      patch.name = name;
    }
    if (dto.description !== undefined) {
      patch.description = dto.description;
    }
    const updated = await this.database.roles.updateRole(id, patch);
    if (!updated) {
      throw new NotFoundException('Role not found');
    }
    this.cache.invalidateAllPermissionCaches();
    if (actorId) {
      await this.audit.log({
        userId: actorId,
        event: 'role_updated' as any,
        resource: 'roles',
        action: 'update',
        details: { roleId: id },
      });
    }
    return updated;
  }

  async deleteRole(id: string, actorId?: string): Promise<{ message: string }> {
    const role = await this.database.roles.findRoleById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) {
      throw new ConflictException('System roles cannot be deleted');
    }
    await this.database.roles.deleteRole(id);
    this.cache.invalidateAllPermissionCaches();
    if (actorId) {
      await this.audit.log({
        userId: actorId,
        event: 'role_deleted' as any,
        resource: 'roles',
        action: 'delete',
        details: { roleId: id },
      });
    }
    return { message: `Role "${role.name}" deleted` };
  }

  // ── Role permissions (matrix) ─────────────────────────
  async getRolePermissions(roleId: string): Promise<PermissionRecord[]> {
    return this.database.roles.getRolePermissions(roleId);
  }

  async getRoleUsers(roleId: string): Promise<string[]> {
    return this.database.roles.getUsersWithRole(roleId);
  }

  private async ensurePermission(name: string): Promise<PermissionRecord> {
    const existing = await this.database.roles.findPermissionByName(name);
    if (existing) {
      return existing;
    }
    const [resource, ...rest] = name.split('.');
    const action = rest.join('.');
    try {
      return await this.database.roles.createPermission({
        name,
        resource,
        action,
        description: name,
      });
    } catch {
      // Race: doosra concurrent save ne abhi banaya hoga — re-fetch
      const recheck = await this.database.roles.findPermissionByName(name);
      if (recheck) {
        return recheck;
      }
      throw new ConflictException(`Could not create permission "${name}"`);
    }
  }

  /**
   * Matrix save — domain-limited replacement with wildcard awareness:
   * - `*.*` (global admin) wale role ko touch nahi karte (full access override rehta hai)
   * - Fully-checked row ke liye `resource.*` wildcard PRESERVE karte hain (family safety: masters.* → companies.read etc.)
   * - Partially-checked row → wildcard hata ke sirf checked granular codes
   * - Out-of-domain permissions (ai.chat, dms.upload, integrations.* ...) kabhi nahi harte
   */
  async setRolePermissions(
    roleId: string,
    permissionNames: string[],
    actorId?: string,
  ): Promise<{ assigned: number; message: string }> {
    const role = await this.database.roles.findRoleById(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const current = await this.database.roles.getRolePermissions(roleId);
    const currentByName = new Map<string, PermissionRecord>(current.map((p) => [p.name, p]));
    const currentIds = new Set(current.map((p) => p.id));

    // `*.*` = unrestricted — matrix save skip
    if (currentByName.has('*.*')) {
      return {
        assigned: 0,
        message:
          'This role has unrestricted access (*) — remove it before managing granular permissions.',
      };
    }

    // System roles (admin) ke matrix ko accidental save se lockout nahi hone dete
    if (role.isSystem) {
      return {
        assigned: 0,
        message:
          'System roles keep their seeded permissions — create a copy role if you need different access.',
      };
    }

    const domain = new Set<string>();
    for (const r of MATRIX_RESOURCES) {
      for (const a of MATRIX_ACTIONS) {
        domain.add(`${r}.${a}`);
      }
    }
    const rawInput = new Set(permissionNames.filter((n) => typeof n === 'string'));
    const requested = new Set(
      permissionNames.filter((n) => typeof n === 'string' && domain.has(n)),
    );

    // 1) Remove: in-domain exact codes not requested + partial-row wildcards
    for (const p of current) {
      const isInDomain = domain.has(p.name);
      const isMatrixWildcard =
        p.action === '*' && (MATRIX_RESOURCES as readonly string[]).includes(p.resource);
      if (isMatrixWildcard) {
        // Wildcard row: remove ONLY agar poora row checked nahi hai
        // rawInput mein `${res}.*` bhi full-row grant maana jata hai — no-op save
        // (bina change kiye Save) wildcard kabhi nahi hatayega.
        const rowFullyChecked =
          rawInput.has(`${p.resource}.*`) ||
          MATRIX_ACTIONS.every((a) => requested.has(`${p.resource}.${a}`));
        if (rowFullyChecked) {
          continue;
        } // preserve wildcard — family safety
        if (currentIds.has(p.id)) {
          await this.database.roles.removePermissionFromRole(roleId, p.id);
          currentIds.delete(p.id);
        }
      } else if (isInDomain && !requested.has(p.name) && currentIds.has(p.id)) {
        await this.database.roles.removePermissionFromRole(roleId, p.id);
        currentIds.delete(p.id);
      }
    }

    // 2) Add: requested codes (find-or-create)
    let added = 0;
    for (const name of requested) {
      const perm = await this.ensurePermission(name);
      if (!currentIds.has(perm.id)) {
        await this.database.roles.assignPermissionToRole(roleId, perm.id);
        currentIds.add(perm.id);
        added++;
      }
    }

    this.cache.invalidateAllPermissionCaches();
    if (actorId) {
      await this.audit.log({
        userId: actorId,
        event: 'role_permissions_updated' as any,
        resource: 'roles',
        action: 'update',
        details: { roleId, count: requested.size },
      });
    }
    this.logger.log(`Role ${roleId}: permissions set to ${requested.size} (${added} added)`);
    return {
      assigned: requested.size,
      message: `Permissions updated — ${requested.size} granted, ${added} added`,
    };
  }

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
    return (
      userPermStrings.includes(requiredPermission) ||
      userPermStrings.includes('*.manage') ||
      userPermStrings.includes('*.*')
    );
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
