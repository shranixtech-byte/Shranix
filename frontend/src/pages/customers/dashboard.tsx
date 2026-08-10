import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  FileText,
  Loader2,
  MapPin,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import {
  getCustomerDashboard,
  type CustomerDashboardData,
} from '@/services/customer-master.service';

import { CustomerAvatar, StatCard, StatusBadge } from './components';

function formatCurrency(v: number): string {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function CustomerDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<CustomerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getCustomerDashboard());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Customer Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Customer Master overview — ग्राहक मास्टर विहंगावलोकन
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            icon={<TrendingUp className="h-4 w-4" />}
            onClick={() => navigate('/customers/outstanding')}
          >
            Outstanding
          </Button>
          <Button
            variant="secondary"
            icon={<Banknote className="h-4 w-4" />}
            onClick={() => navigate('/sales/payments')}
          >
            Payments
          </Button>
          <Button
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => navigate('/customers/create')}
          >
            New Customer
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Customers"
          value={s?.totalCustomers ?? 0}
          hint={`${s?.newThisMonth ?? 0} added this month`}
          icon={<Users className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          label="Active"
          value={s?.activeCustomers ?? 0}
          hint={`${s?.inactiveCustomers ?? 0} inactive · ${s?.blockedCustomers ?? 0} blocked`}
          icon={<UserCheck className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label="Total Outstanding"
          value={formatCurrency(s?.totalOutstanding ?? 0)}
          hint={`${s?.customersWithDue ?? 0} customers with dues`}
          icon={<Wallet className="h-4 w-4" />}
          tone="red"
        />
        <StatCard
          label="Overdue"
          value={formatCurrency(s?.totalOverdue ?? 0)}
          hint={`Advance balance ${formatCurrency(s?.totalAdvance ?? 0)}`}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top customers */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex items-center justify-between px-6 pt-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Top Customers by Sales
              </h3>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                सर्वाधिक विक्री असलेले ग्राहक
              </p>
            </div>
            <Link
              to="/customers"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mx-6 mb-4 mt-4 border-t border-slate-100 dark:border-slate-700" />
          <div className="space-y-1 px-6 pb-6">
            {(data?.topCustomers || []).length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">
                No sales yet — top customers will appear here
              </p>
            )}
            {(data?.topCustomers || []).map((c, i) => (
              <button
                key={c.id}
                onClick={() => navigate(`/customers/${c.id}`)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40"
              >
                <span className="w-5 text-xs font-bold text-slate-300 dark:text-slate-500">
                  {i + 1}
                </span>
                <CustomerAvatar name={c.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {c.name}
                  </p>
                  <p className="text-[11px] text-slate-400">{c.code || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(c.amount)}
                  </p>
                  <p className="text-[10px] text-red-500">due {formatCurrency(c.outstanding)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Status split + recent */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Status Split
            </h3>
            <div className="mt-4 space-y-3">
              {(['active', 'inactive', 'blocked'] as const).map((key) => {
                const count = data?.byStatus?.[key] ?? 0;
                const total = Math.max(1, s?.totalCustomers ?? 1);
                const pct = Math.round((count / total) * 100);
                const bar =
                  key === 'active'
                    ? 'bg-emerald-500'
                    : key === 'inactive'
                      ? 'bg-slate-400'
                      : 'bg-red-500';
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 capitalize text-slate-600 dark:text-slate-300">
                        <Activity className="h-3.5 w-3.5" /> {key}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {count}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        className={`h-full rounded-full ${bar} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Recent Customers
            </h3>
            <div className="mt-3 space-y-2">
              {(data?.recent || []).length === 0 && (
                <p className="py-4 text-center text-sm text-slate-400">No customers yet</p>
              )}
              {(data?.recent || []).slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40"
                >
                  <CustomerAvatar name={c.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                      {c.name}
                    </p>
                    <p className="text-[10px] text-slate-400">{c.code}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Group / Category distribution */}
      <div className="grid gap-6 sm:grid-cols-2">
        <DistributionCard
          title="Customers by Group"
          icon={<Users className="h-4 w-4" />}
          rows={(data?.groupDistribution || []).map((g) => ({
            label: g.name,
            count: g.count,
            color: 'bg-emerald-500',
          }))}
          total={s?.totalCustomers ?? 0}
          empty="No group assignments yet"
        />
        <DistributionCard
          title="Customers by Category"
          icon={<CalendarClock className="h-4 w-4" />}
          rows={(data?.categoryDistribution || []).map((c) => ({
            label: c.name,
            count: c.count,
            color: 'bg-violet-500',
          }))}
          total={s?.totalCustomers ?? 0}
          empty="No category assignments yet"
        />
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: 'Customer List',
            desc: 'Search, filter, export & bulk actions',
            path: '/customers',
            icon: FileText,
          },
          {
            label: 'Outstanding Report',
            desc: 'Who owes how much',
            path: '/customers/outstanding',
            icon: Wallet,
          },
          {
            label: 'Customer Ledger 360°',
            desc: 'Full document chain per customer',
            path: '/sales/customer-ledger',
            icon: MapPin,
          },
        ].map((q) => {
          const Icon = q.icon;
          return (
            <Link
              key={q.path}
              to={q.path}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-emerald-700"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {q.label}
                </p>
                <p className="truncate text-xs text-slate-400">{q.desc}</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-500" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DistributionCard({
  title,
  icon,
  rows,
  total,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  rows: { label: string; count: number; color: string }[];
  total: number;
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center gap-2">
        <span className="text-slate-400">{icon}</span>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      </div>
      <div className="mt-4 space-y-2.5">
        {rows.length === 0 && <p className="py-4 text-center text-sm text-slate-400">{empty}</p>}
        {rows.map((r) => {
          const pct = Math.round((r.count / Math.max(1, total)) * 100);
          return (
            <div key={r.label} className="flex items-center gap-3">
              <span className="w-28 truncate text-xs font-medium capitalize text-slate-600 dark:text-slate-300">
                {r.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div className={`h-full rounded-full ${r.color}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 text-right text-xs font-semibold text-slate-800 dark:text-slate-100">
                {r.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
