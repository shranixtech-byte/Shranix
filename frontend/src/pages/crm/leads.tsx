import { Plus, Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  deleteLead,
  getLeads,
  LEAD_SOURCES,
  LEAD_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  type Lead,
} from '@/services/crm.service';

export function LeadsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLeads({
        page,
        pageSize,
        search: search || undefined,
        status: status || undefined,
        source: source || undefined,
      });
      setData(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, source]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this lead?')) {
      return;
    }
    await deleteLead(id);
    void load();
  };

  const scoreColor = (level?: string) =>
    level === 'high'
      ? 'text-emerald-600'
      : level === 'medium'
        ? 'text-amber-600'
        : 'text-slate-500';

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground mt-1 text-sm">{total} leads</p>
        </div>
        <button
          onClick={() => navigate('/crm/leads/new')}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> New Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name / mobile / email…"
            className="bg-card focus:border-primary/50 rounded-lg border py-2 pl-8 pr-3 text-sm outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="bg-card rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s] || s}
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(1);
          }}
          className="bg-card rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All sources</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card overflow-x-auto rounded-lg border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
              <th className="px-4 py-2.5 font-medium">Lead #</th>
              <th className="px-4 py-2.5 font-medium">Name / Company</th>
              <th className="px-4 py-2.5 font-medium">Mobile</th>
              <th className="px-4 py-2.5 font-medium">Source</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Score</th>
              <th className="px-4 py-2.5 font-medium">Expected Value</th>
              <th className="px-4 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted-foreground px-4 py-10 text-center text-xs">
                  No leads yet — create your first lead
                </td>
              </tr>
            ) : (
              data.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-muted/30 cursor-pointer border-b last:border-0"
                  onClick={() => navigate(`/crm/leads/${lead.id}`)}
                >
                  <td className="px-4 py-2.5 font-medium text-indigo-600">{lead.leadNumber}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{lead.leadName}</p>
                    {lead.companyName && (
                      <p className="text-muted-foreground text-xs">{lead.companyName}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{lead.mobile || '—'}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {String(lead.source || '—').replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_COLORS[String(lead.status)] || 'border-slate-200 bg-slate-100 text-slate-600'}`}
                    >
                      {STATUS_LABELS[String(lead.status)] || lead.status}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-2.5 text-sm font-semibold ${scoreColor(lead.scoreLevel)}`}
                  >
                    {Math.round(Number(lead.score) || 0)}
                  </td>
                  <td className="px-4 py-2.5">
                    ₹{Number(lead.expectedValue || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/crm/leads/${lead.id}/edit`)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(lead.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>
          Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="bg-card rounded-lg border px-3 py-1.5 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => setPage(page + 1)}
            className="bg-card rounded-lg border px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
