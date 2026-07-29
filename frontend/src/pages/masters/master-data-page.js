import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/// <reference types="vite/client" />
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { Button } from '@/components/ui/Button';
const initialState = () => ({
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
export function MasterDataPage({ title, description, columns, apiPath, formFields: _formFields, basePath }) {
    const navigate = useNavigate();
    const [state, setState] = useState(initialState);
    // ── Data Fetching ─────────────────────────────────────
    const fetchData = useCallback(async () => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const params = new URLSearchParams();
            params.set('page', String(state.page));
            params.set('pageSize', String(state.pageSize));
            if (state.search) {
                params.set('search', state.search);
            }
            const result = await apiRequest(`${apiPath}?${params}`);
            const data = result.data || result || [];
            setState((s) => ({
                ...s,
                data: Array.isArray(data) ? data : [],
                total: result.total || (Array.isArray(data) ? data.length : 0),
                totalPages: result.totalPages || 1,
                loading: false,
            }));
        }
        catch (err) {
            setState((s) => ({ ...s, error: err.message, loading: false }));
        }
    }, [state.page, state.pageSize, state.search, apiPath]);
    useEffect(() => { fetchData(); }, [fetchData]);
    // ── Navigation to new form pages ──────────────────────
    const openCreate = () => {
        const path = basePath || apiPath.replace(/^\/?(?:api\/)?(?:v\d+\/)?/, '');
        navigate(`/${path}/create`);
    };
    const openEdit = (record) => {
        const path = basePath || apiPath.replace(/^\/?(?:api\/)?(?:v\d+\/)?/, '');
        navigate(`/${path}/${record.id}/edit`);
    };
    const confirmDelete = (id) => {
        setState((s) => ({ ...s, deleteConfirmId: id }));
    };
    const handleDelete = async (id) => {
        try {
            await apiRequest(`${apiPath}/${id}`, { method: 'DELETE' });
            setState((s) => ({ ...s, deleteConfirmId: null }));
            await fetchData();
        }
        catch (err) {
            setState((s) => ({ ...s, error: err.message, deleteConfirmId: null }));
        }
    };
    const handleRestore = async (id) => {
        try {
            await apiRequest(`${apiPath}/${id}/restore`, { method: 'POST' });
            await fetchData();
        }
        catch (err) {
            setState((s) => ({ ...s, error: err.message }));
        }
    };
    // ── Render ────────────────────────────────────────────
    if (state.loading && state.data.length === 0) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" }), _jsxs("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: ["Loading ", title, "..."] })] }) }));
    }
    if (state.error && state.data.length === 0) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsxs("div", { className: "rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950", children: [_jsxs("p", { className: "text-red-600 dark:text-red-400", children: ["Failed to load ", title] }), _jsx("p", { className: "mt-1 text-sm text-red-500", children: state.error }), _jsx("button", { onClick: fetchData, className: "mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700", children: "Retry" })] }) }));
    }
    return (_jsxs("div", { className: "space-y-6 animate-in fade-in duration-300", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100", children: title }), description && _jsx("p", { className: "mt-1 text-sm text-slate-500 dark:text-slate-400", children: description })] }), _jsxs(Button, { variant: "primary", onClick: openCreate, children: ["+ Create ", title.slice(0, -1)] })] }), state.error && (_jsxs("div", { className: "flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400", children: [_jsx("span", { children: state.error }), _jsx("button", { onClick: () => setState((s) => ({ ...s, error: null })), className: "ml-auto underline", children: "Dismiss" })] })), _jsxs("div", { className: "relative max-w-md", children: [_jsx("span", { className: "absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400", children: "\uD83D\uDD0D" }), _jsx("input", { type: "text", placeholder: `Search ${title.toLowerCase()}...`, value: state.search, onChange: (e) => setState((s) => ({ ...s, search: e.target.value, page: 1 })), className: "h-[42px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" })] }), _jsxs("div", { className: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50", children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-slate-100 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/80", children: [_jsx("th", { className: "sticky top-0 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500", children: "#" }), columns.map((col) => (_jsx("th", { className: "sticky top-0 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500", children: col.label }, col.key))), _jsx("th", { className: "sticky top-0 px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-slate-700", children: state.data.length === 0 ? (_jsx("tr", { children: _jsxs("td", { colSpan: columns.length + 2, className: "px-4 py-16 text-center text-sm text-slate-400", children: ["No ", title.toLowerCase(), " found. Create one to get started."] }) })) : (state.data.map((record, idx) => (_jsxs("tr", { className: "transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/30", children: [_jsx("td", { className: "px-4 py-3.5 text-sm text-slate-400", children: (state.page - 1) * state.pageSize + idx + 1 }), columns.map((col) => (_jsx("td", { className: "px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300", children: col.render ? col.render(record[col.key], record) : String(record[col.key] ?? '—') }, col.key))), _jsx("td", { className: "px-4 py-3.5 text-right", children: state.deleteConfirmId === record.id ? (_jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsx("span", { className: "text-xs text-slate-400", children: "Confirm?" }), _jsx("button", { onClick: () => handleDelete(record.id), className: "rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600", children: "Delete" }), _jsx("button", { onClick: () => setState((s) => ({ ...s, deleteConfirmId: null })), className: "rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700", children: "Cancel" })] })) : (_jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsx("button", { onClick: () => openEdit(record), className: "rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950", children: "Edit" }), record.isDeleted ? (_jsx("button", { onClick: () => handleRestore(record.id), className: "rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950", children: "Restore" })) : (_jsx("button", { onClick: () => confirmDelete(record.id), className: "rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950", children: "Delete" }))] })) })] }, record.id)))) })] }) }), state.totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-700", children: [_jsxs("p", { className: "text-sm text-slate-500", children: ["Showing ", (state.page - 1) * state.pageSize + 1, "\u2013", Math.min(state.page * state.pageSize, state.total), " of ", state.total] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => setState((s) => ({ ...s, page: Math.max(1, s.page - 1) })), disabled: state.page <= 1, className: "rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700", children: "\u2190 Prev" }), Array.from({ length: Math.min(5, state.totalPages) }, (_, i) => {
                                        const start = Math.max(1, state.page - 2);
                                        const p = start + i;
                                        if (p > state.totalPages) {
                                            return null;
                                        }
                                        return (_jsx("button", { onClick: () => setState((s) => ({ ...s, page: p })), className: `rounded-lg px-3 py-1.5 text-sm font-medium transition ${p === state.page ? 'bg-emerald-600 text-white shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`, children: p }, p));
                                    }), _jsx("button", { onClick: () => setState((s) => ({ ...s, page: Math.min(s.totalPages, s.page + 1) })), disabled: state.page >= state.totalPages, className: "rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700", children: "Next \u2192" })] })] }))] })] }));
}
//# sourceMappingURL=master-data-page.js.map