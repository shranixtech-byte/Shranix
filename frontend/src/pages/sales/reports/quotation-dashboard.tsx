// ═════════════════════════════════════════════════════════
// PHASE 10 — QUOTATION DASHBOARD
//
// Total · Today · Pending · Approved · Rejected · Converted
// Lost · Conversion % — the full quotation funnel in one view.
//
// Data: GET /sales/reports/quotation-summary
//   • converted = status 'converted' OR linked to a sales order
//   • lost      = status 'lost' + 'expired'
//   • Conversion % = converted / total × 100
//   • Win Rate %  = converted / (converted + lost + rejected) × 100
// ═════════════════════════════════════════════════════════

import {
  CheckCircle2,
  Clock4,
  FileText,
  Loader2,
  Percent,
  RefreshCw,
  Send,
  ThumbsDown,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
  CalendarDays,
  ArrowRight,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getQuotationSummary, type QuotationSummaryData } from '@/services/sales-reports.service';

// ═════════════════════════════════════════════════════════
// KPI CARD — gradient-tinted stat tile with hover lift
// ═════════════════════════════════════════════════════════

function KpiCard({
  label,
  value,
  sub,
  icon,
  gradient,
  ring,
  format = (n: number) => Math.round(n).toLocaleString('en-IN'),
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
  ring: string;
  format?: (n: number) => string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-800 ${ring}`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20 ${gradient}`}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {format(value)}
          </p>
          {sub && <p className="mt-0.5 text-[11px] font-medium text-slate-400">{sub}</p>}
        </div>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${gradient}`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// STATUS FUNNEL — stacked distribution bar
// ═════════════════════════════════════════════════════════

function StatusFunnel({ data }: { data: QuotationSummaryData['statusBreakdown'] }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Status Distribution
        </h3>
        <p className="mt-2 text-xs text-slate-400">No quotations yet</p>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0) || 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Status Distribution
        </h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          {total} quotes
        </span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        {data.map((d) => (
          <div
            key={d.status}
            style={{ width: `${(d.count / total) * 100}%`, background: d.color }}
            title={`${d.status}: ${d.count}`}
            className="h-full transition-all duration-500 hover:brightness-110"
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {data.map((d) => (
          <div key={d.status} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="capitalize text-slate-600 dark:text-slate-300">
              {d.status.replace(/_/g, ' ')}
            </span>
            <span className="ml-auto font-bold tabular-nums text-slate-900 dark:text-white">
              {d.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// TREND CHART — pure CSS bar chart (counts)
// ═════════════════════════════════════════════════════════

function TrendChart({
  data,
  xKey,
  title,
  height = 170,
}: {
  data: { count: number; value: number; date?: string; month?: string }[];
  xKey: 'date' | 'month';
  title: string;
  height?: number;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <p className="mt-2 text-xs text-slate-400">No data available</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalValue = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <span className="text-[11px] font-medium text-slate-400">
          {data.reduce((s, d) => s + d.count, 0)} quotes · ₹
          {Math.round(totalValue).toLocaleString('en-IN')}
        </span>
      </div>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => {
          const pct = (d.count / maxCount) * 100;
          const label = xKey === 'date' ? d.date : d.month;
          const isToday = xKey === 'date' && d.date === new Date().toISOString().split('T')[0];
          return (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center justify-end"
              title={`${label}: ${d.count} quote(s) · ₹${Math.round(d.value).toLocaleString('en-IN')}`}
            >
              {/* tooltip */}
              <span className="pointer-events-none absolute -top-7 z-10 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover:block dark:bg-slate-100 dark:text-slate-900">
                {d.count} · ₹{Math.round(d.value).toLocaleString('en-IN')}
              </span>
              <div
                className={`w-full rounded-t-md transition-all duration-300 group-hover:brightness-110 ${
                  isToday
                    ? 'bg-gradient-to-t from-teal-600 to-emerald-400'
                    : 'bg-gradient-to-t from-blue-600 to-sky-400'
                }`}
                style={{ height: `${Math.max(pct, 2)}%`, minHeight: d.count > 0 ? 4 : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1">
        {data.map((d, i) => (
          <span
            key={i}
            className="flex-1 truncate text-center text-[9px] text-slate-400 dark:text-slate-500"
          >
            {xKey === 'date' ? (d.date || '').slice(5) : (d.month || '').slice(5)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export function QuotationDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<QuotationSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getQuotationSummary();
      setData(result);
    } catch (err) {
      setError((err as Error).message || 'Failed to load quotation dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const k = data?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Quotation Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Quotation funnel — total, pipeline, and conversion performance at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/sales/quotations')}
            className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50"
          >
            <FileText className="h-4 w-4" />
            All Quotations
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">
            Loading quotation data...
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* ── Primary KPIs ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total Quotations"
              value={k.total?.value || 0}
              icon={<FileText className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-slate-500 to-slate-700"
              ring="border-l-4 border-l-slate-500"
            />
            <KpiCard
              label="Today's Quotations"
              value={k.today?.value || 0}
              icon={<CalendarDays className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-sky-500 to-blue-600"
              ring="border-l-4 border-l-sky-500"
            />
            <KpiCard
              label="Pending"
              value={k.pending?.value || 0}
              sub="Approval pipeline"
              icon={<Clock4 className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-violet-500 to-purple-600"
              ring="border-l-4 border-l-violet-500"
            />
            <KpiCard
              label="Approved"
              value={k.approved?.value || 0}
              icon={<CheckCircle2 className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-emerald-500 to-green-600"
              ring="border-l-4 border-l-emerald-500"
            />
            <KpiCard
              label="Rejected"
              value={k.rejected?.value || 0}
              icon={<XCircle className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-rose-500 to-red-600"
              ring="border-l-4 border-l-rose-500"
            />
            <KpiCard
              label="Converted"
              value={k.converted?.value || 0}
              sub="→ Sales Order"
              icon={<TrendingUp className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-teal-500 to-emerald-600"
              ring="border-l-4 border-l-teal-500"
            />
            <KpiCard
              label="Lost"
              value={k.lost?.value || 0}
              sub="Lost + expired"
              icon={<ThumbsDown className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-amber-500 to-orange-600"
              ring="border-l-4 border-l-amber-500"
            />
            <KpiCard
              label="Conversion %"
              value={k.conversionRate?.value || 0}
              sub="Converted ÷ total"
              icon={<Percent className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-indigo-500 to-violet-600"
              ring="border-l-4 border-l-indigo-500"
              format={(n) => `${(Number(n) || 0).toFixed(1)}%`}
            />
          </div>

          {/* ── Secondary KPIs ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Draft"
              value={k.draft?.value || 0}
              icon={<FileText className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-slate-400 to-slate-500"
              ring="border-l-4 border-l-slate-400"
            />
            <KpiCard
              label="Sent"
              value={k.sent?.value || 0}
              icon={<Send className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-blue-400 to-sky-500"
              ring="border-l-4 border-l-blue-400"
            />
            <KpiCard
              label="Final"
              value={k.final?.value || 0}
              icon={<CheckCircle2 className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-fuchsia-500 to-purple-600"
              ring="border-l-4 border-l-fuchsia-500"
            />
            <KpiCard
              label="Win Rate %"
              value={k.winRate?.value || 0}
              sub="Converted ÷ decided"
              icon={<TrendingDown className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-cyan-500 to-teal-600"
              ring="border-l-4 border-l-cyan-500"
              format={(n) => `${(Number(n) || 0).toFixed(1)}%`}
            />
            <KpiCard
              label="Quotation Value"
              value={k.totalValue?.value || 0}
              icon={<Users className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
              ring="border-l-4 border-l-emerald-500"
              format={fmtINR}
            />
            <KpiCard
              label="Converted Value"
              value={k.convertedValue?.value || 0}
              icon={<TrendingUp className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-green-500 to-emerald-600"
              ring="border-l-4 border-l-green-500"
              format={fmtINR}
            />
            <KpiCard
              label="Average Quotation"
              value={k.avgValue?.value || 0}
              icon={<Percent className="h-4 w-4" />}
              gradient="bg-gradient-to-br from-orange-500 to-amber-600"
              ring="border-l-4 border-l-orange-500"
              format={fmtINR}
            />
            <div className="rounded-2xl border border-dashed border-teal-300 bg-gradient-to-br from-teal-50/60 to-white p-4 dark:border-teal-700 dark:from-teal-900/10 dark:to-slate-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Open Pipeline
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-teal-700 dark:text-teal-300">
                {(k.draft?.value || 0) +
                  (k.pending?.value || 0) +
                  (k.approved?.value || 0) +
                  (k.sent?.value || 0)}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-teal-500/80">
                Active quotes (draft + pending + approved + sent)
              </p>
            </div>
          </div>

          {/* ── Funnel + trends ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <StatusFunnel data={data.statusBreakdown} />
            <TrendChart data={data.dailyTrend} xKey="date" title="Quotations — Last 14 Days" />
          </div>

          <TrendChart data={data.monthlyTrend} xKey="month" title="Quotations — Last 6 Months" />
        </>
      )}
    </div>
  );
}
