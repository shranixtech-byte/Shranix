import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Reflector } from '@nestjs/core';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DatabaseService } from '../../database/database.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PermissionCacheService } from '../services/permission-cache.service';

/**
 * Seeded permissions grant access at a module boundary (for example,
 * `masters.*`), while controllers protect individual master resources (for
 * example, `companies.read`). Keep that relationship explicit rather than
 * weakening the guard or duplicating every CRUD permission in seed data.
 */
const permissionResourceFamilies: Record<string, readonly string[]> = {
  masters: [
    'companies',
    'financial-years',
    'branches',
    'warehouses',
    'units',
    'categories',
    'brands',
    'tax-groups',
    'gst-rates',
  ],
  inventory: [
    'items',
    'item-groups',
    'item-variants',
    'item-pricing',
    'barcodes',
    'hsn-codes',
    'stock-opening',
    'item-images',
    'inventory-settings',
    'product',
  ],
  assets: ['asset', 'asset-category'],
  // integrations.* (seeded) grants the integration.api_key / integration.webhook / integration.import controllers
  integrations: ['integration'],
  // license.* grants the Phase-15 security dashboard + Phase-16 central KPIs
  license: ['security', 'central'],
};

export function grantsPermission(grantedPermission: string, requiredPermission: string): boolean {
  if (grantedPermission === requiredPermission || grantedPermission === '*.*') {
    return true;
  }

  const [grantedResource, grantedAction] = grantedPermission.split('.', 2);
  const [requiredResource] = requiredPermission.split('.', 2);

  if (!grantedResource || grantedAction !== '*') {
    return false;
  }

  if (
    grantedResource === requiredResource ||
    requiredPermission.startsWith(`${grantedResource}.`)
  ) {
    return true;
  }

  return permissionResourceFamilies[grantedResource]?.includes(requiredResource) ?? false;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly database: DatabaseService,
    private readonly cache: PermissionCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // Try cache first
    const cacheKey = `user_permissions:${user.id}`;
    let userPermissionKeys: string[] | null = this.cache.get<string[]>(cacheKey);

    if (!userPermissionKeys) {
      // Query permissions from database
      const userPermissions = await this.database.roles.getUserPermissions(user.id);
      userPermissionKeys = userPermissions.map((p) => `${p.resource}.${p.action}`);
      this.cache.set(cacheKey, userPermissionKeys);
    }

    const hasPermission = requiredPermissions.every((requiredPermission) =>
      userPermissionKeys!.some((grantedPermission) =>
        grantsPermission(grantedPermission, requiredPermission),
      ),
    );
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
