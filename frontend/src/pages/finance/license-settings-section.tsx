import {
  BadgeCheck,
  Check,
  Copy,
  Eye,
  EyeOff,
  HardDrive,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { apiRequest } from '@/services/api-client';

import { ErrorBanner, SaveButton, SectionCard } from './settings-ui';

// ── Types ──────────────────────────────────────────────
export interface LicenseSettingsRecord {
  currentPlan?: string;
  licenseExpiry?: string;
  activationKey?: string;
  usersAllowed?: number;
  branchesAllowed?: number;
  storageLimitGb?: number;
  // Computed usage (read-only, from GET /license)
  usersCount?: number;
  branchesCount?: number;
  storageUsedBytes?: number;
}

const PLAN_OPTIONS = [
  { label: 'Starter', value: 'Starter' },
  { label: 'Growth', value: 'Growth' },
  { label: 'Business', value: 'Business' },
  { label: 'Enterprise', value: 'Enterprise' },
];

// ── Formatting helpers ─────────────────────────────────
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 MB';
  }
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`;
  }
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

function expiryStatus(expiry?: string): { label: string; cls: string; daysLeft: number | null } {
  if (!expiry) {
    return {
      label: 'Not Set',
      cls: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
      daysLeft: null,
    };
  }
  const end = new Date(expiry);
  if (Number.isNaN(end.getTime())) {
    return {
      label: 'Invalid Date',
      cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
      daysLeft: null,
    };
  }
  const ms = end.getTime() - Date.now();
  const days = Math.ceil(ms / (24 * 3600 * 1000));
  if (days < 0) {
    return {
      label: `Expired ${Math.abs(days)}d ago`,
      cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
      daysLeft: days,
    };
  }
  if (days <= 30) {
    return {
      label: `Expires in ${days}d`,
      cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      daysLeft: days,
    };
  }
  return {
    label: `Active · ${days}d left`,
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    daysLeft: days,
  };
}

function UsageBar({
  icon,
  label,
  used,
  limit,
  unit,
  format,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
  unit: string;
  format: (n: number) => string;
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const over = limit > 0 && used > limit;
  const barCls = over ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm dark:bg-slate-700 dark:text-slate-300">
            {icon}
          </span>
          {label}
        </p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {format(used)}{' '}
          <span className="text-xs font-normal text-slate-400">
            / {format(limit)}
            {unit}
          </span>
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barCls}`}
          style={{ width: `${pct > 0 ? Math.max(2, Math.min(100, pct)) : 0}%` }}
        />
      </div>
      {over && (
        <p className="mt-1.5 text-[11px] font-medium text-rose-500">
          Limit exceeded — upgrade or free up usage
        </p>
      )}
    </div>
  );
}

// ── Section ────────────────────────────────────────────
export function LicenseSettingsSection() {
  const [form, setForm] = useState<LicenseSettingsRecord>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [renewMonths, setRenewMonths] = useState(12);
  const [renewing, setRenewing] = useState(false);
  const [renewMsg, setRenewMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiRequest('/license')) as unknown;
      const s = ((res as { data?: Record<string, unknown> })?.data ?? res ?? {}) as Record<
        string,
        unknown
      >;
      setForm(s as LicenseSettingsRecord);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof LicenseSettingsRecord>(key: K, value: LicenseSettingsRecord[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest('/license', {
        method: 'PUT',
        body: JSON.stringify({
          currentPlan: form.currentPlan ?? 'Starter',
          licenseExpiry: form.licenseExpiry ?? '',
          activationKey: form.activationKey ?? '',
          usersAllowed: Number(form.usersAllowed) || 0,
          branchesAllowed: Number(form.branchesAllowed) || 0,
          storageLimitGb: Number(form.storageLimitGb) || 0,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRenew = async () => {
    setRenewing(true);
    setError(null);
    setRenewMsg(null);
    try {
      const res = (await apiRequest('/license/renew', {
        method: 'POST',
        body: JSON.stringify({ months: renewMonths }),
      })) as unknown;
      const s = ((res as { data?: Record<string, unknown> })?.data ?? res ?? {}) as Record<
        string,
        unknown
      >;
      setForm(s as LicenseSettingsRecord);
      setRenewMsg(`License renewed ✅ — new expiry: ${String(s.licenseExpiry ?? '—')}`);
      setTimeout(() => setRenewMsg(null), 5000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRenewing(false);
    }
  };

  const copyKey = async () => {
    if (!form.activationKey) {
      return;
    }
    try {
      await navigator.clipboard.writeText(form.activationKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const status = expiryStatus(form.licenseExpiry);
  const storageLimitGb = Number(form.storageLimitGb) || 0;
  const storageLimitBytes = storageLimitGb * 1024 ** 3;

  return (
    <div className="space-y-6">
      {/* Card 1 — Current Plan */}
      <SectionCard
        title="Current Plan"
        description="Plan, expiry & activation key for this installation"
        icon={<BadgeCheck className="h-5 w-5" />}
        tint="emerald"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Plan</span>
            <select
              value={String(form.currentPlan ?? 'Starter')}
              onChange={(e) => set('currentPlan', e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            >
              {PLAN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              License Expiry
            </span>
            <input
              type="date"
              value={String(form.licenseExpiry ?? '')}
              onChange={(e) => set('licenseExpiry', e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            />
          </label>
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.cls}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {status.label}
              </span>
              {form.licenseExpiry && (
                <span className="text-xs text-slate-400">
                  Renew before this date to avoid interruption
                </span>
              )}
            </div>
          </div>

          {/* Activation key — masked, copyable */}
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Activation Key
            </span>
            <div className="mt-1 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={String(form.activationKey ?? '')}
                  onChange={(e) => set('activationKey', e.target.value)}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-10 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label={showKey ? 'Hide activation key' : 'Show activation key'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => void copyKey()}
                disabled={!form.activationKey}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </label>
        </div>
        {error && (
          <div className="mt-3">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}
        <div className="mt-4">
          <SaveButton
            busy={busy}
            saved={saved}
            onClick={handleSave}
            label="Save License Settings"
          />
        </div>
      </SectionCard>

      {/* Card 2 — Plan Usage */}
      <SectionCard
        title="Plan Usage"
        description="Live usage vs. your plan limits"
        icon={<ShieldCheck className="h-5 w-5" />}
        tint="indigo"
      >
        <div className="grid gap-3 lg:grid-cols-3">
          <UsageBar
            icon={<Users className="h-4 w-4" />}
            label="Users"
            used={Number(form.usersCount) || 0}
            limit={Number(form.usersAllowed) || 0}
            unit=" users"
            format={(n) => String(Math.round(n))}
          />
          <UsageBar
            icon={<Store className="h-4 w-4" />}
            label="Branches"
            used={Number(form.branchesCount) || 0}
            limit={Number(form.branchesAllowed) || 0}
            unit=" branches"
            format={(n) => String(Math.round(n))}
          />
          <UsageBar
            icon={<HardDrive className="h-4 w-4" />}
            label="Storage"
            used={Number(form.storageUsedBytes) || 0}
            limit={storageLimitBytes}
            unit=""
            format={formatBytes}
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh usage
        </button>
      </SectionCard>

      {/* Card 3 — Renew */}
      <SectionCard
        title="Renew License"
        description="Extend the license expiry date"
        icon={<Sparkles className="h-5 w-5" />}
        tint="amber"
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Renewal Period
            </span>
            <select
              value={renewMonths}
              onChange={(e) => setRenewMonths(Number(e.target.value))}
              className="mt-1 h-10 w-44 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            >
              <option value={12}>1 Year</option>
              <option value={24}>2 Years</option>
              <option value={36}>3 Years</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void handleRenew()}
            disabled={renewing}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 active:scale-[0.98] disabled:opacity-60"
          >
            {renewing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Renew License
          </button>
        </div>
        {renewMsg && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" /> {renewMsg}
          </p>
        )}
        <p className="mt-3 text-[11px] text-slate-400">
          Self-hosted mode: renewal expiry date extend karta hai — koi online activation server nahi
          chahiye.
        </p>
      </SectionCard>
    </div>
  );
}
