import { BarChart3, Loader2, Mail, MessageSquare, RefreshCw, RotateCcw, Send } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  getCommunicationReports,
  listCommunications,
  retryCommunication,
  sendCommunication,
  runCommunicationWorker,
  type CommunicationLog,
} from '@/services/communication.service';

const CHANNELS = ['email', 'sms', 'whatsapp', 'in_app'];
const STATUSES = ['queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'cancelled'];

const statusCls: Record<string, string> = {
  queued: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30',
  sending: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30',
  sent: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30',
  delivered: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30',
  read: 'bg-teal-50 text-teal-600 dark:bg-teal-950/30',
  failed: 'bg-red-50 text-red-600 dark:bg-red-950/30',
  cancelled: 'bg-muted text-muted-foreground',
};

function channelIcon(ch: string) {
  return ch === 'email' ? Mail : MessageSquare;
}

export function CommunicationLogPage() {
  const [rows, setRows] = useState<CommunicationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await listCommunications({
        page,
        ps: 25,
        channel: channel || undefined,
        status: status || undefined,
      })) as any;
      setRows(res?.data || []);
      setTotal(res?.total || 0);
      const rep = (await getCommunicationReports()) as any;
      setReports(rep || null);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, channel, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRetry = async (id: string) => {
    await retryCommunication(id).catch(() => undefined);
    await load();
  };

  const handleRunWorker = async () => {
    await runCommunicationWorker().catch(() => undefined);
    await load();
  };

  const handleTestSend = async () => {
    const to = window.prompt('Test email address:');
    if (!to) {
      return;
    }
    await sendCommunication({
      channel: 'email',
      templateCode: 'WELCOME_CUSTOMER',
      to,
      variables: { customer_name: 'Test Customer', company_name: 'Shranix Krushi' },
    }).catch(() => undefined);
    await load();
  };

  const byStatus = (reports?.byStatus as Record<string, number>) || {};

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Communication Log</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Email / SMS / WhatsApp history and delivery reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleTestSend()}
            className="border-border hover:border-primary/40 text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Send className="h-3.5 w-3.5" /> Test send
          </button>
          <button
            onClick={() => void handleRunWorker()}
            className="border-border hover:border-primary/40 text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Run worker
          </button>
          <button
            onClick={() => void load()}
            className="border-border hover:border-primary/40 text-muted-foreground rounded-lg border px-3 py-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Report strip */}
      {reports && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card rounded-xl border p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium">Total messages</p>
            <p className="mt-1 text-2xl font-bold">{String(reports.total ?? 0)}</p>
          </div>
          <div className="bg-card rounded-xl border p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium">Sent / delivered</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{String(reports.sent ?? 0)}</p>
          </div>
          <div className="bg-card rounded-xl border p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium">Failed</p>
            <p className="mt-1 text-2xl font-bold text-red-500">{String(reports.failed ?? 0)}</p>
          </div>
          <div className="bg-card rounded-xl border p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium">By status</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(byStatus).map(([k, v]) => (
                <span
                  key={k}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCls[k] || 'bg-muted'}`}
                >
                  {k}: {v}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2">
        <select
          value={channel}
          onChange={(e) => {
            setChannel(e.target.value);
            setPage(1);
          }}
          className="border-border bg-card rounded-lg border px-2 py-1.5 text-xs outline-none"
        >
          <option value="">All channels</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="border-border bg-card rounded-lg border px-2 py-1.5 text-xs outline-none"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="text-muted-foreground ml-auto text-xs">{total} messages</span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">To</th>
              <th className="px-4 py-3 font-medium">Template / Subject</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Attempts</th>
              <th className="px-4 py-3 font-medium">Sent at</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <Loader2 className="text-primary mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted-foreground py-12 text-center text-xs">
                  No communications yet
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const Icon = channelIcon(r.channel);
                return (
                  <tr
                    key={r.id}
                    className="border-border hover:bg-muted/30 border-t transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                        <Icon className="h-3.5 w-3.5" /> {r.channel}
                      </span>
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-xs">
                      {r.recipientAddress || '—'}
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="truncate text-xs font-medium">{r.templateCode || 'direct'}</p>
                      <p className="text-muted-foreground truncate text-[11px]">
                        {r.subject || ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {r.referenceNumber ? (
                        <span className="text-muted-foreground font-mono text-[11px]">
                          {r.referenceNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCls[r.status] || 'bg-muted'}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">{r.attempts}</td>
                    <td className="text-muted-foreground px-4 py-3 text-[11px]">
                      {r.sentAt
                        ? new Date(r.sentAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : new Date(r.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'failed' && (
                        <button
                          onClick={() => void handleRetry(r.id)}
                          className="text-primary hover:bg-primary/5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium"
                        >
                          <RotateCcw className="h-3 w-3" /> Retry
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total > 25 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border-border rounded-lg border px-3 py-1 text-xs disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-muted-foreground self-center text-xs">
            Page {page} / {Math.max(1, Math.ceil(total / 25))}
          </span>
          <button
            disabled={page >= Math.ceil(total / 25)}
            onClick={() => setPage((p) => p + 1)}
            className="border-border rounded-lg border px-3 py-1 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
