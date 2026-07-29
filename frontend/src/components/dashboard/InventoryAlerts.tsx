import { AlertTriangle, Clock, PackageX, Undo2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AlertItem {
  label: string;
  count: number;
  icon: typeof AlertTriangle;
  variant: 'warning' | 'danger' | 'info' | 'neutral';
  path: string;
}

interface InventoryAlertsProps {
  lowStockCount: number;
  nearExpiryCount?: number;
  expiredCount?: number;
  pendingReturnsCount?: number;
}

const alertVariants: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  warning: {
    bg: 'bg-amber-50/80 dark:bg-amber-950/15',
    border: 'border-amber-200/50 dark:border-amber-800/30',
    icon: 'text-amber-600 dark:text-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
  },
  danger: {
    bg: 'bg-red-50/80 dark:bg-red-950/15',
    border: 'border-red-200/50 dark:border-red-800/30',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-700 dark:text-red-300',
  },
  info: {
    bg: 'bg-sky-50/80 dark:bg-sky-950/15',
    border: 'border-sky-200/50 dark:border-sky-800/30',
    icon: 'text-sky-600 dark:text-sky-400',
    text: 'text-sky-700 dark:text-sky-300',
  },
  neutral: {
    bg: 'bg-gray-50/80 dark:bg-gray-800/30',
    border: 'border-gray-200/50 dark:border-gray-700/30',
    icon: 'text-gray-600 dark:text-gray-400',
    text: 'text-gray-700 dark:text-gray-300',
  },
};

export function InventoryAlerts({
  lowStockCount,
  nearExpiryCount = 0,
  expiredCount = 0,
  pendingReturnsCount = 0,
}: InventoryAlertsProps) {
  const navigate = useNavigate();

  const alerts: AlertItem[] = [
    {
      label: 'Near Expiry',
      count: nearExpiryCount,
      icon: Clock,
      variant: 'warning',
      path: '/inventory/items',
    },
    {
      label: 'Expired Products',
      count: expiredCount,
      icon: PackageX,
      variant: 'danger',
      path: '/inventory/items',
    },
    {
      label: 'Low Stock',
      count: lowStockCount,
      icon: AlertTriangle,
      variant: 'warning',
      path: '/inventory/items',
    },
    {
      label: 'Pending Returns',
      count: pendingReturnsCount,
      icon: Undo2,
      variant: 'info',
      path: '/purchase/returns',
    },
  ];

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold">Inventory Alerts</h3>
        <p className="text-xs text-muted-foreground">Items requiring immediate attention</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {alerts.map((alert) => {
          const styles = alertVariants[alert.variant];
          const Icon = alert.icon;
          const hasItems = alert.count > 0;

          return (
            <button
              key={alert.label}
              onClick={() => navigate(alert.path)}
              className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 ${
                hasItems
                  ? `${styles.bg} ${styles.border} hover:shadow-md hover:-translate-y-0.5`
                  : 'border-dashed opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles.bg} ${styles.icon}`}>
                  <Icon className="h-4 w-4" />
                </div>
                {hasItems && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-primary transition-all group-hover:gap-1.5">
                    View <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </div>
              <div className="mt-3">
                <p className={`text-2xl font-bold ${hasItems ? styles.text : 'text-muted-foreground'}`}>
                  {hasItems ? alert.count : 0}
                </p>
                <p className={`mt-0.5 text-sm ${hasItems ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {alert.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
