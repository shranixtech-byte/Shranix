import crypto from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DatabaseService } from '../../database/database.service';
import { RequestContextService } from '../context/request-context.service';

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

export interface AuditLogParams {
  userId: string;
  event: AuditEvent | string;
  resource?: string | null;
  action?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: string;
  severity?: AuditSeverity | string;
  // Rich audit-trail fields (written to shranix_audit_details when old/new present)
  entityId?: string | null;
  module?: string | null;
  actionType?: string | null;
  userName?: string | null;
  userRole?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  sessionId?: string | null;
}

/** Fields that are never shown as audit "changes" (audit/row metadata). */
const INTERNAL_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'isDeleted',
  'created_by',
  'updated_by',
  'createdBy',
  'updatedBy',
  'is_deleted',
  'deleted_at',
]);

/** Keep only the fields that actually differ between before/after. */
export function diffValues(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): {
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  changes: { field: string; old: unknown; new: unknown }[];
} {
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};
  const changes: { field: string; old: unknown; new: unknown }[] = [];

  const keys = new Set<string>([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const key of keys) {
    if (INTERNAL_FIELDS.has(key)) {
      continue;
    }
    const oldV = before ? (before as Record<string, unknown>)[key] : undefined;
    const newV = after ? (after as Record<string, unknown>)[key] : undefined;
    const oldS = oldV === undefined ? undefined : JSON.stringify(oldV);
    const newS = newV === undefined ? undefined : JSON.stringify(newV);
    if (oldS !== newS) {
      // null (not undefined) so JSON round-trips preserve "field was absent"
      oldValues[key] = oldV === undefined ? null : oldV;
      newValues[key] = newV === undefined ? null : newV;
      changes.push({
        field: key,
        old: oldV === undefined ? null : oldV,
        new: newV === undefined ? null : newV,
      });
    }
  }
  return { oldValues, newValues, changes };
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
  ) {}

  /** Best-effort user display name (first + last). */
  async resolveUserName(userId: string): Promise<string> {
    try {
      const user = await this.database.users.findById(userId);
      if (user) {
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
        return name || String(user.email || user.id).slice(0, 40);
      }
    } catch {
      /* ignore */
    }
    return '';
  }

  async log(params: AuditLogParams): Promise<void> {
    // Auto-populate IP / user-agent from the current request when not passed explicitly.
    const ipAddress = params.ipAddress ?? this.requestContext.getIp();
    const userAgent = params.userAgent ?? this.requestContext.getUserAgent();

    try {
      const logId = crypto.randomUUID();
      await this.database.auditLogs.create({
        userId: params.userId,
        event: params.event,
        resource: params.resource ?? null,
        action: params.action ?? null,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress,
        userAgent,
        status: params.status ?? 'success',
        severity: params.severity ?? AuditSeverity.INFO,
      });

      // Rich change record — written when old/new values are available.
      const hasChange =
        (params.oldValues !== undefined && params.oldValues !== null) ||
        (params.newValues !== undefined && params.newValues !== null);
      if (hasChange) {
        const { oldValues, newValues, changes } = diffValues(params.oldValues, params.newValues);
        // Skip no-op rows when BOTH sides were given and nothing actually changed.
        const bothSidesGiven =
          params.oldValues !== undefined &&
          params.oldValues !== null &&
          params.newValues !== undefined &&
          params.newValues !== null;
        if (!(bothSidesGiven && changes.length === 0)) {
          const userName = params.userName ?? (await this.resolveUserName(params.userId));
          await this.database.auditDetails.create({
            auditLogId: logId,
            action: params.action ?? 'update',
            actionType: params.actionType ?? params.action ?? 'change',
            entityType: params.resource ?? 'record',
            entityId: params.entityId ?? null,
            userId: params.userId,
            userName: userName || null,
            userRole: params.userRole ?? null,
            ipAddress,
            userAgent,
            oldValues: JSON.stringify(oldValues),
            newValues: JSON.stringify(newValues),
            changes: JSON.stringify(changes),
            timestamp: new Date().toISOString(),
            module: params.module ?? 'System',
            status: params.status ?? 'success',
            remarks: params.details ? JSON.stringify(params.details).slice(0, 2000) : null,
            sessionId: params.sessionId ?? null,
          });
        }
      }

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
