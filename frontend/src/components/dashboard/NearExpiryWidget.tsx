import { Clock, CalendarDays, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ExpiryItem {
  id: string;
  name: string;
  sku: string;
  expiryDate: string | null;
  currentStock: number;
}

interface NearExpiryWidgetProps {
  items?: ExpiryItem[];
}

export function NearExpiryWidget({ items = [] }: NearExpiryWidgetProps) {
  const navigate = useNavigate();
  const displayed = items.slice(0, 4);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-900/50">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600 shadow-sm dark:from-orange-900/30 dark:to-orange-900/10 dark:text-orange-400">
            <Clock className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Near Expiry</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {displayed.length > 0 ? `${displayed.length} product${displayed.length !== 1 ? 's' : ''} expiring soon` : 'No items near expiry'}
            </p>
          </div>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="flex h-20 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/20">
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <CalendarDays className="h-4 w-4" />
            All items within shelf life
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:bg-slate-100/50 hover:shadow-sm dark:border-slate-700/50 dark:bg-slate-800/20 dark:hover:bg-slate-700/30"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>
                <p className="mt-0.5 text-[10px] font-medium text-slate-400">{item.sku}</p>
              </div>
              <div className="ml-3 text-right">
                <p className="text-xs font-bold text-orange-600 dark:text-orange-400">{item.currentStock} units</p>
                {item.expiryDate && (
                  <p className="text-[10px] font-medium text-slate-400">
                    Exp: {new Date(item.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {displayed.length > 0 && (
        <button
          onClick={() => navigate('/inventory/items')}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-100 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-400 dark:hover:bg-slate-700/40"
        >
          View Inventory <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
