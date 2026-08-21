/**
 * H13 — Centralized rate-limit policies.
 *
 * Provides named throttling presets so every endpoint applies consistent,
 * endpoint-appropriate limits without duplicating magic numbers.
 *
 * Uses @nestjs/throttler v6 `@Throttle({ default: { ttl, limit } })` shape.
 *
 * Rate limiting is currently process-local (in-memory ThrottlerStore).
 * For multi-instance production, back with Redis via @nestjs/throttler-plugin-redis
 * or a shared ThrottlerStorage implementation.
 */

// ─── Policy definitions ────────────────────────────────────────────

export interface ThrottlePolicy {
  /** Window duration in milliseconds */
  ttl: number;
  /** Max requests per window */
  limit: number;
  /** Human-readable label for logging */
  label: string;
}

/** Auth — login: aggressive brute-force protection */
export const THROTTLE_AUTH_LOGIN: ThrottlePolicy = {
  ttl: 60_000,
  limit: 10,
  label: 'auth-login',
};

/** Auth — register: prevent account spam */
export const THROTTLE_AUTH_REGISTER: ThrottlePolicy = {
  ttl: 60_000,
  limit: 5,
  label: 'auth-register',
};

/** Auth — token refresh: moderate limit */
export const THROTTLE_AUTH_REFRESH: ThrottlePolicy = {
  ttl: 60_000,
  limit: 30,
  label: 'auth-refresh',
};

/** Auth — change password: strict limit */
export const THROTTLE_AUTH_CHANGE_PASSWORD: ThrottlePolicy = {
  ttl: 60_000,
  limit: 5,
  label: 'auth-change-password',
};

/** Portal — login: brute-force protection */
export const THROTTLE_PORTAL_LOGIN: ThrottlePolicy = {
  ttl: 60_000,
  limit: 10,
  label: 'portal-login',
};

/** Portal — forgot password: prevent email flooding */
export const THROTTLE_PORTAL_FORGOT_PASSWORD: ThrottlePolicy = {
  ttl: 60_000,
  limit: 3,
  label: 'portal-forgot-password',
};

/** Portal — reset password: prevent abuse */
export const THROTTLE_PORTAL_RESET_PASSWORD: ThrottlePolicy = {
  ttl: 60_000,
  limit: 5,
  label: 'portal-reset-password',
};

/** Upload — single file upload (DMS, data management, products, customers, suppliers) */
export const THROTTLE_UPLOAD_SINGLE: ThrottlePolicy = {
  ttl: 60_000,
  limit: 10,
  label: 'upload-single',
};

/** Upload — multiple file upload (DMS batch) */
export const THROTTLE_UPLOAD_MULTIPLE: ThrottlePolicy = {
  ttl: 60_000,
  limit: 5,
  label: 'upload-multiple',
};

/** Export — CSV/XLSX/JSON export endpoints */
export const THROTTLE_EXPORT: ThrottlePolicy = {
  ttl: 60_000,
  limit: 20,
  label: 'export',
};

/** Report — report generation endpoints */
export const THROTTLE_REPORT: ThrottlePolicy = {
  ttl: 60_000,
  limit: 15,
  label: 'report',
};

/** Search — search/quick-search endpoints */
export const THROTTLE_SEARCH: ThrottlePolicy = {
  ttl: 60_000,
  limit: 30,
  label: 'search',
};

/** Backup — backup create/restore (expensive operations) */
export const THROTTLE_BACKUP: ThrottlePolicy = {
  ttl: 300_000, // 5 minutes
  limit: 5,
  label: 'backup',
};

/** Backup — backup download */
export const THROTTLE_BACKUP_DOWNLOAD: ThrottlePolicy = {
  ttl: 60_000,
  limit: 10,
  label: 'backup-download',
};

/** Dashboard — dashboard/stats endpoints */
export const THROTTLE_DASHBOARD: ThrottlePolicy = {
  ttl: 60_000,
  limit: 30,
  label: 'dashboard',
};

/** Webhook — incoming webhook endpoints */
export const THROTTLE_WEBHOOK: ThrottlePolicy = {
  ttl: 60_000,
  limit: 60,
  label: 'webhook',
};

/** Analytics — analytics processing (expensive) */
export const THROTTLE_ANALYTICS: ThrottlePolicy = {
  ttl: 60_000,
  limit: 15,
  label: 'analytics',
};

/** Health — health check (no limit for monitoring) */
export const THROTTLE_HEALTH: ThrottlePolicy = {
  ttl: 60_000,
  limit: 120,
  label: 'health',
};

// ─── Helper ────────────────────────────────────────────────────────

/**
 * Convert a ThrottlePolicy into the @Throttle decorator argument shape.
 *
 * Usage:
 *   @Throttle(throttle(THROTTLE_AUTH_LOGIN))
 */
export function throttle(policy: ThrottlePolicy): Record<string, { ttl: number; limit: number }> {
  return {
    default: { ttl: policy.ttl, limit: policy.limit },
  };
}
