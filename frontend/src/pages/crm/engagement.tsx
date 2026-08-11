import { Bell, CalendarClock, Loader2, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  completeFollowUp,
  createFollowUp,
  createCrmTask,
  getCrmTasks,
  getFollowUpReminders,
  getFollowUps,
  updateCrmTask,
  type CrmTask,
  type FollowUp,
} from '@/services/crm.service';

const inputCls = 'rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:border-primary/50';

// ═══════════════════════════════════════════════════════════════════
// FOLLOW-UPS + REMINDERS
// ═══════════════════════════════════════════════════════════════════
export function FollowUpsPage() {
  const [list, setList] = useState<FollowUp[]>([]);
  const [reminders, setReminders] = useState<{
    upcoming: FollowUp[];
    dueToday: FollowUp[];
    overdue: FollowUp[];
    missed: FollowUp[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    scheduledAt: '',
    followUpType: 'phone',
    purpose: '',
    leadId: '',
    customerId: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, rem] = await Promise.all([
        getFollowUps({ pageSize: 100 }),
        getFollowUpReminders(),
      ]);
      setList(res.data);
      setReminders(rem);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!form.scheduledAt) {
      return;
    }
    await createFollowUp({
      ...form,
      leadId: form.leadId || undefined,
      customerId: form.customerId || undefined,
    });
    setForm({ scheduledAt: '', followUpType: 'phone', purpose: '', leadId: '', customerId: '' });
    void load();
  };

  const complete = async (fu: FollowUp) => {
    await completeFollowUp(fu.id, { outcome: 'completed' });
    void load();
  };

  const ReminderSection = ({
    title,
    items,
    tone,
  }: {
    title: string;
    items: FollowUp[];
    tone: string;
  }) => (
    <div className="bg-card rounded-lg border p-4 shadow-sm">
      <p className={`mb-2 flex items-center gap-1.5 text-xs font-semibold ${tone}`}>
        <Bell className="h-3.5 w-3.5" />
        {title} ({items.length})
      </p>
      <div className="space-y-1.5">
        {items.length === 0 && (
          <p className="text-muted-foreground py-2 text-center text-xs">None</p>
        )}
        {items.slice(0, 5).map((fu) => (
          <div
            key={fu.id}
            className="flex items-center justify-between rounded-lg border p-2 text-xs"
          >
            <span>
              {String(fu.scheduledAt).replace('T', ' ').slice(0, 16)} ·{' '}
              {String(fu.followUpType).replace(/_/g, ' ')}
            </span>
            <span className="text-muted-foreground">{fu.purpose || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <CalendarClock className="h-6 w-6 text-amber-500" /> Follow-ups & Reminders
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Track scheduled, due-today, overdue and missed follow-ups
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReminderSection
          title="Due Today"
          items={reminders?.dueToday || []}
          tone="text-amber-600"
        />
        <ReminderSection title="Overdue" items={reminders?.overdue || []} tone="text-red-600" />
        <ReminderSection
          title="Upcoming"
          items={reminders?.upcoming || []}
          tone="text-emerald-600"
        />
        <ReminderSection title="Missed" items={reminders?.missed || []} tone="text-orange-600" />
      </div>

      <div className="bg-card flex flex-wrap items-end gap-2 rounded-lg border p-4 shadow-sm">
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Schedule</label>
          <input
            type="datetime-local"
            className={inputCls}
            value={form.scheduledAt}
            onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
          />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Type</label>
          <select
            className={inputCls}
            value={form.followUpType}
            onChange={(e) => setForm({ ...form, followUpType: e.target.value })}
          >
            {[
              'phone',
              'whatsapp',
              'email',
              'meeting',
              'visit',
              'demo',
              'quotation_discussion',
              'payment_followup',
              'other',
            ].map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Lead ID</label>
          <input
            className={inputCls}
            value={form.leadId}
            onChange={(e) => setForm({ ...form, leadId: e.target.value })}
          />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Customer ID</label>
          <input
            className={inputCls}
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
          />
        </div>
        <div className="flex-1">
          <label className="text-muted-foreground mb-1 block text-xs">Purpose</label>
          <input
            className={`${inputCls} w-full`}
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
          />
        </div>
        <button
          onClick={add}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="bg-card overflow-x-auto rounded-lg border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
              <th className="px-4 py-2.5 font-medium">Scheduled</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Purpose</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Outcome</th>
              <th className="px-4 py-2.5 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted-foreground px-4 py-10 text-center text-xs">
                  No follow-ups scheduled
                </td>
              </tr>
            ) : (
              list.map((fu) => (
                <tr key={fu.id} className="hover:bg-muted/30 border-b last:border-0">
                  <td className="px-4 py-2.5">
                    {String(fu.scheduledAt).replace('T', ' ').slice(0, 16)}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {String(fu.followUpType).replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-2.5">{fu.purpose || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${
                        fu.status === 'completed'
                          ? 'border-emerald-200 bg-emerald-500/10 text-emerald-600'
                          : fu.status === 'missed'
                            ? 'border-orange-200 bg-orange-500/10 text-orange-600'
                            : fu.status === 'cancelled'
                              ? 'border-slate-200 bg-slate-100 text-slate-500'
                              : 'border-indigo-200 bg-indigo-500/10 text-indigo-600'
                      }`}
                    >
                      {fu.status}
                    </span>
                  </td>
                  <td className="text-muted-foreground px-4 py-2.5 text-xs">{fu.outcome || '—'}</td>
                  <td className="px-4 py-2.5">
                    {fu.status === 'scheduled' && (
                      <button
                        onClick={() => void complete(fu)}
                        className="text-xs text-emerald-600 hover:underline"
                      >
                        Mark complete
                      </button>
                    )}
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

// ═══════════════════════════════════════════════════════════════════
// CRM TASKS
// ═══════════════════════════════════════════════════════════════════
export function CrmTasksPage() {
  const [list, setList] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', dueDate: '', priority: 'medium', leadId: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCrmTasks({ pageSize: 100 });
      setList(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!form.title) {
      return;
    }
    await createCrmTask({ ...form, leadId: form.leadId || undefined });
    setForm({ title: '', dueDate: '', priority: 'medium', leadId: '' });
    void load();
  };

  const toggle = async (t: CrmTask) => {
    await updateCrmTask(t.id, { status: t.status === 'completed' ? 'open' : 'completed' });
    void load();
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CRM Tasks</h1>
        <p className="text-muted-foreground mt-1 text-sm">{list.length} tasks</p>
      </div>

      <div className="bg-card flex flex-wrap items-end gap-2 rounded-lg border p-4 shadow-sm">
        <div className="min-w-56 flex-1">
          <label className="text-muted-foreground mb-1 block text-xs">Title *</label>
          <input
            className={`${inputCls} w-full`}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Due</label>
          <input
            type="date"
            className={inputCls}
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Priority</label>
          <select
            className={inputCls}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            {['low', 'medium', 'high', 'urgent'].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={add}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="bg-card overflow-x-auto rounded-lg border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
              <th className="px-4 py-2.5 font-medium">Done</th>
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">Priority</th>
              <th className="px-4 py-2.5 font-medium">Due</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center text-xs">
                  No tasks
                </td>
              </tr>
            ) : (
              list.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 border-b last:border-0">
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={t.status === 'completed'}
                      onChange={() => void toggle(t)}
                    />
                  </td>
                  <td
                    className={`px-4 py-2.5 ${t.status === 'completed' ? 'text-muted-foreground line-through' : ''}`}
                  >
                    {t.title}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{t.priority}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {t.dueDate ? String(t.dueDate).slice(0, 10) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{t.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
