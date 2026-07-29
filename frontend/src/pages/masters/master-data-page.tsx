/// <reference types="vite/client" />

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiRequest } from '@/services/api-client';
import { Button } from '@/components/ui/Button';

// ── Types ───────────────────────────────────────────────
export interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, record: Record<string, unknown>) => React.ReactNode;
}

export interface MasterDataPageProps {
  title: string;
  description?: string;
  columns: ColumnDef[];
  apiPath: string;
  formFields: FormField[];
  basePath?: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'textarea' | 'select' | 'boolean' | 'number' | 'date';
  required?: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
}

// ── State ───────────────────────────────────────────────
interface PageState {
  data: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  search: string;
  deleteConfirmId: string | null;
}

const initialState = (): PageState => ({
  data: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
  loading: true,
  error: null,
  search: '',
  deleteConfirmId: null,
});

// ── Component ───────────────────────────────────────────
export function MasterDataPage({ title, description, columns, apiPath, formFields: _formFields, basePath }: MasterDataPageProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>(initialState);

  // ── Data Fetching ─────────────────────────────────────
  const fetchData = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const params = new URLSearchParams();
      params.set('page', String(state.page));
      params.set('pageSize', String(state.pageSize));
      if (state.search) {params.set('search', state.search);}

      const result = await apiRequest<any>(`${apiPath}?${params}`);
      const data = result.data || result || [];
      setState((s) => ({
        ...s,
        data: Array.isArray(data) ? data : [],
        total: result.total || (Array.isArray(data) ? data.length : 0),
        totalPages: result.totalPages || 1,
        loading: false,
      }));
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message, loading: false }));
    }
  }, [state.page, state.pageSize, state.search, apiPath]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Navigation to new form pages ──────────────────────
  const openCreate = () => {
    const path = basePath || apiPath.replace(/^\/?(?:api\/)?(?:v\d+\/)?/, '');
    navigate(`/${path}/create`);
  };

  const openEdit = (record: Record<string, unknown>) => {
    const path = basePath || apiPath.replace(/^\/?(?:api\/)?(?:v\d+\/)?/, '');
    navigate(`/${path}/${record.id}/edit`);
  };

  const confirmDelete = (id: string) => {
    setState((s) => ({ ...s, deleteConfirmId: id }));
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`${apiPath}/${id}`, { method: 'DELETE' });
      setState((s) => ({ ...s, deleteConfirmId: null }));
      await fetchData();
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message, deleteConfirmId: null }));
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await apiRequest(`${apiPath}/${id}/restore`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message }));
    }
  };

  // ── Render ────────────────────────────────────────────
  if (state.loading && state.data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading {title}...</p>
        </div>
      </div>
    );
  }

  if (state.error && state.data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
          <p className="text-red-600 dark:text-red-400">Failed to load {title}</p>
          <p className="mt-1 text-sm text-red-500">{state.error}</p>
          <button onClick={fetchData} className="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        <Button variant="primary" onClick={openCreate}>
          + Create {title.slice(0, -1)}
        </Button>
      </div>

      {/* Error Banner */}
      {state.error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <span>{state.error}</span>
          <button onClick={() => setState((s) => ({ ...s, error: null }))} className="ml-auto underline">Dismiss</button>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="text"
          placeholder={`Search ${title.toLowerCase()}...`}
          value={state.search}
          onChange={(e) => setState((s) => ({ ...s, search: e.target.value, page: 1 }))}
          className="h-[42px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/80">
                <th className="sticky top-0 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">#</th>
                {columns.map((col) => (
                  <th key={col.key} className="sticky top-0 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {col.label}
                  </th>
                ))}
                <th className="sticky top-0 px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {state.data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-4 py-16 text-center text-sm text-slate-400">
                    No {title.toLowerCase()} found. Create one to get started.
                  </td>
                </tr>
              ) : (
                state.data.map((record, idx) => (
                  <tr key={record.id as string} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3.5 text-sm text-slate-400">{(state.page - 1) * state.pageSize + idx + 1}</td>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300">
                        {col.render ? col.render(record[col.key], record) : String(record[col.key] ?? '—')}
                      </td>
                    ))}
                    <td className="px-4 py-3.5 text-right">
                      {state.deleteConfirmId === record.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-slate-400">Confirm?</span>
                          <button onClick={() => handleDelete(record.id as string)} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">Delete</button>
                          <button onClick={() => setState((s) => ({ ...s, deleteConfirmId: null }))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(record)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950">Edit</button>
                          {(record as any).isDeleted ? (
                            <button onClick={() => handleRestore(record.id as string)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950">Restore</button>
                          ) : (
                            <button onClick={() => confirmDelete(record.id as string)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950">Delete</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {state.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-700">
            <p className="text-sm text-slate-500">
              Showing {(state.page - 1) * state.pageSize + 1}–{Math.min(state.page * state.pageSize, state.total)} of {state.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setState((s) => ({ ...s, page: Math.max(1, s.page - 1) }))}
                disabled={state.page <= 1}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(5, state.totalPages) }, (_, i) => {
                const start = Math.max(1, state.page - 2);
                const p = start + i;
                if (p > state.totalPages) {return null;}
                return (
                  <button
                    key={p}
                    onClick={() => setState((s) => ({ ...s, page: p }))}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${p === state.page ? 'bg-emerald-600 text-white shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setState((s) => ({ ...s, page: Math.min(s.totalPages, s.page + 1) }))}
                disabled={state.page >= state.totalPages}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
