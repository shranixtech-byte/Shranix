import {
  Search,
  Plus,
  Download,
  Copy,
  Eye,
  Pencil,
  Trash2,
  X,
  Filter,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Package,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiRequest } from '@/services/api-client';

interface Product {
  id: string;
  name: string;
  sku: string;
  productCode?: string;
  hsnCode?: string;
  barcode?: string;
  qrCode?: string;
  categoryId?: string;
  subCategoryId?: string;
  brandId?: string;
  unitId?: string;
  packSize?: string;
  manufacturer?: string;
  supplierId?: string;
  purchaseRate?: number;
  salesRate?: number;
  mrp?: number;
  gstRateId?: string;
  currentStock?: number;
  reorderLevel?: number;
  isActive?: boolean;
  isDeleted?: boolean;
  type?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function ProductsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const result: any = await apiRequest(`/inventory/items?${params}`);
      const records = ((result as any).data || result || []) as Product[];
      setData(Array.isArray(records) ? records : []);
      setTotal((result as any).total || (Array.isArray(records) ? records.length : 0));
      setTotalPages((result as any).totalPages || 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    let filtered = data;
    if (statusFilter === 'active') {
      filtered = filtered.filter((p) => p.isActive !== false);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((p) => p.isActive === false);
    }
    return filtered;
  }, [data, statusFilter]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/inventory/items/${id}`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      void fetchData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await apiRequest(`/inventory/items/${id}/duplicate`, { method: 'POST' });
      void fetchData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleExport = () => {
    // CSV export — build from filteredData
    const headers = [
      'Name',
      'SKU',
      'Product Code',
      'HSN',
      'Category',
      'Brand',
      'Unit',
      'Purchase Rate',
      'Sales Rate',
      'MRP',
      'Stock',
      'Status',
    ];
    const rows = filteredData.map((p) => [
      p.name,
      p.sku,
      p.productCode || '',
      p.hsnCode || '',
      p.categoryId || '',
      p.brandId || '',
      p.unitId || '',
      p.purchaseRate || 0,
      p.salesRate || 0,
      p.mrp || 0,
      p.currentStock || 0,
      p.isActive ? 'Active' : 'Inactive',
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

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="text-muted-foreground h-3 w-3" />;
    }
    return sortDir === 'asc' ? (
      <ChevronUp className="text-primary h-3 w-3" />
    ) : (
      <ChevronDown className="text-primary h-3 w-3" />
    );
  };

  return (
    <div className="animate-in fade-in space-y-6 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Enterprise product master with stock, pricing, GST, batch/serial tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="bg-card hover:bg-muted inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98]"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            onClick={() => navigate('/inventory/items/create')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}{' '}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, SKU, barcode, category..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-background focus:border-primary focus:ring-primary h-10 w-full rounded-xl border pl-10 pr-4 text-sm outline-none transition-all focus:ring-1"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background focus:border-primary focus:ring-primary h-10 cursor-pointer appearance-none rounded-xl border px-3 pr-8 text-sm outline-none transition-all focus:ring-1"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Filter className="text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="text-muted-foreground px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                  #
                </th>
                <th
                  className="text-muted-foreground hover:text-foreground cursor-pointer select-none px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                  onClick={() => handleSort('name')}
                >
                  <span className="inline-flex items-center gap-1">
                    Product Name <SortIcon field="name" />
                  </span>
                </th>
                <th
                  className="text-muted-foreground hover:text-foreground cursor-pointer select-none px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                  onClick={() => handleSort('sku')}
                >
                  <span className="inline-flex items-center gap-1">
                    SKU <SortIcon field="sku" />
                  </span>
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                  HSN
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider">
                  Purchase ₹
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider">
                  Sales ₹
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider">
                  MRP
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider">
                  Stock
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider">
                  Status
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="bg-muted h-5 animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <Package className="text-muted-foreground/50 mx-auto h-10 w-10" />
                    <p className="text-muted-foreground mt-3 text-sm font-medium">
                      No products found
                    </p>
                    <p className="text-muted-foreground/60 text-xs">
                      Create your first product to get started
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((product, idx) => (
                  <tr key={product.id} className="hover:bg-muted/20 transition-colors">
                    <td className="text-muted-foreground px-4 py-3.5 text-sm">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => navigate(`/inventory/products/${product.id}`)}
                        className="text-foreground hover:text-primary text-sm font-medium transition-colors"
                      >
                        {product.name || '—'}
                      </button>
                    </td>
                    <td className="text-muted-foreground px-4 py-3.5 font-mono text-sm">
                      {product.sku || '—'}
                    </td>
                    <td className="text-muted-foreground px-4 py-3.5 text-sm">
                      {product.hsnCode || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-medium">
                      ₹{Number(product.purchaseRate || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-medium">
                      ₹{Number(product.salesRate || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-medium">
                      ₹{Number(product.mrp || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm">
                      <span
                        className={`font-semibold ${Number(product.currentStock || 0) <= Number(product.reorderLevel || 0) ? 'text-amber-600' : 'text-emerald-600'}`}
                      >
                        {Number(product.currentStock || 0).toFixed(0)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {product.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {deleteConfirmId === product.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-muted-foreground text-[10px]">Confirm?</span>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="rounded-lg bg-red-500 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-red-600"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="hover:bg-muted rounded-lg border px-2.5 py-1.5 text-[11px] font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => navigate(`/inventory/products/${product.id}`)}
                            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2 transition-all"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(product.id)}
                            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2 transition-all"
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/inventory/items/${product.id}/edit`)}
                            className="text-muted-foreground hover:bg-muted rounded-lg p-2 transition-all hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(product.id)}
                            className="text-muted-foreground hover:bg-muted rounded-lg p-2 transition-all hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-muted-foreground text-sm">
              Showing {Math.min((page - 1) * pageSize + 1, total)}–
              {Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="hover:bg-muted rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, page - 2);
                const p = start + i;
                if (p > totalPages) {
                  return null;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="hover:bg-muted rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40"
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
