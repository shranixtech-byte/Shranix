import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Breadcrumb } from './Breadcrumb';

export interface FormAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  icon?: ReactNode;
  onClick: () => void;
}

export interface FormPageLayoutProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; path?: string }>;
  actions?: FormAction[];
  children: ReactNode;
  className?: string;
  size?: 'default' | 'full';
}

export function FormPageLayout({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
  size = 'default',
}: FormPageLayoutProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumb */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} />
      )}

      {/* Header with Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-3">
            {actions.map((action, idx) => (
              <Button
                key={idx}
                variant={action.variant || 'primary'}
                loading={action.loading}
                icon={action.icon}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Content - 2-column grid on desktop */}
      <div
        className={cn(
          size === 'full' ? '' : 'max-w-5xl',
          className,
        )}
      >
        <div className="grid gap-6 md:grid-cols-2">
          {children}
        </div>
      </div>
    </div>
  );
}
