import { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, Bell, BellRing, AlertTriangle, Clock, Mail, MessageSquare, Phone, Send } from 'lucide-react';
import { getReminders, type CustomerCreditProfile } from '@/services/sales-credit.service';

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

function getDaysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function ReminderEnginePage() {
  const [data, setData] = useState<{ dueSoon: CustomerCreditProfile[]; dueToday: CustomerCreditProfile[]; overdue: CustomerCreditProfile[]; critical: CustomerCreditProfile[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('dueToday');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await getReminders()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sections = data ? [
    { key: 'dueSoon', label: 'Due Soon (within 5 days)', icon: Clock, color: 'blue', count: data.dueSoon.length, items: data.dueSoon },
    { key: 'dueToday', label: "Today's Due", icon: Bell, color: 'yellow', count: data.dueToday.length, items: data.dueToday },
    { key: 'overdue', label: 'Overdue', icon: AlertTriangle, color: 'orange', count: data.overdue.length, items: data.overdue },
    { key: 'critical', label: 'Critical', icon: BellRing, color: 'red', count: data.critical.length, items: data.critical },
  ] : [];

  const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    blue: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-600', badge: 'bg-blue-500/10 text-blue-600' },
    yellow: { bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', text: 'text-yellow-600', badge: 'bg-yellow-500/10 text-yellow-600' },
    orange: { bg: 'bg-orange-500/5', border: 'border-orange-500/20', text: 'text-orange-600', badge: 'bg-orange-500/10 text-orange-600' },
    red: { bg: 'bg-red-500/5', border: 'border-red-500/20', text: 'text-red-600', badge: 'bg-red-500/10 text-red-600' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reminder Engine</h1>
          <p className="mt-1 text-sm text-muted-foreground">Payment reminders, due tracking, and communication tools</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((s) => {
          const c = colorMap[s.color];
          return (
            <button
              key={s.key}
              onClick={() => setExpandedSection(expandedSection === s.key ? null : s.key)}
              className={`rounded-lg border ${c.border} ${c.bg} p-4 shadow-sm text-left transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-md ${c.badge} p-2`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <span className={`text-xs font-semibold ${c.text}`}>{s.count} customers</span>
              </div>
              <p className={`mt-3 text-sm font-medium ${c.text}`}>{s.label}</p>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : data ? (
        <div className="space-y-4">
          {sections.map((s) => {
            const c = colorMap[s.color];
            const isExpanded = expandedSection === s.key;
            if (s.items.length === 0) return null;
            return (
              <div key={s.key} className={`rounded-lg border ${c.border} overflow-hidden`}>
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : s.key)}
                  className={`flex w-full items-center justify-between ${c.bg} px-4 py-3 text-sm font-semibold ${c.text}`}
                >
                  <span className="flex items-center gap-2">
                    <s.icon className="h-4 w-4" />
                    {s.label}
                    <span className={`ml-1 rounded-full ${c.badge} px-1.5 py-0.5 text-[10px]`}>{s.count}</span>
                  </span>
                  <span className="text-[10px] opacity-60">{isExpanded ? 'Collapse' : 'Expand'}</span>
                </button>
                {isExpanded && (
                  <div className="divide-y">
                    {s.items.map((c) => (
                      <div key={c.customerId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/30 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{c.customerName}</p>
                          <p className="text-xs text-muted-foreground">{c.customerCode} · Credit: {formatCurrency(c.creditLimit)} · Days: {c.creditDays}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(c.outstanding)}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.lastPaymentDate ? `${getDaysSince(c.lastPaymentDate)} days since payment` : 'No payments'}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            title="Send Email (placeholder)"
                            className="rounded-md border bg-background p-1.5 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600 transition-colors"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Send WhatsApp (placeholder)"
                            className="rounded-md border bg-background p-1.5 text-muted-foreground hover:bg-green-500/10 hover:text-green-600 transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Send SMS (placeholder)"
                            className="rounded-md border bg-background p-1.5 text-muted-foreground hover:bg-purple-500/10 hover:text-purple-600 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Send Reminder"
                            className="rounded-md border bg-background p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* Bulk action */}
                    <div className={`flex items-center gap-3 px-4 py-2.5 ${c.bg}`}>
                      <span className="text-xs text-muted-foreground">Bulk actions:</span>
                      <button className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-[10px] font-medium hover:bg-blue-500/10 hover:text-blue-600 transition-colors">
                        <Mail className="h-3 w-3" /> Email All
                      </button>
                      <button className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-[10px] font-medium hover:bg-green-500/10 hover:text-green-600 transition-colors">
                        <MessageSquare className="h-3 w-3" /> WhatsApp All
                      </button>
                      <button className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-[10px] font-medium hover:bg-purple-500/10 hover:text-purple-600 transition-colors">
                        <Phone className="h-3 w-3" /> SMS All
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {sections.every((s) => s.items.length === 0) && (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Bell className="mb-2 h-8 w-8" />
              <p className="text-sm">No reminders — all customers are in good standing</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
