import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { publicId } from '../license/numbering';

/**
 * PHASE 15 — SECURITY EVENT ENGINE.
 *
 * Append-only log of security-relevant facts. The server is the licensing
 * authority; this engine records attempts the server REJECTED or suspicious
 * patterns it observed, so abuse is auditable and supportable.
 *
 * Event types (PHASE 15.30):
 *   INVALID_LICENSE | INVALID_TOKEN | TOKEN_TAMPER | SIGNATURE_FAILURE |
 *   ACTIVATION_LIMIT_REACHED | DUPLICATE_ACTIVATION | REPLAY_DETECTED |
 *   DEVICE_MISMATCH | CLOCK_ROLLBACK | RATE_LIMIT_TRIGGERED |
 *   UNAUTHORIZED_LICENSE_ACCESS | UNAUTHORIZED_DEVICE_ACCESS |
 *   ADMIN_OVERRIDE | INTEGRITY_FAILURE | UPDATE_SIGNATURE_FAILURE |
 *   SUSPICIOUS_ACTIVATION | KEY_ROTATED | LICENSE_REVOKED_EMERGENCY
 *
 * Severity (PHASE 15.31): INFO | LOW | MEDIUM | HIGH | CRITICAL
 * Response policy (PHASE 15.34):
 *   1 log only · 2 require online validation · 3 require reauthentication ·
 *   4 require device recovery · 5 admin review · 6 license suspension
 *   (6 only when authorized and justified — never automatic).
 *
 * SAFE METADATA ONLY: never log passwords, tokens, private keys, raw machine
 * identifiers or full secrets. Use masked references (SHR-LIC-****1234).
 */
export type SecuritySeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const SECURITY_EVENT_TYPES = {
  INVALID_LICENSE: 'INVALID_LICENSE',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_TAMPER: 'TOKEN_TAMPER',
  SIGNATURE_FAILURE: 'SIGNATURE_FAILURE',
  ACTIVATION_LIMIT_REACHED: 'ACTIVATION_LIMIT_REACHED',
  DUPLICATE_ACTIVATION: 'DUPLICATE_ACTIVATION',
  REPLAY_DETECTED: 'REPLAY_DETECTED',
  DEVICE_MISMATCH: 'DEVICE_MISMATCH',
  CLOCK_ROLLBACK: 'CLOCK_ROLLBACK',
  RATE_LIMIT_TRIGGERED: 'RATE_LIMIT_TRIGGERED',
  UNAUTHORIZED_LICENSE_ACCESS: 'UNAUTHORIZED_LICENSE_ACCESS',
  UNAUTHORIZED_DEVICE_ACCESS: 'UNAUTHORIZED_DEVICE_ACCESS',
  ADMIN_OVERRIDE: 'ADMIN_OVERRIDE',
  INTEGRITY_FAILURE: 'INTEGRITY_FAILURE',
  UPDATE_SIGNATURE_FAILURE: 'UPDATE_SIGNATURE_FAILURE',
  SUSPICIOUS_ACTIVATION: 'SUSPICIOUS_ACTIVATION',
  KEY_ROTATED: 'KEY_ROTATED',
  LICENSE_REVOKED_EMERGENCY: 'LICENSE_REVOKED_EMERGENCY',
  WEBHOOK_SIGNATURE_FAILURE: 'WEBHOOK_SIGNATURE_FAILURE',
} as const;

export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[keyof typeof SECURITY_EVENT_TYPES];

export interface SecurityEventInput {
  eventType: SecurityEventType | string;
  severity?: SecuritySeverity;
  customerId?: string | null;
  licenseId?: string | null;
  deviceRef?: string | null;
  installationRef?: string | null;
  source?: string;
  ipAddress?: string | null;
  actor?: string | null;
  responseLevel?: number;
  metadata?: Record<string, any> | null;
}

export interface SecurityEventQuery {
  page?: number;
  pageSize?: number;
  severity?: string;
  eventType?: string;
  customerId?: string;
  licenseId?: string;
  deviceRef?: string;
  source?: string;
  search?: string;
  from?: string;
  to?: string;
}

const SEARCH_FIELDS = ['eventId', 'eventType', 'severity', 'deviceRef', 'installationRef'];

/** Default response level per severity — configurable per event. */
const SEVERITY_RESPONSE: Record<SecuritySeverity, number> = {
  INFO: 1,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 5,
};

/** Mask an IP for storage — keeps the /24 (v4) or /48 (v6) prefix. */
export function maskIp(ip?: string | null): string | null {
  if (!ip) {
    return null;
  }
  const clean = String(ip).trim();
  if (clean.includes(':')) {
    // IPv6 — keep first 4 hextets (empty → 0) as a coarse /48 prefix
    const parts = clean
      .split(':')
      .slice(0, 4)
      .map((p) => p || '0');
    return parts.length >= 4 ? `${parts.join(':')}::/48` : 'masked';
  }
  const parts = clean.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  return 'masked';
}

/** Mask a license/device reference — SHR-LIC-1234-5678 → SHR-LIC-****5678. */
export function maskReference(ref?: string | null): string | null {
  if (!ref) {
    return null;
  }
  const s = String(ref);
  return s.length <= 8 ? '****' : `${s.slice(0, s.length - 4)}****`;
}

@Injectable()
export class SecurityEventsService {
  private readonly logger = new Logger(SecurityEventsService.name);

  constructor(private readonly database: DatabaseService) {}

  /**
   * Record a security event. Best-effort — a failure to persist must never
   * break the business operation that triggered it.
   */
  async record(input: SecurityEventInput): Promise<void> {
    const severity: SecuritySeverity = this.normalizeSeverity(input.severity);
    const responseLevel = Number(input.responseLevel) || SEVERITY_RESPONSE[severity] || 1;
    try {
      await this.database.securityEvents.create({
        eventId: publicId('sev'),
        eventType: String(input.eventType || 'INVALID_LICENSE'),
        severity,
        eventTime: new Date().toISOString(),
        customerId: input.customerId || null,
        licenseId: input.licenseId || null,
        deviceRef: input.deviceRef || null,
        installationRef: input.installationRef || null,
        source: input.source || 'api',
        ipAddress: maskIp(input.ipAddress),
        actor: input.actor || null,
        responseLevel,
        metadata: input.metadata ? JSON.stringify(this.sanitizeMetadata(input.metadata)) : null,
      } as any);
    } catch (err) {
      this.logger.warn(
        `Security event ${input.eventType} record failed: ${(err as Error).message}`,
      );
    }
  }

  private normalizeSeverity(sev?: string): SecuritySeverity {
    const s = String(sev || 'LOW').toUpperCase();
    return (['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).includes(s as SecuritySeverity)
      ? (s as SecuritySeverity)
      : 'LOW';
  }

  /** Drop anything that looks like a secret / raw fingerprint before storage. */
  private sanitizeMetadata(meta: Record<string, any>): Record<string, any> {
    const DENY_KEYS =
      /password|secret|token|private.?key|pem|signature|machine|fingerprint|raw|hash$/i;
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(meta || {})) {
      if (DENY_KEYS.test(k)) {
        out[k] = '[masked]';
        continue;
      }
      if (typeof v === 'string' && v.length > 200) {
        out[k] = `${v.slice(0, 200)}…`;
        continue;
      }
      out[k] = v;
    }
    return out;
  }

  private buildFilters(
    q: SecurityEventQuery,
  ): { field: string; operator: string; value: string }[] {
    const filters: { field: string; operator: string; value: string }[] = [];
    if (q.severity) {
      filters.push({ field: 'severity', operator: 'eq', value: q.severity.toUpperCase() });
    }
    if (q.eventType) {
      filters.push({ field: 'eventType', operator: 'eq', value: q.eventType.toUpperCase() });
    }
    if (q.customerId) {
      filters.push({ field: 'customerId', operator: 'eq', value: q.customerId });
    }
    if (q.licenseId) {
      filters.push({ field: 'licenseId', operator: 'eq', value: q.licenseId });
    }
    if (q.deviceRef) {
      filters.push({ field: 'deviceRef', operator: 'eq', value: q.deviceRef });
    }
    if (q.source) {
      filters.push({ field: 'source', operator: 'eq', value: q.source });
    }
    if (q.from) {
      filters.push({ field: 'eventTime', operator: 'gte', value: new Date(q.from).toISOString() });
    }
    if (q.to) {
      filters.push({ field: 'eventTime', operator: 'lte', value: new Date(q.to).toISOString() });
    }
    return filters;
  }

  private mapRow(row: any) {
    let metadata: Record<string, any> | null = null;
    try {
      metadata = row.metadata ? JSON.parse(row.metadata) : null;
    } catch {
      /* ignore */
    }
    return {
      id: row.eventId,
      eventType: row.eventType,
      severity: row.severity,
      eventTime: row.eventTime,
      customerId: row.customerId,
      licenseId: row.licenseId,
      deviceRef: row.deviceRef,
      installationRef: row.installationRef,
      source: row.source,
      ipAddress: row.ipAddress,
      actor: row.actor,
      responseLevel: Number(row.responseLevel) || 1,
      metadata,
    };
  }

  /** Filterable, pageable security event log for the admin dashboard. */
  async query(q: SecurityEventQuery = {}): Promise<{
    data: ReturnType<SecurityEventsService['mapRow']>[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const filters = this.buildFilters(q);
    const result = await this.database.securityEvents.findAll({
      page: Math.max(1, Number(q.page) || 1),
      pageSize: Math.min(Math.max(Number(q.pageSize) || 50, 1), 200),
      search: q.search || undefined,
      searchFields: SEARCH_FIELDS,
      filters: filters.length > 0 ? filters : undefined,
      sorts: [{ field: 'eventTime', direction: 'desc' }],
    } as any);
    const data = (result.data || [])
      .filter((r: any) => !r.isDeleted)
      .map((r: any) => this.mapRow(r));
    return {
      data,
      total: Number(result.total || 0),
      page: Number(result.page || 1),
      pageSize: Number(result.pageSize || q.pageSize || 50),
      totalPages: Number(result.totalPages || 0),
    };
  }

  /** Dashboard summary — counts by severity, top event types, recent criticals. */
  async summary(days = 7): Promise<Record<string, any>> {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const all = await this.query({ page: 1, pageSize: 200, from: since });
    const bySeverity: Record<string, number> = { INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const byType: Record<string, number> = {};
    const criticals: any[] = [];
    for (const e of all.data) {
      bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
      byType[e.eventType] = (byType[e.eventType] || 0) + 1;
      if (e.severity === 'CRITICAL' || e.severity === 'HIGH') {
        criticals.push(e);
      }
    }
    const topTypes = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));
    return {
      windowDays: days,
      total: all.total,
      bySeverity,
      topTypes,
      criticals: criticals.slice(0, 20),
      generatedAt: new Date().toISOString(),
    };
  }
}
