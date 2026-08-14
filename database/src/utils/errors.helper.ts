/**
 * Database error helpers.
 *
 * drizzle-orm (>=0.45) wraps driver errors as `{ query, params, cause }` where
 * the original driver error (with `code`, e.g. `SQLITE_CONSTRAINT_UNIQUE` /
 * `23505`) lives on `.cause`. Older versions exposed the raw message directly.
 * These helpers detect violations across both shapes.
 */

const UNIQUE_PATTERN = /UNIQUE|already exists|duplicate|23505|constraint/i;

/** True when the error (or its wrapped `cause`) is a unique-constraint violation. */
export function isUniqueConstraintError(err: unknown): boolean {
  const e = err as { message?: string; cause?: { message?: string; code?: string } };
  const msg = `${e?.message || ''} ${e?.cause?.message || ''} ${e?.cause?.code || ''}`;
  return UNIQUE_PATTERN.test(msg);
}
