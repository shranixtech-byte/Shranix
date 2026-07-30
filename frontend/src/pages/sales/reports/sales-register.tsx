import { useEffect, useState, useCallback } from 'react';
import { Loader2, Download, Printer } from 'lucide-react';
import { getSalesRegister } from '@/services/sales-reports.service';
import { ReportFilters } from './components/ReportFilters';

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  partially_paid: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || statusStyles.draft;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function formatCurrency(v: number): string {
  return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function SalesRegisterReport() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    period: 'this_month',
    startDate: '',
    endDate: '',
    search: '',
    customerId: '',
    productId: '',
    salesPerson: '',
    invoiceStatus: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSalesRegister({
        page,
        pageSize,
        search: filters.search || undefined,
        period: filters.period !== 'this_month' ? filters.period : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        invoiceStatus: filters.invoiceStatus || undefined,
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Register</h1>
        <p className="mt-1 text-sm text-muted-foreground">Complete sales transaction log with tax details</p>
      </div>

      <ReportFilters values={filters} onChange={setFilters} showSearch showStatus />

      {/* Export Buttons */}
      <div className="flex items-center gap-2">
        <button className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent">
          <Download className="h-3.5 w-3.5" />
          Excel
        </button>
        <button className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent">
          <Download className="h-3.5 w-3.5" />
          PDF
        </button>
        <button className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent">
          <Printer className="h-3.5 w-3.5" />
          Print
        </button>
        <span className="ml-auto text-xs text-muted-foreground">
          {total} record{total !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Invoice#</th>
                  <th className="px-3 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Customer</th>
                  <th className="px-3 py-2.5 font-semibold">GSTIN</th>
                  <th className="px-3 py-2.5 font-semibold">Sales Person</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Items</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Qty</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Taxable</th>
                  <th className="px-3 py-2.5 font-semibold text-right">CGST</th>
                  <th className="px-3 py-2.5 font-semibold text-right">SGST</th>
                  <th className="px-3 py-2.5 font-semibold text-right">IGST</th>
                  <th className="px-3 py-2.5 font-semibold text-right">CESS</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Discount</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Round Off</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Grand Total</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((row: any, i: number) => (
                  <tr key={row.id || i} className="hover:bg-muted/50 transition-colors">
                    <td className="px-3 py-2 font-medium">{row.invoiceNumber}</td>
                    <td className="px-3 py-2">{row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString('en-IN') : '-'}</td>
                    <td className="px-3 py-2">{row.customerId?.slice(0, 8) || '-'}</td>
                    <td className="px-3 py-2">{row.customerGstin || '-'}</td>
                    <td className="px-3 py-2">{row.salesPerson || '-'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.items}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.qty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.taxable)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.cgst)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.sgst)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.igst)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.cess)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.discount)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.roundOff || '-'}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">{formatCurrency(row.grandTotal)}</td>
                    <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={16} className="px-3 py-8 text-center text-muted-foreground">
                      No records found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-accent"
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-accent"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
