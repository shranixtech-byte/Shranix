import * as crypto from 'node:crypto';

/**
 * License numbering — SHR-LIC-<year>-<NNNNNN>.
 * Max-sequence scan (raw SQL max INCLUDING soft-deleted rows, so a soft-
 * deleted license can never cause a number reuse) + UNIQUE-index retry
 * (caller wraps create in a retry loop). License numbers are NOT
 * authorization tokens — public IDs and signed tokens carry the security.
 */
export async function nextLicenseNumber(repo: any): Promise<string> {
  const year = new Date().getFullYear();
  const rawMax =
    typeof repo.maxFieldValue === 'function'
      ? await repo.maxFieldValue('licenseNumber').catch(() => null)
      : null;
  let max = 0;
  const m = String(rawMax || '').match(/^SHR-LIC-(\d{4})-(\d{6})$/);
  if (m && Number(m[1]) === year) {
    max = Number(m[2]);
  }
  if (!rawMax) {
    const all = await repo.findAll({ page: 1, pageSize: 10000 } as any).catch(() => ({ data: [] }));
    for (const row of all.data || []) {
      const rx = String(row?.licenseNumber || '').match(/^SHR-LIC-(\d{4})-(\d{6})$/);
      if (rx && Number(rx[1]) === year) {
        const seq = Number(rx[2]);
        if (seq > max) {
          max = seq;
        }
      }
    }
  }
  return `SHR-LIC-${year}-${String(max + 1).padStart(6, '0')}`;
}

/** Non-guessable public identifier (never the raw DB id). */
export function publicId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

/** sha256 of a string (device hashes, idempotency references). */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

/** Audit actor — audit.log requires a string userId. */
export const actor = (userId?: string | null): string => userId || 'system';

/** Days between two ISO dates (date-only). */
export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${String(fromIso).slice(0, 10)}T00:00:00`).getTime();
  const b = new Date(`${String(toIso).slice(0, 10)}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}
