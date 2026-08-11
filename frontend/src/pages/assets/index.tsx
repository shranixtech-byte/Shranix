import { Eye, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { assetApi, assetCategoryApi, type Asset } from '@/services/asset-expense.service';

const STATUS_CLS: Record<string, string> = {
  available: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30',
  assigned: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30',
  under_maintenance: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30',
  disposed: 'bg-slate-100 text-slate-600 dark:bg-slate-800',
};

const fmt = (n?: number | null) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export function AssetsPage() {
  const [rows, setRows] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<{ id: string; categoryName: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await assetApi.list({
        ps: 50,
        search: search || undefined,
        status: status || undefined,
        categoryId: categoryId || undefined,
      });
      setRows(res?.data || []);
      setTotal(res?.total || 0);
      const cats = await assetCategoryApi.list();
      setCategories(cats || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [search, status, categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Assets</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{total} assets</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code / name / serial…"
              className="border-border bg-card placeholder:text-muted-foreground w-52 rounded-lg border py-1.5 pl-8 pr-3 text-xs outline-none"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border-border bg-card rounded-lg border px-2 py-1.5 text-xs outline-none"
          >
            <option value="">All statuses</option>
            {Object.keys(STATUS_CLS).map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="border-border bg-card rounded-lg border px-2 py-1.5 text-xs outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.categoryName}
              </option>
            ))}
          </select>
          <Link
            to="/assets/new"
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New asset
          </Link>
          <button
            onClick={() => void load()}
            className="border-border hover:border-primary/40 text-muted-foreground rounded-lg border p-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Serial</th>
              <th className="px-4 py-3 font-medium">Assigned to</th>
              <th className="px-4 py-3 font-medium">Book value</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <Loader2 className="text-primary mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted-foreground py-12 text-center text-xs">
                  No assets found
                </td>
              </tr>
            ) : (
              rows.map((a) => (
                <tr
                  key={a.id}
                  className="border-border hover:bg-muted/30 border-t transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium">{a.assetCode}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.assetName}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {a.brand} {a.model || ''}
                    </p>
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-xs">
                    {a.categoryName || '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px]">{a.serialNumber || '—'}</td>
                  <td className="text-muted-foreground px-4 py-3 text-xs">
                    {a.assignedEmployeeName || '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{fmt(a.currentBookValue)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLS[a.status || 'available'] || 'bg-muted'}`}
                    >
                      {a.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/assets/${a.id}`}
                      className="text-primary hover:bg-primary/5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium"
                    >
                      <Eye className="h-3 w-3" /> View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
