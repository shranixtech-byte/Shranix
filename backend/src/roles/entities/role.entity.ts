export interface RoleEntity {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionEntity {
  id: string;
  name: string;
  description?: string | null;
  resource: string;
  action: string;
}

export interface RolePermissionEntity {
  id: string;
  roleId: string;
  permissionId: string;
}

export interface UserRoleEntity {
  id: string;
  userId: string;
  roleId: string;
}
