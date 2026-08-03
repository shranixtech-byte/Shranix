import {
  AlertCircle,
  Braces,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Loader2,
  Plug,
  Plus,
  RefreshCw,
  Send,
  Share2,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { apiRequest, apiUrl } from '@/services/api-client';

import { ErrorBanner, FieldText, SaveButton, SectionCard, Toggle } from './settings-ui';

// ── Types ──────────────────────────────────────────────
interface ApiKeyRecord {
  id: string;
  name?: string;
  key?: string;
  isActive?: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt?: string;
}

interface WebhookRecord {
  id: string;
  name?: string;
  url?: string;
  events?: unknown;
  secret?: string;
  isActive?: boolean;
  lastTriggeredAt?: string;
  failureCount?: number;
  createdAt?: string;
}

interface ApiSettingsRecord {
  developerAccess?: boolean;
  oauthEnabled?: boolean;
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthCallbackUrl?: string;
  oauthScopes?: string;
  smsGatewayApiKey?: string;
  smsGatewaySenderId?: string;
  whatsappApiKey?: string;
  emailApiKey?: string;
  emailFromAddress?: string;
  telegramBotToken?: string;
}

const WEBHOOK_EVENT_HINTS = [
  'invoice.created',
  'payment.received',
  'stock.low',
  'purchase.po.approved',
];

// ── Helpers ────────────────────────────────────────────
function maskKey(k?: string): string {
  const s = String(k ?? '');
  if (s.length <= 10) {
    return s ? '••••••••' : '—';
  }
  return `${s.slice(0, 3)}••••••••${s.slice(-4)}`;
}

function formatDate(d?: string): string {
  return d ? d.slice(0, 10) : '—';
}

function eventChips(events: unknown): string[] {
  if (Array.isArray(events)) {
    return events.map(String);
  }
  return String(events ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Two-click destructive button (Revoke/Delete → Confirm?) */
function ConfirmButton({
  busy,
  onConfirm,
  children,
}: {
  busy: boolean;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  const [arm, setArm] = useState(false);
  useEffect(() => {
    if (!arm) {
      return;
    }
    const t = setTimeout(() => setArm(false), 3000);
    return () => clearTimeout(t);
  }, [arm]);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (arm) {
          setArm(false);
          onConfirm();
        } else {
          setArm(true);
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
        arm
          ? 'bg-rose-600 text-white hover:bg-rose-700'
          : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      {arm ? 'Confirm?' : children}
    </button>
  );
}

/** GET masked secret hai to 'type to replace' hint dikhao (bullets = saved value). */
function maskedHint(value: string | undefined): string | undefined {
  return value && /^[•]+$/.test(value) ? 'Saved value hidden — type to replace' : undefined;
}

function SecretField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <div className="relative mt-1">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-10 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
          aria-label={show ? 'Hide value' : 'Show value'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <span className="mt-0.5 block text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

// ── Section ────────────────────────────────────────────
export function ApiSettingsSection() {
  // Settings (developer access, OAuth, third-party)
  const [settings, setSettings] = useState<ApiSettingsRecord>({});
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // API tokens
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [tokenForm, setTokenForm] = useState({ name: '', expiresAt: '' });
  const [creatingKey, setCreatingKey] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Webhooks
  const [hooks, setHooks] = useState<WebhookRecord[]>([]);
  const [hooksLoading, setHooksLoading] = useState(true);
  const [hooksError, setHooksError] = useState<string | null>(null);
  const [hookForm, setHookForm] = useState({
    name: '',
    url: '',
    events: '',
    secret: '',
    isActive: true,
  });
  const [creatingHook, setCreatingHook] = useState(false);
  const [deletingHookId, setDeletingHookId] = useState<string | null>(null);
  const [testingHookId, setTestingHookId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; message: string } | null>(
    null,
  );

  // Save states
  const [savingOAuth, setSavingOAuth] = useState(false);
  const [oauthSaved, setOauthSaved] = useState(false);
  const [savingThirdParty, setSavingThirdParty] = useState(false);
  const [thirdPartySaved, setThirdPartySaved] = useState(false);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const res = (await apiRequest('/integrations/settings')) as unknown;
      const s = ((res as { data?: Record<string, unknown> })?.data ?? res ?? {}) as Record<
        string,
        unknown
      >;
      setSettings(s as ApiSettingsRecord);
    } catch (err) {
      setSettingsError((err as Error).message);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    setKeysError(null);
    try {
      const res = (await apiRequest('/integrations/api-keys')) as unknown;
      const rows = ((res as { data?: ApiKeyRecord[] })?.data ??
        (Array.isArray(res) ? res : [])) as ApiKeyRecord[];
      setKeys(rows);
    } catch (err) {
      setKeysError((err as Error).message);
    } finally {
      setKeysLoading(false);
    }
  }, []);

  const loadHooks = useCallback(async () => {
    setHooksLoading(true);
    setHooksError(null);
    try {
      const res = (await apiRequest('/integrations/webhooks')) as unknown;
      const rows = ((res as { data?: WebhookRecord[] })?.data ??
        (Array.isArray(res) ? res : [])) as WebhookRecord[];
      setHooks(rows);
    } catch (err) {
      setHooksError((err as Error).message);
    } finally {
      setHooksLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
    void loadKeys();
    void loadHooks();
  }, [loadSettings, loadKeys, loadHooks]);

  const setSetting = <K extends keyof ApiSettingsRecord>(key: K, value: ApiSettingsRecord[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // ── Developer access (auto-save on toggle) ──
  const [devFlash, setDevFlash] = useState(false);
  const toggleDeveloperAccess = async (v: boolean) => {
    setSetting('developerAccess', v);
    try {
      await apiRequest('/integrations/settings', {
        method: 'PUT',
        body: JSON.stringify({ developerAccess: v }),
      });
      setDevFlash(true);
      window.setTimeout(() => setDevFlash(false), 1600);
    } catch (err) {
      // Save fail hua → local state revert karo (server value wahi rehti hai)
      setSetting('developerAccess', !v);
      setSettingsError((err as Error).message);
    }
  };

  // ── API token actions ──
  const createToken = async () => {
    if (!tokenForm.name.trim()) {
      setKeysError('Token name is required');
      return;
    }
    setCreatingKey(true);
    setKeysError(null);
    setCreatedKey(null);
    try {
      const created = (await apiRequest<ApiKeyRecord>('/integrations/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          name: tokenForm.name.trim(),
          expiresAt: tokenForm.expiresAt || undefined,
        }),
      })) as unknown as ApiKeyRecord;
      setCreatedKey(created?.key ?? null);
      setTokenForm({ name: '', expiresAt: '' });
      await loadKeys();
    } catch (err) {
      setKeysError((err as Error).message);
    } finally {
      setCreatingKey(false);
    }
  };

  const revokeToken = async (id: string) => {
    setRevokingId(id);
    setKeysError(null);
    try {
      await apiRequest(`/integrations/api-keys/${id}`, { method: 'DELETE' });
      await loadKeys();
    } catch (err) {
      setKeysError((err as Error).message);
    } finally {
      setRevokingId(null);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard blocked */
    }
  };

  // ── Webhook actions ──
  const createHook = async () => {
    if (!hookForm.name.trim() || !hookForm.url.trim()) {
      setHooksError('Name and URL are required');
      return;
    }
    if (!/^https?:\/\//i.test(hookForm.url.trim())) {
      setHooksError('Webhook URL must start with http:// or https://');
      return;
    }
    setCreatingHook(true);
    setHooksError(null);
    try {
      await apiRequest('/integrations/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          name: hookForm.name.trim(),
          url: hookForm.url.trim(),
          events: hookForm.events.trim() || undefined,
          secret: hookForm.secret.trim() || undefined,
          isActive: hookForm.isActive,
        }),
      });
      setHookForm({ name: '', url: '', events: '', secret: '', isActive: true });
      await loadHooks();
    } catch (err) {
      setHooksError((err as Error).message);
    } finally {
      setCreatingHook(false);
    }
  };

  const toggleHook = async (h: WebhookRecord) => {
    try {
      await apiRequest(`/integrations/webhooks/${h.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !h.isActive }),
      });
      await loadHooks();
    } catch (err) {
      setHooksError((err as Error).message);
    }
  };

  const testHook = async (h: WebhookRecord) => {
    setTestingHookId(h.id);
    setTestResult(null);
    try {
      const res = (await apiRequest<{ success: boolean; status?: number; message: string }>(
        `/integrations/webhooks/${h.id}/test`,
        {
          method: 'POST',
        },
      )) as unknown as { success: boolean; status?: number; message: string };
      setTestResult({
        id: h.id,
        ok: Boolean(res?.success),
        message: res?.message ?? 'Test completed',
      });
    } catch (err) {
      setTestResult({ id: h.id, ok: false, message: (err as Error).message });
    } finally {
      setTestingHookId(null);
    }
  };

  const deleteHook = async (id: string) => {
    setDeletingHookId(id);
    setHooksError(null);
    try {
      await apiRequest(`/integrations/webhooks/${id}`, { method: 'DELETE' });
      await loadHooks();
    } catch (err) {
      setHooksError((err as Error).message);
    } finally {
      setDeletingHookId(null);
    }
  };

  // ── OAuth / third-party saves ──
  const saveOAuth = async () => {
    setSavingOAuth(true);
    setSettingsError(null);
    try {
      await apiRequest('/integrations/settings', {
        method: 'PUT',
        body: JSON.stringify({
          oauthEnabled: settings.oauthEnabled ?? false,
          oauthClientId: settings.oauthClientId ?? '',
          oauthClientSecret: settings.oauthClientSecret ?? '',
          oauthCallbackUrl: settings.oauthCallbackUrl ?? '',
          oauthScopes: settings.oauthScopes ?? '',
        }),
      });
      setOauthSaved(true);
      setTimeout(() => setOauthSaved(false), 3000);
    } catch (err) {
      setSettingsError((err as Error).message);
    } finally {
      setSavingOAuth(false);
    }
  };

  const saveThirdParty = async () => {
    setSavingThirdParty(true);
    setSettingsError(null);
    try {
      await apiRequest('/integrations/settings', {
        method: 'PUT',
        body: JSON.stringify({
          smsGatewayApiKey: settings.smsGatewayApiKey ?? '',
          smsGatewaySenderId: settings.smsGatewaySenderId ?? '',
          whatsappApiKey: settings.whatsappApiKey ?? '',
          emailApiKey: settings.emailApiKey ?? '',
          emailFromAddress: settings.emailFromAddress ?? '',
          telegramBotToken: settings.telegramBotToken ?? '',
        }),
      });
      setThirdPartySaved(true);
      setTimeout(() => setThirdPartySaved(false), 3000);
    } catch (err) {
      setSettingsError((err as Error).message);
    } finally {
      setSavingThirdParty(false);
    }
  };

  const loading = settingsLoading;

  return (
    <div className="space-y-6">
      {settingsError && (
        <ErrorBanner message={settingsError} onDismiss={() => setSettingsError(null)} />
      )}

      {/* Card 1 — API Token */}
      <SectionCard
        title="API Token"
        description="Generate & manage API tokens for programmatic access"
        icon={<KeyRound className="h-5 w-5" />}
        tint="emerald"
      >
        {/* Create */}
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldText
            label="Token Name"
            value={tokenForm.name}
            onChange={(v) => setTokenForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. POS Integration"
          />
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Expires</span>
            <input
              type="date"
              value={tokenForm.expiresAt}
              onChange={(e) => setTokenForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            />
          </label>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void createToken()}
            disabled={creatingKey}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60"
          >
            {creatingKey ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Generate Token
          </button>
        </div>

        {/* New key shown once */}
        {createdKey && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Copy this key now — it will not be shown again
              </p>
              <code className="mt-0.5 block truncate font-mono text-xs text-amber-800 dark:text-amber-200">
                {createdKey}
              </code>
            </div>
            <button
              type="button"
              onClick={() => void copyText(createdKey)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:bg-slate-800 dark:text-amber-300"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
        )}

        {/* List */}
        <div className="mt-4">
          {keysError && (
            <div className="mb-3">
              <ErrorBanner message={keysError} onDismiss={() => setKeysError(null)} />
            </div>
          )}
          {keysLoading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            </div>
          ) : keys.length === 0 ? (
            <p className="text-sm text-slate-400">No API tokens yet — generate one above.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {k.name || 'Untitled'}
                    </p>
                    <p className="font-mono text-xs text-slate-400">
                      {maskKey(k.key)} · expires {formatDate(k.expiresAt)}
                    </p>
                  </div>
                  <ConfirmButton
                    busy={revokingId === k.id}
                    onConfirm={() => void revokeToken(k.id)}
                  >
                    Revoke
                  </ConfirmButton>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Tokens use <code className="font-mono">sk_…</code> format. Send as{' '}
          <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>.
        </p>
      </SectionCard>

      {/* Card 2 — Webhook */}
      <SectionCard
        title="Webhook"
        description="Notify external systems when business events happen"
        icon={<Share2 className="h-5 w-5" />}
        tint="blue"
      >
        {/* Create */}
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldText
            label="Name"
            value={hookForm.name}
            onChange={(v) => setHookForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. Accounting Sync"
          />
          <FieldText
            label="Endpoint URL *"
            value={hookForm.url}
            onChange={(v) => setHookForm((f) => ({ ...f, url: v }))}
            placeholder="https://example.com/hooks/erp"
          />
          <FieldText
            label="Events"
            value={hookForm.events}
            onChange={(v) => setHookForm((f) => ({ ...f, events: v }))}
            placeholder="invoice.created, payment.received"
            hint="Comma-separated. Examples:"
          />
          <SecretField
            label="Secret (optional)"
            value={hookForm.secret}
            onChange={(v) => setHookForm((f) => ({ ...f, secret: v }))}
            placeholder="shared secret for signature"
          />
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {WEBHOOK_EVENT_HINTS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() =>
                setHookForm((f) => ({ ...f, events: f.events ? `${f.events}, ${e}` : e }))
              }
              className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
            >
              + {e}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void createHook()}
            disabled={creatingHook}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60"
          >
            {creatingHook ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add Webhook
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={hookForm.isActive}
              onChange={(e) => setHookForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Active on creation
          </label>
        </div>

        {/* List */}
        <div className="mt-4">
          {hooksError && (
            <div className="mb-3">
              <ErrorBanner message={hooksError} onDismiss={() => setHooksError(null)} />
            </div>
          )}
          {hooksLoading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            </div>
          ) : hooks.length === 0 ? (
            <p className="text-sm text-slate-400">No webhooks yet — add one above.</p>
          ) : (
            <div className="space-y-2">
              {hooks.map((h) => {
                const events = eventChips(h.events);
                const result = testResult?.id === h.id ? testResult : null;
                return (
                  <div
                    key={h.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {h.name || 'Untitled'}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              h.isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-500 dark:bg-slate-700'
                            }`}
                          >
                            {h.isActive ? 'Active' : 'Paused'}
                          </span>
                        </p>
                        <p className="truncate text-xs text-slate-400">{h.url}</p>
                        {events.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {events.slice(0, 4).map((e) => (
                              <span
                                key={e}
                                className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                              >
                                {e}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void testHook(h)}
                          disabled={testingHookId === h.id}
                          title="Test delivery"
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 dark:hover:bg-blue-950/40"
                        >
                          {testingHookId === h.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Test
                        </button>
                        <Toggle checked={Boolean(h.isActive)} onChange={() => void toggleHook(h)} />
                        <ConfirmButton
                          busy={deletingHookId === h.id}
                          onConfirm={() => void deleteHook(h.id)}
                        >
                          Delete
                        </ConfirmButton>
                      </div>
                    </div>
                    {result && (
                      <p
                        className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}
                      >
                        {result.ok ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5" />
                        )}
                        {result.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Card 3 — Developer Access */}
      <SectionCard
        title="Developer Access"
        description="Enable the public API & interactive API docs"
        icon={<Braces className="h-5 w-5" />}
        tint="violet"
      >
        {loading ? (
          <div className="flex h-16 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  Developer API Access
                </p>
                <p className="text-xs text-slate-400">
                  OFF hone par API endpoints reject hote hain — docs still viewable
                </p>
              </div>
              <div className="flex items-center gap-2">
                {devFlash && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
                <Toggle
                  checked={Boolean(settings.developerAccess)}
                  onChange={(v) => void toggleDeveloperAccess(v)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <code className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {apiUrl('/api/docs')}
              </code>
              <a
                href={apiUrl('/api/docs')}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-violet-700 active:scale-[0.98]"
              >
                Open API Docs <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Card 4 — OAuth */}
      <SectionCard
        title="OAuth"
        description="OAuth 2.0 application credentials for third-party apps (future-ready)"
        icon={<Fingerprint className="h-5 w-5" />}
        tint="amber"
      >
        {loading ? (
          <div className="flex h-16 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  OAuth Applications
                </p>
                <p className="text-xs text-slate-400">
                  Enable to accept OAuth 2.0 client credentials
                </p>
              </div>
              <Toggle
                checked={Boolean(settings.oauthEnabled)}
                onChange={(v) => setSetting('oauthEnabled', v)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldText
                label="Client ID"
                value={settings.oauthClientId ?? ''}
                onChange={(v) => setSetting('oauthClientId', v)}
                placeholder="oauth-client-id"
              />
              <SecretField
                label="Client Secret"
                value={settings.oauthClientSecret ?? ''}
                onChange={(v) => setSetting('oauthClientSecret', v)}
                placeholder="oauth-client-secret"
                hint={maskedHint(settings.oauthClientSecret)}
              />
              <FieldText
                label="Callback URL"
                value={settings.oauthCallbackUrl ?? ''}
                onChange={(v) => setSetting('oauthCallbackUrl', v)}
                placeholder="https://app.example.com/callback"
              />
              <FieldText
                label="Scopes"
                value={settings.oauthScopes ?? ''}
                onChange={(v) => setSetting('oauthScopes', v)}
                placeholder="openid profile email"
              />
            </div>
            <SaveButton
              busy={savingOAuth}
              saved={oauthSaved}
              onClick={() => void saveOAuth()}
              label="Save OAuth Settings"
            />
          </div>
        )}
      </SectionCard>

      {/* Card 5 — Third Party Integration */}
      <SectionCard
        title="Third Party Integration"
        description="Provider credentials — used by upcoming gateway integrations"
        icon={<Plug className="h-5 w-5" />}
        tint="sky"
      >
        {loading ? (
          <div className="flex h-16 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <SecretField
                label="SMS Gateway API Key"
                value={settings.smsGatewayApiKey ?? ''}
                onChange={(v) => setSetting('smsGatewayApiKey', v)}
                placeholder="sms-gateway-api-key"
                hint={maskedHint(settings.smsGatewayApiKey)}
              />
              <FieldText
                label="SMS Sender ID"
                value={settings.smsGatewaySenderId ?? ''}
                onChange={(v) => setSetting('smsGatewaySenderId', v)}
                placeholder="SHRANIX"
              />
              <SecretField
                label="WhatsApp API Key"
                value={settings.whatsappApiKey ?? ''}
                onChange={(v) => setSetting('whatsappApiKey', v)}
                placeholder="whatsapp-business-api-key"
                hint={maskedHint(settings.whatsappApiKey)}
              />
              <SecretField
                label="Email API Key"
                value={settings.emailApiKey ?? ''}
                onChange={(v) => setSetting('emailApiKey', v)}
                placeholder="email-service-api-key"
                hint={maskedHint(settings.emailApiKey)}
              />
              <FieldText
                label="Email From Address"
                value={settings.emailFromAddress ?? ''}
                onChange={(v) => setSetting('emailFromAddress', v)}
                placeholder="alerts@company.com"
              />
              <SecretField
                label="Telegram Bot Token"
                value={settings.telegramBotToken ?? ''}
                onChange={(v) => setSetting('telegramBotToken', v)}
                placeholder="123456:ABC-DEF..."
                hint={maskedHint(settings.telegramBotToken)}
              />
            </div>
            <SaveButton
              busy={savingThirdParty}
              saved={thirdPartySaved}
              onClick={() => void saveThirdParty()}
              label="Save Integration Keys"
            />
            <p className="text-[11px] text-slate-400">
              Credentials securely stored in settings (masked in this screen). Provider adapters
              (SMS, WhatsApp, Email, Telegram) in-progress.
            </p>
          </div>
        )}
      </SectionCard>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => {
            void loadSettings();
            void loadKeys();
            void loadHooks();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh all
        </button>
      </div>
    </div>
  );
}
