import { type LucideIcon, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  label: string;
  path: string;
  icon: LucideIcon;
  description?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

const variantStyles: Record<string, string> = {
  default: 'border-border hover:bg-muted hover:border-primary/30',
  primary: 'border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40',
  success: 'border-emerald-200/50 bg-emerald-50/50 hover:bg-emerald-100/50 hover:border-emerald-400/50 dark:border-emerald-800/30 dark:bg-emerald-950/10 dark:hover:bg-emerald-900/20',
  warning: 'border-amber-200/50 bg-amber-50/50 hover:bg-amber-100/50 hover:border-amber-400/50 dark:border-amber-800/30 dark:bg-amber-950/10 dark:hover:bg-amber-900/20',
};

interface QuickActionCardProps {
  actions: QuickAction[];
  columns?: 2 | 3 | 4;
}

export function QuickActionCard({ actions, columns = 3 }: QuickActionCardProps) {
  const navigate = useNavigate();

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  };

  return (
    <div className={`grid gap-3 ${gridCols[columns]}`}>
      {actions.map((action) => {
        const Icon = action.icon;
        const variant = action.variant || 'default';
        return (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className={`group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${variantStyles[variant]}`}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
            </div>
            <div>
              <p className="text-sm font-medium">{action.label}</p>
              {action.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
