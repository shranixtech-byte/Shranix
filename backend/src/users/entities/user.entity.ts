export interface UserEntity {
  id: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string | null;
  failedLoginAttempts: number;
  lockedUntil?: string | null;
  refreshTokenVersion: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  isDeleted?: boolean;
}
