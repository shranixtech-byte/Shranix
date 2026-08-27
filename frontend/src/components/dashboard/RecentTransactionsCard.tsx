import {
  ShoppingCart,
  Truck,
  Warehouse,
  Package,
  UserPlus,
  CreditCard,
  ChevronRight,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/utils';

export interface RecentTransactionItem {
  id: string;
  type: 'sale' | 'purchase' | 'stock' | 'product' | 'customer' | 'payment';
  title: string;
  reference: string;
  timeAgo: string;
  amount?: string;
  icon?: LucideIcon;
  colorScheme?: 'emerald' | 'blue' | 'purple' | 'orange' | 'teal' | 'indigo';
}

interface RecentTransactionsCardProps {
  transactions?: RecentTransactionItem[];
  onViewAll?: () => void;
}

const typeConfig: Record<
  string,
  {
    icon: LucideIcon;
    bg: string;
    text: string;
    border: string;
  }
> = {
  sale: {
    icon: ShoppingCart,
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200/60 dark:border-emerald-900/40',
  },
  purchase: {
    icon: Truck,
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200/60 dark:border-blue-900/40',
  },
  stock: {
    icon: Warehouse,
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200/60 dark:border-purple-900/40',
  },
  product: {
    icon: Package,
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200/60 dark:border-orange-900/40',
  },
  customer: {
    icon: UserPlus,
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-200/60 dark:border-teal-900/40',
  },
  payment: {
    icon: CreditCard,
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-200/60 dark:border-indigo-900/40',
  },
};

export function RecentTransactionsCard({
  transactions = [],
  onViewAll,
}: RecentTransactionsCardProps) {
  const navigate = useNavigate();

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      navigate('/sales/invoices');
    }
  };

  return (
    <div className="shadow-2xs hover:shadow-xs flex h-full flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3 transition-all duration-150 sm:rounded-2xl sm:p-3.5 dark:border-white/[0.08] dark:bg-[#111827]">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-100/80 pb-1.5 dark:border-white/[0.06]">
          <h3 className="font-poppins text-xs font-bold leading-none text-slate-900 sm:text-sm dark:text-white">
            अलीकडील व्यवहार{' '}
            <span className="text-xs font-normal text-slate-400">(Recent Transactions)</span>
          </h3>
          <button
            onClick={handleViewAll}
            className="group flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            <span>सर्व पहा</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Transactions List / Empty State */}
      <div className="my-1.5 flex flex-1 flex-col justify-center space-y-1 overflow-hidden sm:space-y-1.5">
        {transactions.length > 0 ? (
          transactions.slice(0, 3).map((item) => {
            const config = typeConfig[item.type] || typeConfig.sale;
            const Icon = item.icon || config.icon;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-1 transition-colors hover:bg-slate-100/60 sm:py-1.5 dark:border-white/[0.04] dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                      config.bg,
                      config.border,
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5', config.text)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-medium">{item.reference}</span>
                      <span>•</span>
                      <span>{item.timeAgo}</span>
                    </div>
                  </div>
                </div>

                {item.amount && (
                  <span className="font-poppins shrink-0 text-xs font-extrabold text-slate-900 dark:text-white">
                    {item.amount}
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <ReceiptText className="mb-1 h-6 w-6 text-slate-300 dark:text-slate-600" />
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              सध्या कोणतेही अलीकडील व्यवहार उपलब्ध नाहीत.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-100/80 pt-1 text-[11px] text-slate-500 dark:border-white/[0.06] dark:text-slate-400">
        एकूण{' '}
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {transactions.length} व्यवहार
        </span>{' '}
        नोंदवले गेले आहेत
      </div>
    </div>
  );
}
