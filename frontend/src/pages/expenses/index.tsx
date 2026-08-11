import { CheckCircle2, Eye, Loader2, Plus, RefreshCw, Search, Wallet, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { expenseApi, type Expense } from '@/services/asset-expense.service';

const STATUS_CLS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30',
  approved: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30',
  rejected: 'bg-red-50 text-red-600 dark:bg-red-950/30',
  paid: 'bg-slate-100 text-slate-600 dark:bg-slate-800',
};

const fmt = (n?: number | null) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function ExpensesPage() {
  const [rows, setRows] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categories, setCategories] = useState<{ id: string; categoryName: string }[]>([]);
  const [categoryId, setCategoryId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await expenseApi.list({
        ps: 50,
        search: search || undefined,
        status: status || undefined,
        categoryId: categoryId || undefined,
      });
      setRows(res?.data || []);
      setTotal(res?.total || 0);
      const cats = await expenseApi.categories();
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

  const action = async (fn: () => Promise<any>, label: string) => {
    try {
      await fn();
      await load();
    } catch (e: any) {
      alert(e?.message || `${label} failed`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Expenses</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{total} expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search number / description…"
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
                {s}
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
            to="/expenses/new"
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New expense
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
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <Loader2 className="text-primary mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted-foreground py-12 text-center text-xs">
                  No expenses found
                </td>
              </tr>
            ) : (
              rows.map((e) => (
                <tr
                  key={e.id}
                  className="border-border hover:bg-muted/30 border-t transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium">{e.expenseNumber}</td>
                  <td className="px-4 py-3 text-xs">{e.expenseDate || '—'}</td>
                  <td className="text-muted-foreground px-4 py-3 text-xs">
                    {e.categoryName || '—'}
                  </td>
                  <td className="text-muted-foreground max-w-[220px] truncate px-4 py-3 text-xs">
                    {e.description || '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{fmt(e.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLS[e.status || 'draft'] || 'bg-muted'}`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {e.status === 'submitted' && (
                        <>
                          <button
                            title="Approve"
                            onClick={() => void action(() => expenseApi.approve(e.id), 'Approve')}
                            className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Reject"
                            onClick={() => void action(() => expenseApi.reject(e.id), 'Reject')}
                            className="rounded-md p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {e.status === 'approved' && (
                        <button
                          title="Mark paid"
                          onClick={() =>
                            void action(
                              () => expenseApi.pay(e.id, { paymentMode: 'bank' }),
                              'Payment',
                            )
                          }
                          className="hover:bg-primary/10 text-primary rounded-md p-1.5"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <Link
                        to={`/expenses/${e.id}`}
                        className="text-primary hover:bg-primary/5 rounded-md p-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </div>
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
