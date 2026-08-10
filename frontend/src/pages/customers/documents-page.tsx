import { ArrowLeft, FileText, FileUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import {
  createDocument,
  deleteDocument,
  getCustomer,
  listDocuments,
  DOC_TYPES,
  type CustomerDocument,
} from '@/services/customer-master.service';

import { Field, SelectInput, TextInput } from './components';

const emptyDoc = {
  docType: 'other' as CustomerDocument['docType'],
  fileName: '',
  fileUrl: '',
  fileSize: 0,
  mimeType: '',
  notes: '',
};

export function CustomerDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState('');
  const [docs, setDocs] = useState<CustomerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDoc);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    try {
      const [c, list] = await Promise.all([getCustomer(id), listDocuments(id)]);
      setCustomerName(c.name);
      setDocs(list || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveDoc = async () => {
    if (!id) {
      return;
    }
    if (!draft.fileName.trim()) {
      setError('Document name is required');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const created = await createDocument(id, {
        docType: draft.docType,
        fileName: draft.fileName,
        fileUrl: draft.fileUrl || undefined,
        fileSize: draft.fileSize,
        mimeType: draft.mimeType || undefined,
        notes: draft.notes || undefined,
      });
      setDocs((prev) => [...prev, created]);
      setDraft(emptyDoc);
      setShowForm(false);
      setNotice('Document added');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const removeDoc = async (d: CustomerDocument) => {
    if (!id) {
      return;
    }
    if (!window.confirm(`Delete document "${d.fileName}"?`)) {
      return;
    }
    try {
      await deleteDocument(id, d.id);
      setDocs((prev) => prev.filter((x) => x.id !== d.id));
      setNotice('Document deleted');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(`/customers/${id}`)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400"
      >
        <ArrowLeft className="h-4 w-4" /> {customerName || 'Customer'}
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Documents
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {customerName} — GST certificate, PAN, agreements & licenses
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowForm((v) => !v)}>
          Add Document
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-800 dark:bg-emerald-900/10">
          <p className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            <FileUp className="h-4 w-4" /> Register a document
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Document Type">
              <SelectInput
                value={draft.docType}
                onChange={(e) => setDraft({ ...draft, docType: e.target.value as any })}
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="File Name" required>
              <TextInput
                value={draft.fileName}
                onChange={(e) => setDraft({ ...draft, fileName: e.target.value })}
                placeholder="GST certificate.pdf"
              />
            </Field>
            <Field label="File URL / Reference">
              <TextInput
                value={draft.fileUrl}
                onChange={(e) => setDraft({ ...draft, fileUrl: e.target.value })}
                placeholder="Link to stored file (optional)"
              />
            </Field>
            <Field label="MIME Type">
              <TextInput
                value={draft.mimeType}
                onChange={(e) => setDraft({ ...draft, mimeType: e.target.value })}
                placeholder="application/pdf"
              />
            </Field>
            <Field label="Size (bytes)">
              <TextInput
                type="number"
                min={0}
                value={String(draft.fileSize || '')}
                onChange={(e) => setDraft({ ...draft, fileSize: Number(e.target.value) })}
                placeholder="0"
              />
            </Field>
            <Field label="Notes">
              <TextInput
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Remarks"
              />
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button size="sm" loading={saving} onClick={saveDoc}>
              Save Document
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
          </div>
        ) : docs.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-500">No documents uploaded</p>
            <p className="mt-1 text-xs text-slate-400">
              Add GST certificates, PAN, agreements or licenses
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-700/30"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {d.fileName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    <span className="capitalize">{d.docType.replace(/_/g, ' ')}</span>
                    {d.fileSize ? ` · ${(d.fileSize / 1024).toFixed(1)} KB` : ''}
                    {d.mimeType ? ` · ${d.mimeType}` : ''}
                    {d.createdAt ? ` · ${new Date(d.createdAt).toLocaleDateString()}` : ''}
                  </p>
                  {d.notes && (
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {d.notes}
                    </p>
                  )}
                </div>
                {d.fileUrl && (
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-emerald-600 hover:underline"
                  >
                    Open
                  </a>
                )}
                <button
                  onClick={() => removeDoc(d)}
                  className="text-slate-400 transition-colors hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
