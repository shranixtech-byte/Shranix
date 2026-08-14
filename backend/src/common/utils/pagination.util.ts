/**
 * H4 — bound a client-supplied pageSize for normal UI/API list endpoints.
 *
 * The repository layer already caps every page at MAX_PAGE_SIZE (10000) as a
 * hard safety ceiling. UI list endpoints additionally cap to a smaller default
 * so a malicious/buggy client cannot request a page large enough to hurt the
 * database or response size. Exports and internal aggregations are exempt
 * (they use their own bounded retrieval).
 *
 * Preserves the existing default when the value is missing/invalid.
 */
export function sanitizePageSize(value: unknown, defaultValue = 50, maxPageSize = 200): number {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) {
    return defaultValue;
  }
  return Math.min(Math.floor(raw), maxPageSize);
}

/**
 * H4 — same for the page number: always a positive integer, defaulting to 1.
 */
export function sanitizePage(value: unknown): number {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 1;
  }
  return Math.floor(raw);
}
