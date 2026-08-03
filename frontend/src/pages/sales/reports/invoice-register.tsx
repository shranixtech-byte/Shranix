import { Loader2, Download, Search, Printer, FileText } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import { getInvoiceRegister } from '@/services/sales-reports.service';

import { ReportFilters } from './components/ReportFilters';

function formatCurrency(v: number): string {
  return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function InvoiceRegisterReport() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');
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
      const result = await getInvoiceRegister({
        page,
        pageSize,
        search: globalSearch || filters.search || undefined,
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
  }, [page, pageSize, filters, globalSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoice Register</h1>
          <p className="text-muted-foreground mt-1 text-sm">Search and manage sales invoices</p>
        </div>
      </div>

      <ReportFilters values={filters} onChange={setFilters} showSearch={false} showStatus />

      {/* Global Search Bar */}
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Global search: Invoice#, Customer, GSTIN, Reference, Barcode..."
          value={globalSearch}
          onChange={(e) => {
            setGlobalSearch(e.target.value);
            setPage(1);
          }}
          className="bg-background focus:ring-primary/50 w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2"
        />
        {globalSearch && (
          <kbd className="bg-muted text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 rounded border px-1.5 py-0.5 text-[10px]">
            Ctrl+K
          </kbd>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button className="bg-background hover:bg-accent inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors">
          <Download className="h-3.5 w-3.5" />
          Excel
        </button>
        <button className="bg-background hover:bg-accent inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors">
          <FileText className="h-3.5 w-3.5" />
          PDF
        </button>
        <button className="bg-background hover:bg-accent inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors">
          <Printer className="h-3.5 w-3.5" />
          Print
        </button>
        <span className="text-muted-foreground ml-auto text-xs">{total} invoices found</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/80 sticky top-0 backdrop-blur">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Invoice#</th>
                  <th className="px-3 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Customer</th>
                  <th className="px-3 py-2.5 font-semibold">Mobile</th>
                  <th className="px-3 py-2.5 font-semibold">GSTIN</th>
                  <th className="px-3 py-2.5 font-semibold">Reference</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Paid</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Balance</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((row: any, i: number) => (
                  <tr key={row.id || i} className="hover:bg-muted/50 transition-colors">
                    <td className="px-3 py-2 font-medium">{row.invoiceNumber}</td>
                    <td className="px-3 py-2">
                      {row.invoiceDate
                        ? new Date(row.invoiceDate).toLocaleDateString('en-IN')
                        : '-'}
                    </td>
                    <td className="px-3 py-2">{row.customerId?.slice(0, 8) || '-'}</td>
                    <td className="px-3 py-2">{row.mobile || '-'}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{row.customerGstin || '-'}</td>
                    <td className="px-3 py-2">{row.reference ? row.reference.slice(0, 8) : '-'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(row.grandTotal)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(row.paidAmount)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(row.balanceAmount)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                          row.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : row.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {row.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1"
                          title="Print"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1"
                          title="Download PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-muted-foreground px-3 py-8 text-center">
                      No invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="bg-background hover:bg-accent rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-muted-foreground text-xs">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="bg-background hover:bg-accent rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
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
