import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {label}
            {props.required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400',
            'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
            'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500'
              : 'border-slate-200',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 dark:disabled:bg-slate-900',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          rows={3}
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="text-xs text-slate-400">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

FormTextarea.displayName = 'FormTextarea';
