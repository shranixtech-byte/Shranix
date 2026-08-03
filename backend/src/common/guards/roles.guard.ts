import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Reflector } from '@nestjs/core';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DatabaseService } from '../../database/database.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PermissionCacheService } from '../services/permission-cache.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly database: DatabaseService,
    private readonly cache: PermissionCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // Try cache first
    const cacheKey = `user_roles:${user.id}`;
    let userRoleNames: string[] | null = this.cache.get<string[]>(cacheKey);

    if (!userRoleNames) {
      // Query roles from database
      const userRoles = await this.database.roles.getUserRoles(user.id);
      userRoleNames = userRoles.map((r) => r.name);
      this.cache.set(cacheKey, userRoleNames);
    }

    const hasRole = requiredRoles.some((role) => userRoleNames!.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    return true;
  }
}
