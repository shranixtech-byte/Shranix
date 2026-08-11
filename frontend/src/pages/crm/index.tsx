import { Loader2, RefreshCw, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { DashboardChart } from '@/components/dashboard/DashboardChart';
import { getCrmDashboard, getCrmReport } from '@/services/crm.service';
import type { CrmDashboard } from '@/services/crm.service';

const inr = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const KPI_LABELS: Record<string, { label: string; color: string; format?: 'currency' }> = {
  totalLeads: { label: 'Total Leads', color: 'border-l-indigo-500' },
  newLeads: { label: 'New Leads (month)', color: 'border-l-cyan-500' },
  activeLeads: { label: 'Active Leads', color: 'border-l-violet-500' },
  convertedLeads: { label: 'Converted', color: 'border-l-lime-500' },
  wonLeads: { label: 'Won', color: 'border-l-emerald-500' },
  lostLeads: { label: 'Lost', color: 'border-l-red-500' },
  followUpsDue: { label: 'Follow-ups Due', color: 'border-l-amber-500' },
  overdueFollowUps: { label: 'Overdue Follow-ups', color: 'border-l-orange-500' },
  openTasks: { label: 'Open Tasks', color: 'border-l-teal-500' },
  pipelineValue: { label: 'Pipeline Value', color: 'border-l-blue-500', format: 'currency' },
  wonValue: { label: 'Won Value', color: 'border-l-green-500', format: 'currency' },
  conversionRate: { label: 'Conversion Rate', color: 'border-l-purple-500' },
};

// ═══════════════════════════════════════════════════════════════════
// CRM DASHBOARD
// ═══════════════════════════════════════════════════════════════════
export function CrmDashboardPage() {
  const [data, setData] = useState<CrmDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getCrmDashboard());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading CRM dashboard…
      </div>
    );
  }

  const c = data?.charts;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="h-6 w-6 text-indigo-500" /> CRM Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Leads, pipeline, follow-ups and conversion at a glance
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data?.kpis.map((kpi) => {
          const meta = KPI_LABELS[kpi.key] || { label: kpi.key, color: 'border-l-slate-500' };
          return (
            <div
              key={kpi.key}
              className={`bg-card rounded-lg border-l-4 p-4 shadow-sm transition-transform hover:-translate-y-0.5 ${meta.color}`}
            >
              <p className="text-muted-foreground text-xs font-medium">{meta.label}</p>
              <p className="mt-1 text-2xl font-bold">
                {meta.format === 'currency'
                  ? inr(kpi.value)
                  : kpi.key === 'conversionRate'
                    ? `${kpi.value}%`
                    : kpi.value.toLocaleString('en-IN')}
              </p>
            </div>
          );
        })}
      </div>

      {/* Pipeline value strip */}
      {data?.pipelineValue && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-card rounded-lg border p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium">Open Pipeline Value (leads)</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {inr(data.pipelineValue.pipeline)}
            </p>
          </div>
          <div className="bg-card rounded-lg border p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium">
              Weighted Pipeline (opportunities)
            </p>
            <p className="mt-1 text-2xl font-bold text-violet-600">
              {inr(data.pipelineValue.weightedOpportunities)}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardChart
          title="Lead Trend (12 months)"
          data={c?.leadTrend || []}
          series={[
            { key: 'Leads', name: 'Leads', color: '#6366f1' },
            { key: 'Converted', name: 'Converted', color: '#22c55e' },
          ]}
          type="area"
          height={240}
          formatValue={(v) => String(v)}
        />
        <DashboardChart
          title="Pipeline Funnel"
          data={(c?.pipelineFunnel || []).map((p) => ({ label: p.stage, count: p.count }))}
          series={[{ key: 'count', name: 'Leads', color: '#8b5cf6' }]}
          height={240}
          formatValue={(v) => String(v)}
        />
        <DashboardChart
          title="Lead Source"
          data={(c?.leadSource || []).map((s) => ({ label: s.name, leads: s.value }))}
          series={[{ key: 'leads', name: 'Leads', color: '#06b6d4' }]}
          height={240}
          formatValue={(v) => String(v)}
        />
        <DashboardChart
          title="Won vs Lost vs Converted"
          data={(c?.wonVsLost || []).map((w) => ({ label: w.name, count: w.value }))}
          series={[{ key: 'count', name: 'Leads', color: '#f59e0b' }]}
          height={240}
          formatValue={(v) => String(v)}
        />
        <DashboardChart
          title="Salesperson Performance"
          data={(c?.salespersonPerformance || []).map((p) => ({
            label: String(p.salesperson).slice(0, 10),
            leads: p.leads,
          }))}
          series={[{ key: 'leads', name: 'Leads', color: '#ec4899' }]}
          height={240}
          formatValue={(v) => String(v)}
        />
        <DashboardChart
          title="Monthly Conversion Rate %"
          data={(c?.conversionTrend || []).map((m) => ({ label: m.label, Rate: m.Rate }))}
          series={[{ key: 'Rate', name: 'Rate %', color: '#22c55e' }]}
          height={240}
          formatValue={(v) => `${v}%`}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CRM REPORTS
// ═══════════════════════════════════════════════════════════════════
const REPORT_TYPES: { key: string; label: string }[] = [
  { key: 'lead-register', label: 'Lead Register' },
  { key: 'lead-source', label: 'Lead Source' },
  { key: 'lead-conversion', label: 'Lead Conversion' },
  { key: 'lead-status', label: 'Lead Status' },
  { key: 'salesperson-performance', label: 'Salesperson Performance' },
  { key: 'follow-up-report', label: 'Follow-up Report' },
  { key: 'overdue-follow-ups', label: 'Overdue Follow-ups' },
  { key: 'pipeline', label: 'Pipeline Report' },
  { key: 'won-lost', label: 'Won / Lost' },
  { key: 'lost-reason', label: 'Lost Reasons' },
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'tasks', label: 'Tasks' },
];

export function CrmReportsPage() {
  const [type, setType] = useState('lead-register');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCrmReport(type, { page: 1, pageSize: 100 });
      setRows(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CRM Reports</h1>
        <p className="text-muted-foreground mt-1 text-sm">{total} records</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {REPORT_TYPES.map((r) => (
          <button
            key={r.key}
            onClick={() => setType(r.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              type === r.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:border-primary/40 border'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="bg-card overflow-x-auto rounded-lg border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
              {columns.map((c) => (
                <th key={c} className="px-4 py-2.5 font-medium">
                  {c.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={Math.max(columns.length, 1)}
                  className="text-muted-foreground px-4 py-10 text-center"
                >
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(columns.length, 1)}
                  className="text-muted-foreground px-4 py-10 text-center text-xs"
                >
                  No data available
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/30 border-b last:border-0">
                  {columns.map((c) => (
                    <td key={c} className="px-4 py-2.5">
                      {String(row[c] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
