import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Search, Plus, Download, Copy, Eye, Pencil, Trash2, X, Filter, ArrowUpDown, ChevronUp, ChevronDown, Package, CheckCircle2, XCircle, } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
export function ProductsPage() {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortField, setSortField] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [error, setError] = useState(null);
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('pageSize', String(pageSize));
            if (search) {
                params.set('search', search);
            }
            const result = await apiRequest(`/inventory/items?${params}`);
            const records = (result.data || result || []);
            setData(Array.isArray(records) ? records : []);
            setTotal(result.total || (Array.isArray(records) ? records.length : 0));
            setTotalPages(result.totalPages || 1);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }, [page, pageSize, search]);
    useEffect(() => { void fetchData(); }, [fetchData]);
    const filteredData = useMemo(() => {
        let filtered = data;
        if (statusFilter === 'active') {
            filtered = filtered.filter((p) => p.isActive !== false);
        }
        else if (statusFilter === 'inactive') {
            filtered = filtered.filter((p) => p.isActive === false);
        }
        return filtered;
    }, [data, statusFilter]);
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
        }
        else {
            setSortField(field);
            setSortDir('asc');
        }
    };
    const handleDelete = async (id) => {
        try {
            await apiRequest(`/inventory/items/${id}`, { method: 'DELETE' });
            setDeleteConfirmId(null);
            void fetchData();
        }
        catch (err) {
            setError(err.message);
        }
    };
    const handleDuplicate = async (id) => {
        try {
            await apiRequest(`/inventory/items/${id}/duplicate`, { method: 'POST' });
            void fetchData();
        }
        catch (err) {
            setError(err.message);
        }
    };
    const handleExport = () => {
        // CSV export — build from filteredData
        const headers = ['Name', 'SKU', 'Product Code', 'HSN', 'Category', 'Brand', 'Unit', 'Purchase Rate', 'Sales Rate', 'MRP', 'Stock', 'Status'];
        const rows = filteredData.map((p) => [
            p.name, p.sku, p.productCode || '', p.hsnCode || '', p.categoryId || '',
            p.brandId || '', p.unitId || '', p.purchaseRate || 0, p.salesRate || 0,
            p.mrp || 0, p.currentStock || 0, p.isActive ? 'Active' : 'Inactive',
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'products.csv';
        a.click();
        URL.revokeObjectURL(url);
    };
    const SortIcon = ({ field }) => {
        if (sortField !== field)
            return _jsx(ArrowUpDown, { className: "h-3 w-3 text-muted-foreground" });
        return sortDir === 'asc'
            ? _jsx(ChevronUp, { className: "h-3 w-3 text-primary" })
            : _jsx(ChevronDown, { className: "h-3 w-3 text-primary" });
    };
    return (_jsxs("div", { className: "space-y-6 animate-in fade-in duration-500", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Products" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Enterprise product master with stock, pricing, GST, batch/serial tracking" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: handleExport, className: "inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]", children: [_jsx(Download, { className: "h-4 w-4" }), " Export"] }), _jsxs("button", { onClick: () => navigate('/inventory/items/create'), className: "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]", children: [_jsx(Plus, { className: "h-4 w-4" }), " Add Product"] })] })] }), error && (_jsxs("div", { className: "rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400", children: [error, " ", _jsx("button", { onClick: () => setError(null), className: "ml-2 underline", children: "Dismiss" })] })), _jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [_jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), _jsx("input", { type: "text", placeholder: "Search by name, SKU, barcode, category...", value: search, onChange: (e) => { setSearch(e.target.value); setPage(1); }, className: "h-10 w-full rounded-xl border bg-background pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary" }), search && (_jsx("button", { onClick: () => { setSearch(''); setPage(1); }, className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground", children: _jsx(X, { className: "h-4 w-4" }) }))] }), _jsxs("div", { className: "relative", children: [_jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "h-10 rounded-xl border bg-background px-3 pr-8 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer", children: [_jsx("option", { value: "all", children: "All Status" }), _jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "inactive", children: "Inactive" })] }), _jsx(Filter, { className: "absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-muted-foreground" })] })] }), _jsxs("div", { className: "overflow-hidden rounded-2xl border bg-card shadow-sm", children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b bg-muted/30", children: [_jsx("th", { className: "px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "#" }), _jsx("th", { className: "px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground", onClick: () => handleSort('name'), children: _jsxs("span", { className: "inline-flex items-center gap-1", children: ["Product Name ", _jsx(SortIcon, { field: "name" })] }) }), _jsx("th", { className: "px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground", onClick: () => handleSort('sku'), children: _jsxs("span", { className: "inline-flex items-center gap-1", children: ["SKU ", _jsx(SortIcon, { field: "sku" })] }) }), _jsx("th", { className: "px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "HSN" }), _jsx("th", { className: "px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Purchase \u20B9" }), _jsx("th", { className: "px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Sales \u20B9" }), _jsx("th", { className: "px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "MRP" }), _jsx("th", { className: "px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Stock" }), _jsx("th", { className: "px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Status" }), _jsx("th", { className: "px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y", children: loading ? (Array.from({ length: 5 }).map((_, i) => (_jsx("tr", { children: Array.from({ length: 10 }).map((_, j) => (_jsx("td", { className: "px-4 py-4", children: _jsx("div", { className: "h-5 animate-pulse rounded bg-muted" }) }, j))) }, i)))) : filteredData.length === 0 ? (_jsx("tr", { children: _jsxs("td", { colSpan: 10, className: "px-4 py-16 text-center", children: [_jsx(Package, { className: "mx-auto h-10 w-10 text-muted-foreground/50" }), _jsx("p", { className: "mt-3 text-sm font-medium text-muted-foreground", children: "No products found" }), _jsx("p", { className: "text-xs text-muted-foreground/60", children: "Create your first product to get started" })] }) })) : (filteredData.map((product, idx) => (_jsxs("tr", { className: "transition-colors hover:bg-muted/20", children: [_jsx("td", { className: "px-4 py-3.5 text-sm text-muted-foreground", children: (page - 1) * pageSize + idx + 1 }), _jsx("td", { className: "px-4 py-3.5", children: _jsx("button", { onClick: () => navigate(`/inventory/products/${product.id}`), className: "text-sm font-medium text-foreground hover:text-primary transition-colors", children: product.name || '—' }) }), _jsx("td", { className: "px-4 py-3.5 text-sm font-mono text-muted-foreground", children: product.sku || '—' }), _jsx("td", { className: "px-4 py-3.5 text-sm text-muted-foreground", children: product.hsnCode || '—' }), _jsxs("td", { className: "px-4 py-3.5 text-sm text-right font-medium", children: ["\u20B9", Number(product.purchaseRate || 0).toFixed(2)] }), _jsxs("td", { className: "px-4 py-3.5 text-sm text-right font-medium", children: ["\u20B9", Number(product.salesRate || 0).toFixed(2)] }), _jsxs("td", { className: "px-4 py-3.5 text-sm text-right font-medium", children: ["\u20B9", Number(product.mrp || 0).toFixed(2)] }), _jsx("td", { className: "px-4 py-3.5 text-sm text-right", children: _jsx("span", { className: `font-semibold ${Number(product.currentStock || 0) <= Number(product.reorderLevel || 0) ? 'text-amber-600' : 'text-emerald-600'}`, children: Number(product.currentStock || 0).toFixed(0) }) }), _jsx("td", { className: "px-4 py-3.5 text-center", children: product.isActive !== false ? (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400", children: [_jsx(CheckCircle2, { className: "h-3 w-3" }), " Active"] })) : (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400", children: [_jsx(XCircle, { className: "h-3 w-3" }), " Inactive"] })) }), _jsx("td", { className: "px-4 py-3.5 text-right", children: deleteConfirmId === product.id ? (_jsxs("div", { className: "flex items-center justify-end gap-1.5", children: [_jsx("span", { className: "text-[10px] text-muted-foreground", children: "Confirm?" }), _jsx("button", { onClick: () => handleDelete(product.id), className: "rounded-lg bg-red-500 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-red-600", children: "Delete" }), _jsx("button", { onClick: () => setDeleteConfirmId(null), className: "rounded-lg border px-2.5 py-1.5 text-[11px] font-medium hover:bg-muted", children: "Cancel" })] })) : (_jsxs("div", { className: "flex items-center justify-end gap-0.5", children: [_jsx("button", { onClick: () => navigate(`/inventory/products/${product.id}`), className: "rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all", title: "View Details", children: _jsx(Eye, { className: "h-4 w-4" }) }), _jsx("button", { onClick: () => handleDuplicate(product.id), className: "rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all", title: "Duplicate", children: _jsx(Copy, { className: "h-4 w-4" }) }), _jsx("button", { onClick: () => navigate(`/inventory/items/${product.id}/edit`), className: "rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-blue-600 transition-all", title: "Edit", children: _jsx(Pencil, { className: "h-4 w-4" }) }), _jsx("button", { onClick: () => setDeleteConfirmId(product.id), className: "rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-red-600 transition-all", title: "Delete", children: _jsx(Trash2, { className: "h-4 w-4" }) })] })) })] }, product.id)))) })] }) }), totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-between border-t px-4 py-3", children: [_jsxs("p", { className: "text-sm text-muted-foreground", children: ["Showing ", Math.min((page - 1) * pageSize + 1, total), "\u2013", Math.min(page * pageSize, total), " of ", total] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => setPage(Math.max(1, page - 1)), disabled: page <= 1, className: "rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-muted disabled:opacity-40", children: "\u2190 Prev" }), Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const start = Math.max(1, page - 2);
                                        const p = start + i;
                                        if (p > totalPages) {
                                            return null;
                                        }
                                        return (_jsx("button", { onClick: () => setPage(p), className: `rounded-lg px-3 py-1.5 text-sm font-medium transition ${p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`, children: p }, p));
                                    }), _jsx("button", { onClick: () => setPage(Math.min(totalPages, page + 1)), disabled: page >= totalPages, className: "rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-muted disabled:opacity-40", children: "Next \u2192" })] })] }))] })] }));
}
//# sourceMappingURL=products.js.map