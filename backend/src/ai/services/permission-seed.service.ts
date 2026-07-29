import { OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AiPermissionSeedService implements OnModuleInit {
  private readonly logger = new Logger(AiPermissionSeedService.name);

  constructor(private readonly database: DatabaseService) {}

  async onModuleInit() {
    try {
      await this.seedAiPermissions();
    } catch (error) {
      this.logger.warn(`AI permission seeding deferred: ${(error as Error).message}`);
    }
  }

  async seedAiPermissions(): Promise<void> {
    const aiPermissions = [
      { name: 'ai.chat', description: 'Chat with AI Copilot', resource: 'ai', action: 'chat' },
      { name: 'ai.query', description: 'Execute natural language queries', resource: 'ai', action: 'query' },
      { name: 'ai.insights', description: 'View AI-generated insights', resource: 'ai', action: 'insights' },
      { name: 'ai.predict', description: 'View AI predictions and forecasts', resource: 'ai', action: 'predict' },
      { name: 'ai.documents', description: 'Analyze documents with AI', resource: 'ai', action: 'documents' },
      { name: 'ai.automation', description: 'AI-assisted automation suggestions', resource: 'ai', action: 'automation' },
      { name: 'ai.admin', description: 'AI administration (usage, provider switch)', resource: 'ai', action: 'admin' },
    ];

    for (const perm of aiPermissions) {
      try {
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

    // Assign AI permissions to admin role
    try {
      const rolesResult = await this.database.roles.findAllRoles({ page: 1, pageSize: 100 });
      const rolesData = rolesResult.data || [];
      const adminRole = rolesData.find((r: any) => r.name === 'admin' || r.code === 'admin');
      if (adminRole) {
        for (const perm of aiPermissions) {
          const permission = await this.database.permissions.findByName(perm.name);
          if (permission) {
            const existingPermissions = await this.database.permissions.getPermissionsByRole(adminRole.id);
            const alreadyAssigned = existingPermissions.some((p: any) => p.name === perm.name);
            if (!alreadyAssigned) {
              await this.database.roles.assignPermissionToRole(adminRole.id, permission.id);
              this.logger.log(`Permission "${perm.name}" assigned to admin role`);
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to assign AI permissions to admin: ${(error as Error).message}`);
    }

    this.logger.log('AI permissions seeding completed');
  }
}
