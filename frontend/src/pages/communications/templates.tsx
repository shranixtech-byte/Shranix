import {
  Bell,
  Loader2,
  Mail,
  MessageSquare,
  PenLine,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  updateTemplate,
  type CommunicationTemplate,
} from '@/services/communication.service';

const CHANNELS = ['email', 'sms', 'whatsapp', 'in_app'] as const;
const CATEGORIES = ['invoices', 'payments', 'orders', 'offers', 'crm', 'reminders', 'system'];

const channelMeta: Record<string, { icon: typeof Mail; label: string; cls: string }> = {
  email: { icon: Mail, label: 'Email', cls: 'text-sky-600 bg-sky-50 dark:bg-sky-950/30' },
  sms: {
    icon: MessageSquare,
    label: 'SMS',
    cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
  },
  whatsapp: {
    icon: MessageSquare,
    label: 'WhatsApp',
    cls: 'text-green-600 bg-green-50 dark:bg-green-950/30',
  },
  in_app: {
    icon: Bell,
    label: 'In-app',
    cls: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30',
  },
};

interface DraftTemplate {
  id?: string;
  templateCode: string;
  templateName: string;
  channel: string;
  subject: string;
  body: string;
  category: string;
  language: string;
}

const emptyDraft = (): DraftTemplate => ({
  templateCode: '',
  templateName: '',
  channel: 'email',
  subject: '',
  body: '',
  category: 'system',
  language: 'en',
});

export function CommunicationTemplatesPage() {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<DraftTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await listTemplates({
        ps: 200,
        channel,
        search: searchDebounce || undefined,
      })) as any;
      setTemplates(res?.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [channel, searchDebounce]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!editing) {
      return;
    }
    if (!editing.templateCode.trim() || !editing.body.trim()) {
      setError('Template code and body are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing.id) {
        await updateTemplate(editing.id, editing as unknown as Record<string, unknown>);
      } else {
        await createTemplate(editing as unknown as Record<string, unknown>);
      }
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this template?')) {
      return;
    }
    await deleteTemplate(id).catch(() => undefined);
    await load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Communication Templates</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Reusable message templates with {'{{variable}}'} substitution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="border-border bg-card placeholder:text-muted-foreground w-48 rounded-lg border px-3 py-1.5 text-xs outline-none"
          />
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="border-border bg-card rounded-lg border px-2 py-1.5 text-xs outline-none"
          >
            <option value="">All channels</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {channelMeta[c].label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setEditing(emptyDraft())}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New template
          </button>
          <button
            onClick={() => void load()}
            className="border-border hover:border-primary/40 text-muted-foreground rounded-lg border px-3 py-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mt-4 rounded-lg border px-4 py-2 text-xs">
          {error}
        </div>
      )}

      {editing && (
        <div className="border-border bg-card mt-5 rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {editing.id ? 'Edit template' : 'New template'}
            </h2>
            <button
              onClick={() => setEditing(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-muted-foreground text-xs font-medium">Template code *</label>
              <input
                value={editing.templateCode}
                disabled={!!editing.id}
                onChange={(e) =>
                  setEditing({ ...editing, templateCode: e.target.value.toUpperCase() })
                }
                placeholder="SALES_INVOICE_CREATED"
                className="border-border bg-card mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-xs font-medium">Template name *</label>
              <input
                value={editing.templateName}
                onChange={(e) => setEditing({ ...editing, templateName: e.target.value })}
                placeholder="Sales Invoice Created"
                className="border-border bg-card mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-xs font-medium">Channel</label>
              <select
                value={editing.channel}
                onChange={(e) => setEditing({ ...editing, channel: e.target.value })}
                className="border-border bg-card mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {channelMeta[c].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-muted-foreground text-xs font-medium">Category</label>
              <select
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                className="border-border bg-card mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-muted-foreground text-xs font-medium">Subject</label>
              <input
                value={editing.subject}
                onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                placeholder="Invoice {{invoice_number}} from {{company_name}}"
                className="border-border bg-card mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-muted-foreground text-xs font-medium">Body *</label>
              <textarea
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                rows={5}
                placeholder="Dear {{customer_name}}, …"
                className="border-border bg-card mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-muted-foreground text-[11px]">
              Variables: {'{{customer_name}}'} {'{{invoice_number}}'} {'{{invoice_total}}'}{' '}
              {'{{company_name}}'} …
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(null)}
                className="border-border text-muted-foreground rounded-lg border px-4 py-2 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editing.id ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <Loader2 className="text-primary mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted-foreground py-12 text-center text-xs">
                  No templates found
                </td>
              </tr>
            ) : (
              templates.map((t) => {
                const meta = channelMeta[t.channel] || channelMeta.email;
                const Icon = meta.icon;
                return (
                  <tr
                    key={t.id}
                    className="border-border hover:bg-muted/30 border-t transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium">{t.templateCode}</td>
                    <td className="px-4 py-3">{t.templateName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}
                      >
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-xs capitalize">
                      {t.category || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          t.isActive
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() =>
                            setEditing({
                              id: t.id,
                              templateCode: t.templateCode,
                              templateName: t.templateName,
                              channel: t.channel,
                              subject: t.subject || '',
                              body: t.body,
                              category: t.category || 'system',
                              language: t.language || 'en',
                            })
                          }
                          className="text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md p-1.5"
                          title="Edit"
                        >
                          <PenLine className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => void handleDelete(t.id)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-md p-1.5"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
