import { Injectable, Logger } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DatabaseService } from '../../database/database.service';

export enum AuditEvent {
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGOUT_ALL = 'logout_all',
  LOGIN_FAILED = 'login_failed',
  REGISTER = 'register',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  PERMISSION_CREATED = 'permission_created',
  PERMISSION_UPDATED = 'permission_updated',
  PERMISSION_DELETED = 'permission_deleted',
  PERMISSION_ASSIGNED = 'permission_assigned',
  PERMISSION_REVOKED = 'permission_revoked',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  USER_CREATED = 'user_created',
  USER_DEACTIVATED = 'user_deactivated',
  USER_ACTIVATED = 'user_activated',
  TOKEN_REFRESHED = 'token_refreshed',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly database: DatabaseService) {}

  async log(params: {
    userId: string;
    event: AuditEvent | string;
    resource?: string | null;
    action?: string | null;
    details?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    status?: string;
    severity?: AuditSeverity | string;
  }): Promise<void> {
    try {
      await this.database.auditLogs.create({
        userId: params.userId,
        event: params.event,
        resource: params.resource ?? null,
        action: params.action ?? null,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        status: params.status ?? 'success',
        severity: params.severity ?? AuditSeverity.INFO,
      });

      if (params.severity === AuditSeverity.CRITICAL || params.severity === AuditSeverity.ERROR) {
        this.logger.warn(
          `[${params.severity}] ${params.event} by user ${params.userId}: ${JSON.stringify(params.details)}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${(error as Error).message}`);
    }
  }

  async logLogin(params: {
    userId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    status?: string;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      event: params.status === 'failure' ? AuditEvent.LOGIN_FAILED : AuditEvent.LOGIN,
      resource: 'auth',
      action: 'login',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      status: params.status ?? 'success',
      severity: params.status === 'failure' ? AuditSeverity.WARNING : AuditSeverity.INFO,
    });
  }

  async logLogout(params: {
    userId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    allDevices?: boolean;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      event: params.allDevices ? AuditEvent.LOGOUT_ALL : AuditEvent.LOGOUT,
      resource: 'auth',
      action: 'logout',
      details: { allDevices: params.allDevices ?? false },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  async logPasswordChange(params: {
    userId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      event: AuditEvent.PASSWORD_CHANGE,
      resource: 'auth',
      action: 'change_password',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      severity: AuditSeverity.WARNING,
    });
  }
}
