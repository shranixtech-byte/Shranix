import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  bulkDeleteCustomers,
  bulkCustomerStatus,
  downloadCustomers,
  importCustomersFile,
  listCategories,
  listCustomers,
  listGroups,
  type CustomerCategory,
  type CustomerGroup,
  type CustomerRecord,
} from '@/services/customer-master.service';

import { CustomerAvatar, SelectInput, StatusBadge, TextInput } from './components';

const PAGE_SIZE = 25;

function formatCurrency(v: number | undefined): string {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

type SortKey = 'name' | 'customerCode' | 'status' | 'creditLimit';

export function CustomersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CustomerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [groupId, setGroupId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Selection + bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // Reference data
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [categories, setCategories] = useState<CustomerCategory[]>([]);

  // Import
  const [importMode, setImportMode] = useState<'upsert' | 'insert'>('upsert');
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCustomers({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: status || undefined,
        groupId: groupId || undefined,
        categoryId: categoryId || undefined,
        sortBy,
        sortDir,
        withProfile: true,
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
  }, [page, debouncedSearch, status, groupId, categoryId, sortBy, sortDir]);

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
    void listGroups()
      .then(setGroups)
      .catch(() => undefined);
    void listCategories()
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleRow = (id: string) => {
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

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleAll = () => {
    setSelected(() => {
      if (allSelected) {
        return new Set();
      }
      return new Set(rows.map((r) => r.id));
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) {
      return;
    }
    if (!window.confirm(`Set ${selected.size} customer(s) status to "${bulkStatus}"?`)) {
      return;
    }
    setBusy('status');
    try {
      const res = await bulkCustomerStatus([...selected], bulkStatus as any);
      setBulkStatus('');
      setSelected(new Set());
      setError(null);
      setImportResult(`✅ Bulk status: ${res.updated} updated, ${res.failed} failed`);
      void fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) {
      return;
    }
    if (
      !window.confirm(
        `Delete ${selected.size} customer(s)? Customers with invoices will be skipped. This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy('delete');
    try {
      const res = await bulkDeleteCustomers([...selected]);
      setSelected(new Set());
      setImportResult(`🗑️ Deleted: ${res.deleted}, failed: ${res.failed}`);
      void fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      await downloadCustomers(format);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleImport = async (file: File | null) => {
    if (!file) {
      return;
    }
    setImportBusy(true);
    setError(null);
    setImportResult(null);
    try {
      const res = await importCustomersFile(file, importMode);
      setImportResult(
        `📥 Import complete — added ${res.imported}, updated ${res.updated}, skipped ${res.skipped}, errors ${res.errors?.length || 0}`,
      );
      void fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImportBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const groupName = useMemo(() => {
    const map = new Map(groups.map((g) => [g.id, g.name]));
    return (id?: string | null) => (id ? map.get(id) || '' : '');
  }, [groups]);

  return (
    <div className="space-y-6 print:p-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Customers
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Customer Master — search, filter, export & bulk manage
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            icon={<Users className="h-4 w-4" />}
            onClick={() => navigate('/customers/dashboard')}
          >
            Dashboard
          </Button>
          <Button
            variant="secondary"
            icon={<Wallet className="h-4 w-4" />}
            onClick={() => navigate('/customers/outstanding')}
          >
            Outstanding
          </Button>
          <Button
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => navigate('/customers/create')}
          >
            New Customer
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 print:hidden">
          {error}
        </div>
      )}
      {importResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 print:hidden">
          {importResult}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <TextInput
            type="text"
            placeholder="Search name, mobile, GSTIN, code, firm…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <SelectInput
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-32"
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
        </SelectInput>
        <SelectInput
          value={groupId}
          onChange={(e) => {
            setGroupId(e.target.value);
            setPage(1);
          }}
          className="w-36"
        >
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className="w-36"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as SortKey);
            setPage(1);
          }}
          className="w-40"
        >
          <option value="name">Sort: Name</option>
          <option value="customerCode">Sort: Code</option>
          <option value="status">Sort: Status</option>
          <option value="creditLimit">Sort: Credit Limit</option>
        </SelectInput>
        <Button
          variant="ghost"
          icon={<RefreshCw className="h-4 w-4" />}
          onClick={() => {
            setSearch('');
            setStatus('');
            setGroupId('');
            setCategoryId('');
            setPage(1);
          }}
        >
          Reset
        </Button>
      </div>

      {/* Export / Import bar */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button
          variant="secondary"
          size="sm"
          icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
          onClick={() => handleExport('xlsx')}
        >
          Excel
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<FileText className="h-3.5 w-3.5" />}
          onClick={() => handleExport('csv')}
        >
          CSV
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Printer className="h-3.5 w-3.5" />}
          onClick={handlePrint}
        >
          Print
        </Button>
        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
        <SelectInput
          value={importMode}
          onChange={(e) => setImportMode(e.target.value as 'upsert' | 'insert')}
          className="h-8 w-44 text-xs"
        >
          <option value="upsert">Import: update + add</option>
          <option value="insert">Import: add only</option>
        </SelectInput>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {importBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Import Excel / CSV
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.json"
            className="hidden"
            onChange={(e) => handleImport(e.target.files?.[0] || null)}
          />
        </label>
        <span className="text-xs text-slate-400">{total} customers</span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 dark:border-emerald-800 dark:bg-emerald-900/20 print:hidden">
          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            {selected.size} selected
          </span>
          <SelectInput
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="h-8 w-36 text-xs"
          >
            <option value="">Set status…</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </SelectInput>
          <Button
            size="sm"
            variant="secondary"
            icon={<Ban className="h-3.5 w-3.5" />}
            disabled={!bulkStatus || busy !== null}
            loading={busy === 'status'}
            onClick={handleBulkStatus}
          >
            Apply
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            disabled={busy !== null}
            loading={busy === 'delete'}
            onClick={handleBulkDelete}
          >
            Delete
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  />
                </th>
                {(
                  [
                    { key: 'customerCode' as SortKey, label: 'Code', className: 'w-28' },
                    { key: 'name' as SortKey, label: 'Customer', className: 'min-w-[200px]' },
                    { key: 'status' as SortKey, label: 'Status', className: 'w-24' },
                  ] as const
                ).map((col) => (
                  <th key={col.key} className={cn('px-4 py-3 font-semibold', col.className)}>
                    <button
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-emerald-600"
                    >
                      {col.label}
                      {sortBy === col.key && (
                        <span className="text-emerald-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold">Mobile</th>
                <th className="px-4 py-3 font-semibold">GSTIN</th>
                <th className="px-4 py-3 font-semibold">Group</th>
                <th className="px-4 py-3 text-right font-semibold">
                  <button
                    onClick={() => handleSort('creditLimit')}
                    className="inline-flex items-center gap-1 hover:text-emerald-600"
                  >
                    Credit Limit{' '}
                    {sortBy === 'creditLimit' && (
                      <span className="text-emerald-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-semibold">Outstanding</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-600" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <Users className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-500">No customers found</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Try adjusting your filters or create a new customer
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-emerald-50/40 dark:hover:bg-slate-700/30"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleRow(c.id)}
                        className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                        {c.code || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CustomerAvatar name={c.name} size="sm" />
                        <div className="min-w-0">
                          <button
                            onClick={() => navigate(`/customers/${c.id}`)}
                            className="block max-w-[220px] truncate text-sm font-semibold text-slate-800 hover:text-emerald-600 dark:text-slate-100"
                          >
                            {c.name}
                          </button>
                          <p className="max-w-[220px] truncate text-[11px] text-slate-400">
                            {c.firmName || c.customerType || c.email || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      {c.mobile || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {c.gstin || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      {groupName(c.groupId) || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-slate-700 dark:text-slate-200">
                      {formatCurrency(c.creditLimit)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          (c.outstanding || 0) > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-400',
                        )}
                      >
                        {formatCurrency(c.outstanding)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <IconBtn title="View" onClick={() => navigate(`/customers/${c.id}`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn title="Edit" onClick={() => navigate(`/customers/${c.id}/edit`)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          title="Ledger 360°"
                          onClick={() => navigate(`/sales/customer-ledger?customerId=${c.id}`)}
                        >
                          <Wallet className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          title="Documents"
                          onClick={() => navigate(`/customers/${c.id}/documents`)}
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-700 print:hidden">
          <span className="text-xs text-slate-400">
            Page {page} of {totalPages} · {total} customers
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft className="h-3.5 w-3.5" />}
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-700"
    >
      {children}
    </button>
  );
}
