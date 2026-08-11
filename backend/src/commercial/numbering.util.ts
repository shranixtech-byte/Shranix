/**
 * Commercial document numbering — max-sequence scan + UNIQUE-index retry.
 * Same pattern as the purchase/sales numbering services. The max scan uses a
 * raw SQL max (via repo.maxFieldValue) that INCLUDES soft-deleted rows — a
 * soft-deleted document keeps its unique number, so a naive scan could reuse
 * it and hit a UNIQUE violation. Callers must wrap the create in a retry loop
 * when a UNIQUE violation surfaces.
 */
export async function nextCommercialNumber(
  repo: any,
  field: string,
  prefix: string,
): Promise<string> {
  const rawMax =
    typeof repo.maxFieldValue === 'function'
      ? await repo.maxFieldValue(field).catch(() => null)
      : null;
  let max = 0;
  if (rawMax) {
    const m = String(rawMax).match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) {
      max = Number(m[1]);
    }
  }
  if (!rawMax) {
    // Fallback — inclusive scan (best-effort; soft-deleted rows may be missed)
    const all = await repo.findAll({ page: 1, pageSize: 10000 } as any).catch(() => ({ data: [] }));
    for (const row of all.data || []) {
      const m = String(row?.[field] || '').match(new RegExp(`^${prefix}-(\\d+)$`));
      if (m) {
        const seq = Number(m[1]);
        if (seq > max) {
          max = seq;
        }
      }
    }
  }
  return `${prefix}-${String(max + 1).padStart(6, '0')}`;
}

export const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

/** Audit actor — audit.log requires a string userId. */
export const actor = (userId?: string | null): string => userId || 'system';
