import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ScrollText,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { apiRequest, apiUrl } from '@/services/api-client';
import { authService } from '@/services/auth.service';

import { SectionCard } from './settings-ui';

interface ChangeEntry {
  field: string;
  old: unknown;
  new: unknown;
}

interface AuditRow {
  id: string;
  timestamp: string | null;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  action: string | null;
  actionType: string | null;
  entityType: string | null;
  entityId: string | null;
  module: string | null;
  status: string | null;
  ipAddress: string | null;
  device: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changes: ChangeEntry[] | null;
  remarks: string | null;
}

interface AuditMeta {
  modules: string[];
  entityTypes: string[];
  actions: string[];
  actionTypes: string[];
}

interface AuditPage {
  data: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ACTION_STYLES: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  delete: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
  restore: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  login: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
};

function formatDateTime(v: string | null): { date: string; time: string } {
  if (!v) {
    return { date: '—', time: '' };
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    return { date: v, time: '' };
  }
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === '') {
    return '—';
  }
  if (typeof v === 'boolean') {
    return v ? 'Yes' : 'No';
  }
  const s = String(v);
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

const selectCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800';
const inputCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800';

export function AuditTrailSection() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [data, setData] = useState<AuditPage | null>(null);
  const [meta, setMeta] = useState<AuditMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportBusy, setExportBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [fSearch, setFSearch] = useState('');
  const [fModule, setFModule] = useState('');
  const [fEntity, setFEntity] = useState('');
  const [fAction, setFAction] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const searchRef = useRef('');
  const searchTimer = useRef<number | null>(null);

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          pageSize: String(pageSize),
        });
        const q = searchRef.current.trim();
        if (q) {
          params.set('search', q);
        }
        if (fModule) {
          params.set('module', fModule);
        }
        if (fEntity) {
          params.set('entityType', fEntity);
        }
        if (fAction) {
          params.set('action', fAction);
        }
        if (fFrom) {
          params.set('from', fFrom);
        }
        if (fTo) {
          params.set('to', fTo);
        }
        const res = await apiRequest<{ data?: AuditPage } | AuditPage>(
          `/audit-trail?${params.toString()}`,
        );
        const p = (res as { data?: AuditPage }).data ?? (res as AuditPage);
        setData({
          data: Array.isArray(p?.data) ? p.data : [],
          total: Number(p?.total ?? 0),
          page: Number(p?.page ?? targetPage),
          pageSize: Number(p?.pageSize ?? pageSize),
          totalPages: Number(p?.totalPages ?? 0),
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [fModule, fEntity, fAction, fFrom, fTo, pageSize],
  );

  const loadMeta = useCallback(async () => {
    try {
      const res = await apiRequest<{ data?: AuditMeta } | AuditMeta>('/audit-trail/meta');
      setMeta((res as { data?: AuditMeta }).data ?? (res as AuditMeta));
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void load(1);
    setPage(1);
  }, [load]);

  // Debounce the free-text search (load does NOT depend on fSearch, so the
  // immediate [load] effect above only fires for select/date filters).
  useEffect(() => {
    if (searchTimer.current) {
      window.clearTimeout(searchTimer.current);
    }
    searchTimer.current = window.setTimeout(() => {
      setPage(1);
      void load(1);
    }, 450);
    return () => {
      if (searchTimer.current) {
        window.clearTimeout(searchTimer.current);
      }
    };
  }, [fSearch, load]);

  const handleExport = async () => {
    setExportBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fSearch.trim()) {
        params.set('search', fSearch.trim());
      }
      if (fModule) {
        params.set('module', fModule);
      }
      if (fEntity) {
        params.set('entityType', fEntity);
      }
      if (fAction) {
        params.set('action', fAction);
      }
      if (fFrom) {
        params.set('from', fFrom);
      }
      if (fTo) {
        params.set('to', fTo);
      }
      const token = authService.getAccessToken();
      const res = await fetch(apiUrl(`/audit-trail/export?${params.toString()}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExportBusy(false);
    }
  };

  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const visibleChanges = (row: AuditRow) => (row.changes || []).slice(0, 3);
  const moreCount = (row: AuditRow) => Math.max(0, (row.changes?.length || 0) - 3);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Audit Trail"
        description="Who changed what — with old & new values, date, time, IP and device — कोणी काय बदलले"
        icon={<ScrollText className="h-5 w-5" />}
        tint="violet"
      >
        {/* ── Filters ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Search</span>
            <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-slate-400" />
            <input
              value={fSearch}
              onChange={(e) => {
                setFSearch(e.target.value);
                searchRef.current = e.target.value;
              }}
              placeholder="User, entity, action…"
              className={`${inputCls} pl-9`}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Module</span>
            <select
              value={fModule}
              onChange={(e) => setFModule(e.target.value)}
              className={selectCls}
            >
              <option value="">All modules</option>
              {(meta?.modules || []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Entity</span>
            <select
              value={fEntity}
              onChange={(e) => setFEntity(e.target.value)}
              className={selectCls}
            >
              <option value="">All entities</option>
              {(meta?.entityTypes || []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Action</span>
            <select
              value={fAction}
              onChange={(e) => setFAction(e.target.value)}
              className={selectCls}
            >
              <option value="">All actions</option>
              {[
                'create',
                'update',
                'delete',
                'restore',
                ...(meta?.actions || []).filter(
                  (a) => !['create', 'update', 'delete', 'restore'].includes(a),
                ),
              ].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              From date
            </span>
            <input
              type="date"
              value={fFrom}
              onChange={(e) => setFFrom(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">To date</span>
            <input
              type="date"
              value={fTo}
              onChange={(e) => setFTo(e.target.value)}
              className={inputCls}
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setPage(1);
                void load(1);
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Apply
            </button>
            <button
              onClick={handleExport}
              disabled={exportBusy}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition-colors hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
            >
              {exportBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* ── Table ── */}
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400 dark:border-slate-700 dark:bg-slate-800/80">
                  <th className="px-4 py-3 font-semibold">Date & Time</th>
                  <th className="px-4 py-3 font-semibold">Who</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Module / Entity</th>
                  <th className="px-4 py-3 font-semibold">Old → New Value</th>
                  <th className="px-4 py-3 font-semibold">IP</th>
                  <th className="px-4 py-3 font-semibold">Device</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-500" />
                    </td>
                  </tr>
                ) : (data?.data?.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                      <ScrollText className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                      No audit entries yet — changes made from now on (masters, customers, products,
                      settings…) will appear here.
                    </td>
                  </tr>
                ) : (
                  data?.data.map((row) => {
                    const dt = formatDateTime(row.timestamp);
                    const expandedHere = expanded === row.id;
                    return (
                      <FragmentRow
                        key={row.id}
                        row={row}
                        dt={dt}
                        expanded={expandedHere}
                        onToggle={() => setExpanded(expandedHere ? null : row.id)}
                        moreCount={moreCount(row)}
                        visibleChanges={visibleChanges(row)}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagination ── */}
        {!loading && (data?.total ?? 0) > 0 && (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-slate-400">
              {data?.total ?? 0} entr{(data?.total ?? 0) === 1 ? 'y' : 'ies'} · page{' '}
              {data?.page ?? page} of {totalPages}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setPage(Math.max(1, page - 1));
                  void load(Math.max(1, page - 1));
                }}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-medium text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => {
                  setPage(Math.min(totalPages, page + 1));
                  void load(Math.min(totalPages, page + 1));
                }}
                disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function FragmentRow({
  row,
  dt,
  expanded,
  onToggle,
  visibleChanges,
  moreCount,
}: {
  row: AuditRow;
  dt: { date: string; time: string };
  expanded: boolean;
  onToggle: () => void;
  visibleChanges: ChangeEntry[];
  moreCount: number;
}) {
  const actionStyle =
    ACTION_STYLES[(row.action || '').toLowerCase()] ||
    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-violet-50/50 dark:border-slate-800 dark:hover:bg-slate-800/60"
      >
        <td className="whitespace-nowrap px-4 py-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{dt.date}</p>
          <p className="text-[11px] text-slate-400">{dt.time}</p>
        </td>
        <td className="px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-100">
            <User className="h-3.5 w-3.5 shrink-0 text-violet-400" />
            {row.userName || row.userId?.slice(0, 8) || 'Unknown'}
          </p>
          {row.userRole && <p className="mt-0.5 text-[10px] text-slate-400">{row.userRole}</p>}
        </td>
        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${actionStyle}`}
          >
            {row.action || '—'}
          </span>
        </td>
        <td className="px-4 py-3">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {row.module || '—'}
          </p>
          <p className="text-[11px] text-slate-400">
            {row.entityType}
            {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ''}
          </p>
        </td>
        <td className="max-w-[260px] px-4 py-3">
          {row.changes && row.changes.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {visibleChanges.map((c) => (
                <span
                  key={c.field}
                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <span className="font-semibold">{c.field}:</span>
                  <span className="line-through decoration-rose-400/70">{fmtVal(c.old)}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">→</span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    {fmtVal(c.new)}
                  </span>
                </span>
              ))}
              {moreCount > 0 && (
                <span className="text-[10px] text-slate-400">+{moreCount} more</span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">—</span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
          {row.ipAddress || '—'}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400">
          {row.device || '—'}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Old Values
                </p>
                <pre className="max-h-48 overflow-auto rounded-lg bg-slate-100/80 p-3 font-mono text-[11px] leading-relaxed text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  {row.oldValues ? JSON.stringify(row.oldValues, null, 2) : '— (created new)'}
                </pre>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  New Values
                </p>
                <pre className="max-h-48 overflow-auto rounded-lg bg-slate-100/80 p-3 font-mono text-[11px] leading-relaxed text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  {row.newValues ? JSON.stringify(row.newValues, null, 2) : '— (deleted)'}
                </pre>
              </div>
            </div>
            {row.remarks && (
              <p className="mt-3 rounded-lg bg-slate-100/60 px-3 py-2 text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <FileText className="mr-1 inline h-3 w-3" /> {row.remarks}
              </p>
            )}
            <button
              onClick={onToggle}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400"
            >
              <ChevronUp className="h-3.5 w-3.5" /> Close
            </button>
          </td>
        </tr>
      )}
    </>
  );
}
