import { CreditCard, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Receivable {
  id: string;
  reference: string;
  party: string;
  amount: number;
  date: string | null;
  status: string;
}

interface PendingReceivablesWidgetProps {
  receivables?: Receivable[];
  totalOverdue?: number;
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function PendingReceivablesWidget({ receivables = [], totalOverdue = 0 }: PendingReceivablesWidgetProps) {
  const navigate = useNavigate();
  const displayed = receivables.slice(0, 4);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-900/50">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-100 to-rose-50 text-rose-600 shadow-sm dark:from-rose-900/30 dark:to-rose-900/10 dark:text-rose-400">
            <CreditCard className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pending Receivables</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {totalOverdue > 0 ? `${totalOverdue} overdue invoice${totalOverdue !== 1 ? 's' : ''}` : 'All invoices paid'}
            </p>
          </div>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="flex h-20 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/20">
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <CreditCard className="h-4 w-4" />
            No outstanding receivables
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayed.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-xl p-2.5 transition-all hover:bg-slate-50 hover:shadow-sm dark:hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400">
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{inv.party}</p>
                  <p className="text-[10px] font-medium text-slate-400">{inv.reference}</p>
                </div>
              </div>
              <p className="ml-2 text-xs font-bold text-slate-900 dark:text-white">{currency.format(inv.amount)}</p>
            </div>
          ))}
        </div>
      )}

      {displayed.length > 0 && (
        <button
          onClick={() => navigate('/sales/invoices')}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-100 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-400 dark:hover:bg-slate-700/40"
        >
          View Invoices <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
