import { Loader2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import { getCustomerLedger } from '@/services/sales-reports.service';

import { ReportFilters } from './components/ReportFilters';

function formatCurrency(v: number): string {
  return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function CustomerLedgerReport() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
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
      const result = await getCustomerLedger({
        period: filters.period !== 'this_month' ? filters.period : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        customerId: selectedCustomer || undefined,
      });
      setData(result || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, selectedCustomer]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedLedger = data.find((c) => c.customerId === selectedCustomer);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customer Ledger</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Customer-wise outstanding balances, aging, and running balance
        </p>
      </div>

      <ReportFilters values={filters} onChange={setFilters} showSearch={false} />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Customer List */}
          <div className="bg-card rounded-lg border shadow-sm lg:col-span-1">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Customers ({data.length})</h2>
            </div>
            <div className="max-h-[70vh] divide-y overflow-y-auto">
              {data.map((customer: any) => (
                <button
                  key={customer.customerId}
                  onClick={() => setSelectedCustomer(customer.customerId)}
                  className={`hover:bg-accent w-full px-4 py-3 text-left text-xs transition-colors ${
                    selectedCustomer === customer.customerId ? 'bg-accent font-medium' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{customer.customerId?.slice(0, 12)}</span>
                    <span
                      className={`tabular-nums ${
                        customer.closingBalance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(customer.closingBalance)}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-1 flex items-center gap-2 text-[10px]">
                    <span>{customer.invoiceCount} invoices</span>
                    <span>·</span>
                    <span>Due: {formatCurrency(customer.closingBalance)}</span>
                  </div>
                </button>
              ))}
              {data.length === 0 && (
                <div className="text-muted-foreground px-4 py-8 text-center text-xs">
                  No customer data found
                </div>
              )}
            </div>
          </div>

          {/* Customer Detail */}
          <div className="space-y-4 lg:col-span-2">
            {selectedLedger ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="bg-card rounded-lg border p-3 shadow-sm">
                    <p className="text-muted-foreground text-[10px] uppercase">Opening Balance</p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {formatCurrency(selectedLedger.openingBalance)}
                    </p>
                  </div>
                  <div className="bg-card rounded-lg border p-3 shadow-sm">
                    <p className="text-muted-foreground text-[10px] uppercase">Invoices</p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {selectedLedger.invoiceCount}
                    </p>
                  </div>
                  <div className="bg-card rounded-lg border p-3 shadow-sm">
                    <p className="text-muted-foreground text-[10px] uppercase">Payments</p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {formatCurrency(selectedLedger.payments)}
                    </p>
                  </div>
                  <div className="bg-card rounded-lg border p-3 shadow-sm">
                    <p className="text-muted-foreground text-[10px] uppercase">Closing Balance</p>
                    <p
                      className={`mt-1 text-lg font-bold tabular-nums ${
                        selectedLedger.closingBalance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(selectedLedger.closingBalance)}
                    </p>
                  </div>
                </div>

                {/* Aging */}
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold">Ageing Analysis</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      {
                        label: '0-30 Days',
                        value: selectedLedger.aging?.['0-30'] || 0,
                        color: 'bg-green-100 text-green-700',
                      },
                      {
                        label: '31-60 Days',
                        value: selectedLedger.aging?.['31-60'] || 0,
                        color: 'bg-yellow-100 text-yellow-700',
                      },
                      {
                        label: '61-90 Days',
                        value: selectedLedger.aging?.['61-90'] || 0,
                        color: 'bg-orange-100 text-orange-700',
                      },
                      {
                        label: '90+ Days',
                        value: selectedLedger.aging?.['90+'] || 0,
                        color: 'bg-red-100 text-red-700',
                      },
                    ].map((age) => (
                      <div
                        key={age.label}
                        className={`rounded-lg px-3 py-2 text-center ${age.color}`}
                      >
                        <p className="text-[10px] font-medium">{age.label}</p>
                        <p className="mt-1 text-sm font-bold tabular-nums">
                          {formatCurrency(age.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transactions */}
                <div className="bg-card rounded-lg border shadow-sm">
                  <div className="border-b px-4 py-3">
                    <h3 className="text-sm font-semibold">Transactions</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Date</th>
                          <th className="px-3 py-2 font-semibold">Type</th>
                          <th className="px-3 py-2 font-semibold">Document#</th>
                          <th className="px-3 py-2 text-right font-semibold">Debit</th>
                          <th className="px-3 py-2 text-right font-semibold">Credit</th>
                          <th className="px-3 py-2 text-right font-semibold">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedLedger.transactions?.map((txn: any, i: number) => (
                          <tr key={i} className="hover:bg-muted/50">
                            <td className="px-3 py-2">
                              {txn.date ? new Date(txn.date).toLocaleDateString('en-IN') : '-'}
                            </td>
                            <td className="px-3 py-2 capitalize">{txn.type}</td>
                            <td className="px-3 py-2 font-medium">{txn.documentNo}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatCurrency(txn.debit)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-green-600">
                              {formatCurrency(txn.credit)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium tabular-nums">
                              {formatCurrency(txn.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground flex items-center justify-center py-16 text-sm">
                Select a customer from the list to view their ledger
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
