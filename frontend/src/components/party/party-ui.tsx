import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { PartyStatus } from '@/services/party-master.types';

// ═════════════════════════════════════════════════════════
// STATUS BADGE — shared by Customer & Supplier Master
// ═════════════════════════════════════════════════════════

const statusStyles: Record<PartyStatus, string> = {
  active:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-400',
  blocked: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-300',
};

const statusLabels: Record<PartyStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  blocked: 'Blocked',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = (['active', 'inactive', 'blocked'] as PartyStatus[]).includes(status as PartyStatus)
    ? (status as PartyStatus)
    : 'active';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
        statusStyles[key],
        className,
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          key === 'active' && 'bg-emerald-500',
          key === 'inactive' && 'bg-slate-400',
          key === 'blocked' && 'bg-red-500',
        )}
      />
      {statusLabels[key]}
    </span>
  );
}

// ═════════════════════════════════════════════════════════
// PARTY AVATAR (initials) — shared by Customer & Supplier
// ═════════════════════════════════════════════════════════

const avatarPalette = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function PartyAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('') || '?';
  const color = avatarPalette[hashCode(name || 'x') % avatarPalette.length];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        size === 'sm' && 'h-7 w-7 text-[10px]',
        size === 'md' && 'h-9 w-9 text-xs',
        size === 'lg' && 'h-14 w-14 text-lg',
        color,
      )}
    >
      {initials}
    </span>
  );
}

// ═════════════════════════════════════════════════════════
// STAT CARD
// ═════════════════════════════════════════════════════════

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: 'default' | 'green' | 'red' | 'amber' | 'blue' | 'violet';
}) {
  const tones: Record<string, string> = {
    default: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50',
    green: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-900/20',
    red: 'border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-900/20',
    amber: 'border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-900/20',
    blue: 'border-sky-200 bg-sky-50/60 dark:border-sky-800 dark:bg-sky-900/20',
    violet: 'border-violet-200 bg-violet-50/60 dark:border-violet-800 dark:bg-violet-900/20',
  };
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 shadow-sm transition-transform duration-150 hover:-translate-y-0.5',
        tones[tone],
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
      </div>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// SIMPLE TAB BAR
// ═════════════════════════════════════════════════════════

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; icon?: ReactNode; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
            active === tab.key
              ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:text-emerald-300 dark:ring-slate-600'
              : 'text-slate-500 hover:bg-white/60 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200',
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                active === tab.key
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-300',
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// FIELD HELPERS (small labelled input/select/textarea)
// ═════════════════════════════════════════════════════════

const fieldBase =
  'mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500';

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-0.5 block text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={cn(fieldBase, className)} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select {...rest} className={cn(fieldBase, 'pr-8', className)}>
      {children}
    </select>
  );
}

export function TextAreaInput(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={cn(fieldBase, 'h-auto min-h-20 py-2', className)} />;
}
