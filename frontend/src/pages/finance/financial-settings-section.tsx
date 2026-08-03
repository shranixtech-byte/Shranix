import {
  Banknote,
  CalendarClock,
  CalendarX2,
  Coins,
  Loader2,
  Lock,
  PiggyBank,
  Scale,
  Unlock,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiRequest } from '@/services/api-client';

import { ErrorBanner, FieldText, SaveButton, SectionCard, Toggle } from './settings-ui';

// ── Types ──────────────────────────────────────────────────
interface FinancialSettings {
  currency?: string;
  roundOffDecimals?: number;
  fiscalYearLock?: boolean;
  periodLock?: boolean;
  periodLockDate?: string;
  voucherLock?: boolean;
  closingDate?: string;
  openingBalanceLock?: boolean;
  defaultLedgerAccountId?: string;
  defaultTaxGroupId?: string;
  roundingRule?: string;
}

interface AccountRecord {
  id: string;
  accountCode?: string;
  accountName: string;
  accountType?: string;
}
interface TaxGroupRecord {
  id: string;
  name: string;
  type?: string;
}

const ROUNDING_RULES = [
  { value: 'nearest', label: 'Nearest (standard)' },
  { value: 'up', label: 'Round Up' },
  { value: 'down', label: 'Round Down (truncate)' },
  { value: 'bankers', label: "Banker's Rounding" },
];

// ── Component ──────────────────────────────────────────────
export function FinancialSettingsSection() {
  const [form, setForm] = useState<FinancialSettings>({});
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [taxGroups, setTaxGroups] = useState<TaxGroupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FinancialSettings>(key: K, value: FinancialSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, acctRes, taxRes] = await Promise.all([
        apiRequest<Record<string, unknown>>('/finance/settings') as unknown as FinancialSettings,
        apiRequest<{ data?: AccountRecord[] }>('/finance/chart-of-accounts?ps=200') as unknown,
        apiRequest<{ data?: TaxGroupRecord[] }>('/tax-groups?pageSize=100') as unknown,
      ]);
      const acctRows = ((acctRes as { data?: AccountRecord[] })?.data ??
        (Array.isArray(acctRes) ? acctRes : [])) as AccountRecord[];
      const taxRows = ((taxRes as { data?: TaxGroupRecord[] })?.data ??
        (Array.isArray(taxRes) ? taxRes : [])) as TaxGroupRecord[];
      setAccounts(acctRows);
      setTaxGroups(taxRows);
      setForm(settingsRes || {});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Only send the fields this section manages
  const payload = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    (
      [
        'currency',
        'roundOffDecimals',
        'fiscalYearLock',
        'periodLock',
        'periodLockDate',
        'voucherLock',
        'closingDate',
        'openingBalanceLock',
        'defaultLedgerAccountId',
        'defaultTaxGroupId',
        'roundingRule',
      ] as const
    ).forEach((key) => {
      if (form[key] !== undefined) {
        out[key] = form[key];
      }
    });
    return out;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest('/finance/settings', {
        method: 'PUT',
        body: JSON.stringify(payload()),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === form.defaultLedgerAccountId),
    [accounts, form.defaultLedgerAccountId],
  );
  const selectedTax = useMemo(
    () => taxGroups.find((t) => t.id === form.defaultTaxGroupId),
    [taxGroups, form.defaultTaxGroupId],
  );

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Card 1 — Period Controls */}
      <SectionCard
        title="Period Controls"
        description="Lock the books against back-dated or future-dated entries"
        icon={<CalendarClock className="h-5 w-5" />}
        tint="amber"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                <Lock className="h-4 w-4 text-amber-500" /> Fiscal Year Lock
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No entries after the active financial year end date
              </p>
            </div>
            <Toggle
              checked={Boolean(form.fiscalYearLock)}
              onChange={(v) => set('fiscalYearLock', v)}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                <Lock className="h-4 w-4 text-amber-500" /> Period Lock
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No entries after the lock date below
              </p>
            </div>
            <Toggle checked={Boolean(form.periodLock)} onChange={(v) => set('periodLock', v)} />
          </div>

          {form.periodLock && (
            <label className="block">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Period Lock Date
              </span>
              <input
                type="date"
                value={String(form.periodLockDate ?? '')}
                onChange={(e) => set('periodLockDate', e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
              />
            </label>
          )}

          <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                <Lock className="h-4 w-4 text-amber-500" /> Voucher Lock
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Posted vouchers cannot be edited while enabled
              </p>
            </div>
            <Toggle checked={Boolean(form.voucherLock)} onChange={(v) => set('voucherLock', v)} />
          </div>

          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Closing Date
            </span>
            <div className="relative mt-1">
              <CalendarX2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
              <input
                type="date"
                value={String(form.closingDate ?? '')}
                onChange={(e) => set('closingDate', e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
              />
            </div>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              Books are closed — no entries before this date
            </span>
          </label>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                <Unlock className="h-4 w-4 text-amber-500" /> Opening Balance Lock
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prevent changes to opening balances after start of year
              </p>
            </div>
            <Toggle
              checked={Boolean(form.openingBalanceLock)}
              onChange={(v) => set('openingBalanceLock', v)}
            />
          </div>
        </div>
      </SectionCard>

      {/* Card 2 — Defaults & Rounding */}
      <SectionCard
        title="Defaults & Rounding"
        description="Default ledger, default tax group and rounding behaviour for accounting"
        icon={<Coins className="h-5 w-5" />}
        tint="emerald"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Default Ledger
            </span>
            <select
              value={String(form.defaultLedgerAccountId ?? '')}
              onChange={(e) => set('defaultLedgerAccountId', e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            >
              <option value="">— Select ledger —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountCode ? `${a.accountCode} — ` : ''}
                  {a.accountName}
                </option>
              ))}
            </select>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              {selectedAccount
                ? `Currently: ${selectedAccount.accountName} (${selectedAccount.accountType ?? 'account'})`
                : 'New journal entries use this as the default account'}
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Default Tax Group
            </span>
            <select
              value={String(form.defaultTaxGroupId ?? '')}
              onChange={(e) => set('defaultTaxGroupId', e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            >
              <option value="">— Select tax group —</option>
              {taxGroups.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.type ? ` (${t.type.toUpperCase()})` : ''}
                </option>
              ))}
            </select>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              {selectedTax
                ? `Currently: ${selectedTax.name}`
                : 'Used when no tax group is specified'}
            </span>
          </label>

          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Rounding Rule
              </span>
              <select
                value={String(form.roundingRule ?? 'nearest')}
                onChange={(e) => set('roundingRule', e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
              >
                {ROUNDING_RULES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <FieldText
              label="Round Off Decimals"
              value={String(form.roundOffDecimals ?? 2)}
              onChange={(v) => set('roundOffDecimals', Math.max(0, Math.min(4, Number(v) || 0)))}
              type="number"
              hint="0–4 decimal places"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 sm:col-span-2 dark:border-emerald-800 dark:bg-emerald-950/20">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                <Banknote className="h-4 w-4 text-emerald-500" /> Currency
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Base currency for the books (default INR)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-slate-400" />
              <input
                value={String(form.currency ?? 'INR')}
                onChange={(e) => set('currency', e.target.value.toUpperCase().slice(0, 3))}
                placeholder="INR"
                className="h-10 w-24 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold uppercase tracking-wide outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Honest note */}
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-500 sm:col-span-2 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            <PiggyBank className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>
              Locks are enforced on <b>journal entries</b> (create/update) and{' '}
              <b>opening balances</b> (chart of accounts). Defaults are used by new voucher flows.
            </span>
          </div>
        </div>

        <div className="mt-5">
          <SaveButton
            busy={saving}
            saved={saved}
            onClick={handleSave}
            label="Save Financial Settings"
          />
        </div>
      </SectionCard>
    </div>
  );
}
