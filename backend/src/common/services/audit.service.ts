import crypto from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DatabaseService } from '../../database/database.service';
import { RequestContextService } from '../context/request-context.service';

export enum AuditEvent {
  // Authentication events
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGOUT_ALL = 'logout_all',
  LOGIN_FAILED = 'login_failed',
  REGISTER = 'register',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',
  TOKEN_REFRESHED = 'token_refreshed',
  TOKEN_REFRESH_REUSE_DETECTED = 'token_refresh_reuse_detected',
  TOKEN_REVOKED = 'token_revoked',

  // Authorization events
  AUTHORIZATION_DENIED = 'authorization_denied',
  TENANT_ACCESS_DENIED = 'tenant_access_denied',

  // Account security events
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  ACCOUNT_ACTIVATED = 'account_activated',
  ACCOUNT_DEACTIVATED = 'account_deactivated',

  // Admin events
  USER_CREATED = 'user_created',
  USER_DEACTIVATED = 'user_deactivated',
  USER_ACTIVATED = 'user_activated',
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  ROLE_CHANGED = 'role_changed',
  PERMISSION_CREATED = 'permission_created',
  PERMISSION_UPDATED = 'permission_updated',
  PERMISSION_DELETED = 'permission_deleted',
  PERMISSION_ASSIGNED = 'permission_assigned',
  PERMISSION_REVOKED = 'permission_revoked',
  ADMIN_SESSION_REVOKED = 'admin_session_revoked',

  // Data access events
  DATA_EXPORT = 'data_export',
  DATA_IMPORT = 'data_import',
  BULK_OPERATION = 'bulk_operation',

  // Backup events
  BACKUP_CREATED = 'backup_created',
  BACKUP_RESTORED = 'backup_restored',
  BACKUP_DOWNLOADED = 'backup_downloaded',

  // Webhook / payment events
  WEBHOOK_SIGNATURE_FAILURE = 'webhook_signature_failure',
  WEBHOOK_REPLAY_DETECTED = 'webhook_replay_detected',

  // Rate limit events
  RATE_LIMIT_TRIGGERED = 'rate_limit_triggered',
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
  // H17: Request/correlation ID for traceability
  requestId?: string | null;
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

// ─── H17: Metadata Safety Bounds ─────────────────────────────────

/** Maximum length for any single string value in metadata/details. */
const MAX_STRING_LENGTH = 500;
/** Maximum depth for nested objects in metadata. */
const MAX_DEPTH = 4;
/** Maximum number of keys at any level. */
const MAX_KEYS = 20;

/** Fields that are sensitive and must never appear in audit details. */
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'jwt',
  'authorization',
  'csrf',
  'csrfToken',
  'csrf_token',
  'secret',
  'apiKey',
  'api_key',
  'clientSecret',
  'client_secret',
  'resetToken',
  'reset_token',
  'activationToken',
  'activation_token',
  'cookie',
  'set-cookie',
  'privateKey',
  'private_key',
  'creditCard',
  'cardNumber',
]);

/** H17: Sanitize metadata to remove sensitive fields and enforce bounds. */
function sanitizeAuditMetadata(
  obj: Record<string, unknown> | null | undefined,
  depth = 0,
): Record<string, unknown> | null {
  if (!obj || typeof obj !== 'object') {
    return null;
  }
  if (depth > MAX_DEPTH) {
    return { _truncated: true };
  }

  const result: Record<string, unknown> = {};
  let keyCount = 0;
  for (const [key, value] of Object.entries(obj)) {
    if (keyCount >= MAX_KEYS) {
      break;
    }
    // Redact sensitive fields
    if (SENSITIVE_FIELDS.has(key) || /password|secret|token|key/i.test(key)) {
      result[key] = '[redacted]';
      keyCount++;
      continue;
    }
    if (typeof value === 'string') {
      result[key] =
        value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
    } else if (Array.isArray(value)) {
      result[key] = value.slice(0, 10); // Bound array length
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeAuditMetadata(value as Record<string, unknown>, depth + 1);
    } else {
      result[key] = value;
    }
    keyCount++;
  }
  return result;
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
    // H17: Auto-populate requestId from request context if not provided
    const _requestId = params.requestId ?? this.requestContext.getContext?.()?.requestId ?? null;

    try {
      // H17: Sanitize details to remove sensitive fields and enforce bounds
      // Include requestId in details for traceability
      const baseDetails = {
        ...(params.details || {}),
        ...(_requestId ? { requestId: _requestId } : {}),
      };
      const sanitizedDetails = sanitizeAuditMetadata(baseDetails);

      const logId = crypto.randomUUID();
      await this.database.auditLogs.create({
        userId: params.userId,
        event: params.event,
        resource: params.resource ?? null,
        action: params.action ?? null,
        details: sanitizedDetails ? JSON.stringify(sanitizedDetails) : null,
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
