import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface FormSelectOption {
  label: string;
  value: string;
}

export interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: FormSelectOption[];
  placeholder?: string;
  quickCreate?: boolean;
  onQuickCreate?: () => void;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className, label, error, hint, options, placeholder, quickCreate, onQuickCreate, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {label}
            {props.required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <div className="flex gap-2">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'h-[42px] w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 outline-none transition-all duration-150 appearance-none cursor-pointer',
              'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
              'dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500'
                : 'border-slate-200',
              'disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed dark:disabled:bg-slate-900',
              className,
            )}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.75rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.25rem',
              paddingRight: '2.5rem',
            }}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {quickCreate && onQuickCreate && (
            <button
              type="button"
              onClick={onQuickCreate}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 text-lg font-medium text-slate-500 transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-600 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
              title={`Create new ${label || 'item'}`}
            >
              +
            </button>
          )}
        </div>
        {error && (
          <p id={`${selectId}-error`} className="text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${selectId}-hint`} className="text-xs text-slate-400">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

FormSelect.displayName = 'FormSelect';
