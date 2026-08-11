import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { portalService } from '@/services/portal.service';

import { Card, fmtINR, KpiCard, PageHeader, PortalLoading } from './common';

export function PortalOutstandingPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    portalService
      .getOutstanding()
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

  const ageing = data.ageing || {};

  return (
    <div className="space-y-6">
      <PageHeader title="Outstanding" subtitle="Your outstanding balance and ageing" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Total Outstanding"
          value={fmtINR(data.totalOutstanding)}
          tone={data.totalOutstanding > 0 ? 'red' : 'emerald'}
        />
        <KpiCard label="Current Due" value={fmtINR(data.currentDue)} tone="emerald" />
        <KpiCard label="Overdue" value={fmtINR(data.overdue)} tone="red" />
        <KpiCard
          label="Available Credit"
          value={fmtINR(data.availableCredit)}
          sub={`Limit ${fmtINR(data.creditLimit)}`}
          tone="blue"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-700 dark:text-slate-200">
            Ageing Analysis
          </h2>
          <div className="space-y-3">
            {[
              ['0–30 Days', ageing.days0_30],
              ['31–60 Days', ageing.days31_60],
              ['61–90 Days', ageing.days61_90],
              ['90+ Days', ageing.days90plus],
            ].map(([label, value]) => (
              <div key={label as string}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {fmtINR(value as number)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-red-500"
                    style={{
                      width: `${Math.min(100, ((value as number) / Math.max(data.totalOutstanding || 1, 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Need help?</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View the full transaction history in your{' '}
            <Link
              to="/portal/ledger"
              className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            >
              ledger
            </Link>
            , or{' '}
            <Link
              to="/portal/tickets"
              className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            >
              contact support
            </Link>{' '}
            for payment arrangements.
          </p>
        </Card>
      </div>
    </div>
  );
}
