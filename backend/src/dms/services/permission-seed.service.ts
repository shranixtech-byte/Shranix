import { OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class DmsPermissionSeedService implements OnModuleInit {
  private readonly logger = new Logger(DmsPermissionSeedService.name);

  constructor(private readonly database: DatabaseService) {}

  async onModuleInit() {
    await this.seedDmsPermissions();
  }

  async seedDmsPermissions(): Promise<void> {
    const dmsPermissions = [
      { name: 'dms.create', description: 'Create documents in DMS', resource: 'dms', action: 'create' },
      { name: 'dms.read', description: 'Read documents in DMS', resource: 'dms', action: 'read' },
      { name: 'dms.update', description: 'Update documents in DMS', resource: 'dms', action: 'update' },
      { name: 'dms.delete', description: 'Delete documents in DMS', resource: 'dms', action: 'delete' },
      { name: 'dms.upload', description: 'Upload files to DMS', resource: 'dms', action: 'upload' },
      { name: 'dms.download', description: 'Download files from DMS', resource: 'dms', action: 'download' },
      { name: 'dms.sign', description: 'Sign documents digitally', resource: 'dms', action: 'sign' },
      { name: 'dms.restore', description: 'Restore previous document versions', resource: 'dms', action: 'restore' },
      { name: 'dms.archive', description: 'Archive documents', resource: 'dms', action: 'archive' },
    ];

    for (const perm of dmsPermissions) {
      try {
        const existing = await (this.database as any).permissions.findByName(perm.name);
        if (existing) {
          this.logger.debug(`Permission "${perm.name}" already exists, skipping`);
          continue;
        }
        await this.database.permissions.create({
          name: perm.name,
          description: perm.description,
          resource: perm.resource,
          action: perm.action,
        } as any);
        this.logger.log(`Permission "${perm.name}" seeded successfully`);
      } catch (error) {
        this.logger.warn(`Failed to seed permission "${perm.name}": ${(error as Error).message}`);
      }
    }

    // Assign DMS permissions to admin role
    try {
      const rolesResult = await (this.database as any).roles.findAllRoles({ page: 1, pageSize: 100 });
      const rolesData = rolesResult.data || [];
      const adminRole = rolesData.find((r: any) => r.name === 'admin' || r.code === 'admin');
      if (adminRole) {
        for (const perm of dmsPermissions) {
          const permission = await (this.database as any).permissions.findByName(perm.name);
          if (permission) {
            const existingPermissions = await (this.database as any).permissions.getPermissionsByRole(adminRole.id);
            const alreadyAssigned = existingPermissions.some((p: any) => p.name === perm.name);
            if (!alreadyAssigned) {
              await (this.database as any).roles.assignPermissionToRole(adminRole.id, permission.id);
              this.logger.log(`Permission "${perm.name}" assigned to admin role`);
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to assign DMS permissions to admin: ${(error as Error).message}`);
    }

    this.logger.log('DMS permissions seeding completed');
  }
}
