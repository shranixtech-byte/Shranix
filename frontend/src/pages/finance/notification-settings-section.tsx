import {
  AlertCircle,
  BellRing,
  Loader2,
  Mail,
  MessageSquare,
  RotateCcw,
  Send,
  Smartphone,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { apiRequest } from '@/services/api-client';

import { ErrorBanner, FieldText, SaveButton, SectionCard, Toggle } from './settings-ui';

// ── Types ──────────────────────────────────────────────
export interface NotificationSettingsRecord {
  smsEnabled?: boolean;
  whatsappEnabled?: boolean;
  emailEnabled?: boolean;
  telegramEnabled?: boolean;
  pushEnabled?: boolean;
  smsPhone?: string;
  whatsappNumber?: string;
  alertEmail?: string;
  telegramChatId?: string;
  lowStockAlert?: boolean;
  paymentReminder?: boolean;
  dueReminder?: boolean;
  expiryAlert?: boolean;
  lowStockThreshold?: number;
  dueDays?: number;
  expiryDays?: number;
}

function ChannelRow({
  icon,
  label,
  desc,
  enabled,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        enabled
          ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/10'
          : 'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/60'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              enabled
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-700'
            }`}
          >
            {icon}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
            <p className="text-xs text-slate-400">{desc}</p>
          </div>
        </div>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>
      {enabled && children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function NotificationSettingsSection() {
  const [form, setForm] = useState<NotificationSettingsRecord>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiRequest('/notifications/settings')) as unknown;
      const s = ((res as { data?: Record<string, unknown> })?.data ?? res ?? {}) as Record<
        string,
        unknown
      >;
      setForm(s as NotificationSettingsRecord);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof NotificationSettingsRecord>(
    key: K,
    value: NotificationSettingsRecord[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest('/notifications/settings', { method: 'PUT', body: JSON.stringify(form) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    setForm({});
    setSaved(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card 1 — Channels */}
      <SectionCard
        title="Notification Channels"
        description="Which channels are active for alerts & reminders"
        icon={<Send className="h-5 w-5" />}
        tint="blue"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <ChannelRow
            icon={<Smartphone className="h-4 w-4" />}
            label="SMS"
            desc="Text messages to your phone"
            enabled={Boolean(form.smsEnabled)}
            onToggle={(v) => set('smsEnabled', v)}
          >
            <FieldText
              label="SMS Phone"
              value={form.smsPhone ?? ''}
              onChange={(v) => set('smsPhone', v)}
              placeholder="+91-9876543210"
            />
          </ChannelRow>
          <ChannelRow
            icon={<MessageSquare className="h-4 w-4" />}
            label="WhatsApp"
            desc="Business WhatsApp messages"
            enabled={Boolean(form.whatsappEnabled)}
            onToggle={(v) => set('whatsappEnabled', v)}
          >
            <FieldText
              label="WhatsApp Number"
              value={form.whatsappNumber ?? ''}
              onChange={(v) => set('whatsappNumber', v)}
              placeholder="+91-9876543210"
            />
          </ChannelRow>
          <ChannelRow
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            desc="Email alerts & reports"
            enabled={Boolean(form.emailEnabled)}
            onToggle={(v) => set('emailEnabled', v)}
          >
            <FieldText
              label="Alert Email"
              value={form.alertEmail ?? ''}
              onChange={(v) => set('alertEmail', v)}
              placeholder="alerts@company.com"
            />
          </ChannelRow>
          <ChannelRow
            icon={<Send className="h-4 w-4" />}
            label="Telegram"
            desc="Telegram bot messages"
            enabled={Boolean(form.telegramEnabled)}
            onToggle={(v) => set('telegramEnabled', v)}
          >
            <FieldText
              label="Telegram Chat ID"
              value={form.telegramChatId ?? ''}
              onChange={(v) => set('telegramChatId', v)}
              placeholder="123456789"
            />
          </ChannelRow>
          <div className="lg:col-span-2">
            <ChannelRow
              icon={<BellRing className="h-4 w-4" />}
              label="Push Notification"
              desc="Browser & app notifications"
              enabled={Boolean(form.pushEnabled)}
              onToggle={(v) => set('pushEnabled', v)}
            >
              <p className="text-[11px] text-slate-400">
                Browser permission is granted from the notification bell — no setup needed here.
              </p>
            </ChannelRow>
          </div>
        </div>
      </SectionCard>

      {/* Card 2 — Alerts & Reminders */}
      <SectionCard
        title="Alerts & Reminders"
        description="Which business events should trigger notifications"
        icon={<BellRing className="h-5 w-5" />}
        tint="amber"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <ChannelRow
            icon={<AlertCircle className="h-4 w-4" />}
            label="Low Stock Alert"
            desc="When an item falls below its reorder level"
            enabled={Boolean(form.lowStockAlert)}
            onToggle={(v) => set('lowStockAlert', v)}
          >
            <FieldText
              label="Low Stock Threshold (units)"
              value={String(form.lowStockThreshold ?? 5)}
              onChange={(v) => set('lowStockThreshold', Number(v) || 0)}
              type="number"
            />
          </ChannelRow>
          <ChannelRow
            icon={<AlertCircle className="h-4 w-4" />}
            label="Payment Reminder"
            desc="Remind customers about pending invoice payments"
            enabled={Boolean(form.paymentReminder)}
            onToggle={(v) => set('paymentReminder', v)}
          >
            <FieldText
              label="Remind before due (days)"
              value={String(form.dueDays ?? 3)}
              onChange={(v) => set('dueDays', Number(v) || 0)}
              type="number"
            />
          </ChannelRow>
          <ChannelRow
            icon={<AlertCircle className="h-4 w-4" />}
            label="Due Reminder"
            desc="Notify when invoices / orders are overdue"
            enabled={Boolean(form.dueReminder)}
            onToggle={(v) => set('dueReminder', v)}
          />
          <ChannelRow
            icon={<AlertCircle className="h-4 w-4" />}
            label="Expiry Alert"
            desc="Warn before batches / lots expire"
            enabled={Boolean(form.expiryAlert)}
            onToggle={(v) => set('expiryAlert', v)}
          >
            <FieldText
              label="Warn before expiry (days)"
              value={String(form.expiryDays ?? 30)}
              onChange={(v) => set('expiryDays', Number(v) || 0)}
              type="number"
            />
          </ChannelRow>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Channel toggles gate the notification service. WhatsApp &amp; Telegram need provider
          integration, and scheduled alert scans (low-stock / due / expiry) are the next phase.
        </p>
        {error && (
          <div className="mt-3">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SaveButton
            busy={busy}
            saved={saved}
            onClick={handleSave}
            label="Save Notification Settings"
          />
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
