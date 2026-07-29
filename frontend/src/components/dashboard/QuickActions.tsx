import {
  ShoppingCart,
  Package,
  PlusCircle,
  UserPlus,
  FileText,
  TrendingUp,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Action {
  label: string;
  path: string;
  icon: LucideIcon;
  gradient: string;
}

const actions: Action[] = [
  { label: 'New Sale', path: '/sales/orders', icon: ShoppingCart, gradient: 'from-emerald-500 to-emerald-600' },
  { label: 'New Purchase', path: '/purchase/orders', icon: Package, gradient: 'from-blue-500 to-blue-600' },
  { label: 'Add Product', path: '/inventory/items', icon: PlusCircle, gradient: 'from-purple-500 to-purple-600' },
  { label: 'Stock Adjustment', path: '/inventory/stock-opening', icon: TrendingUp, gradient: 'from-amber-500 to-amber-600' },
  { label: 'Reports', path: '/gl/dashboard', icon: FileText, gradient: 'from-slate-500 to-slate-600' },
  { label: 'Customers', path: '/companies', icon: UserPlus, gradient: 'from-cyan-500 to-cyan-600' },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-900/50">
      <div className="mb-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-sky-50 text-sky-600 shadow-sm dark:from-sky-900/30 dark:to-sky-900/10 dark:text-sky-400">
            <TrendingUp className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick Actions</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Start common workflows</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="group relative flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] dark:border-slate-700/50 dark:bg-slate-800/30 dark:hover:bg-slate-700/40"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-sm transition-transform duration-200 group-hover:scale-110 group-hover:shadow-md`}>
                <Icon className="h-4.5 w-4.5" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{action.label}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
