import { AlertTriangle, Package, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
}

interface LowStockWidgetProps {
  lowStock: LowStockItem[];
  lowStockCount: number;
}

export function LowStockWidget({ lowStock, lowStockCount }: LowStockWidgetProps) {
  const navigate = useNavigate();
  const displayed = lowStock.slice(0, 5);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-900/50">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 shadow-sm dark:from-amber-900/30 dark:to-amber-900/10 dark:text-amber-400">
            <AlertTriangle className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Low Stock Alert</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {lowStockCount > 0
                ? `${lowStockCount} item${lowStockCount !== 1 ? 's' : ''} below reorder level`
                : 'All items adequately stocked'}
            </p>
          </div>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/20">
          <div className="text-center">
            <Package className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600" />
            <p className="mt-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">All items in stock</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((item) => {
            const ratio = item.currentStock / Math.max(item.reorderLevel, 1);
            const isCritical = ratio <= 0.25;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 transition-all hover:bg-slate-100/50 hover:shadow-sm dark:border-slate-700/50 dark:bg-slate-800/20 dark:hover:bg-slate-700/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">{item.sku}</p>
                </div>
                <div className="ml-3 text-right">
                  <p className={`text-sm font-bold ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {item.currentStock}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400">min: {item.reorderLevel}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lowStockCount > 5 && (
        <button
          onClick={() => navigate('/inventory/items')}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-100 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-400 dark:hover:bg-slate-700/40"
        >
          View all {lowStockCount} items
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
