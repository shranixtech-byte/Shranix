import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      className={cn(
        'flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400',
        className,
      )}
      aria-label="Breadcrumb"
    >
      <Link
        to="/"
        className="flex items-center transition-colors hover:text-slate-700 dark:hover:text-slate-200"
      >
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          {item.path && index < items.length - 1 ? (
            <Link
              to={item.path}
              className="transition-colors hover:text-slate-700 dark:hover:text-slate-200"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-900 dark:text-slate-100">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
