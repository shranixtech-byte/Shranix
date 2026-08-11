import { Loader2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { tagApi, type Tag } from '@/services/control.service';

const COLORS = ['blue', 'green', 'red', 'amber', 'purple', 'pink', 'gray', 'teal'];
const COLOR_CLS: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30',
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30',
  red: 'bg-red-50 text-red-600 dark:bg-red-950/30',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/30',
  pink: 'bg-pink-50 text-pink-600 dark:bg-pink-950/30',
  gray: 'bg-slate-100 text-slate-600 dark:bg-slate-800',
  teal: 'bg-teal-50 text-teal-600 dark:bg-teal-950/30',
};

const inputCls =
  'border-border bg-card w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-primary/50';

export function TagsPage() {
  const [rows, setRows] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [form, setForm] = useState<any>({ tagName: '', tagColor: 'blue', description: '' });
  // Record assignment demo
  const [recType, setRecType] = useState('customer');
  const [recId, setRecId] = useState('');
  const [recTags, setRecTags] = useState<Tag[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tagApi.list();
      setRows(res || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    try {
      if (editing) {
        await tagApi.update(editing.id, form);
      } else {
        await tagApi.create(form);
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    }
  };

  const remove = async (t: Tag) => {
    if (!window.confirm(`Delete tag "${t.tagName}"?`)) {
      return;
    }
    try {
      await tagApi.remove(t.id);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    }
  };

  const loadRecTags = useCallback(async () => {
    if (!recId) {
      setRecTags([]);
      return;
    }
    try {
      const res = await tagApi.recordTags(recType, recId);
      setRecTags(res || []);
    } catch {
      setRecTags([]);
    }
  }, [recType, recId]);

  useEffect(() => {
    void loadRecTags();
  }, [loadRecTags]);

  const assignTag = async (t: Tag) => {
    if (!recId) {
      alert('Enter a record ID first');
      return;
    }
    try {
      await tagApi.assign(t.id, recType, recId);
      await loadRecTags();
    } catch (e: any) {
      alert(e?.message || 'Assign failed');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Tags</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {rows.length} tags — VIP, Urgent, High Value…
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New tag
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
          <h3 className="mb-4 text-sm font-semibold">{editing ? 'Edit tag' : 'New tag'}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Tag name *
              </span>
              <input
                value={form.tagName}
                onChange={(e) => setForm({ ...form, tagName: e.target.value })}
                className={inputCls}
                placeholder="VIP"
              />
            </label>
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Color
              </span>
              <select
                value={form.tagColor}
                onChange={(e) => setForm({ ...form, tagColor: e.target.value })}
                className={inputCls}
              >
                {COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Description
              </span>
              <input
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputCls}
              />
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
              disabled={!form.tagName}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {editing ? 'Save changes' : 'Create tag'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {loading ? (
              <Loader2 className="text-primary h-5 w-5 animate-spin" />
            ) : rows.length === 0 ? (
              <p className="text-muted-foreground py-6 text-xs">No tags yet</p>
            ) : (
              rows.map((t) => (
                <div
                  key={t.id}
                  className="border-border bg-card flex items-center gap-2 rounded-lg border px-3 py-2 shadow-sm"
                >
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_CLS[t.tagColor || 'blue'] || 'bg-muted'}`}
                  >
                    {t.tagName}
                  </span>
                  <button
                    onClick={() => void assignTag(t)}
                    className="text-primary hover:bg-primary/5 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                  >
                    assign
                  </button>
                  <button
                    onClick={() => {
                      setEditing(t);
                      setForm({
                        tagName: t.tagName,
                        tagColor: t.tagColor || 'blue',
                        description: t.description || '',
                      });
                      setShowForm(true);
                    }}
                    className="text-muted-foreground hover:text-foreground rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                  >
                    edit
                  </button>
                  <button
                    onClick={() => void remove(t)}
                    className="rounded-md p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Assign to a record</h3>
          <div className="flex flex-col gap-2">
            <select
              value={recType}
              onChange={(e) => setRecType(e.target.value)}
              className={inputCls}
            >
              {[
                'customer',
                'supplier',
                'product',
                'invoice',
                'lead',
                'employee',
                'asset',
                'expense',
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              value={recId}
              onChange={(e) => setRecId(e.target.value)}
              className={inputCls}
              placeholder="Record ID"
            />
            <p className="text-muted-foreground text-[11px]">Assigned tags on this record:</p>
            <div className="flex flex-wrap gap-1.5">
              {recTags.length === 0 ? (
                <span className="text-muted-foreground text-[11px]">None</span>
              ) : (
                recTags.map((t) => (
                  <span
                    key={t.id}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_CLS[t.tagColor || 'blue'] || 'bg-muted'}`}
                  >
                    {t.tagName}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
