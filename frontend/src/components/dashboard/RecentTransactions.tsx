import { ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Transaction {
  id: string;
  type: 'sales' | 'purchase';
  reference: string;
  party: string;
  amount: number;
  date: string | null;
  status: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  approved: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  submitted: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  delivered: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  overdue: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
  unpaid: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  partial: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
};

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const navigate = useNavigate();
  const displayed = transactions.slice(0, 5);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-900/50">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600 shadow-sm dark:from-purple-900/30 dark:to-purple-900/10 dark:text-purple-400">
            <ArrowRight className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Latest activity</p>
          </div>
        </div>
        {transactions.length > 5 && (
          <button
            onClick={() => navigate('/sales/invoices')}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400"
          >
            View All <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {displayed.length === 0 ? (
        <div className="flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/20">
          <div className="text-center">
            <ArrowRight className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600" />
            <p className="mt-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">No transactions yet</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayed.map((tx) => {
            const isSales = tx.type === 'sales';
            const statusStyle = statusStyles[tx.status?.toLowerCase()] || statusStyles.draft;
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-xl p-3 transition-all hover:bg-slate-50 hover:shadow-sm dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    isSales
                      ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 dark:from-emerald-900/30 dark:to-emerald-900/10 dark:text-emerald-400'
                      : 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 dark:from-blue-900/30 dark:to-blue-900/10 dark:text-blue-400'
                  }`}>
                    {isSales ? (
                      <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" strokeWidth={2} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{tx.party}</p>
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusStyle}`}>
                        {tx.status?.charAt(0).toUpperCase() + tx.status?.slice(1).replace(/_/g, ' ') || 'Draft'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                      {tx.reference}
                      {tx.date ? ` · ${new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                    </p>
                  </div>
                </div>
                <p className="ml-3 text-sm font-bold text-slate-900 dark:text-white">{currency.format(tx.amount)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
