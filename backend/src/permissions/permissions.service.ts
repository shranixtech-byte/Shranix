import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PermissionRecord, PermissionCreateInput } from '@shranix/database';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditService, AuditEvent, AuditSeverity } from '../common/services/audit.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PermissionCacheService } from '../common/services/permission-cache.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly cache: PermissionCacheService,
    private readonly audit: AuditService,
  ) {}

  async findAll(page = 1, pageSize = 50): Promise<{ data: PermissionRecord[]; total: number; page: number; pageSize: number }> {
    const result = await this.database.permissions.findAll({ page, pageSize });
    return result;
  }

  async findById(id: string): Promise<{ data: PermissionRecord } | null> {
    const permission = await this.database.permissions.findById(id);
    if (!permission) {return null;}
    return { data: permission };
  }

  async create(dto: PermissionCreateInput, userId?: string): Promise<{ data: PermissionRecord }> {
    // Check for uniqueness
    const existing = await this.database.permissions.findByName(dto.name);
    if (existing) {
      throw new ConflictException(`Permission with name "${dto.name}" already exists`);
    }

    // Check resource+action uniqueness
    const existingByKey = await this.database.permissions.findByResourceAction(dto.resource, dto.action);
    if (existingByKey) {
      throw new ConflictException(`Permission "${dto.resource}.${dto.action}" already exists`);
    }

    const permission = await this.database.permissions.create(dto);

    // Invalidate cache
    this.cache.invalidateAllPermissionCaches();

    // Audit
    if (userId) {
      await this.audit.log({
        userId,
        event: AuditEvent.PERMISSION_CREATED,
        resource: 'permissions',
        action: 'create',
        details: { permissionId: permission.id, name: permission.name, resource: permission.resource, action: permission.action },
        severity: AuditSeverity.INFO,
      });
    }

    this.logger.log(`Permission created: ${dto.resource}.${dto.action}`);
    return { data: permission };
  }

  async update(id: string, dto: Partial<PermissionCreateInput>, userId?: string): Promise<{ data: PermissionRecord } | null> {
    const permission = await this.database.permissions.findById(id);
    if (!permission) {
      throw new NotFoundException(`Permission with id "${id}" not found`);
    }

    const updated = await this.database.permissions.update(id, dto);
    if (!updated) {return null;}

    // Invalidate cache
    this.cache.invalidateAllPermissionCaches();

    // Audit
    if (userId) {
      await this.audit.log({
        userId,
        event: AuditEvent.PERMISSION_UPDATED,
        resource: 'permissions',
        action: 'update',
        details: { permissionId: id, changes: dto },
        severity: AuditSeverity.INFO,
      });
    }

    return { data: updated };
  }

  async delete(id: string, userId?: string): Promise<void> {
    const permission = await this.database.permissions.findById(id);
    if (!permission) {
      throw new NotFoundException(`Permission with id "${id}" not found`);
    }

    await this.database.permissions.softDelete(id);

    // Invalidate cache
    this.cache.invalidateAllPermissionCaches();

    // Audit
    if (userId) {
      await this.audit.log({
        userId,
        event: AuditEvent.PERMISSION_DELETED,
        resource: 'permissions',
        action: 'delete',
        details: { permissionId: id, name: permission.name },
        severity: AuditSeverity.WARNING,
      });
    }

    this.logger.log(`Permission soft-deleted: ${permission.name}`);
  }

  async getPermissionsByRole(roleId: string): Promise<PermissionRecord[]> {
    return this.database.permissions.getPermissionsByRole(roleId);
  }

  async assignToRole(roleId: string, permissionId: string): Promise<void> {
    await this.database.roles.assignPermissionToRole(roleId, permissionId);
    this.cache.invalidateAllPermissionCaches();
    this.logger.log(`Permission ${permissionId} assigned to role ${roleId}`);
  }

  async removeFromRole(roleId: string, permissionId: string): Promise<void> {
    await this.database.roles.removePermissionFromRole(roleId, permissionId);
    this.cache.invalidateAllPermissionCaches();
    this.logger.log(`Permission ${permissionId} removed from role ${roleId}`);
  }
}
