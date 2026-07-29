import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Column {
  key: string;
  label: string;
  render?: (value: unknown, record: Record<string, unknown>) => React.ReactNode;
}

interface ActivityTableProps {
  title: string;
  subtitle?: string;
  columns: Column[];
  data: Record<string, unknown>[];
  emptyMessage?: string;
  viewAllPath?: string;
  variant?: 'sales' | 'purchase';
}

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  unpaid: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  overdue: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status.toLowerCase()] || statusStyles.draft;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style}`}>
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
    </span>
  );
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function ActivityTable({
  title,
  subtitle,
  columns,
  data,
  emptyMessage = 'No records found',
  viewAllPath,
  variant = 'sales',
}: ActivityTableProps) {
  const navigate = useNavigate();
  const accentColor = variant === 'sales' ? 'border-l-emerald-500' : 'border-l-blue-500';

  return (
    <div className="rounded-xl border bg-card">
      <div className={`flex items-center justify-between border-b px-6 py-4 ${accentColor} border-l-4`}>
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {viewAllPath && (
          <button
            onClick={() => navigate(viewAllPath)}
            className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((record, idx) => (
                <tr
                  key={record.id as string || idx}
                  className="transition-colors hover:bg-muted/20"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-6 py-3 text-sm">
                      {col.render
                        ? col.render(record[col.key], record)
                        : col.key === 'amount' || col.key === 'grandTotal'
                        ? currency.format(Number(record[col.key]) || 0)
                        : col.key === 'status'
                        ? <StatusBadge status={String(record[col.key] || 'draft')} />
                        : col.key.includes('Date') || col.key === 'date'
                        ? record[col.key]
                          ? new Date(String(record[col.key])).toLocaleDateString('en-IN')
                          : '—'
                        : String(record[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
