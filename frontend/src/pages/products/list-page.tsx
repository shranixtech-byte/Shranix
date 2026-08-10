import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Package,
  PackagePlus,
  Pencil,
  Printer,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  bulkDeleteProducts,
  bulkProductStatus,
  downloadProducts,
  getFormMasters,
  importProducts,
  listProducts,
  productStatusBadge,
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  type FormMasters,
  type ProductRecord,
} from '@/services/product-master.service';

const PAGE_SIZE = 25;

function formatCurrency(v: number | undefined): string {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function ProductsListPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProductRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  // Selection + bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // Reference data
  const [masters, setMasters] = useState<FormMasters | null>(null);

  // Import
  const importMode = 'upsert';
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProducts({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        type: type || undefined,
        status: status || undefined,
      });
      setRows(res.data || []);
      setTotal(res.total || 0);
      setSelected((prev) => {
        const ids = new Set(res.data.map((r) => r.id));
        return new Set([...prev].filter((id) => ids.has(id)));
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, categoryId, brandId, type, status]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    void getFormMasters()
      .then(setMasters)
      .catch(() => undefined);
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === rows.length) {
        return new Set();
      }
      return new Set(rows.map((r) => r.id));
    });
  };

  const runBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) {
      return;
    }
    setBusy('status');
    try {
      const res = await bulkProductStatus([...selected], bulkStatus as any);
      setImportResult(`${res.updated} products updated to ${bulkStatus}`);
      setBulkStatus('');
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const runBulkDelete = async () => {
    if (
      selected.size === 0 ||
      !window.confirm(
        `Delete ${selected.size} product(s)? Products with transaction history are skipped.`,
      )
    ) {
      return;
    }
    setBusy('delete');
    try {
      const res = await bulkDeleteProducts([...selected]);
      setImportResult(`${res.deleted} deleted · ${res.failed} blocked (transaction history)`);
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onExport = async (format: 'csv' | 'xlsx') => {
    try {
      await downloadProducts(format);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onImportFile = async (file: File) => {
    setImportBusy(true);
    setImportResult(null);
    setError(null);
    try {
      const res = await importProducts(file, importMode);
      setImportResult(
        `Import: ${res.imported} created · ${res.updated} updated · ${res.skipped} skipped · ${res.errors.length} errors`,
      );
      if (res.errors.length > 0) {
        setError(
          `Errors on rows: ${res.errors
            .slice(0, 3)
            .map((e) => `#${e.row} ${e.message}`)
            .join('; ')}${res.errors.length > 3 ? ` +${res.errors.length - 3} more` : ''}`,
        );
      }
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImportBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Product Master
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {total} products · उत्पाद सूची
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            icon={<Download className="h-4 w-4" />}
            onClick={() => onExport('csv')}
          >
            CSV
          </Button>
          <Button
            variant="secondary"
            icon={<FileSpreadsheet className="h-4 w-4" />}
            onClick={() => onExport('xlsx')}
          >
            Excel
          </Button>
          <Button
            variant="secondary"
            icon={<Printer className="h-4 w-4" />}
            onClick={() => window.print()}
          >
            Print
          </Button>
          <Button
            variant="secondary"
            icon={
              importBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )
            }
            disabled={importBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            {importBusy ? 'Importing…' : 'Import'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                void onImportFile(f);
              }
            }}
          />
          <Button
            icon={<PackagePlus className="h-4 w-4" />}
            onClick={() => navigate('/products/create')}
          >
            New Product
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      {importResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          {importResult}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code / SKU / name / barcode / HSN…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">All Categories</option>
            {(masters?.categories || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">All Brands</option>
            {(masters?.brands || []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">All Types</option>
            {PRODUCT_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">All Status</option>
            {PRODUCT_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-900/20">
            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              {selected.size} selected
            </span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Set status…</option>
              {PRODUCT_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              disabled={!bulkStatus || busy === 'status'}
              onClick={runBulkStatus}
            >
              {busy === 'status' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
            </Button>
            <Button variant="danger" size="sm" disabled={busy === 'delete'} onClick={runBulkDelete}>
              {busy === 'delete' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.size === rows.length && rows.length > 0}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">HSN</th>
              <th className="px-4 py-3 text-right">MRP</th>
              <th className="px-4 py-3 text-right">Selling</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center text-sm text-slate-400">
                  <Package className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                  No products found
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((p) => (
                <tr key={p.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-left" onClick={() => navigate(`/products/${p.id}`)}>
                      <div className="font-medium text-slate-800 hover:text-emerald-600 dark:text-slate-100">
                        {p.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {p.productCode || '—'} · {p.sku}
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {p.categoryName || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {p.brandName || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {p.hsnCode || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                    {formatCurrency(p.mrp)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-100">
                    {formatCurrency(p.salesRate)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        p.stockStatus === 'out_of_stock'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : p.stockStatus === 'low_stock'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                      )}
                    >
                      {formatCurrency(p.currentStock).replace('₹', '')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        productStatusBadge(p.status),
                      )}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="View"
                        onClick={() => navigate(`/products/${p.id}`)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        title="Edit"
                        onClick={() => navigate(`/products/${p.id}/edit`)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Page {page} of {totalPages} · {total} products
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
