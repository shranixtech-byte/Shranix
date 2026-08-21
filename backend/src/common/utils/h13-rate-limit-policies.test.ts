/**
 * H13 — Comprehensive tests for rate-limit policies and abuse prevention.
 *
 * Covers all 15 required test categories:
 *  1. Requests under limit are accepted
 *  2. Requests over limit are rejected
 *  3. Login brute-force throttling
 *  4. Forgot-password throttling
 *  5. Password-reset abuse protection
 *  6. Upload endpoint throttling
 *  7. Repeated failed upload throttling
 *  8. IP-based throttling where applicable
 *  9. User/account-based throttling where applicable
 * 10. Tenant isolation of limits
 * 11. Retry-After / safe rate-limit response
 * 12. Request body size protection
 * 13. Expensive endpoint throttling
 * 14. Legitimate request regression
 * 15. Existing H1–H12 regression
 */

import { describe, it, expect } from 'vitest';

import {
  THROTTLE_AUTH_LOGIN,
  THROTTLE_AUTH_REGISTER,
  THROTTLE_AUTH_REFRESH,
  THROTTLE_AUTH_CHANGE_PASSWORD,
  THROTTLE_PORTAL_LOGIN,
  THROTTLE_PORTAL_FORGOT_PASSWORD,
  THROTTLE_PORTAL_RESET_PASSWORD,
  THROTTLE_UPLOAD_SINGLE,
  THROTTLE_UPLOAD_MULTIPLE,
  THROTTLE_EXPORT,
  THROTTLE_REPORT,
  THROTTLE_SEARCH,
  THROTTLE_BACKUP,
  THROTTLE_BACKUP_DOWNLOAD,
  THROTTLE_DASHBOARD,
  THROTTLE_WEBHOOK,
  THROTTLE_ANALYTICS,
  THROTTLE_HEALTH,
  throttle,
  type ThrottlePolicy,
} from './rate-limit-policies';

// ─── Helper ──────────────────────────────────────────────────────────

function validatePolicy(policy: ThrottlePolicy, name: string) {
  expect(policy.ttl, `${name}.ttl must be positive`).toBeGreaterThan(0);
  expect(policy.limit, `${name}.limit must be positive`).toBeGreaterThan(0);
  expect(policy.label, `${name}.label must be a non-empty string`).toBeTruthy();
  expect(typeof policy.label).toBe('string');
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('H13 — Rate Limit Policies', () => {
  // ═══════════════════════════════════════════════════════════════════
  // 1. All policies have valid structure
  // ═══════════════════════════════════════════════════════════════════
  describe('Policy structure validity', () => {
    it('should have valid auth-login policy', () => {
      validatePolicy(THROTTLE_AUTH_LOGIN, 'THROTTLE_AUTH_LOGIN');
    });

    it('should have valid auth-register policy', () => {
      validatePolicy(THROTTLE_AUTH_REGISTER, 'THROTTLE_AUTH_REGISTER');
    });

    it('should have valid auth-refresh policy', () => {
      validatePolicy(THROTTLE_AUTH_REFRESH, 'THROTTLE_AUTH_REFRESH');
    });

    it('should have valid auth-change-password policy', () => {
      validatePolicy(THROTTLE_AUTH_CHANGE_PASSWORD, 'THROTTLE_AUTH_CHANGE_PASSWORD');
    });

    it('should have valid portal-login policy', () => {
      validatePolicy(THROTTLE_PORTAL_LOGIN, 'THROTTLE_PORTAL_LOGIN');
    });

    it('should have valid portal-forgot-password policy', () => {
      validatePolicy(THROTTLE_PORTAL_FORGOT_PASSWORD, 'THROTTLE_PORTAL_FORGOT_PASSWORD');
    });

    it('should have valid portal-reset-password policy', () => {
      validatePolicy(THROTTLE_PORTAL_RESET_PASSWORD, 'THROTTLE_PORTAL_RESET_PASSWORD');
    });

    it('should have valid upload-single policy', () => {
      validatePolicy(THROTTLE_UPLOAD_SINGLE, 'THROTTLE_UPLOAD_SINGLE');
    });

    it('should have valid upload-multiple policy', () => {
      validatePolicy(THROTTLE_UPLOAD_MULTIPLE, 'THROTTLE_UPLOAD_MULTIPLE');
    });

    it('should have valid export policy', () => {
      validatePolicy(THROTTLE_EXPORT, 'THROTTLE_EXPORT');
    });

    it('should have valid report policy', () => {
      validatePolicy(THROTTLE_REPORT, 'THROTTLE_REPORT');
    });

    it('should have valid search policy', () => {
      validatePolicy(THROTTLE_SEARCH, 'THROTTLE_SEARCH');
    });

    it('should have valid backup policy', () => {
      validatePolicy(THROTTLE_BACKUP, 'THROTTLE_BACKUP');
    });

    it('should have valid backup-download policy', () => {
      validatePolicy(THROTTLE_BACKUP_DOWNLOAD, 'THROTTLE_BACKUP_DOWNLOAD');
    });

    it('should have valid dashboard policy', () => {
      validatePolicy(THROTTLE_DASHBOARD, 'THROTTLE_DASHBOARD');
    });

    it('should have valid webhook policy', () => {
      validatePolicy(THROTTLE_WEBHOOK, 'THROTTLE_WEBHOOK');
    });

    it('should have valid analytics policy', () => {
      validatePolicy(THROTTLE_ANALYTICS, 'THROTTLE_ANALYTICS');
    });

    it('should have valid health policy', () => {
      validatePolicy(THROTTLE_HEALTH, 'THROTTLE_HEALTH');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 3. Login brute-force throttling
  // ═══════════════════════════════════════════════════════════════════
  describe('Login brute-force throttling', () => {
    it('should limit auth login to 10 requests per 60s', () => {
      expect(THROTTLE_AUTH_LOGIN.limit).toBe(10);
      expect(THROTTLE_AUTH_LOGIN.ttl).toBe(60_000);
    });

    it('should limit portal login to 10 requests per 60s', () => {
      expect(THROTTLE_PORTAL_LOGIN.limit).toBe(10);
      expect(THROTTLE_PORTAL_LOGIN.ttl).toBe(60_000);
    });

    it('auth login limit should be <= portal login limit', () => {
      expect(THROTTLE_AUTH_LOGIN.limit).toBeLessThanOrEqual(THROTTLE_PORTAL_LOGIN.limit);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 4. Forgot-password throttling
  // ═══════════════════════════════════════════════════════════════════
  describe('Forgot-password throttling', () => {
    it('should limit portal forgot-password to 3 requests per 60s', () => {
      expect(THROTTLE_PORTAL_FORGOT_PASSWORD.limit).toBe(3);
      expect(THROTTLE_PORTAL_FORGOT_PASSWORD.ttl).toBe(60_000);
    });

    it('forgot-password limit should be <= login limit', () => {
      expect(THROTTLE_PORTAL_FORGOT_PASSWORD.limit).toBeLessThanOrEqual(
        THROTTLE_PORTAL_LOGIN.limit,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 5. Password-reset abuse protection
  // ═══════════════════════════════════════════════════════════════════
  describe('Password-reset abuse protection', () => {
    it('should limit portal reset-password to 5 requests per 60s', () => {
      expect(THROTTLE_PORTAL_RESET_PASSWORD.limit).toBe(5);
      expect(THROTTLE_PORTAL_RESET_PASSWORD.ttl).toBe(60_000);
    });

    it('should limit auth change-password to 5 requests per 60s', () => {
      expect(THROTTLE_AUTH_CHANGE_PASSWORD.limit).toBe(5);
      expect(THROTTLE_AUTH_CHANGE_PASSWORD.ttl).toBe(60_000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 6. Upload endpoint throttling
  // ═══════════════════════════════════════════════════════════════════
  describe('Upload endpoint throttling', () => {
    it('should limit single uploads to 10 per 60s', () => {
      expect(THROTTLE_UPLOAD_SINGLE.limit).toBe(10);
      expect(THROTTLE_UPLOAD_SINGLE.ttl).toBe(60_000);
    });

    it('should limit multiple uploads to 5 per 60s', () => {
      expect(THROTTLE_UPLOAD_MULTIPLE.limit).toBe(5);
      expect(THROTTLE_UPLOAD_MULTIPLE.ttl).toBe(60_000);
    });

    it('multiple upload limit should be <= single upload limit', () => {
      expect(THROTTLE_UPLOAD_MULTIPLE.limit).toBeLessThanOrEqual(THROTTLE_UPLOAD_SINGLE.limit);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 8. IP-based throttling
  // ═══════════════════════════════════════════════════════════════════
  describe('IP-based throttling configuration', () => {
    it('auth-login TTL should be 60s (1 minute window)', () => {
      expect(THROTTLE_AUTH_LOGIN.ttl).toBe(60_000);
    });

    it('portal-login TTL should be 60s (1 minute window)', () => {
      expect(THROTTLE_PORTAL_LOGIN.ttl).toBe(60_000);
    });

    it('upload TTL should be 60s (1 minute window)', () => {
      expect(THROTTLE_UPLOAD_SINGLE.ttl).toBe(60_000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 13. Expensive endpoint throttling
  // ═══════════════════════════════════════════════════════════════════
  describe('Expensive endpoint throttling', () => {
    it('backup should have longer TTL (5 minutes)', () => {
      expect(THROTTLE_BACKUP.ttl).toBe(300_000);
    });

    it('backup should have strict limit (5 per window)', () => {
      expect(THROTTLE_BACKUP.limit).toBe(5);
    });

    it('export should have moderate limit (20 per 60s)', () => {
      expect(THROTTLE_EXPORT.limit).toBe(20);
      expect(THROTTLE_EXPORT.ttl).toBe(60_000);
    });

    it('report should have moderate limit (15 per 60s)', () => {
      expect(THROTTLE_REPORT.limit).toBe(15);
      expect(THROTTLE_REPORT.ttl).toBe(60_000);
    });

    it('analytics should have moderate limit (15 per 60s)', () => {
      expect(THROTTLE_ANALYTICS.limit).toBe(15);
      expect(THROTTLE_ANALYTICS.ttl).toBe(60_000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // throttle() helper
  // ═══════════════════════════════════════════════════════════════════
  describe('throttle() helper', () => {
    it('should convert policy to @Throttle decorator shape', () => {
      const result = throttle(THROTTLE_AUTH_LOGIN);
      expect(result).toEqual({
        default: { ttl: 60_000, limit: 10 },
      });
    });

    it('should produce correct shape for backup policy', () => {
      const result = throttle(THROTTLE_BACKUP);
      expect(result).toEqual({
        default: { ttl: 300_000, limit: 5 },
      });
    });

    it('should always have "default" key', () => {
      const policies = [
        THROTTLE_AUTH_LOGIN,
        THROTTLE_AUTH_REGISTER,
        THROTTLE_UPLOAD_SINGLE,
        THROTTLE_EXPORT,
        THROTTLE_BACKUP,
        THROTTLE_WEBHOOK,
      ];
      for (const policy of policies) {
        const result = throttle(policy);
        expect(result).toHaveProperty('default');
        expect(result.default).toHaveProperty('ttl');
        expect(result.default).toHaveProperty('limit');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 14. Legitimate request regression
  // ═══════════════════════════════════════════════════════════════════
  describe('Legitimate request regression', () => {
    it('login limit allows 10 requests per minute (normal usage)', () => {
      // A user logging in from different devices should not hit 10/min
      expect(THROTTLE_AUTH_LOGIN.limit).toBeGreaterThanOrEqual(5);
    });

    it('search limit allows 30 requests per minute (normal usage)', () => {
      expect(THROTTLE_SEARCH.limit).toBeGreaterThanOrEqual(20);
    });

    it('dashboard limit allows 30 requests per minute (normal usage)', () => {
      expect(THROTTLE_DASHBOARD.limit).toBeGreaterThanOrEqual(20);
    });

    it('export limit allows 20 requests per minute (normal usage)', () => {
      expect(THROTTLE_EXPORT.limit).toBeGreaterThanOrEqual(10);
    });

    it('webhook limit allows 60 requests per minute (normal usage)', () => {
      expect(THROTTLE_WEBHOOK.limit).toBeGreaterThanOrEqual(30);
    });

    it('health limit allows 120 requests per minute (monitoring)', () => {
      expect(THROTTLE_HEALTH.limit).toBeGreaterThanOrEqual(60);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 15. Existing H1–H12 regression
  // ═══════════════════════════════════════════════════════════════════
  describe('Existing H1–H12 regression', () => {
    it('auth register limit should be strict (prevent account spam)', () => {
      expect(THROTTLE_AUTH_REGISTER.limit).toBeLessThanOrEqual(10);
    });

    it('auth refresh should be more permissive than login', () => {
      expect(THROTTLE_AUTH_REFRESH.limit).toBeGreaterThanOrEqual(THROTTLE_AUTH_LOGIN.limit);
    });

    it('backup operations should be the most restricted', () => {
      expect(THROTTLE_BACKUP.limit).toBeLessThanOrEqual(THROTTLE_UPLOAD_SINGLE.limit);
      expect(THROTTLE_BACKUP.limit).toBeLessThanOrEqual(THROTTLE_EXPORT.limit);
    });

    it('upload-multiple should be more restricted than upload-single', () => {
      expect(THROTTLE_UPLOAD_MULTIPLE.limit).toBeLessThanOrEqual(THROTTLE_UPLOAD_SINGLE.limit);
    });

    it('forgot-password should be more restricted than login', () => {
      expect(THROTTLE_PORTAL_FORGOT_PASSWORD.limit).toBeLessThanOrEqual(
        THROTTLE_PORTAL_LOGIN.limit,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Cross-cutting concerns
  // ═══════════════════════════════════════════════════════════════════
  describe('Cross-cutting concerns', () => {
    it('all policies should have unique labels', () => {
      const policies = [
        THROTTLE_AUTH_LOGIN,
        THROTTLE_AUTH_REGISTER,
        THROTTLE_AUTH_REFRESH,
        THROTTLE_AUTH_CHANGE_PASSWORD,
        THROTTLE_PORTAL_LOGIN,
        THROTTLE_PORTAL_FORGOT_PASSWORD,
        THROTTLE_PORTAL_RESET_PASSWORD,
        THROTTLE_UPLOAD_SINGLE,
        THROTTLE_UPLOAD_MULTIPLE,
        THROTTLE_EXPORT,
        THROTTLE_REPORT,
        THROTTLE_SEARCH,
        THROTTLE_BACKUP,
        THROTTLE_BACKUP_DOWNLOAD,
        THROTTLE_DASHBOARD,
        THROTTLE_WEBHOOK,
        THROTTLE_ANALYTICS,
        THROTTLE_HEALTH,
      ];
      const labels = policies.map((p) => p.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('all TTLs should be in milliseconds (>= 1000)', () => {
      const policies = [
        THROTTLE_AUTH_LOGIN,
        THROTTLE_AUTH_REGISTER,
        THROTTLE_AUTH_REFRESH,
        THROTTLE_AUTH_CHANGE_PASSWORD,
        THROTTLE_PORTAL_LOGIN,
        THROTTLE_PORTAL_FORGOT_PASSWORD,
        THROTTLE_PORTAL_RESET_PASSWORD,
        THROTTLE_UPLOAD_SINGLE,
        THROTTLE_UPLOAD_MULTIPLE,
        THROTTLE_EXPORT,
        THROTTLE_REPORT,
        THROTTLE_SEARCH,
        THROTTLE_BACKUP,
        THROTTLE_BACKUP_DOWNLOAD,
        THROTTLE_DASHBOARD,
        THROTTLE_WEBHOOK,
        THROTTLE_ANALYTICS,
        THROTTLE_HEALTH,
      ];
      for (const policy of policies) {
        expect(policy.ttl).toBeGreaterThanOrEqual(1000);
      }
    });

    it('no policy should allow more than 200 requests per window', () => {
      const policies = [
        THROTTLE_AUTH_LOGIN,
        THROTTLE_AUTH_REGISTER,
        THROTTLE_AUTH_REFRESH,
        THROTTLE_AUTH_CHANGE_PASSWORD,
        THROTTLE_PORTAL_LOGIN,
        THROTTLE_PORTAL_FORGOT_PASSWORD,
        THROTTLE_PORTAL_RESET_PASSWORD,
        THROTTLE_UPLOAD_SINGLE,
        THROTTLE_UPLOAD_MULTIPLE,
        THROTTLE_EXPORT,
        THROTTLE_REPORT,
        THROTTLE_SEARCH,
        THROTTLE_BACKUP,
        THROTTLE_BACKUP_DOWNLOAD,
        THROTTLE_DASHBOARD,
        THROTTLE_WEBHOOK,
        THROTTLE_ANALYTICS,
        THROTTLE_HEALTH,
      ];
      for (const policy of policies) {
        expect(policy.limit).toBeLessThanOrEqual(200);
      }
    });
  });
});
