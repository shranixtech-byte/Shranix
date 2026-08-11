import { ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * Customer data isolation — CRITICAL security helper.
 *
 * Every portal query must pass the authenticated customer's id (derived from
 * the token, never from the frontend) plus the fetched record. If the record
 * belongs to another customer we return 404 (not 403) so we never confirm the
 * existence of another tenant's records.
 */
export function assertOwned(
  record: any | null | undefined,
  customerId: string,
): asserts record is any {
  if (!record || record.isDeleted) {
    throw new NotFoundException('Record not found');
  }
  if (String(record.customerId ?? record.customer_id ?? '') !== String(customerId)) {
    throw new NotFoundException('Record not found');
  }
}

/** Ensure the portal user's role permits a capability. */
export function requirePortalRole(user: { role: string }, ...allowed: string[]) {
  if (!allowed.includes(user.role)) {
    throw new ForbiddenException('You do not have permission for this action');
  }
}

export const PORTAL_ROLES = ['admin', 'accounts', 'purchase', 'viewer'] as const;

/** Number formatting helpers used across portal responses. */
export function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function toDateStr(v: any): string {
  if (!v) {
    return '';
  }
  return String(v).slice(0, 10);
}
