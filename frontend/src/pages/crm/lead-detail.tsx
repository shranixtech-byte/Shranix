import {
  ArrowLeft,
  CheckCircle2,
  GitMerge,
  Loader2,
  Phone,
  Plus,
  Send,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  changeLeadStatus,
  completeFollowUp,
  convertLead,
  createFollowUp,
  createCrmTask,
  findLeadDuplicates,
  getLead,
  LEAD_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  updateCrmTask,
  type FollowUp,
  type LeadActivity,
  type CrmTask,
} from '@/services/crm.service';

const inputCls =
  'w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:border-primary/50';

const ACTIVITY_ICONS: Record<string, string> = {
  'lead.created': '🆕',
  'lead.assigned': '👤',
  'lead.status_changed': '🔁',
  'lead.converted': '✅',
  'follow_up.created': '📅',
  'follow_up.completed': '✔️',
  call: '📞',
  meeting: '🤝',
  note: '📝',
  'task.created': '📋',
  'opportunity.created': '💎',
  'opportunity.stage_changed': '🔄',
};

export function LeadDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [duplicates, setDuplicates] = useState<any[] | null>(null);
  const [converting, setConverting] = useState(false);
  const [fuForm, setFuForm] = useState({ scheduledAt: '', followUpType: 'phone', purpose: '' });
  const [taskForm, setTaskForm] = useState({ title: '', dueDate: '', priority: 'medium' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLead(await getLead(id));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !lead) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading lead…
      </div>
    );
  }

  const onStatus = async (status: string) => {
    if (status === 'lost') {
      const reason = window.prompt(
        'Lost reason (e.g. price, competitor, no requirement, budget, delayed_decision, other):',
        'other',
      );
      if (reason === null) {
        return;
      }
      await changeLeadStatus(id, status, { lostReason: reason });
    } else {
      await changeLeadStatus(id, status);
    }
    void load();
  };

  const onCheckDuplicates = async () => {
    const res = await findLeadDuplicates(id);
    setDuplicates(res);
  };

  const onConvert = async (matchCustomerId?: string) => {
    setConverting(true);
    try {
      const res = await convertLead(id, matchCustomerId);
      if (res.converted) {
        alert(`Lead converted to customer (${res.method}).`);
        void load();
      }
    } finally {
      setConverting(false);
    }
  };

  const onAddFollowUp = async () => {
    if (!fuForm.scheduledAt) {
      return;
    }
    await createFollowUp({
      leadId: id,
      scheduledAt: fuForm.scheduledAt,
      followUpType: fuForm.followUpType,
      purpose: fuForm.purpose,
    });
    setFuForm({ scheduledAt: '', followUpType: 'phone', purpose: '' });
    void load();
  };

  const onAddTask = async () => {
    if (!taskForm.title) {
      return;
    }
    await createCrmTask({
      leadId: id,
      title: taskForm.title,
      dueDate: taskForm.dueDate,
      priority: taskForm.priority,
    });
    setTaskForm({ title: '', dueDate: '', priority: 'medium' });
    void load();
  };

  const onCompleteFu = async (fu: FollowUp) => {
    await completeFollowUp(fu.id, { outcome: 'completed', nextFollowUpAt: '' });
    void load();
  };

  const onToggleTask = async (t: CrmTask) => {
    await updateCrmTask(t.id, { status: t.status === 'completed' ? 'open' : 'completed' });
    void load();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/crm/leads')}
            className="bg-card hover:border-primary/40 rounded-lg border p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{lead.leadName}</h1>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_COLORS[String(lead.status)] || 'bg-slate-100 text-slate-600'}`}
              >
                {STATUS_LABELS[lead.status] || lead.status}
              </span>
              {lead.convertedToCustomer && (
                <span className="rounded-full border border-lime-200 bg-lime-500/10 px-2 py-0.5 text-xs text-lime-700">
                  Converted
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {lead.leadNumber} · {lead.companyName || 'No firm'} · Score{' '}
              {Math.round(Number(lead.score) || 0)} ({lead.scoreLevel})
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate(`/crm/leads/${id}/edit`)}
            className="bg-card hover:border-primary/40 rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            Edit
          </button>
          {!lead.convertedToCustomer && (
            <>
              <button
                onClick={onCheckDuplicates}
                className="bg-card hover:border-primary/40 rounded-lg border px-3 py-1.5 text-xs font-medium"
              >
                <GitMerge className="mr-1 inline h-3.5 w-3.5" />
                Check Duplicates
              </button>
              <button
                onClick={() => void onConvert()}
                disabled={converting}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />{' '}
                {converting ? 'Converting…' : 'Convert to Customer'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Duplicate match picker */}
      {duplicates && duplicates.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="mb-2 font-medium text-amber-800 dark:text-amber-400">
            Matching customer(s) found — select one to link, or create a new customer:
          </p>
          <div className="flex flex-wrap gap-2">
            {duplicates.map((d) => (
              <button
                key={d.customerId}
                onClick={() => void onConvert(d.customerId)}
                className="dark:bg-card rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs hover:bg-amber-100"
              >
                {d.name} {d.mobile ? `· ${d.mobile}` : ''} {d.gstin ? `· ${d.gstin}` : ''}
              </button>
            ))}
            <button
              onClick={() => setDuplicates(null)}
              className="text-muted-foreground rounded-lg border px-3 py-1.5 text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Status pipeline */}
      <div className="bg-card rounded-lg border p-4 shadow-sm">
        <p className="text-muted-foreground mb-2 text-xs font-medium">Pipeline Stage</p>
        <div className="flex flex-wrap gap-1.5">
          {LEAD_STATUSES.filter((s) => s !== 'converted').map((s) => (
            <button
              key={s}
              disabled={lead.status === s}
              onClick={() => void onStatus(s)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                lead.status === s
                  ? 'bg-primary text-primary-foreground'
                  : lead.status === 'won' || lead.status === 'lost'
                    ? 'opacity-50'
                    : 'bg-muted hover:bg-muted/60'
              }`}
            >
              {STATUS_LABELS[s] || s}
            </button>
          ))}
          {lead.status === 'lost' && (
            <span className="self-center text-xs text-red-500">
              <XCircle className="mr-1 inline h-3.5 w-3.5" />
              {lead.lostReason || 'Lost'}
            </span>
          )}
          {lead.status === 'won' && (
            <span className="self-center text-xs text-emerald-600">
              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />₹
              {Number(lead.wonValue || lead.expectedValue || 0).toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: details + quick actions */}
        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Details</h3>
            <dl className="space-y-2 text-sm">
              {[
                ['Mobile', lead.mobile],
                ['WhatsApp', lead.whatsapp],
                ['Email', lead.email],
                ['Source', String(lead.source || '—').replace(/_/g, ' ')],
                ['Type', lead.leadType],
                ['Priority', lead.priority],
                [
                  'Expected Value',
                  lead.expectedValue
                    ? `₹${Number(lead.expectedValue).toLocaleString('en-IN')}`
                    : '—',
                ],
                [
                  'Close Date',
                  lead.expectedCloseDate ? String(lead.expectedCloseDate).slice(0, 10) : '—',
                ],
                ['Assigned To', lead.assignedTo || 'Unassigned'],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Follow-up quick create */}
          <div className="bg-card rounded-lg border p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <Phone className="h-4 w-4 text-indigo-500" /> Schedule Follow-up
            </h3>
            <div className="space-y-2">
              <input
                type="datetime-local"
                className={inputCls}
                value={fuForm.scheduledAt}
                onChange={(e) => setFuForm({ ...fuForm, scheduledAt: e.target.value })}
              />
              <select
                className={inputCls}
                value={fuForm.followUpType}
                onChange={(e) => setFuForm({ ...fuForm, followUpType: e.target.value })}
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
              <input
                placeholder="Purpose"
                className={inputCls}
                value={fuForm.purpose}
                onChange={(e) => setFuForm({ ...fuForm, purpose: e.target.value })}
              />
              <button
                onClick={onAddFollowUp}
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg px-3 py-2 text-sm font-medium"
              >
                <Plus className="mr-1 inline h-4 w-4" />
                Add
              </button>
            </div>
          </div>

          {/* Task quick create */}
          <div className="bg-card rounded-lg border p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Add Task</h3>
            <div className="space-y-2">
              <input
                placeholder="Task title"
                className={inputCls}
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
              <input
                type="date"
                className={inputCls}
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              />
              <button
                onClick={onAddTask}
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg px-3 py-2 text-sm font-medium"
              >
                <Plus className="mr-1 inline h-4 w-4" />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Right: timeline */}
        <div className="space-y-6 lg:col-span-2">
          <div className="bg-card rounded-lg border p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold">Activity Timeline</h3>
            <div className="space-y-4">
              {(lead.activities || []).map((a: LeadActivity) => (
                <div key={a.id} className="flex gap-3">
                  <span className="mt-0.5 text-lg">{ACTIVITY_ICONS[a.activityType] || '•'}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{a.title || a.activityType}</p>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {new Date(a.happenedAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {a.description && (
                      <p className="text-muted-foreground text-xs">{a.description}</p>
                    )}
                  </div>
                </div>
              ))}
              {(lead.activities || []).length === 0 && (
                <p className="text-muted-foreground py-6 text-center text-xs">No activities yet</p>
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-card rounded-lg border p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">
                Follow-ups ({lead.followUps?.length || 0})
              </h3>
              <div className="space-y-2">
                {(lead.followUps || []).map((fu: FollowUp) => (
                  <div
                    key={fu.id}
                    className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
                  >
                    <div>
                      <p className="text-xs font-medium">
                        {String(fu.followUpType).replace(/_/g, ' ')} ·{' '}
                        {String(fu.scheduledAt).replace('T', ' ').slice(0, 16)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {fu.purpose || '—'} · {fu.status}
                      </p>
                    </div>
                    {fu.status === 'scheduled' && (
                      <button
                        onClick={() => void onCompleteFu(fu)}
                        className="text-xs text-emerald-600 hover:underline"
                      >
                        <Send className="mr-1 inline h-3 w-3" />
                        Complete
                      </button>
                    )}
                  </div>
                ))}
                {(lead.followUps || []).length === 0 && (
                  <p className="text-muted-foreground py-3 text-center text-xs">
                    No follow-ups scheduled
                  </p>
                )}
              </div>
            </div>

            <div className="bg-card rounded-lg border p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Tasks ({lead.tasks?.length || 0})</h3>
              <div className="space-y-2">
                {(lead.tasks || []).map((t: CrmTask) => (
                  <label
                    key={t.id}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={t.status === 'completed'}
                      onChange={() => void onToggleTask(t)}
                      className="mt-0.5"
                    />
                    <span
                      className={
                        t.status === 'completed' ? 'text-muted-foreground line-through' : ''
                      }
                    >
                      {t.title}
                      {t.dueDate && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          due {String(t.dueDate).slice(0, 10)}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
                {(lead.tasks || []).length === 0 && (
                  <p className="text-muted-foreground py-3 text-center text-xs">No tasks</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
