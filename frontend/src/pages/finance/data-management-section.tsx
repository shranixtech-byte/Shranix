import {
  AlertCircle,
  Archive as ArchiveIcon,
  Check,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  HardDrive,
  Loader2,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { apiRequest, apiUrl } from '@/services/api-client';
import { authService } from '@/services/auth.service';

import { ErrorBanner, SectionCard } from './settings-ui';

const EXPORT_ENTITIES = [
  { key: 'customers', label: 'Customers', hint: 'ग्राहक' },
  { key: 'suppliers', label: 'Suppliers', hint: 'पुरवठादार' },
  { key: 'products', label: 'Products', hint: 'उत्पादने' },
];

const ARCHIVE_ENTITIES = [
  { key: 'salesInvoices', label: 'Sales Invoices', hint: 'विक्री इनव्हॉइस' },
  { key: 'purchaseInvoices', label: 'Purchase Invoices', hint: 'खरेदी इनव्हॉइस' },
  { key: 'journalEntries', label: 'Journal Entries', hint: 'जर्नल नोंदी' },
];

interface DeletedOverview {
  total: number;
  entities: { key: string; label: string; count: number }[];
}

interface DeletedList {
  count: number;
  rows: { id: string; displayName: string; deletedAt: string | null; updatedAt: string | null }[];
}

interface ImportResult {
  entity?: string;
  mode?: string;
  imported?: number;
  updated?: number;
  skipped?: number;
  errors?: { row: number; message: string }[];
  success?: boolean;
  message?: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(v: string | null | undefined): string {
  if (!v) {
    return '—';
  }
  return new Date(v).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DataManagementSection() {
  // ── Export ────────────────────────────────────────────────
  const [exportEntity, setExportEntity] = useState('customers');
  const [exportBusy, setExportBusy] = useState(false);

  // ── Import ────────────────────────────────────────────────
  const [importEntity, setImportEntity] = useState('customers');
  const [importMode, setImportMode] = useState<'upsert' | 'insert'>('upsert');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Deleted records ───────────────────────────────────────
  const [deletedOverview, setDeletedOverview] = useState<DeletedOverview | null>(null);
  const [deletedEntity, setDeletedEntity] = useState('customers');
  const [deletedList, setDeletedList] = useState<DeletedList>({ count: 0, rows: [] });
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  // ── Cleanup ───────────────────────────────────────────────
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<Record<string, unknown> | null>(null);

  // ── Archive ───────────────────────────────────────────────
  const [archiveEntity, setArchiveEntity] = useState('salesInvoices');
  const [archiveDate, setArchiveDate] = useState('');
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveResult, setArchiveResult] = useState<Record<string, unknown> | null>(null);

  const [error, setError] = useState<string | null>(null);

  const downloadFile = useCallback(async (url: string, fallbackName: string) => {
    const token = authService.getAccessToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`Download failed (${res.status})`);
    }
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fallbackName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }, []);

  // ── Export handlers ───────────────────────────────────────
  const handleExport = async (format: 'excel' | 'csv' | 'json') => {
    setExportBusy(true);
    setError(null);
    try {
      const ext = format === 'excel' ? 'xlsx' : format;
      await downloadFile(
        apiUrl(
          `/data-management/export?entity=${encodeURIComponent(exportEntity)}&format=${format}`,
        ),
        `${exportEntity}-export.${ext}`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExportBusy(false);
    }
  };

  // ── Import handlers ───────────────────────────────────────
  const handleImport = async () => {
    if (!importFile) {
      setError('Select a file to import first');
      return;
    }
    setImportBusy(true);
    setError(null);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('entity', importEntity);
      fd.append('mode', importMode);
      const res = await apiRequest<ImportResult>('/data-management/import', {
        method: 'POST',
        body: fd,
      });
      setImportResult(res);
      setImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadDeletedOverview();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImportBusy(false);
    }
  };

  // ── Deleted records ───────────────────────────────────────
  const loadDeletedOverview = useCallback(async () => {
    try {
      const res = (await apiRequest('/data-management/deleted')) as
        { data?: DeletedOverview } | DeletedOverview;
      const o = (res as { data?: DeletedOverview })?.data ?? (res as DeletedOverview);
      setDeletedOverview(o);
    } catch {
      /* non-fatal — refresh will retry */
    }
  }, []);

  const loadDeletedList = useCallback(async (entity: string) => {
    setDeletedLoading(true);
    setError(null);
    try {
      const res = (await apiRequest(
        `/data-management/deleted/list?entity=${encodeURIComponent(entity)}&limit=50`,
      )) as { data?: DeletedList } | DeletedList;
      const l = (res as { data?: DeletedList })?.data ?? (res as DeletedList);
      setDeletedList({ count: Number(l?.count ?? 0), rows: Array.isArray(l?.rows) ? l.rows : [] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletedLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDeletedOverview();
  }, [loadDeletedOverview]);

  useEffect(() => {
    void loadDeletedList(deletedEntity);
  }, [deletedEntity, loadDeletedList]);

  const handleRestore = async (entity: string, ids?: string[]) => {
    setRowBusy(ids?.length ? ids[0] : 'all');
    setError(null);
    try {
      await apiRequest('/data-management/deleted/restore', {
        method: 'POST',
        body: JSON.stringify({ entity, ids }),
      });
      await Promise.all([loadDeletedOverview(), loadDeletedList(entity)]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRowBusy(null);
    }
  };

  const handlePurge = async (entity: string, ids?: string[]) => {
    const label = ids?.length ? 'this record' : 'all deleted records for this entity';
    if (
      !window.confirm(
        `Permanently delete ${label}?\n\nThis CANNOT be undone — the records will be removed from the database.`,
      )
    ) {
      return;
    }
    setRowBusy(ids?.length ? ids[0] : 'all');
    setError(null);
    try {
      await apiRequest('/data-management/deleted/purge', {
        method: 'POST',
        body: JSON.stringify({ entity, ids }),
      });
      await Promise.all([loadDeletedOverview(), loadDeletedList(entity)]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRowBusy(null);
    }
  };

  // ── Cleanup ───────────────────────────────────────────────
  const handleCleanup = async () => {
    if (
      !window.confirm(
        'Run full cleanup?\n\nThis permanently deletes ALL soft-deleted records and compacts the database (VACUUM). A backup is strongly recommended first. This cannot be undone.',
      )
    ) {
      return;
    }
    setCleanupBusy(true);
    setError(null);
    setCleanupResult(null);
    try {
      const res = await apiRequest<Record<string, unknown>>('/data-management/cleanup', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setCleanupResult(res);
      await Promise.all([loadDeletedOverview(), loadDeletedList(deletedEntity)]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCleanupBusy(false);
    }
  };

  // ── Archive ───────────────────────────────────────────────
  const handleArchive = async () => {
    if (!archiveDate) {
      setError('Choose a cutoff date first');
      return;
    }
    const label = ARCHIVE_ENTITIES.find((e) => e.key === archiveEntity)?.label || '';
    if (
      !window.confirm(
        `Archive ${label} before ${archiveDate}?\n\nClosed (posted/paid/cancelled) records before this date will be saved to an archive file and removed from the working database. A backup is strongly recommended first.`,
      )
    ) {
      return;
    }
    setArchiveBusy(true);
    setError(null);
    setArchiveResult(null);
    try {
      const res = await apiRequest<Record<string, unknown>>('/data-management/archive', {
        method: 'POST',
        body: JSON.stringify({ entity: archiveEntity, beforeDate: archiveDate }),
      });
      setArchiveResult(res);
      await Promise.all([loadDeletedOverview(), loadDeletedList(deletedEntity)]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setArchiveBusy(false);
    }
  };

  const deletedTotal = deletedOverview?.total ?? 0;
  const selectCls =
    'mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800';

  return (
    <div className="space-y-6">
      {/* ── Card 1 — Export Data ─────────────────────────── */}
      <SectionCard
        title="Export Data"
        description="Download master data as Excel, CSV or JSON — Excel मध्ये डाउनलोड करा"
        icon={<Download className="h-5 w-5" />}
        tint="emerald"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Entity</span>
            <select
              value={exportEntity}
              onChange={(e) => setExportEntity(e.target.value)}
              className={selectCls}
            >
              {EXPORT_ENTITIES.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label} ({e.hint})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => handleExport('excel')}
            disabled={exportBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60"
          >
            {exportBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Excel (.xlsx)
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={exportBusy}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-50 active:scale-[0.98] disabled:opacity-60 dark:border-emerald-800 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          >
            <FileText className="h-4 w-4" /> CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={exportBusy}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-50 active:scale-[0.98] disabled:opacity-60 dark:border-emerald-800 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          >
            <FileJson className="h-4 w-4" /> JSON
          </button>
        </div>
      </SectionCard>

      {/* ── Card 2 — Import Data ─────────────────────────── */}
      <SectionCard
        title="Import Data"
        description="Upload an Excel, CSV or JSON file — फाइल अपलोड करून डेटा इम्पोर्ट करा"
        icon={<Upload className="h-5 w-5" />}
        tint="blue"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Entity</span>
            <select
              value={importEntity}
              onChange={(e) => setImportEntity(e.target.value)}
              className={selectCls}
            >
              {EXPORT_ENTITIES.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Mode</span>
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as 'upsert' | 'insert')}
              className={selectCls}
            >
              <option value="upsert">Update existing + add new</option>
              <option value="insert">Add new only (skip duplicates)</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              onClick={() =>
                downloadFile(
                  apiUrl(
                    `/data-management/export?entity=${encodeURIComponent(importEntity)}&format=csv`,
                  ),
                  `${importEntity}-template.csv`,
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <FileText className="h-3.5 w-3.5" /> Download current data as template
            </button>
          </div>
        </div>

        <label
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all ${
            importFile
              ? 'border-emerald-400 bg-emerald-50/60 dark:border-emerald-600 dark:bg-emerald-950/30'
              : 'border-slate-300 bg-slate-50/50 hover:border-emerald-400 hover:bg-emerald-50/40 dark:border-slate-600 dark:bg-slate-800/40 dark:hover:border-emerald-600'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/json"
            className="hidden"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
          />
          {importFile ? (
            <>
              <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {importFile.name}
              </p>
              <p className="text-xs text-slate-400">
                {(importFile.size / 1024).toFixed(1)} KB — click to change
              </p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Click to choose a file (Excel / CSV / JSON)
              </p>
              <p className="text-xs text-slate-400">
                Headers must match the export template. Max 5,000 rows.
              </p>
            </>
          )}
        </label>

        {importResult && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/60">
            {importResult.success === false ||
            (importResult.message && !importResult.imported && !importResult.updated) ? (
              <p className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                <XCircle className="h-4 w-4 shrink-0" /> {importResult.message || 'Import failed'}
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-4">
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center dark:bg-emerald-950/40">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {importResult.imported ?? 0}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-600/70 dark:text-emerald-400/70">
                    Added
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-center dark:bg-blue-950/40">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {importResult.updated ?? 0}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-blue-600/70 dark:text-blue-400/70">
                    Updated
                  </p>
                </div>
                <div className="rounded-lg bg-slate-100 px-3 py-2 text-center dark:bg-slate-800">
                  <p className="text-lg font-bold text-slate-500">{importResult.skipped ?? 0}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Skipped
                  </p>
                </div>
                <div
                  className={`rounded-lg px-3 py-2 text-center ${(importResult.errors?.length || 0) > 0 ? 'bg-rose-50 dark:bg-rose-950/40' : 'bg-slate-100 dark:bg-slate-800'}`}
                >
                  <p
                    className={`text-lg font-bold ${(importResult.errors?.length || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}
                  >
                    {importResult.errors?.length ?? 0}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Errors
                  </p>
                </div>
              </div>
            )}
            {importResult.errors && importResult.errors.length > 0 && (
              <ul className="mt-3 max-h-36 space-y-1 overflow-y-auto rounded-lg bg-rose-50/60 p-3 text-xs text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                {importResult.errors.slice(0, 10).map((e) => (
                  <li key={e.row}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
                {importResult.errors.length > 10 && (
                  <li>…and {importResult.errors.length - 10} more</li>
                )}
              </ul>
            )}
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={handleImport}
            disabled={importBusy || !importFile}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60"
          >
            {importBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {importBusy
              ? 'Importing…'
              : `Import ${EXPORT_ENTITIES.find((e) => e.key === importEntity)?.label || ''}`}
          </button>
        </div>
      </SectionCard>

      {/* ── Card 3 — Deleted Records ─────────────────────── */}
      <SectionCard
        title="Deleted Records"
        description={`${deletedTotal} soft-deleted record${deletedTotal === 1 ? '' : 's'} — restore or permanently purge — हटवलेले रेकॉर्ड`}
        icon={<RotateCcw className="h-5 w-5" />}
        tint="violet"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Entity</span>
            <select
              value={deletedEntity}
              onChange={(e) => setDeletedEntity(e.target.value)}
              className={selectCls}
            >
              {(deletedOverview?.entities || []).map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label} ({e.count})
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end justify-end gap-2">
            <button
              onClick={() => handleRestore(deletedEntity)}
              disabled={rowBusy !== null || deletedList.count === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
            >
              {rowBusy === 'all' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Restore all ({deletedList.count})
            </button>
            <button
              onClick={() => handlePurge(deletedEntity)}
              disabled={rowBusy !== null || deletedList.count === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:border-rose-400 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" /> Purge all
            </button>
          </div>
        </div>

        <div className="mt-4">
          {deletedLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
            </div>
          ) : deletedList.rows.length === 0 ? (
            <p className="rounded-xl bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-400 dark:bg-slate-800/60">
              No deleted{' '}
              {deletedOverview?.entities.find((e) => e.key === deletedEntity)?.label.toLowerCase()}{' '}
              records 🎉
            </p>
          ) : (
            <div className="space-y-2">
              {deletedList.rows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {r.displayName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Deleted {formatDate(r.deletedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => handleRestore(deletedEntity, [r.id])}
                      disabled={rowBusy !== null}
                      title="Restore"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:bg-slate-800 dark:text-emerald-400"
                    >
                      {rowBusy === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handlePurge(deletedEntity, [r.id])}
                      disabled={rowBusy !== null}
                      title="Purge permanently"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-500 transition-colors hover:border-rose-400 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:bg-slate-800 dark:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {error && (
          <div className="mt-3">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}
      </SectionCard>

      {/* ── Card 4 — Database Cleanup ────────────────────── */}
      <SectionCard
        title="Database Cleanup"
        description="Purge deleted records and compact the database — डेटाबेस स्वच्छ करा"
        icon={<HardDrive className="h-5 w-5" />}
        tint="amber"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <p className="font-medium">
              <span className="inline-flex items-center gap-1.5">
                <Trash2 className="h-4 w-4 text-rose-400" />
                {deletedTotal} soft-deleted record{deletedTotal === 1 ? '' : 's'} across all
                entities
              </span>
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
              <Database className="h-3.5 w-3.5" /> Cleanup purges these + runs VACUUM to reclaim
              space
            </p>
            {cleanupResult && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                {String(cleanupResult.message || 'Cleanup complete')}
                {typeof cleanupResult.dbSizeBefore === 'number' &&
                  typeof cleanupResult.dbSizeAfter === 'number' && (
                    <span className="text-slate-400">
                      {' '}
                      — {formatBytes(Number(cleanupResult.dbSizeBefore))} →{' '}
                      {formatBytes(Number(cleanupResult.dbSizeAfter))}
                    </span>
                  )}
              </p>
            )}
          </div>
          <button
            onClick={() => void handleCleanup()}
            disabled={cleanupBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-700 active:scale-[0.98] disabled:opacity-60"
          >
            {cleanupBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <HardDrive className="h-4 w-4" />
            )}
            {cleanupBusy ? 'Cleaning…' : 'Run Full Cleanup'}
          </button>
        </div>
        <p className="mt-3 rounded-xl bg-amber-50/70 px-4 py-2.5 text-[11px] text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
          Recommended: create a Backup first (Backup &amp; Restore tab) — this action cannot be
          undone.
        </p>
      </SectionCard>

      {/* ── Card 5 — Archive Data ────────────────────────── */}
      <SectionCard
        title="Archive Data"
        description="Move old closed transactions to a dated archive file — जुन्या नोंदी आर्काइव्ह करा"
        icon={<ArchiveIcon className="h-5 w-5" />}
        tint="teal"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Entity</span>
            <select
              value={archiveEntity}
              onChange={(e) => setArchiveEntity(e.target.value)}
              className={selectCls}
            >
              {ARCHIVE_ENTITIES.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label} ({e.hint})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Archive before date
            </span>
            <input
              type="date"
              value={archiveDate}
              onChange={(e) => setArchiveDate(e.target.value)}
              className={selectCls}
            />
          </label>
          <div className="flex items-end">
            <button
              onClick={handleArchive}
              disabled={archiveBusy || !archiveDate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 active:scale-[0.98] disabled:opacity-60"
            >
              {archiveBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArchiveIcon className="h-4 w-4" />
              )}
              {archiveBusy ? 'Archiving…' : 'Archive'}
            </button>
          </div>
        </div>
        {archiveResult && (
          <p
            className={`mt-3 flex items-start gap-1.5 text-sm ${Number(archiveResult.archived) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {Number(archiveResult.archived) > 0 ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {String(archiveResult.message || '')}
          </p>
        )}
        <p className="mt-3 text-[11px] text-slate-400">
          Only closed (posted / paid / cancelled) records older than the cutoff date are archived.
          They are saved to <span className="font-mono">data/archives/</span> and hidden from the
          working database — headers can be restored from Deleted Records.
        </p>
      </SectionCard>

      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            void loadDeletedOverview();
            void loadDeletedList(deletedEntity);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
        {error && (
          <div className="flex-1 pl-3">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
