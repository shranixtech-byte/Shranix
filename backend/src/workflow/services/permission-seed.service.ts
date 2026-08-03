import { OnModuleInit, Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class PermissionSeedService implements OnModuleInit {
  private readonly logger = new Logger(PermissionSeedService.name);

  constructor(private readonly database: DatabaseService) {}

  async onModuleInit() {
    await this.seedWorkflowPermissions();
  }

  async seedWorkflowPermissions(): Promise<void> {
    const workflowPermissions = [
      {
        name: 'workflow.create',
        description: 'Create workflow instances',
        resource: 'workflow',
        action: 'create',
      },
      {
        name: 'workflow.read',
        description: 'Read workflow instances',
        resource: 'workflow',
        action: 'read',
      },
      {
        name: 'workflow.update',
        description: 'Update workflow instances',
        resource: 'workflow',
        action: 'update',
      },
      {
        name: 'workflow.delete',
        description: 'Delete workflow instances',
        resource: 'workflow',
        action: 'delete',
      },
      {
        name: 'workflow.approve',
        description: 'Approve workflow tasks',
        resource: 'workflow',
        action: 'approve',
      },
      {
        name: 'workflow.reject',
        description: 'Reject workflow tasks',
        resource: 'workflow',
        action: 'reject',
      },
      {
        name: 'workflow.comment',
        description: 'Comment on workflows',
        resource: 'workflow',
        action: 'comment',
      },
      {
        name: 'workflow.escalate',
        description: 'Escalate workflow tasks',
        resource: 'workflow',
        action: 'escalate',
      },
    ];

    for (const perm of workflowPermissions) {
      try {
        // Check if permission already exists
        const existing = await this.database.permissions.findByName(perm.name);
        if (existing) {
          this.logger.debug(`Permission "${perm.name}" already exists, skipping`);
          continue;
        }

        await this.database.permissions.create({
          name: perm.name,
          description: perm.description,
          resource: perm.resource,
          action: perm.action,
        });
        this.logger.log(`Permission "${perm.name}" seeded successfully`);
      } catch (error) {
        this.logger.warn(`Failed to seed permission "${perm.name}": ${(error as Error).message}`);
      }
    }

    // Assign workflow permissions to admin role
    try {
      // Find admin role - use the roles repository directly
      const rolesResult = await this.database.roles.findAllRoles({ page: 1, pageSize: 100 });
      const rolesData = rolesResult.data || [];
      const adminRole = rolesData.find((r: any) => r.name === 'admin' || r.code === 'admin');
      if (adminRole) {
        for (const perm of workflowPermissions) {
          const permission = await this.database.permissions.findByName(perm.name);
          if (permission) {
            // Check if already assigned
            const existingPermissions = await this.database.permissions.getPermissionsByRole(
              adminRole.id,
            );
            const alreadyAssigned = existingPermissions.some((p: any) => p.name === perm.name);
            if (!alreadyAssigned) {
              await this.database.roles.assignPermissionToRole(adminRole.id, permission.id);
              this.logger.log(`Permission "${perm.name}" assigned to admin role`);
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to assign workflow permissions to admin: ${(error as Error).message}`,
      );
    }

    this.logger.log('Workflow permissions seeding completed');
  }
}
