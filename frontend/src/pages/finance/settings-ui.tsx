import { AlertCircle, Check, Loader2, Save } from 'lucide-react';

// ── Shared UI helpers for all Settings Hub sections ───────────
// (Alag file taaki section components aur settings-page ke beech
//  circular import na ho — settings-ui.tsx sabko import karte hain.)

export type SectionTint =
  'emerald' | 'blue' | 'violet' | 'rose' | 'amber' | 'sky' | 'teal' | 'indigo';

export const SECTION_TINTS: Record<SectionTint, string> = {
  emerald:
    'border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 dark:border-emerald-800/40 dark:from-emerald-950/40 dark:via-slate-800 dark:to-slate-800',
  blue: 'border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-sky-50/40 dark:border-blue-800/40 dark:from-blue-950/40 dark:via-slate-800 dark:to-slate-800',
  violet:
    'border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-fuchsia-50/40 dark:border-violet-800/40 dark:from-violet-950/40 dark:via-slate-800 dark:to-slate-800',
  rose: 'border-rose-100 bg-gradient-to-br from-rose-50/70 via-white to-pink-50/40 dark:border-rose-800/40 dark:from-rose-950/40 dark:via-slate-800 dark:to-slate-800',
  amber:
    'border-amber-100 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 dark:border-amber-800/40 dark:from-amber-950/40 dark:via-slate-800 dark:to-slate-800',
  sky: 'border-sky-100 bg-gradient-to-br from-sky-50/70 via-white to-cyan-50/40 dark:border-sky-800/40 dark:from-sky-950/40 dark:via-slate-800 dark:to-slate-800',
  teal: 'border-teal-100 bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/40 dark:border-teal-800/40 dark:from-teal-950/40 dark:via-slate-800 dark:to-slate-800',
  indigo:
    'border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 dark:border-indigo-800/40 dark:from-indigo-950/40 dark:via-slate-800 dark:to-slate-800',
};

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
        checked ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export function FieldText({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
      />
      {hint && <span className="mt-0.5 block text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function SectionCard({
  title,
  description,
  icon,
  tint = 'emerald',
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  tint?: SectionTint;
  children: React.ReactNode;
}) {
  const iconTint: Record<SectionTint, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
    teal: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  };
  return (
    <section className={`rounded-2xl border p-6 shadow-sm ${SECTION_TINTS[tint]}`}>
      <div className="flex items-start gap-3">
        {icon && (
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconTint[tint]}`}
          >
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
      {onDismiss && (
        <button onClick={onDismiss} className="ml-auto underline">
          Dismiss
        </button>
      )}
    </div>
  );
}

export function SaveButton({
  busy,
  saved,
  label = 'Save',
  onClick,
  disabled,
}: {
  busy: boolean;
  saved: boolean;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={busy || disabled}
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {label}
      </button>
      {saved && (
        <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" /> Saved!
        </span>
      )}
    </div>
  );
}
