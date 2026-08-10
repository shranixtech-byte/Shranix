import { ArrowLeft, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Field, SelectInput, TextInput } from '@/components/party/party-ui';
import { Button } from '@/components/ui/Button';
import type { PartyDocument } from '@/services/party-master.types';
import {
  createSupplierDocument,
  deleteSupplierDocument,
  getSupplier,
  listSupplierDocuments,
  SUPPLIER_DOC_TYPES,
} from '@/services/supplier-master.service';

export function SupplierDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<any>(null);
  const [docs, setDocs] = useState<PartyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [docType, setDocType] = useState('gst_certificate');
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [s, d] = await Promise.all([getSupplier(id), listSupplierDocuments(id)]);
      setSupplier(s);
      setDocs(d || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!id) {
      return;
    }
    if (!fileName.trim()) {
      setError('File name is required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createSupplierDocument(id, {
        docType,
        fileName: fileName.trim(),
        notes: notes.trim() || undefined,
      });
      setFileName('');
      setNotes('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (documentId: string) => {
    if (!id) {
      return;
    }
    if (!window.confirm('Delete this document record?')) {
      return;
    }
    try {
      await deleteSupplierDocument(id, documentId);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/suppliers/${id}`)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Supplier Documents
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {supplier?.code} · {supplier?.name} — GST certificate, PAN, licences…
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Add form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Record Document
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Document Type">
            <SelectInput value={docType} onChange={(e) => setDocType(e.target.value)}>
              {SUPPLIER_DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="File Name" required>
            <TextInput
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="gst-certificate.pdf"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <TextInput
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reference / validity notes"
              />
            </Field>
          </div>
        </div>
        <div className="mt-4">
          <Button icon={<Plus className="h-4 w-4" />} loading={busy} onClick={add}>
            Add Document
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="grid gap-4 sm:grid-cols-2">
        {docs.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-400 dark:border-slate-700">
            No documents recorded yet
          </div>
        )}
        {docs.map((d) => (
          <div
            key={d.id}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {d.fileName}
              </p>
              <p className="text-[11px] capitalize text-slate-400">
                {d.docType.replace(/_/g, ' ')}
              </p>
              {d.notes && <p className="mt-1 text-xs text-slate-500">{d.notes}</p>}
              {d.fileSize ? (
                <p className="mt-1 text-[10px] text-slate-400">
                  {(d.fileSize / 1024).toFixed(1)} KB ·{' '}
                  {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ''}
                </p>
              ) : null}
            </div>
            <button
              onClick={() => remove(d.id)}
              title="Delete document"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
