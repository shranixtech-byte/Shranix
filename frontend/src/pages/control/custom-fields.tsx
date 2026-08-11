import { Loader2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { customFieldApi, type CustomField } from '@/services/control.service';

const MODULES = [
  'sales',
  'purchase',
  'customer',
  'supplier',
  'product',
  'asset',
  'expense',
  'hr',
  'crm',
];
const FIELD_TYPES = [
  'text',
  'number',
  'decimal',
  'date',
  'boolean',
  'dropdown',
  'multi_select',
  'file',
  'long_text',
];

const inputCls =
  'border-border bg-card w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-primary/50';

export function CustomFieldsPage() {
  const [rows, setRows] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [form, setForm] = useState<any>({
    fieldCode: '',
    fieldName: '',
    module: 'customer',
    documentType: 'customer',
    fieldType: 'text',
    isRequired: false,
    options: '',
    sortOrder: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customFieldApi.list(module || undefined);
      setRows(res || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [module]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    try {
      const payload = {
        ...form,
        options:
          form.fieldType === 'dropdown' || form.fieldType === 'multi_select'
            ? String(form.options)
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
            : undefined,
      };
      if (editing) {
        await customFieldApi.update(editing.id, payload);
      } else {
        await customFieldApi.create(payload);
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    }
  };

  const remove = async (f: CustomField) => {
    if (!window.confirm(`Delete field "${f.fieldName}"?`)) {
      return;
    }
    try {
      await customFieldApi.remove(f.id);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    }
  };

  const editField = (f: CustomField) => {
    setEditing(f);
    setForm({
      fieldCode: f.fieldCode,
      fieldName: f.fieldName,
      module: f.module,
      documentType: f.documentType,
      fieldType: f.fieldType,
      isRequired: f.isRequired,
      options: Array.isArray(f.options) ? f.options.join(', ') : f.options || '',
      sortOrder: f.sortOrder || 0,
    });
    setShowForm(true);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Custom Fields</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Extensible fields — no schema changes required
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={module}
            onChange={(e) => setModule(e.target.value)}
            className="border-border bg-card rounded-lg border px-2 py-1.5 text-xs outline-none"
          >
            <option value="">All modules</option>
            {MODULES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New field
          </button>
          <button
            onClick={() => void load()}
            className="border-border hover:border-primary/40 text-muted-foreground rounded-lg border p-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-card mt-4 rounded-xl border p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">
            {editing ? 'Edit field' : 'New custom field'}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Field code *
              </span>
              <input
                value={form.fieldCode}
                onChange={(e) => set('fieldCode', e.target.value)}
                className={inputCls}
                placeholder="e.g. farmer_id"
              />
            </label>
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Field name *
              </span>
              <input
                value={form.fieldName}
                onChange={(e) => set('fieldName', e.target.value)}
                className={inputCls}
                placeholder="Farmer ID"
              />
            </label>
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Module
              </span>
              <select
                value={form.module}
                onChange={(e) => set('module', e.target.value)}
                className={inputCls}
              >
                {MODULES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Document type
              </span>
              <input
                value={form.documentType}
                onChange={(e) => set('documentType', e.target.value)}
                className={inputCls}
                placeholder="customer"
              />
            </label>
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Field type
              </span>
              <select
                value={form.fieldType}
                onChange={(e) => set('fieldType', e.target.value)}
                className={inputCls}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Sort order
              </span>
              <input
                type="number"
                value={form.sortOrder ?? 0}
                onChange={(e) => set('sortOrder', Number(e.target.value))}
                className={inputCls}
              />
            </label>
            {(form.fieldType === 'dropdown' || form.fieldType === 'multi_select') && (
              <label className="block sm:col-span-2">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  Options (comma-separated)
                </span>
                <input
                  value={form.options || ''}
                  onChange={(e) => set('options', e.target.value)}
                  className={inputCls}
                  placeholder="Option A, Option B, Option C"
                />
              </label>
            )}
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.isRequired}
                onChange={(e) => set('isRequired', e.target.checked)}
                className="accent-primary"
              />
              Required field
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2 border-t pt-4">
            <button
              onClick={() => setShowForm(false)}
              className="border-border text-muted-foreground hover:border-primary/40 rounded-lg border px-4 py-2 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => void save()}
              disabled={!form.fieldCode || !form.fieldName}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {editing ? 'Save changes' : 'Create field'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Module</th>
              <th className="px-4 py-3 font-medium">Document</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Required</th>
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
                  No custom fields defined
                </td>
              </tr>
            ) : (
              rows.map((f) => (
                <tr
                  key={f.id}
                  className="border-border hover:bg-muted/30 border-t transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium">{f.fieldCode}</td>
                  <td className="px-4 py-3 font-medium">{f.fieldName}</td>
                  <td className="text-muted-foreground px-4 py-3 text-xs capitalize">{f.module}</td>
                  <td className="text-muted-foreground px-4 py-3 text-xs">{f.documentType}</td>
                  <td className="px-4 py-3 text-xs capitalize">{f.fieldType.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-xs">{f.isRequired ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => editField(f)}
                        className="text-primary hover:bg-primary/5 rounded-md px-2 py-1 text-[11px] font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void remove(f)}
                        className="rounded-md p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
