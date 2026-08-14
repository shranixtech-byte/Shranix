import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

/**
 * PHASE 16 — release permission seeding (16.8).
 *
 * Seeds the `release.*` permission resource and maps it to the admin role.
 * `release.*` is intentionally NOT in the `license.*` guard family, so
 * ordinary support users (who may hold `license.*`) can never publish or
 * revoke production releases — only the admin role (or super-admin `*.*`).
 *
 * Idempotent: existing permissions/assignments are skipped.
 */
@Injectable()
export class ReleasePermissionSeedService implements OnModuleInit {
  private readonly logger = new Logger(ReleasePermissionSeedService.name);

  constructor(private readonly database: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    await this.seedReleasePermissions();
  }

  async seedReleasePermissions(): Promise<void> {
    const permissions = [
      {
        name: 'release.view',
        description: 'View release registry and version policy',
        resource: 'release',
        action: 'view',
      },
      {
        name: 'release.manage',
        description: 'Create/edit releases, attach packages, manage channels and version policy',
        resource: 'release',
        action: 'manage',
      },
      {
        name: 'release.publish',
        description: 'Publish releases to a channel',
        resource: 'release',
        action: 'publish',
      },
      {
        name: 'release.revoke',
        description: 'Revoke a production release',
        resource: 'release',
        action: 'revoke',
      },
      {
        name: 'release.download',
        description: 'Issue authenticated download access',
        resource: 'release',
        action: 'download',
      },
    ];

    const created: string[] = [];
    for (const perm of permissions) {
      try {
        const existing = await this.database.permissions.findByName(perm.name);
        if (existing) {
          continue;
        }
        await this.database.permissions.create({
          name: perm.name,
          description: perm.description,
          resource: perm.resource,
          action: perm.action,
        } as any);
        created.push(perm.name);
      } catch (err) {
        this.logger.warn(`Failed to seed permission "${perm.name}": ${(err as Error).message}`);
      }
    }

    // Assign to the admin role (idempotent).
    try {
      const rolesResult = await this.database.roles.findAllRoles({ page: 1, pageSize: 100 });
      const adminRole = (rolesResult?.data || []).find(
        (r: any) => r.name === 'admin' || r.code === 'admin',
      );
      if (adminRole) {
        for (const perm of permissions) {
          const permission = await this.database.permissions.findByName(perm.name);
          if (!permission) {
            continue;
          }
          const assigned = await this.database.permissions.getPermissionsByRole(adminRole.id);
          if (!assigned.some((p: any) => p.name === perm.name)) {
            await this.database.roles.assignPermissionToRole(adminRole.id, permission.id);
          }
        }
      } else {
        this.logger.warn('Admin role not found — release permissions created but not mapped');
      }
    } catch (err) {
      this.logger.warn(`Failed to map release permissions to admin: ${(err as Error).message}`);
    }

    if (created.length > 0) {
      this.logger.log(`Seeded release permissions: ${created.join(', ')}`);
    }
  }
}
