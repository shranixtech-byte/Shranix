import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { portalService } from '@/services/portal.service';

import {
  Card,
  DataTable,
  fmtDate,
  fmtINR,
  KpiCard,
  PortalEmpty,
  PortalLoading,
  StatusBadge,
} from './common';

export function PortalDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    portalService
      .getDashboard()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
        {error}
      </div>
    );
  }
  if (!data) {
    return <PortalLoading />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Your business at a glance
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <KpiCard
          label="Outstanding"
          value={fmtINR(data.outstanding)}
          sub={data.dueSoon ? `${data.dueSoon} due soon` : 'All settled'}
          tone={data.outstanding > 0 ? 'red' : 'emerald'}
        />
        <KpiCard
          label="Overdue"
          value={fmtINR(data.overdue)}
          tone={data.overdue > 0 ? 'red' : 'slate'}
        />
        <KpiCard
          label="Total Sales"
          value={fmtINR(data.totalSales)}
          sub={`${data.totalInvoices} invoices`}
          tone="emerald"
        />
        <KpiCard
          label="Pending Quotations"
          value={data.pendingQuotations}
          sub={`${data.openOrders} open orders`}
          tone="blue"
        />
        <KpiCard
          label="Credit Limit"
          value={fmtINR(data.creditLimit)}
          sub={`Available ${fmtINR(data.availableCredit)}`}
          tone="slate"
        />
        <KpiCard label="Unread Notifications" value={data.unreadNotifications} tone="amber" />
      </div>

      {/* Recent records */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Recent Invoices
            </h2>
            <Link
              to="/portal/invoices"
              className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            >
              View all →
            </Link>
          </div>
          {data.recentInvoices.length === 0 ? (
            <PortalEmpty title="No invoices yet" />
          ) : (
            <DataTable headers={['Invoice', 'Date', 'Total', 'Balance', 'Status']}>
              {data.recentInvoices.map((i: any) => (
                <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                    <Link
                      to={`/portal/invoices/${i.id}`}
                      className="hover:text-emerald-600 hover:underline"
                    >
                      {i.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {fmtDate(i.invoiceDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {fmtINR(i.grandTotal)}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {fmtINR(i.balanceAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={
                        i.paymentStatus === 'paid'
                          ? 'paid'
                          : i.balanceAmount > 0
                            ? i.dueDate && i.dueDate < new Date().toISOString().slice(0, 10)
                              ? 'overdue'
                              : 'pending'
                            : 'paid'
                      }
                    />
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Recent Orders</h2>
            <Link
              to="/portal/orders"
              className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            >
              View all →
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <PortalEmpty title="No orders yet" />
          ) : (
            <DataTable headers={['Order', 'Date', 'Total', 'Status']}>
              {data.recentOrders.map((o: any) => (
                <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                    <Link
                      to={`/portal/orders/${o.id}`}
                      className="hover:text-emerald-600 hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {fmtDate(o.orderDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {fmtINR(o.grandTotal)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>
      </div>
    </div>
  );
}
