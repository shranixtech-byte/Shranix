import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { portalService } from '@/services/portal.service';

import { Card, DataTable, PageHeader, PortalEmpty, PortalLoading, StatusBadge } from './common';

const CATEGORIES = [
  'general',
  'billing',
  'payment',
  'order',
  'delivery',
  'product',
  'account',
  'other',
];

export function PortalTicketsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    category: 'general',
    priority: 'normal',
    description: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    portalService
      .getTickets()
      .then((res: any) => setItems(res || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await portalService.createTicket(form);
      setShowCreate(false);
      setForm({ subject: '', category: 'general', priority: 'normal', description: '' });
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <PortalLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        subtitle="Raise a ticket or track your existing requests"
        actions={
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            {showCreate ? 'Cancel' : '+ New Ticket'}
          </button>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {showCreate && (
        <Card className="p-5">
          <form onSubmit={create} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Subject *
              </label>
              <input
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="What can we help with?"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="Describe your issue…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </form>
        </Card>
      )}

      {items.length === 0 ? (
        <PortalEmpty
          title="No support tickets yet"
          hint="Create one above — we usually respond within a day"
        />
      ) : (
        <Card>
          <DataTable headers={['Ticket', 'Subject', 'Category', 'Priority', 'Status', '']}>
            {items.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                  {t.ticketNumber}
                </td>
                <td className="max-w-[240px] truncate px-4 py-3 text-slate-600 dark:text-slate-300">
                  {t.subject}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{t.category}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{t.priority}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/portal/tickets/${t.id}`}
                    className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        </Card>
      )}
    </div>
  );
}

export function PortalTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!id) {
      return;
    }
    portalService
      .getTicket(id)
      .then(setTicket)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const reply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await portalService.replyTicket(id!, message);
      setMessage('');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
        {error}
      </div>
    );
  }
  if (!ticket) {
    return <PortalLoading />;
  }

  const closed = ticket.status === 'closed' || ticket.status === 'resolved';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={`${ticket.ticketNumber} · ${ticket.subject}`}
        subtitle={`${ticket.category} · ${ticket.priority} priority`}
        actions={<StatusBadge status={ticket.status} />}
      />

      <Card className="p-5">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {ticket.description || 'No description provided.'}
        </p>
      </Card>

      <div className="space-y-3">
        {(ticket.messages || []).map((m: any) => (
          <div key={m.id} className={`flex ${m.isCustomer ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm shadow-sm ${m.isCustomer ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
            >
              <p>{m.message}</p>
              <p
                className={`mt-1 text-[10px] ${m.isCustomer ? 'text-emerald-100/70' : 'text-slate-400'}`}
              >
                {new Date(m.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
        {(ticket.messages || []).length === 0 && (
          <p className="py-4 text-center text-sm text-slate-400">No messages yet</p>
        )}
      </div>

      {!closed && (
        <form onSubmit={reply} className="flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write a reply…"
            className="h-11 flex-1 rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={busy || !message.trim()}
            className="rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send'}
          </button>
        </form>
      )}
    </div>
  );
}
