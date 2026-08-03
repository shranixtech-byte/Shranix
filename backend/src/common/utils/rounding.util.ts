/**
 * Rounding utility — Financial Settings → Rounding Rules.
 *
 * Rules supported (values stored in shranix_accounting_settings.rounding_rule):
 *  - nearest : standard Math.round (round half up)
 *  - up      : always round away from zero (ceil for positives)
 *  - down    : always round towards zero (floor for positives)
 *  - bankers : round half to even (IEEE 754 default, common in accounting)
 */
export type RoundingRule = 'nearest' | 'up' | 'down' | 'bankers';

export function roundAmount(value: number, decimals = 2, rule: RoundingRule = 'nearest'): number {
  const safe = Number.isFinite(value) ? value : 0;
  const factor = 10 ** Math.max(0, Math.min(8, Math.floor(decimals)));

  switch (rule) {
    case 'up':
      return Math.ceil(safe * factor - 1e-9) / factor;
    case 'down':
      return Math.floor(safe * factor + 1e-9) / factor;
    case 'bankers': {
      const scaled = safe * factor;
      const floor = Math.floor(scaled);
      const diff = scaled - floor;
      const rounded =
        diff < 0.5 ? floor : diff > 0.5 ? floor + 1 : floor % 2 === 0 ? floor : floor + 1;
      return rounded / factor;
    }
    case 'nearest':
    default:
      return Math.round(safe * factor) / factor;
  }
}

/** Round the two totals of a voucher. Equal inputs always produce equal outputs, so balance is preserved. */
export function roundTotals(
  debit: number,
  credit: number,
  decimals = 2,
  rule: RoundingRule = 'nearest',
): { totalDebit: number; totalCredit: number } {
  return {
    totalDebit: roundAmount(debit, decimals, rule),
    totalCredit: roundAmount(credit, decimals, rule),
  };
}
