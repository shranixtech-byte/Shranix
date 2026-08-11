import { KeyRound, Loader2, Mail, MessageSquare, Save, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  getCommunicationSettings,
  updateCommunicationSettings,
} from '@/services/communication.service';

interface FormState {
  emailProvider: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  smsProvider: string;
  smsApiKey: string;
  smsSenderId: string;
  smsTemplateId: string;
  whatsappProvider: string;
  whatsappApiKey: string;
  whatsappAccessToken: string;
  whatsappBusinessAccountId: string;
  whatsappPhoneNumberId: string;
  retryCount: number;
  retryDelayMinutes: number;
  rateLimitPerMinute: number;
  queueEnabled: boolean;
}

const defaults: FormState = {
  emailProvider: 'smtp',
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
  fromName: 'Shranix Krushi ERP',
  fromEmail: '',
  replyTo: '',
  smsProvider: '',
  smsApiKey: '',
  smsSenderId: '',
  smsTemplateId: '',
  whatsappProvider: '',
  whatsappApiKey: '',
  whatsappAccessToken: '',
  whatsappBusinessAccountId: '',
  whatsappPhoneNumberId: '',
  retryCount: 3,
  retryDelayMinutes: 5,
  rateLimitPerMinute: 60,
  queueEnabled: true,
};

export function CommunicationSettingsPage() {
  const [form, setForm] = useState<FormState>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = (await getCommunicationSettings()) as Record<string, unknown>;
      setForm({
        ...defaults,
        emailProvider: String(s.emailProvider || 'smtp'),
        smtpHost: String(s.smtpHost || ''),
        smtpPort: Number(s.smtpPort) || 587,
        smtpSecure: s.smtpSecure === true,
        smtpUser: String(s.smtpUser || ''),
        smtpPassword: String(s.smtpPassword || ''),
        fromName: String(s.fromName || defaults.fromName),
        fromEmail: String(s.fromEmail || ''),
        replyTo: String(s.replyTo || ''),
        smsProvider: String(s.smsProvider || ''),
        smsApiKey: String(s.smsApiKey || ''),
        smsSenderId: String(s.smsSenderId || ''),
        smsTemplateId: String(s.smsTemplateId || ''),
        whatsappProvider: String(s.whatsappProvider || ''),
        whatsappApiKey: String(s.whatsappApiKey || ''),
        whatsappAccessToken: String(s.whatsappAccessToken || ''),
        whatsappBusinessAccountId: String(s.whatsappBusinessAccountId || ''),
        whatsappPhoneNumberId: String(s.whatsappPhoneNumberId || ''),
        retryCount: Number(s.retryCount) || 3,
        retryDelayMinutes: Number(s.retryDelayMinutes) || 5,
        rateLimitPerMinute: Number(s.rateLimitPerMinute) || 60,
        queueEnabled: s.queueEnabled !== false,
      });
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateCommunicationSettings(form as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const inputCls =
    'border-border bg-card mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary/50';
  const labelCls = 'text-muted-foreground text-xs font-medium';
  const sectionTitle =
    'text-muted-foreground mt-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Communication Settings</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Email / SMS / WhatsApp provider configuration — admin only
          </p>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving || loading}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saved ? 'Saved' : 'Save settings'}
        </button>
      </div>

      <div className="border-primary/20 bg-primary/5 mt-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-xs">
        <ShieldCheck className="text-primary mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-muted-foreground">
          Secret values (SMTP password, SMS/WhatsApp API keys) are stored server-side and never
          returned to the browser — masked as {'••••••••'}. Leave a secret field blank to keep the
          existing value. Provider credentials must never be committed to source control.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="text-primary h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Email */}
          <div className="bg-card rounded-xl border p-5 shadow-sm">
            <h2 className={sectionTitle}>
              <Mail className="h-4 w-4 text-sky-500" /> Email / SMTP
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Provider</label>
                <select
                  value={form.emailProvider}
                  onChange={(e) => set('emailProvider', e.target.value)}
                  className={inputCls}
                >
                  <option value="smtp">SMTP</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="resend">Resend</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>SMTP Host</label>
                <input
                  value={form.smtpHost}
                  onChange={(e) => set('smtpHost', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Port</label>
                <input
                  type="number"
                  value={form.smtpPort}
                  onChange={(e) => set('smtpPort', Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Encryption (SSL/TLS)</label>
                <select
                  value={form.smtpSecure ? 'secure' : 'starttls'}
                  onChange={(e) => set('smtpSecure', e.target.value === 'secure')}
                  className={inputCls}
                >
                  <option value="starttls">STARTTLS (587)</option>
                  <option value="secure">SSL/TLS (465)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Username</label>
                <input
                  value={form.smtpUser}
                  onChange={(e) => set('smtpUser', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={form.smtpPassword}
                    onChange={(e) => set('smtpPassword', e.target.value)}
                    placeholder="••••••••"
                    className={inputCls}
                  />
                  <KeyRound className="text-muted-foreground absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
                </div>
              </div>
              <div>
                <label className={labelCls}>From name</label>
                <input
                  value={form.fromName}
                  onChange={(e) => set('fromName', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>From email</label>
                <input
                  value={form.fromEmail}
                  onChange={(e) => set('fromEmail', e.target.value)}
                  placeholder="no-reply@company.in"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Reply-to</label>
                <input
                  value={form.replyTo}
                  onChange={(e) => set('replyTo', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* SMS */}
          <div className="bg-card rounded-xl border p-5 shadow-sm">
            <h2 className={sectionTitle}>
              <MessageSquare className="h-4 w-4 text-emerald-500" /> SMS
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Provider</label>
                <select
                  value={form.smsProvider}
                  onChange={(e) => set('smsProvider', e.target.value)}
                  className={inputCls}
                >
                  <option value="">None (log only)</option>
                  <option value="twilio">Twilio</option>
                  <option value="msg91">MSG91</option>
                  <option value="aws">AWS SNS</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>API key</label>
                <input
                  type="password"
                  value={form.smsApiKey}
                  onChange={(e) => set('smsApiKey', e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Sender ID</label>
                <input
                  value={form.smsSenderId}
                  onChange={(e) => set('smsSenderId', e.target.value)}
                  placeholder="SHRANX"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Template ID (DND)</label>
                <input
                  value={form.smsTemplateId}
                  onChange={(e) => set('smsTemplateId', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="bg-card rounded-xl border p-5 shadow-sm">
            <h2 className={sectionTitle}>
              <MessageSquare className="h-4 w-4 text-green-500" /> WhatsApp Business
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Provider</label>
                <select
                  value={form.whatsappProvider}
                  onChange={(e) => set('whatsappProvider', e.target.value)}
                  className={inputCls}
                >
                  <option value="">None (log only)</option>
                  <option value="meta">Meta WhatsApp Cloud API</option>
                  <option value="twilio">Twilio</option>
                  <option value="gupshup">Gupshup</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Access token</label>
                <input
                  type="password"
                  value={form.whatsappAccessToken}
                  onChange={(e) => set('whatsappAccessToken', e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Business account ID</label>
                <input
                  value={form.whatsappBusinessAccountId}
                  onChange={(e) => set('whatsappBusinessAccountId', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Phone number ID</label>
                <input
                  value={form.whatsappPhoneNumberId}
                  onChange={(e) => set('whatsappPhoneNumberId', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* System */}
          <div className="bg-card rounded-xl border p-5 shadow-sm">
            <h2 className={sectionTitle}>System</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className={labelCls}>Max retry attempts</label>
                <input
                  type="number"
                  value={form.retryCount}
                  onChange={(e) => set('retryCount', Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Retry delay (minutes)</label>
                <input
                  type="number"
                  value={form.retryDelayMinutes}
                  onChange={(e) => set('retryDelayMinutes', Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Rate limit (per minute)</label>
                <input
                  type="number"
                  value={form.rateLimitPerMinute}
                  onChange={(e) => set('rateLimitPerMinute', Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={form.queueEnabled}
                    onChange={(e) => set('queueEnabled', e.target.checked)}
                    className="accent-primary h-4 w-4"
                  />
                  Background queue enabled
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
