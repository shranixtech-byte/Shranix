import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FormCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function FormCard({ title, description, children, className, actions }: FormCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50',
        className,
      )}
    >
      <div className="flex items-center justify-between px-6 pt-6 pb-0">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="mx-6 mt-4 mb-4 border-t border-slate-100 dark:border-slate-700" />
      <div className="px-6 pb-6">{children}</div>
    </div>
  );
}
