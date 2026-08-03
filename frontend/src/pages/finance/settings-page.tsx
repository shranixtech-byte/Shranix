import {
  AlertCircle,
  BadgeCheck,
  Banknote,
  Bell,
  Braces,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Coins,
  Database,
  DatabaseBackup,
  ScrollText,
  Download,
  Eye,
  EyeOff,
  Folder,
  History,
  Image as ImageIcon,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Loader2,
  Lock,
  Package,
  Palette,
  Pencil,
  Percent,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { MODULE_LABELS, USER_MODULES, parseAllowedModules } from '@/lib/module-access';
import { THEME_COLORS, WIDGET_DEFS, usePreferences } from '@/providers/preferences-provider';
import type { Preferences } from '@/providers/preferences-provider';
import { apiRequest, apiUrl } from '@/services/api-client';
import { authService } from '@/services/auth.service';

import { ApiSettingsSection } from './api-settings-section';
import { AuditTrailSection } from './audit-trail-section';
import { DataManagementSection } from './data-management-section';
import { FinancialSettingsSection } from './financial-settings-section';
import { LicenseSettingsSection } from './license-settings-section';
import { NotificationSettingsSection } from './notification-settings-section';
import { PrinterSettingsSection } from './printer-settings-section';
import { RolesSection } from './roles-section';
import { ErrorBanner, FieldText, SaveButton, SectionCard, Toggle } from './settings-ui';

// ── Constants ──────────────────────────────────────────────
const UNLOCK_KEY = 'shranix_settings_unlocked';

// ═══════════════════════════════════════════════════════════
// PASSWORD INPUT (Settings hub lock screens)
// ═══════════════════════════════════════════════════════════
// Shared UI helpers (Toggle, FieldText, SectionCard, ErrorBanner, SaveButton)
// ab './settings-ui' mein hain — section files ke saath circular import se bachne ke liye.

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-11 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function LockScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="animate-in fade-in slide-in-from-bottom-2 w-full max-w-md duration-300">
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PASSWORD GATE SCREENS
// ═══════════════════════════════════════════════════════════

function SetPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await apiRequest('/finance/settings/security/set', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LockScreenShell>
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 p-8 shadow-xl dark:border-emerald-800/40 dark:from-emerald-950/40 dark:via-slate-800 dark:to-slate-800">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40">
          <ShieldCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Set a Password for Settings
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-500 dark:text-slate-400">
          Only you will be able to open the Settings page — a password will be required each time.
        </p>

        <div className="mt-6 space-y-3">
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="New password (min 4 characters)"
            autoFocus
          />
          <PasswordInput value={confirm} onChange={setConfirm} placeholder="Confirm password" />
        </div>

        {error && <ErrorBanner message={error} />}

        <button
          onClick={submit}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          Set Password
        </button>
      </div>
    </LockScreenShell>
  );
}

function EnterPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await apiRequest<{ valid: boolean }>('/finance/settings/security/verify', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      if (!res?.valid) {
        setError('Incorrect password — please try again');
        return;
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LockScreenShell>
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/50 p-8 shadow-xl dark:border-blue-800/40 dark:from-blue-950/40 dark:via-slate-800 dark:to-slate-800">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40">
          <Lock className="h-7 w-7 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Settings is Protected
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-500 dark:text-slate-400">
          Enter the password to open the Settings hub.
        </p>

        <div className="mt-6">
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="Settings password"
            autoFocus
          />
        </div>

        {error && <ErrorBanner message={error} />}

        <button
          onClick={submit}
          disabled={busy || password.length === 0}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Unlock Settings
        </button>
      </div>
    </LockScreenShell>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION 1 — COMPANY & LICENSE
// ═══════════════════════════════════════════════════════════

interface CompanyRecord {
  id?: string;
  name: string;
  alias?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  licenseNo?: string;
  pesticidesLicense?: string;
  seedsLicense?: string;
  cottonLicense?: string;
  fertilizerLicense?: string;
  retailLicense?: string;
  logo?: string;
  stamp?: string;
  digitalSignature?: string;
  invoiceSignature?: string;
  emailLogo?: string;
  invoiceFooter?: string;
  qrLogo?: string;
  currency?: string;
  financialYearStart?: string;
  isHeadOffice?: boolean;
  isActive?: boolean;
}

const EMPTY_COMPANY: CompanyRecord = {
  name: '',
  alias: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
  website: '',
  gstin: '',
  pan: '',
  cin: '',
  licenseNo: '',
  pesticidesLicense: '',
  seedsLicense: '',
  cottonLicense: '',
  fertilizerLicense: '',
  retailLicense: '',
  logo: '',
  stamp: '',
  digitalSignature: '',
  invoiceSignature: '',
  emailLogo: '',
  invoiceFooter: '',
  qrLogo: '',
  currency: 'INR',
  financialYearStart: 'April',
  isHeadOffice: false,
  isActive: true,
};

// ── Branding image helpers ───────────────────────────────
// File ko base64 data-URL mein read karta hai (client-side resize ke saath taaki
// DB mein bhari payload na jaye — 10mb body limit se kaafi chhota rakhta hai).
function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function resizeImage(dataUrl: string, maxDim = 512, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const isPng = dataUrl.startsWith('data:image/png');
        resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function BrandImageSlot({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const raw = await readImageFile(file);
      onChange(await resizeImage(raw));
    } catch {
      setErr('Could not read this image — try a PNG, JPG or WebP file');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-600 dark:bg-slate-800/60">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/40">
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-contain" />
        ) : (
          <ImageIcon className="h-5 w-5 text-slate-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</p>
        {hint && <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>}
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {value ? 'Replace' : 'Upload'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          )}
        </div>
        {err && <p className="mt-1 text-[10px] font-medium text-rose-500">{err}</p>}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function CompanySection() {
  const [list, setList] = useState<CompanyRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [form, setForm] = useState<CompanyRecord>(EMPTY_COMPANY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = (await apiRequest<{ data?: CompanyRecord[] }>('/companies')) as unknown;
      const rows = (
        Array.isArray(res) ? res : ((res as { data?: CompanyRecord[] })?.data ?? [])
      ) as CompanyRecord[];
      setList(rows);
      const active = rows.find((c) => c.isActive !== false) ?? rows[0];
      if (active) {
        setSelectedId(active.id ?? '');
        setForm({ ...EMPTY_COMPANY, ...active });
        setCreating(false);
      } else {
        setSelectedId('');
        setForm(EMPTY_COMPANY);
        setCreating(true);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = (key: keyof CompanyRecord, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  // Only send editable fields — don't PUT back meta fields (id, createdAt, etc.)
  const editablePayload = (c: CompanyRecord): Record<string, unknown> => ({
    name: c.name,
    alias: c.alias ?? '',
    address: c.address ?? '',
    city: c.city ?? '',
    state: c.state ?? '',
    pincode: c.pincode ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    website: c.website ?? '',
    gstin: c.gstin ?? '',
    pan: c.pan ?? '',
    cin: c.cin ?? '',
    licenseNo: c.licenseNo ?? '',
    pesticidesLicense: c.pesticidesLicense ?? '',
    seedsLicense: c.seedsLicense ?? '',
    cottonLicense: c.cottonLicense ?? '',
    fertilizerLicense: c.fertilizerLicense ?? '',
    retailLicense: c.retailLicense ?? '',
    logo: c.logo ?? '',
    stamp: c.stamp ?? '',
    digitalSignature: c.digitalSignature ?? '',
    invoiceSignature: c.invoiceSignature ?? '',
    emailLogo: c.emailLogo ?? '',
    invoiceFooter: c.invoiceFooter ?? '',
    qrLogo: c.qrLogo ?? '',
    currency: c.currency ?? 'INR',
    financialYearStart: c.financialYearStart ?? 'April',
    isHeadOffice: Boolean(c.isHeadOffice),
    isActive: c.isActive !== false,
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Company name is required');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      if (creating) {
        const created = await apiRequest<CompanyRecord>('/companies', {
          method: 'POST',
          body: JSON.stringify(editablePayload(form)),
        });
        const createdId = created?.id;
        await load();
        if (createdId) {
          setSelectedId(createdId);
        }
      } else if (selectedId) {
        await apiRequest(`/companies/${selectedId}`, {
          method: 'PUT',
          body: JSON.stringify(editablePayload(form)),
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const startNew = () => {
    setForm(EMPTY_COMPANY);
    setCreating(true);
    setSelectedId('');
    setSaved(false);
  };

  return (
    <div className="space-y-6">
      {list.length > 1 && !creating && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Company:</span>
          {list.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedId(c.id ?? '');
                setForm({ ...EMPTY_COMPANY, ...c });
                setCreating(false);
                setSaved(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                selectedId === c.id
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Store className="h-3 w-3" />
              {c.name}
            </button>
          ))}
          <button
            onClick={startNew}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-600"
          >
            <Plus className="h-3 w-3" /> New Company
          </button>
        </div>
      )}

      <SectionCard
        title={creating ? 'Create Account / Company' : 'Company & License'}
        description="Business entity details — GSTIN, PAN, CIN and license numbers"
        icon={<Building2 className="h-5 w-5" />}
        tint="emerald"
      >
        {/* Horizontal compact grid — auto-fit: kisi bhi screen par multi-column */}
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          <div className="col-span-full">
            <FieldText
              label="Company Name *"
              value={form.name}
              onChange={(v) => update('name', v)}
              placeholder="e.g. SHRANIX Krushi Farms Pvt Ltd"
            />
          </div>
          <FieldText
            label="Alias"
            value={form.alias ?? ''}
            onChange={(v) => update('alias', v)}
            placeholder="Short name"
          />
          <FieldText
            label="Website"
            value={form.website ?? ''}
            onChange={(v) => update('website', v)}
            placeholder="https://example.com"
          />
          <FieldText
            label="Currency"
            value={form.currency ?? 'INR'}
            onChange={(v) => update('currency', v)}
            placeholder="INR"
          />
          <FieldText
            label="GSTIN"
            value={form.gstin ?? ''}
            onChange={(v) => update('gstin', v)}
            placeholder="22AAAAA0000A1Z5"
            hint="15-digit GSTIN"
          />
          <FieldText
            label="License No"
            value={form.licenseNo ?? ''}
            onChange={(v) => update('licenseNo', v)}
            placeholder="FSSAI / trade license"
          />
          <FieldText
            label="PAN"
            value={form.pan ?? ''}
            onChange={(v) => update('pan', v)}
            placeholder="AAAAA0000A"
          />
          <FieldText
            label="CIN"
            value={form.cin ?? ''}
            onChange={(v) => update('cin', v)}
            placeholder="U12345MH2020PTC123456"
          />
          <FieldText
            label="Phone"
            value={form.phone ?? ''}
            onChange={(v) => update('phone', v)}
            placeholder="+91-9876543210"
          />
          <FieldText
            label="Email"
            value={form.email ?? ''}
            onChange={(v) => update('email', v)}
            type="email"
            placeholder="company@example.com"
          />
          <div className="col-span-full">
            <label className="block">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Address
              </span>
              <textarea
                value={form.address ?? ''}
                onChange={(e) => update('address', e.target.value)}
                rows={1}
                placeholder="Street, building, area..."
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
              />
            </label>
          </div>
          <FieldText
            label="City"
            value={form.city ?? ''}
            onChange={(v) => update('city', v)}
            placeholder="City"
          />
          <FieldText
            label="State"
            value={form.state ?? ''}
            onChange={(v) => update('state', v)}
            placeholder="State"
          />
          <FieldText
            label="Pincode"
            value={form.pincode ?? ''}
            onChange={(v) => update('pincode', v)}
            placeholder="PIN code"
          />
        </div>

        {/* Business Licenses — compact horizontal row */}
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Landmark className="h-3.5 w-3.5" /> Business Licenses — shown on invoice print
          </p>
          <div className="mt-2 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
            <FieldText
              label="Pesticides License No"
              value={form.pesticidesLicense ?? ''}
              onChange={(v) => update('pesticidesLicense', v)}
              placeholder="e.g. LAIID09140035"
            />
            <FieldText
              label="Fertilizer License No"
              value={form.fertilizerLicense ?? ''}
              onChange={(v) => update('fertilizerLicense', v)}
              placeholder="e.g. LAFD09140031"
            />
            <FieldText
              label="Seeds License No"
              value={form.seedsLicense ?? ''}
              onChange={(v) => update('seedsLicense', v)}
              placeholder="e.g. LASD09140146"
            />
            <FieldText
              label="Cotton License No"
              value={form.cottonLicense ?? ''}
              onChange={(v) => update('cottonLicense', v)}
              placeholder="e.g. LACD09140032"
            />
            <FieldText
              label="Retail License No"
              value={form.retailLicense ?? ''}
              onChange={(v) => update('retailLicense', v)}
              placeholder="Retail / shop license"
            />
          </div>
        </div>

        {/* Company Branding — logo, stamp, signatures, footer, QR */}
        <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-800 dark:bg-teal-950/20">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            <Palette className="h-3.5 w-3.5" /> Company Branding — used on invoices, emails &amp;
            prints
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <BrandImageSlot
              label="Company Logo"
              value={form.logo ?? ''}
              onChange={(v) => update('logo', v)}
              hint="Header of invoice / email"
            />
            <BrandImageSlot
              label="Business Stamp"
              value={form.stamp ?? ''}
              onChange={(v) => update('stamp', v)}
              hint="Rubber stamp on print"
            />
            <BrandImageSlot
              label="Digital Signature"
              value={form.digitalSignature ?? ''}
              onChange={(v) => update('digitalSignature', v)}
              hint="Authorised signatory"
            />
            <BrandImageSlot
              label="Invoice Signature"
              value={form.invoiceSignature ?? ''}
              onChange={(v) => update('invoiceSignature', v)}
              hint="Signature on invoice"
            />
            <BrandImageSlot
              label="Email Header Logo"
              value={form.emailLogo ?? ''}
              onChange={(v) => update('emailLogo', v)}
              hint="For SMS/email branding"
            />
            <BrandImageSlot
              label="QR Logo"
              value={form.qrLogo ?? ''}
              onChange={(v) => update('qrLogo', v)}
              hint="Center logo of QR code"
            />
          </div>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Invoice Footer
            </span>
            <textarea
              value={form.invoiceFooter ?? ''}
              onChange={(e) => update('invoiceFooter', e.target.value)}
              rows={2}
              placeholder="e.g. Thank you for your business! Goods once sold will not be taken back. Subject to jurisdiction."
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            />
          </label>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={Boolean(form.isHeadOffice)}
              onChange={(e) => update('isHeadOffice', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Head Office
          </label>
          <SaveButton
            busy={saving}
            saved={saved}
            onClick={handleSave}
            label={creating ? 'Create Company' : 'Save Company'}
          />
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — FINANCIAL YEAR
// ═══════════════════════════════════════════════════════════

interface FiscalYearRecord {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  isClosed?: boolean;
}

function FinancialYearSection() {
  const [list, setList] = useState<FiscalYearRecord[]>([]);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await apiRequest<{ data?: FiscalYearRecord[] }>('/financial-years')) as unknown;
      const rows = (
        Array.isArray(res) ? res : ((res as { data?: FiscalYearRecord[] })?.data ?? [])
      ) as FiscalYearRecord[];
      setList(rows);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.name || !form.startDate || !form.endDate) {
      setError('Name, start and end dates are required');
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await apiRequest('/financial-years', {
        method: 'POST',
        body: JSON.stringify({ ...form, isActive: list.length === 0 }),
      });
      setForm({ name: '', startDate: '', endDate: '' });
      await load();
      setMsg('Financial year created ✅');
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleActivate = async (fy: FiscalYearRecord) => {
    if (fy.isActive) {
      return;
    }
    setActivating(fy.id);
    setError(null);
    try {
      // Deactivate other active FYs first, then activate chosen one
      await Promise.all(
        list
          .filter((f) => f.isActive && f.id !== fy.id)
          .map((f) =>
            apiRequest(`/financial-years/${f.id}`, {
              method: 'PUT',
              body: JSON.stringify({ isActive: false }),
            }),
          ),
      );
      await apiRequest(`/financial-years/${fy.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: true }),
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActivating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Financial Year"
        description="Set the current financial year for your accounting cycle"
        icon={<CalendarDays className="h-5 w-5" />}
        tint="blue"
      >
        {list.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No financial year yet — create your first one below.
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((fy) => (
              <div
                key={fy.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all ${
                  fy.isActive
                    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                    : 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {fy.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {fy.startDate?.slice(0, 10) ?? '—'} → {fy.endDate?.slice(0, 10) ?? '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {fy.isClosed && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      🔒 Closed
                    </span>
                  )}
                  {fy.isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                      <Check className="h-3 w-3" /> Active
                    </span>
                  ) : (
                    <button
                      onClick={() => handleActivate(fy)}
                      disabled={activating === fy.id}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300"
                    >
                      {activating === fy.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Set Active'
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="New Financial Year"
        description="Add a new accounting period"
        icon={<Plus className="h-5 w-5" />}
        tint="sky"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <FieldText
            label="FY Name"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. 2026-2027"
          />
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Start Date
            </span>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">End Date</span>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            />
          </label>
        </div>
        {error && (
          <div className="mt-3">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}
        {msg && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" /> {msg}
          </p>
        )}
        <div className="mt-5">
          <SaveButton busy={busy} saved={false} onClick={handleCreate} label="Add Financial Year" />
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — MODULE SETTINGS (config-driven single-row forms)
// ═══════════════════════════════════════════════════════════

interface SettingFieldDef {
  key: string;
  label: string;
  type: 'boolean' | 'number' | 'text' | 'select';
  options?: { label: string; value: string }[];
  hint?: string;
}

interface ModuleSettingsConfig {
  id: string;
  label: string;
  description: string;
  apiPath: string;
  fields: SettingFieldDef[];
}

const MODULE_CONFIGS: ModuleSettingsConfig[] = [
  {
    id: 'finance',
    label: 'Finance',
    description: 'Voucher numbering, approval levels, currency',
    apiPath: '/finance/settings',
    fields: [
      { key: 'autoVoucherNumber', label: 'Auto Voucher Numbering', type: 'boolean' },
      { key: 'voucherPrefix', label: 'Voucher Prefix', type: 'text' },
      { key: 'voucherNextNumber', label: 'Next Voucher Number', type: 'number' },
      { key: 'roundOffDecimals', label: 'Round Off Decimals', type: 'number' },
      { key: 'allowNegativeBalance', label: 'Allow Negative Balance', type: 'boolean' },
      { key: 'enforceDebitCreditEquality', label: 'Enforce Debit = Credit', type: 'boolean' },
      { key: 'requireApproval', label: 'Require Approval', type: 'boolean' },
      { key: 'approvalLevels', label: 'Approval Levels', type: 'number' },
      { key: 'currency', label: 'Currency', type: 'text' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    description: 'Approvals, discount & credit rules, alerts, numbering',
    apiPath: '/sales/settings',
    fields: [
      { key: 'autoInvoiceNumber', label: 'Auto Invoice Numbering', type: 'boolean' },
      { key: 'invoicePrefix', label: 'Invoice Prefix', type: 'text' },
      { key: 'invoiceNextNumber', label: 'Next Invoice Number', type: 'number' },
      { key: 'autoQuoteNumber', label: 'Auto Quote Numbering', type: 'boolean' },
      { key: 'quotePrefix', label: 'Quote Prefix', type: 'text' },
      { key: 'quoteNextNumber', label: 'Next Quote Number', type: 'number' },
      { key: 'autoOrderNumber', label: 'Auto Order Numbering', type: 'boolean' },
      { key: 'orderPrefix', label: 'Order Prefix', type: 'text' },
      { key: 'orderNextNumber', label: 'Next Order Number', type: 'number' },
      { key: 'challanPrefix', label: 'Challan Prefix', type: 'text' },
      { key: 'challanNextNumber', label: 'Next Challan Number', type: 'number' },
      { key: 'returnPrefix', label: 'Return Prefix', type: 'text' },
      { key: 'returnNextNumber', label: 'Next Return Number', type: 'number' },
      {
        key: 'quotationExpiryDays',
        label: 'Quotation Expiry (days)',
        type: 'number',
        hint: 'नवीन quotations ला आपोआप validTill मिळते',
      },
      { key: 'requireApproval', label: 'Require Sales Approval', type: 'boolean' },
      { key: 'approvalLevels', label: 'Approval Levels', type: 'number' },
      {
        key: 'discountApproval',
        label: 'Discount Approval',
        type: 'boolean',
        hint: 'Limit पेक्षा जास्त discount साठी approval लागते',
      },
      { key: 'discountApprovalLimit', label: 'Discount Approval Limit (%)', type: 'number' },
      {
        key: 'enforceCreditLimit',
        label: 'Enforce Credit Limit',
        type: 'boolean',
        hint: 'OFF केल्यास बिल credit limit ने block होत नाही',
      },
      { key: 'overdueAlert', label: 'Overdue Alert', type: 'boolean' },
      { key: 'overdueAlertDays', label: 'Overdue Alert (days before)', type: 'number' },
      {
        key: 'salesmanMandatory',
        label: 'Salesman Mandatory',
        type: 'boolean',
        hint: 'ON केल्यास invoice शिवाय salesman जरूरी',
      },
      { key: 'gstEnabled', label: 'GST Enabled', type: 'boolean' },
      { key: 'roundOffDecimals', label: 'Round Off Decimals', type: 'number' },
      {
        key: 'defaultPaymentTerms',
        label: 'Default Payment Terms',
        type: 'text',
        hint: 'नवीन customer ला payment terms आपोआप लागतात',
      },
      {
        key: 'defaultCreditLimit',
        label: 'Default Credit Limit',
        type: 'number',
        hint: 'नवीन customer ला default credit limit',
      },
      {
        key: 'customerGroups',
        label: 'Customer Groups',
        type: 'text',
        hint: 'Comma separated — उदा. Retail, Wholesale, Distributor',
      },
      { key: 'defaultCustomerGroup', label: 'Default Customer Group', type: 'text' },
      {
        key: 'loyaltyEnabled',
        label: 'Loyalty Program',
        type: 'boolean',
        hint: 'ON केल्यास invoice वर loyalty points मिळतात',
      },
      { key: 'loyaltyPointsPerAmount', label: 'Loyalty Points per ₹100', type: 'number' },
      {
        key: 'defaultPriceList',
        label: 'Default Price List',
        type: 'select',
        options: [
          { label: 'Standard', value: 'standard' },
          { label: 'Wholesale', value: 'wholesale' },
          { label: 'Retail', value: 'retail' },
          { label: 'Promotional', value: 'promotional' },
          { label: 'Contract', value: 'contract' },
        ],
      },
      {
        key: 'gstValidation',
        label: 'GST Validation',
        type: 'boolean',
        hint: 'ON केल्यास चुकीचा GSTIN स्वीकारला जात नाही',
      },
      {
        key: 'panValidation',
        label: 'PAN Validation',
        type: 'boolean',
        hint: 'ON केल्यास चुकीचा PAN स्वीकारला जात नाही',
      },
    ],
  },
  {
    id: 'purchase',
    label: 'Purchase',
    description: 'Auto GRN, approvals, credit days, defaults & numbering',
    apiPath: '/purchase/settings',
    fields: [
      { key: 'autoPoNumber', label: 'Auto PO Numbering', type: 'boolean' },
      { key: 'poPrefix', label: 'PO Prefix', type: 'text' },
      { key: 'poNextNumber', label: 'Next PO Number', type: 'number' },
      { key: 'quotationPrefix', label: 'Quotation Prefix', type: 'text' },
      { key: 'quotationNextNumber', label: 'Next Quotation Number', type: 'number' },
      { key: 'grnPrefix', label: 'GRN Prefix', type: 'text' },
      { key: 'grnNextNumber', label: 'Next GRN Number', type: 'number' },
      { key: 'invoicePrefix', label: 'Invoice Prefix', type: 'text' },
      { key: 'invoiceNextNumber', label: 'Next Invoice Number', type: 'number' },
      { key: 'returnPrefix', label: 'Purchase Return Prefix', type: 'text' },
      { key: 'returnNextNumber', label: 'Next Return Number', type: 'number' },
      {
        key: 'autoGrn',
        label: 'Auto GRN on PO Approval',
        type: 'boolean',
        hint: 'Approve होताच PO ची GRN आपोआप तयार होते',
      },
      { key: 'requireApproval', label: 'Require Purchase Approval', type: 'boolean' },
      { key: 'approvalLevels', label: 'Approval Levels', type: 'number' },
      {
        key: 'supplierCreditDays',
        label: 'Supplier Credit Days',
        type: 'number',
        hint: 'नवीन suppliers साठी default credit days',
      },
      {
        key: 'defaultSupplierCategory',
        label: 'Supplier Category (Default)',
        type: 'text',
        hint: 'नवीन supplier ला ही category आपोआप लागते — उदा. Local, Distributor, Importer',
      },
      {
        key: 'defaultVendorRating',
        label: 'Vendor Rating (Default)',
        type: 'select',
        options: [
          { label: '⭐ 1 — Poor', value: '1' },
          { label: '⭐⭐ 2 — Fair', value: '2' },
          { label: '⭐⭐⭐ 3 — Good', value: '3' },
          { label: '⭐⭐⭐⭐ 4 — Very Good', value: '4' },
          { label: '⭐⭐⭐⭐⭐ 5 — Excellent', value: '5' },
        ],
        hint: 'नवीन vendors ची default rating (1–5)',
      },
      {
        key: 'defaultGstRate',
        label: 'Default GST Rate (%)',
        type: 'number',
        hint: 'नवीन supplier वर default GST rate लागतो',
      },
      {
        key: 'requireVendorApproval',
        label: 'Vendor Approval Required',
        type: 'boolean',
        hint: 'ON केल्यास नवीन vendor ला वापरण्याआधी approval लागते',
      },
      {
        key: 'defaultPaymentTerms',
        label: 'Default Payment Terms',
        type: 'text',
        hint: 'नवीन supplier / PO ला payment terms आपोआप लागतात',
      },
      { key: 'defaultTaxGroupId', label: 'Default Tax Group', type: 'text' },
      { key: 'defaultWarehouseId', label: 'Default Warehouse', type: 'text' },
      {
        key: 'defaultPaymentMode',
        label: 'Default Payment Mode',
        type: 'select',
        options: [
          { label: 'Credit', value: 'credit' },
          { label: 'Cash', value: 'cash' },
          { label: 'UPI', value: 'upi' },
          { label: 'Bank Transfer', value: 'bank_transfer' },
        ],
      },
      { key: 'gstEnabled', label: 'GST Enabled', type: 'boolean' },
      { key: 'roundOffDecimals', label: 'Round Off Decimals', type: 'number' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Valuation method, batch/serial/expiry tracking',
    apiPath: '/inventory/settings',
    fields: [
      {
        key: 'method',
        label: 'Valuation Method',
        type: 'select',
        options: [
          { label: 'FIFO', value: 'fifo' },
          { label: 'LIFO', value: 'lifo' },
          { label: 'Weighted Average', value: 'weighted_average' },
          { label: 'Standard', value: 'standard' },
        ],
      },
      {
        key: 'stockValuation',
        label: 'Stock Valuation',
        type: 'select',
        options: [
          { label: 'Cost', value: 'cost' },
          { label: 'MRP', value: 'mrp' },
          { label: 'Sales', value: 'sales' },
        ],
      },
      { key: 'negativeStock', label: 'Allow Negative Stock', type: 'boolean' },
      { key: 'autoReorder', label: 'Auto Reorder', type: 'boolean' },
      { key: 'batchTracking', label: 'Batch Tracking', type: 'boolean' },
      { key: 'serialTracking', label: 'Serial Tracking', type: 'boolean' },
      { key: 'expiryTracking', label: 'Expiry Tracking', type: 'boolean' },
      { key: 'enableWarehouse', label: 'Enable Warehouse', type: 'boolean' },
      { key: 'roundOff', label: 'Round Off Decimals', type: 'number' },
    ],
  },
];

function ModuleSettingsForm({ config }: { config: ModuleSettingsConfig }) {
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await apiRequest<Record<string, unknown>>(config.apiPath)) || {};
      setForm(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [config.apiPath]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  // Only PUT fields defined in config (not GET meta fields)
  const payload = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const field of config.fields) {
      if (form[field.key] !== undefined) {
        out[field.key] = form[field.key];
      }
    }
    return out;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest(config.apiPath, {
        method: 'PUT',
        body: JSON.stringify(payload()),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {config.fields.map((field) => {
          if (field.type === 'boolean') {
            return (
              <div
                key={field.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {field.label}
                  </p>
                  {field.hint && <p className="text-xs text-slate-400">{field.hint}</p>}
                </div>
                <Toggle checked={Boolean(form[field.key])} onChange={(v) => set(field.key, v)} />
              </div>
            );
          }
          if (field.type === 'select') {
            return (
              <label key={field.key} className="block">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {field.label}
                </span>
                <select
                  value={String(form[field.key] ?? '')}
                  onChange={(e) => set(field.key, e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
                >
                  <option value="">— Select —</option>
                  {field.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          }
          return (
            <label key={field.key} className="block">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {field.label}
              </span>
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                value={String(form[field.key] ?? (field.type === 'number' ? 0 : ''))}
                onChange={(e) =>
                  set(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)
                }
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
              />
            </label>
          );
        })}
      </div>
      <SaveButton
        busy={saving}
        saved={saved}
        onClick={handleSave}
        label={`Save ${config.label} Settings`}
      />
    </div>
  );
}

function ModuleSettingsSection() {
  const [active, setActive] = useState(MODULE_CONFIGS[0].id);
  const activeConfig = useMemo(
    () => MODULE_CONFIGS.find((c) => c.id === active) ?? MODULE_CONFIGS[0],
    [active],
  );

  return (
    <div className="space-y-6">
      {/* Module pill tabs */}
      <div className="flex flex-wrap gap-2">
        {MODULE_CONFIGS.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              active === c.id
                ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {active === c.id && <Check className="h-3.5 w-3.5" />}
            {c.label}
          </button>
        ))}
      </div>

      <SectionCard
        title={`${activeConfig.label} Settings`}
        description={activeConfig.description}
        icon={<SlidersHorizontal className="h-5 w-5" />}
        tint="indigo"
      >
        <ModuleSettingsForm key={activeConfig.id} config={activeConfig} />
      </SectionCard>

      {/* GST & Audit — KV-based, link to full page */}
      <SectionCard
        title="GST & Audit Settings"
        description="GST registrations (GSTIN), return periods, audit & closing settings"
        icon={<Landmark className="h-5 w-5" />}
        tint="violet"
      >
        <Link
          to="/gst/settings"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
        >
          Open GST & Audit Settings <ChevronRight className="h-4 w-4" />
        </Link>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION 3b — DASHBOARD SETTINGS (widgets & appearance)
// Client-side preferences (localStorage) — changes apply instantly.
// ═══════════════════════════════════════════════════════════

function DashboardSettingsSection() {
  const { preferences, setPreference, setWidget, resetPreferences } = usePreferences();
  const [flash, setFlash] = useState(false);

  const flashSaved = () => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1600);
  };

  const change = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreference(key, value);
    flashSaved();
  };

  const landingOptions = USER_MODULES.map((m) => ({
    label: `${m.emoji} ${m.label} — ${m.landingPath}`,
    value: m.landingPath,
  }));

  const selectCls =
    'mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800';

  return (
    <div className="space-y-6">
      <SectionCard
        title="Dashboard Settings"
        description="Widgets ON/OFF, dark mode, compact mode, language, landing page & theme color"
        icon={<LayoutDashboard className="h-5 w-5" />}
        tint="emerald"
      >
        {/* ── Widgets ON/OFF ── */}
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Widgets — dashboard var konte sections
          dikhne chahiye
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {WIDGET_DEFS.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5 transition-colors dark:border-slate-700 dark:bg-slate-800/60"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{w.label}</p>
                <p className="truncate text-xs text-slate-400">{w.hint}</p>
              </div>
              <Toggle
                checked={preferences.widgets[w.id]}
                onChange={(v) => {
                  setWidget(w.id, v);
                  flashSaved();
                }}
              />
            </div>
          ))}
        </div>

        {/* ── Appearance row ── */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Dark Mode
            </span>
            <select
              value={preferences.darkMode}
              onChange={(e) => change('darkMode', e.target.value as Preferences['darkMode'])}
              className={selectCls}
            >
              <option value="light">☀️ Light</option>
              <option value="dark">🌙 Dark</option>
              <option value="system">🖥️ System</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Language</span>
            <select
              value={preferences.language}
              onChange={(e) => change('language', e.target.value as Preferences['language'])}
              className={selectCls}
            >
              <option value="en">English</option>
              <option value="mr">मराठी</option>
            </select>
          </label>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 sm:col-span-2 dark:border-slate-700 dark:bg-slate-800/60">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Compact Mode</p>
              <p className="text-xs text-slate-400">
                घट्ट layout — एका स्क्रीनवर जास्त माहिती दिसते
              </p>
            </div>
            <Toggle checked={preferences.compactMode} onChange={(v) => change('compactMode', v)} />
          </div>
        </div>

        {/* ── Default Landing Page ── */}
        <label className="mt-6 block">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Default Landing Page — login नंतर सरळ या page वर नेले जाईल
          </span>
          <select
            value={preferences.landingPage}
            onChange={(e) => change('landingPage', e.target.value)}
            className={selectCls}
          >
            {landingOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {/* ── Theme Color ── */}
        <p className="mb-2 mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Palette className="h-3.5 w-3.5" /> Theme Color — app चा primary color
        </p>
        <div className="flex flex-wrap gap-2.5">
          {(Object.keys(THEME_COLORS) as Array<keyof typeof THEME_COLORS>).map((key) => {
            const c = THEME_COLORS[key];
            const active = preferences.themeColor === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => change('themeColor', key)}
                className={`group flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all hover:scale-[1.03] ${
                  active
                    ? 'border-emerald-500 bg-emerald-50 shadow-md dark:bg-emerald-900/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                }`}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full shadow-inner transition-transform group-hover:scale-110"
                  style={{ backgroundColor: c.swatch }}
                >
                  {active && <Check className="h-4 w-4 text-white" />}
                </span>
                <span
                  className={`text-[11px] font-medium ${active ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Footer: saved flash + reset ── */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {flash ? (
            <p className="animate-in fade-in flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" /> Saved — या device वर लागू झाले
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Changes apply instantly &amp; are saved on this device.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              resetPreferences();
              flashSaved();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reset to Defaults
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — SECURITY (settings password)
// ═══════════════════════════════════════════════════════════

function SecuritySection() {
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleChangePassword = async () => {
    setMsg(null);
    if (newPass.length < 4) {
      setMsg({ ok: false, text: 'New password must be at least 4 characters' });
      return;
    }
    if (newPass !== confirmPass) {
      setMsg({ ok: false, text: 'New passwords do not match' });
      return;
    }
    setBusy(true);
    try {
      await apiRequest('/finance/settings/security/change', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: curPass, newPassword: newPass }),
      });
      setMsg({ ok: true, text: 'Password updated ✅' });
      setCurPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Settings Password"
        description="Change the password used to open the Settings hub"
        icon={<KeyRound className="h-5 w-5" />}
        tint="rose"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <PasswordInput value={curPass} onChange={setCurPass} placeholder="Current password" />
          <PasswordInput value={newPass} onChange={setNewPass} placeholder="New password" />
          <PasswordInput
            value={confirmPass}
            onChange={setConfirmPass}
            placeholder="Confirm new password"
          />
        </div>
        {msg && (
          <p
            className={`mt-3 flex items-center gap-1.5 text-sm ${msg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {msg.ok ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {msg.text}
          </p>
        )}
        <button
          onClick={handleChangePassword}
          disabled={busy || !curPass || !newPass}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-400 dark:hover:bg-slate-700"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Change Password
        </button>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — USERS (user creation + list)
// ═══════════════════════════════════════════════════════════

interface UserRecord {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
  allowedModules?: string[] | string | null;
}

function UsersSection() {
  const [list, setList] = useState<UserRecord[]>([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const toggleModule = (key: string) => {
    setAllowedModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key],
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiRequest<{ data?: UserRecord[] }>('/users')) as unknown;
      const rows = (
        Array.isArray(res) ? res : ((res as { data?: UserRecord[] })?.data ?? [])
      ) as UserRecord[];
      setList(rows);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleCreate = async () => {
    setError(null);
    setMsg(null);
    if (!form.firstName.trim() || !form.email.trim()) {
      setError('First name and email are required');
      return;
    }
    if (form.password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
          // Only send ticked modules — no ticks = full access (admin)
          allowedModules: allowedModules.length > 0 ? allowedModules : undefined,
        }),
      });
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' });
      setAllowedModules([]);
      await load();
      setMsg('User created ✅ — they can now log in');
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="User Creation"
        description="Create new users — they log in with email and password"
        icon={<Users className="h-5 w-5" />}
        tint="violet"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldText
            label="First Name *"
            value={form.firstName}
            onChange={(v) => update('firstName', v)}
            placeholder="e.g. Rahul"
          />
          <FieldText
            label="Last Name"
            value={form.lastName}
            onChange={(v) => update('lastName', v)}
            placeholder="e.g. Sharma"
          />
          <FieldText
            label="Email *"
            value={form.email}
            onChange={(v) => update('email', v)}
            type="email"
            placeholder="user@company.com"
          />
          <FieldText
            label="Phone"
            value={form.phone}
            onChange={(v) => update('phone', v)}
            placeholder="+91-9876543210"
          />
          <PasswordInput
            value={form.password}
            onChange={(v) => update('password', v)}
            placeholder="Password (min 4 chars)"
          />
          <PasswordInput
            value={form.confirm}
            onChange={(v) => update('confirm', v)}
            placeholder="Confirm password"
          />
        </div>

        {/* Module-wise access — only ticked modules are visible to the user */}
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Module Access — only ticked modules are
            visible
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            No ticks = full access (admin). Tick modules to restrict what the user sees after login.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {USER_MODULES.map((m) => {
              const checked = allowedModules.includes(m.key);
              return (
                <label
                  key={m.key}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    checked
                      ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleModule(m.key)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">
                    {m.emoji} {m.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}
        {msg && (
          <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" /> {msg}
          </p>
        )}
        <div className="mt-5">
          <SaveButton busy={busy} saved={false} onClick={handleCreate} label="Create User" />
        </div>
      </SectionCard>

      <SectionCard
        title="Users"
        description="All users who can log in"
        icon={<Users className="h-5 w-5" />}
        tint="blue"
      >
        {loading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No users yet — create the first one above.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5">Module Access</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {list.map((u) => {
                  const modules = parseAllowedModules(u) ?? [];
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{u.email}</td>
                      <td className="px-4 py-2.5">
                        {modules.length === 0 ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                            Full access
                          </span>
                        ) : (
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {modules.slice(0, 4).map((m) => (
                              <span
                                key={m}
                                className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                              >
                                {MODULE_LABELS[m] ?? m}
                              </span>
                            ))}
                            {modules.length > 4 && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                                +{modules.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {u.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            <Check className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — BANKING (Company Bank Accounts)
// ═══════════════════════════════════════════════════════════

interface BankAccountRecord {
  id: string;
  companyId?: string;
  bankName: string;
  accountHolderName?: string;
  accountNumber?: string;
  accountType?: string;
  ifsc?: string;
  swiftCode?: string;
  upiId?: string;
  chequeFormat?: string;
  isDefault?: boolean;
  neftEnabled?: boolean;
  rtgsEnabled?: boolean;
  impsEnabled?: boolean;
  isActive?: boolean;
}

const EMPTY_BANK_FORM = {
  bankName: '',
  accountHolderName: '',
  accountNumber: '',
  accountType: 'savings',
  ifsc: '',
  swiftCode: '',
  upiId: '',
  chequeFormat: 'standard',
};

const ACCOUNT_TYPES = [
  { label: 'Savings', value: 'savings' },
  { label: 'Current', value: 'current' },
  { label: 'Cash Credit (CC)', value: 'cash_credit' },
  { label: 'Overdraft (OD)', value: 'overdraft' },
  { label: 'Loan', value: 'loan' },
];

function maskAccount(no?: string): string {
  if (!no) {
    return '—';
  }
  const clean = no.replace(/\s+/g, '');
  if (clean.length <= 4) {
    return clean;
  }
  return `•••• ${clean.slice(-4)}`;
}

function BankingSection() {
  const [companyId, setCompanyId] = useState<string>('');
  const [list, setList] = useState<BankAccountRecord[]>([]);
  const [form, setForm] = useState(EMPTY_BANK_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(
    async (cid?: string) => {
      setLoading(true);
      setError(null);
      try {
        // Pehle company context chahiye (accounts company se linked hote hain)
        let targetCid = cid || companyId;
        if (!targetCid) {
          const res = (await apiRequest<{ data?: Array<{ id: string }> }>('/companies')) as unknown;
          const rows = (
            Array.isArray(res) ? res : ((res as { data?: Array<{ id: string }> })?.data ?? [])
          ) as Array<{ id: string }>;
          targetCid = rows[0]?.id ?? '';
          setCompanyId(targetCid);
        }
        const res2 = (await apiRequest<{ data?: BankAccountRecord[] }>(
          `/bank-accounts?companyId=${targetCid}`,
        )) as unknown;
        const rows2 = (
          Array.isArray(res2) ? res2 : ((res2 as { data?: BankAccountRecord[] })?.data ?? [])
        ) as BankAccountRecord[];
        setList(rows2);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [companyId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const update = (key: keyof typeof EMPTY_BANK_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_BANK_FORM);
    setEditingId(null);
  };

  const startEdit = (acc: BankAccountRecord) => {
    setEditingId(acc.id);
    setForm({
      bankName: acc.bankName || '',
      accountHolderName: acc.accountHolderName ?? '',
      accountNumber: acc.accountNumber ?? '',
      accountType: acc.accountType ?? 'savings',
      ifsc: acc.ifsc ?? '',
      swiftCode: acc.swiftCode ?? '',
      upiId: acc.upiId ?? '',
      chequeFormat: acc.chequeFormat ?? 'standard',
    });
    setError(null);
    setMsg(null);
  };

  const handleSave = async () => {
    setError(null);
    setMsg(null);
    if (!form.bankName.trim()) {
      setError('Bank name is required');
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await apiRequest(`/bank-accounts/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ ...form, companyId }),
        });
      } else {
        await apiRequest('/bank-accounts', {
          method: 'POST',
          body: JSON.stringify({ ...form, companyId, isDefault: list.length === 0 }),
        });
      }
      resetForm();
      await load();
      setMsg(editingId ? 'Bank account updated ✅' : 'Bank account added ✅');
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (acc: BankAccountRecord) => {
    if (!window.confirm(`Delete bank account ${acc.bankName}?`)) {
      return;
    }
    setError(null);
    setMsg(null);
    try {
      await apiRequest(`/bank-accounts/${acc.id}`, { method: 'DELETE' });
      if (editingId === acc.id) {
        resetForm();
      }
      await load();
      setMsg('Bank account removed');
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSetDefault = async (acc: BankAccountRecord) => {
    setError(null);
    setMsg(null);
    try {
      await apiRequest(`/bank-accounts/${acc.id}/default?companyId=${companyId}`, {
        method: 'POST',
      });
      await load();
      setMsg(`${acc.bankName} is now the default bank`);
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggleMethod = async (
    acc: BankAccountRecord,
    key: 'neftEnabled' | 'rtgsEnabled' | 'impsEnabled',
  ) => {
    try {
      await apiRequest(`/bank-accounts/${acc.id}`, {
        method: 'PUT',
        body: JSON.stringify({ [key]: !acc[key] }),
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add / Edit account */}
      <SectionCard
        title={editingId ? 'Edit Bank Account' : 'Company Bank Account'}
        description={editingId ? 'Update account details' : 'Add a new company bank account'}
        icon={<Banknote className="h-5 w-5" />}
        tint="blue"
      >
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          <FieldText
            label="Bank Name *"
            value={form.bankName}
            onChange={(v) => update('bankName', v)}
            placeholder="e.g. State Bank of India"
          />
          <FieldText
            label="Account Holder"
            value={form.accountHolderName}
            onChange={(v) => update('accountHolderName', v)}
            placeholder="As per bank records"
          />
          <FieldText
            label="Account Number"
            value={form.accountNumber}
            onChange={(v) => update('accountNumber', v)}
            placeholder="Account no."
          />
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Account Type
            </span>
            <select
              value={form.accountType}
              onChange={(e) => update('accountType', e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <FieldText
            label="IFSC Code"
            value={form.ifsc}
            onChange={(v) => update('ifsc', v)}
            placeholder="SBIN0001234"
            hint="For NEFT/RTGS/IMPS transfers"
          />
          <FieldText
            label="Swift Code"
            value={form.swiftCode}
            onChange={(v) => update('swiftCode', v)}
            placeholder="SBININBBXXX"
            hint="International transfers"
          />
          <FieldText
            label="UPI ID"
            value={form.upiId}
            onChange={(v) => update('upiId', v)}
            placeholder="shop@upi"
            hint="UPI payments"
          />
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Cheque Format
            </span>
            <select
              value={form.chequeFormat}
              onChange={(e) => update('chequeFormat', e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100"
            >
              <option value="standard">Standard</option>
              <option value="custom">Custom</option>
            </select>
          </label>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}
        {msg && (
          <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" /> {msg}
          </p>
        )}
        <div className="mt-5 flex items-center gap-3">
          <SaveButton
            busy={busy}
            saved={false}
            onClick={handleSave}
            label={editingId ? 'Update Account' : 'Add Account'}
          />
          {editingId && (
            <button
              onClick={resetForm}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          )}
        </div>
      </SectionCard>

      {/* Account list */}
      <SectionCard
        title="Company Bank Accounts"
        description="All accounts — one can be set as Default Bank"
        icon={<Landmark className="h-5 w-5" />}
        tint="sky"
      >
        {loading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No bank accounts yet — add your first account above.
          </p>
        ) : (
          <div className="space-y-3">
            {list.map((acc) => (
              <div
                key={acc.id}
                className={`rounded-xl border p-4 transition-all ${
                  acc.isDefault
                    ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-900/20'
                    : 'border-slate-200 bg-white/80 dark:border-slate-600 dark:bg-slate-800/60'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {acc.bankName}
                      </p>
                      {acc.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          <Star className="h-3 w-3" /> Default Bank
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {acc.accountHolderName || '—'} · {maskAccount(acc.accountNumber)} ·{' '}
                      {acc.ifsc || '—'} · {acc.accountType}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {acc.upiId && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          UPI: {acc.upiId}
                        </span>
                      )}
                      {acc.swiftCode && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                          SWIFT: {acc.swiftCode}
                        </span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        Cheque: {acc.chequeFormat}
                      </span>
                    </div>
                    {/* Payment methods */}
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Transfers:
                      </span>
                      {(['neftEnabled', 'rtgsEnabled', 'impsEnabled'] as const).map((key) => (
                        <label
                          key={key}
                          className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(acc[key])}
                            onChange={() => toggleMethod(acc, key)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          {key.replace('Enabled', '').toUpperCase()}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!acc.isDefault && (
                      <button
                        onClick={() => handleSetDefault(acc)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-2.5 py-1 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                      >
                        <Star className="h-3 w-3" /> Set Default
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(acc)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(acc)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INVOICE SETTINGS — numbering, print format, bill display
// ═══════════════════════════════════════════════════════════

type InvoiceSettingsRecord = {
  autoInvoiceNumber: boolean;
  invoicePrefix: string;
  invoiceSuffix: string;
  invoiceNextNumber: number;
  printFormat: string;
  duplicateCopy: boolean;
  transportCopy: boolean;
  showQr: boolean;
  showHsn: boolean;
  showBatch: boolean;
  showExpiry: boolean;
  showDiscount: boolean;
  showGst: boolean;
  showBarcode: boolean;
};

const INVOICE_SETTINGS_DEFAULTS: InvoiceSettingsRecord = {
  autoInvoiceNumber: true,
  invoicePrefix: 'SL',
  invoiceSuffix: '',
  invoiceNextNumber: 1,
  printFormat: 'a4_portrait',
  duplicateCopy: true,
  transportCopy: false,
  showQr: true,
  showHsn: true,
  showBatch: true,
  showExpiry: true,
  showDiscount: true,
  showGst: true,
  showBarcode: false,
};

const PRINT_FORMATS: { value: string; label: string }[] = [
  { value: 'a4_portrait', label: 'A4 Portrait' },
  { value: 'a4_landscape', label: 'A4 Landscape' },
  { value: 'thermal_58', label: 'Thermal 58mm' },
  { value: 'thermal_80', label: 'Thermal 80mm' },
  { value: 'dot_matrix', label: 'Dot Matrix' },
  { value: 'continuous', label: 'Continuous Paper' },
];

type InvoiceToggleKey =
  | 'autoInvoiceNumber'
  | 'duplicateCopy'
  | 'transportCopy'
  | 'showQr'
  | 'showHsn'
  | 'showBatch'
  | 'showExpiry'
  | 'showDiscount'
  | 'showGst'
  | 'showBarcode';

function InvoiceSettingsSection() {
  const [form, setForm] = useState<InvoiceSettingsRecord>(INVOICE_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiRequest('/sales/settings')) as unknown;
      const s = (
        Array.isArray(res) ? res[0] : ((res as { data?: Record<string, unknown> })?.data ?? res)
      ) as Record<string, unknown>;
      setForm({
        autoInvoiceNumber: s.autoInvoiceNumber !== false,
        invoicePrefix: s.invoicePrefix ? String(s.invoicePrefix) : 'SL',
        invoiceSuffix: s.invoiceSuffix ? String(s.invoiceSuffix) : '',
        invoiceNextNumber: Number(s.invoiceNextNumber) || 1,
        printFormat: s.printFormat ? String(s.printFormat) : 'a4_portrait',
        duplicateCopy: s.duplicateCopy !== false,
        transportCopy: s.transportCopy === true,
        showQr: s.showQr !== false,
        showHsn: s.showHsn !== false,
        showBatch: s.showBatch !== false,
        showExpiry: s.showExpiry !== false,
        showDiscount: s.showDiscount !== false,
        showGst: s.showGst !== false,
        showBarcode: s.showBarcode === true,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof InvoiceSettingsRecord>(key: K, value: InvoiceSettingsRecord[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleReset = () => {
    setForm(INVOICE_SETTINGS_DEFAULTS);
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest('/sales/settings', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const toggleRow = (label: string, hint: string, key: InvoiceToggleKey) => (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:bg-slate-800">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      </div>
      <Toggle checked={Boolean(form[key])} onChange={(v) => set(key, v)} />
    </div>
  );

  const textField = (
    label: string,
    key: 'invoicePrefix' | 'invoiceSuffix',
    placeholder: string,
  ) => (
    <label className="block">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <input
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
      />
    </label>
  );

  return (
    <div className="space-y-6">
      {/* Invoice numbering */}
      <SectionCard
        title="Invoice Numbering"
        description="Auto number, prefix, suffix & starting sequence"
        icon={<Receipt className="h-5 w-5" />}
        tint="emerald"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {textField('Invoice Prefix', 'invoicePrefix', 'SL')}
          {textField('Invoice Suffix', 'invoiceSuffix', '/26')}
          <p className="text-xs text-slate-400 sm:col-span-2 dark:text-slate-500">
            Example: prefix <b>INV</b> + suffix <b>/26</b> → <b>INVCA26-001/26</b>. Suffix ko
            separator (jaise / ya -) se start karna best hai.
          </p>
        </div>
        <div className="mt-4 space-y-3">
          {toggleRow(
            'Auto Number',
            'Naye invoice par number apne aap generate hoga',
            'autoInvoiceNumber',
          )}
          {!form.autoInvoiceNumber && (
            <label className="block max-w-xs">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Next Number (start)
              </span>
              <input
                type="number"
                min={1}
                value={form.invoiceNextNumber}
                onChange={(e) => set('invoiceNextNumber', Math.max(1, Number(e.target.value) || 1))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
              />
            </label>
          )}
        </div>
      </SectionCard>

      {/* Print format & copies */}
      <SectionCard
        title="Print Format & Copies"
        description="Default print layout, duplicate & transport copies"
        icon={<Printer className="h-5 w-5" />}
        tint="blue"
      >
        <label className="block">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Print Format (default)
          </span>
          <select
            value={form.printFormat}
            onChange={(e) => set('printFormat', e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
          >
            {PRINT_FORMATS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {toggleRow('Duplicate Copy', 'Office + Customer copy — 2 copies', 'duplicateCopy')}
          {toggleRow('Transport Copy', 'Bill par extra transport copy', 'transportCopy')}
        </div>
      </SectionCard>

      {/* Bill display */}
      <SectionCard
        title="Show on Bill"
        description="Kaunse columns aur details printed bill par dikhengi"
        icon={<Eye className="h-5 w-5" />}
        tint="violet"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {toggleRow('Show QR (UPI Scan & Pay)', 'Banking UPI ka QR bill par', 'showQr')}
          {toggleRow('Show HSN', 'HSN code column', 'showHsn')}
          {toggleRow('Show Batch', 'Batch/Lot column', 'showBatch')}
          {toggleRow('Show Expiry', 'Batch column mein expiry date', 'showExpiry')}
          {toggleRow('Show Discount', 'Less Discount line', 'showDiscount')}
          {toggleRow('Show GST', 'GST no + GST columns', 'showGst')}
          {toggleRow('Barcode', 'Invoice number ka barcode', 'showBarcode')}
        </div>
      </SectionCard>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      <div className="flex items-center gap-3">
        <SaveButton busy={busy} saved={saved} onClick={handleSave} label="Save Invoice Settings" />
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STOCK SETTINGS — valuation, tracking, automation
// ═══════════════════════════════════════════════════════════

type StockSettingsRecord = {
  method: string;
  stockValuation: string;
  negativeStock: boolean;
  batchTracking: boolean;
  expiryTracking: boolean;
  lotTracking: boolean;
  serialTracking: boolean;
  autoBarcode: boolean;
  autoSku: boolean;
  lowStockAlert: boolean;
  lowStockThreshold: number;
  stockReservation: boolean;
  autoReorder: boolean;
  roundOff: number;
};

const STOCK_SETTINGS_DEFAULTS: StockSettingsRecord = {
  method: 'fifo',
  stockValuation: 'cost',
  negativeStock: false,
  batchTracking: false,
  expiryTracking: false,
  lotTracking: false,
  serialTracking: false,
  autoBarcode: false,
  autoSku: false,
  lowStockAlert: true,
  lowStockThreshold: 5,
  stockReservation: true,
  autoReorder: false,
  roundOff: 2,
};

const VALUATION_METHODS: { value: string; label: string; hint: string }[] = [
  { value: 'fifo', label: 'FIFO', hint: 'Pehle aaya, pehle jaye' },
  { value: 'fefo', label: 'FEFO', hint: 'Expiry ke hisaab se pehle pick' },
  { value: 'average', label: 'Average Cost', hint: 'Sab units ka average cost' },
  { value: 'weighted_average', label: 'Weighted Cost', hint: 'Quantity-weighted average' },
  { value: 'lifo', label: 'LIFO', hint: 'Aakhri aaya, pehle jaye' },
  { value: 'standard', label: 'Standard', hint: 'Fixed standard cost' },
];

type StockToggleKey =
  | 'negativeStock'
  | 'batchTracking'
  | 'expiryTracking'
  | 'lotTracking'
  | 'serialTracking'
  | 'autoBarcode'
  | 'autoSku'
  | 'lowStockAlert'
  | 'stockReservation'
  | 'autoReorder';

function StockSettingsSection() {
  const [form, setForm] = useState<StockSettingsRecord>(STOCK_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // /inventory/settings findAll envelope ({ data: [row] }) return karta hai
      const res = (await apiRequest('/inventory/settings')) as unknown;
      const env = (Array.isArray(res) ? { data: res } : (res as { data?: unknown })) as {
        data?: unknown;
      };
      const rows = Array.isArray(env.data) ? env.data : [];
      const s = (rows[0] ?? {}) as Record<string, unknown>;
      setForm({
        method: s.method ? String(s.method) : 'fifo',
        stockValuation: s.stockValuation ? String(s.stockValuation) : 'cost',
        negativeStock: s.negativeStock === true,
        batchTracking: s.batchTracking === true || s.enableBatch === true,
        expiryTracking: s.expiryTracking === true || s.enableExpiry === true,
        lotTracking: s.lotTracking === true,
        serialTracking: s.serialTracking === true || s.enableSerial === true,
        autoBarcode: s.autoBarcode === true,
        autoSku: s.autoSku === true,
        lowStockAlert: s.lowStockAlert !== false,
        lowStockThreshold: Number(s.lowStockThreshold) || 5,
        stockReservation: s.stockReservation !== false,
        autoReorder: s.autoReorder === true,
        roundOff: Number(s.roundOff) || 2,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof StockSettingsRecord>(key: K, value: StockSettingsRecord[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleReset = () => {
    setForm(STOCK_SETTINGS_DEFAULTS);
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest('/inventory/settings', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const toggleRow = (label: string, hint: string, key: StockToggleKey) => (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:bg-slate-800">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      </div>
      <Toggle checked={Boolean(form[key])} onChange={(v) => set(key, v)} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Valuation & stock rules */}
      <SectionCard
        title="Valuation & Stock Rules"
        description="Costing method, negative stock, reservation & low stock alerts"
        icon={<Package className="h-5 w-5" />}
        tint="emerald"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Valuation Method
            </span>
            <select
              value={form.method}
              onChange={(e) => set('method', e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            >
              {VALUATION_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} — {m.hint}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              Preference yahan save hota hai — FEFO/Average ka costing engine wiring next phase
              mein.
            </p>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Stock Valuation
            </span>
            <select
              value={form.stockValuation}
              onChange={(e) => set('stockValuation', e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            >
              <option value="cost">Cost Price</option>
              <option value="mrp">MRP</option>
              <option value="sales">Sales Price</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {toggleRow(
            'Negative Stock',
            'Stock 0 se neeche ja sakta hai (kabhi allow karna risky hai)',
            'negativeStock',
          )}
          {toggleRow(
            'Stock Reservation',
            'Order/sale ke liye stock reserve ho sakta hai',
            'stockReservation',
          )}
          {toggleRow('Low Stock Alert', 'Low stock par dashboard + notification', 'lowStockAlert')}
        </div>
        {form.lowStockAlert && (
          <label className="mt-3 block max-w-xs">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Low Stock Threshold (units)
            </span>
            <input
              type="number"
              min={0}
              value={form.lowStockThreshold}
              onChange={(e) => set('lowStockThreshold', Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            />
          </label>
        )}
      </SectionCard>

      {/* Tracking */}
      <SectionCard
        title="Tracking"
        description="Batch, expiry, lot aur serial number tracking"
        icon={<ScanLine className="h-5 w-5" />}
        tint="blue"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {toggleRow('Batch Tracking', 'Har batch ka alag stock + price', 'batchTracking')}
          {toggleRow('Expiry Tracking', 'Batch ke saath expiry date track', 'expiryTracking')}
          {toggleRow('Lot Tracking', 'Har lot/consignment ka alag track', 'lotTracking')}
          {toggleRow('Serial Number', 'Har unit ka unique serial number', 'serialTracking')}
        </div>
      </SectionCard>

      {/* Automation */}
      <SectionCard
        title="Automation"
        description="Barcode, SKU aur reorder automation"
        icon={<Sparkles className="h-5 w-5" />}
        tint="violet"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {toggleRow('Barcode Auto', 'Naye item par barcode apne aap generate', 'autoBarcode')}
          {toggleRow('Auto SKU', 'Naye item par SKU apne aap generate', 'autoSku')}
          {toggleRow('Auto Reorder', 'Low stock par purchase suggestion', 'autoReorder')}
        </div>
        <label className="mt-4 block max-w-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Round Off Decimals
          </span>
          <input
            type="number"
            min={0}
            max={4}
            value={form.roundOff}
            onChange={(e) => set('roundOff', Math.max(0, Math.min(4, Number(e.target.value) || 0)))}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
          />
        </label>
      </SectionCard>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      <div className="flex items-center gap-3">
        <SaveButton busy={busy} saved={saved} onClick={handleSave} label="Save Stock Settings" />
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// GST SETTINGS — type, pricing, filing & compliance
// ═══════════════════════════════════════════════════════════

type GstConfigRecord = {
  gstType: string; // regular | composition | rcm
  hsnLength: number; // 4 | 6 | 8
  gstReturn: string; // monthly | quarterly | annual
  eWayBill: boolean;
  eInvoice: boolean;
  gstRounding: string; // 2dp | whole | none
  taxMode: string; // inclusive | exclusive
};

const GST_CONFIG_DEFAULTS: GstConfigRecord = {
  gstType: 'regular',
  hsnLength: 8,
  gstReturn: 'monthly',
  eWayBill: false,
  eInvoice: false,
  gstRounding: '2dp',
  taxMode: 'exclusive',
};

function GstSettingsSection() {
  const [form, setForm] = useState<GstConfigRecord>(GST_CONFIG_DEFAULTS);
  const [gstin, setGstin] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Company GSTIN (Company & License se) — read-only display
      try {
        const cRes = (await apiRequest<{ data?: Array<{ gstin?: string }> }>(
          '/companies',
        )) as unknown;
        const cRows = (
          Array.isArray(cRes) ? cRes : ((cRes as { data?: Array<{ gstin?: string }> })?.data ?? [])
        ) as Array<{ gstin?: string }>;
        setGstin(cRows[0]?.gstin || '');
      } catch {
        /* GSTIN optional */
      }
      // KV config
      const res = (await apiRequest('/gst/config')) as unknown;
      const s = (
        Array.isArray(res) ? res[0] : ((res as { data?: Record<string, unknown> })?.data ?? res)
      ) as Record<string, unknown>;
      setForm({
        gstType: s.gstType ? String(s.gstType) : 'regular',
        hsnLength: Number(s.hsnLength) || 8,
        gstReturn: s.gstReturn ? String(s.gstReturn) : 'monthly',
        eWayBill: s.eWayBill === true || s.eWayBill === 'true',
        eInvoice: s.eInvoice === true || s.eInvoice === 'true',
        gstRounding: s.gstRounding ? String(s.gstRounding) : '2dp',
        taxMode: s.taxMode ? String(s.taxMode) : 'exclusive',
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof GstConfigRecord>(key: K, value: GstConfigRecord[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleReset = () => {
    setForm(GST_CONFIG_DEFAULTS);
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest('/gst/config', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const radioGroup = (
    options: { value: string; label: string; desc: string }[],
    key: 'gstType' | 'taxMode',
  ) => (
    <div className={`grid gap-2 ${options.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => set(key, o.value)}
          className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
            form[key] === o.value
              ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30 dark:bg-emerald-900/10'
              : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/40'
          }`}
        >
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{o.label}</p>
          <p className="text-[11px] text-slate-400">{o.desc}</p>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* GST type & registration */}
      <SectionCard
        title="GST Type & Registration"
        description="Kaise GST file karte hain + company GSTIN"
        icon={<Percent className="h-5 w-5" />}
        tint="violet"
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Company GSTIN
            </span>
            <input
              value={gstin}
              readOnly
              placeholder="Company & License tab se set hota hai"
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500 outline-none dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
            />
          </label>
        </div>
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">GST Type</p>
        {radioGroup(
          [
            { value: 'regular', label: 'Regular', desc: 'Full ITC + GSTR-1/3B filing' },
            { value: 'composition', label: 'Composition', desc: 'Composition scheme, limited ITC' },
            {
              value: 'reverse_charge',
              label: 'RCM / Reverse Charge',
              desc: 'Liability on receiver',
            },
          ],
          'gstType',
        )}
      </SectionCard>

      {/* Pricing */}
      <SectionCard
        title="Pricing & Rounding"
        description="Tax inclusive/exclusive pricing + GST rounding"
        icon={<Banknote className="h-5 w-5" />}
        tint="emerald"
      >
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          Tax Pricing Mode
        </p>
        {radioGroup(
          [
            { value: 'inclusive', label: 'Tax Inclusive', desc: 'Price mein GST shamil hai' },
            {
              value: 'exclusive',
              label: 'Tax Exclusive',
              desc: 'Price par GST alag se joda jata hai',
            },
          ],
          'taxMode',
        )}
        <label className="mt-4 block max-w-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            GST Rounding
          </span>
          <select
            value={form.gstRounding}
            onChange={(e) => set('gstRounding', e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
          >
            <option value="2dp">Round to 2 decimals</option>
            <option value="whole">Round to nearest rupee</option>
            <option value="none">No rounding</option>
          </select>
        </label>
      </SectionCard>

      {/* Filing & compliance */}
      <SectionCard
        title="Filing & Compliance"
        description="HSN length, return period, e-way bill & e-invoice"
        icon={<ShieldCheck className="h-5 w-5" />}
        tint="blue"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              HSN Length
            </span>
            <select
              value={form.hsnLength}
              onChange={(e) => set('hsnLength', Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            >
              <option value={4}>4 digits</option>
              <option value={6}>6 digits</option>
              <option value={8}>8 digits</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              GST Return Filing
            </span>
            <select
              value={form.gstReturn}
              onChange={(e) => set('gstReturn', e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            >
              <option value="monthly">Monthly (GSTR-1/3B)</option>
              <option value="quarterly">Quarterly (QRMP)</option>
              <option value="annual">Annual</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">E-Way Bill</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Rs. 50,000+ supplies par e-way bill
              </p>
            </div>
            <Toggle checked={form.eWayBill} onChange={(v) => set('eWayBill', v)} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">E-Invoice</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">IRN generation required</p>
            </div>
            <Toggle checked={form.eInvoice} onChange={(v) => set('eInvoice', v)} />
          </div>
        </div>
      </SectionCard>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      <div className="flex items-center gap-3">
        <SaveButton busy={busy} saved={saved} onClick={handleSave} label="Save GST Settings" />
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SETTINGS HUB — tab rail
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// SECTION — BACKUP & RESTORE
// ═══════════════════════════════════════════════════════════

interface BackupMeta {
  id: string;
  fileName: string;
  size: number;
  createdAt: string;
  kind: 'manual' | 'auto';
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BackupSettingsSection() {
  const [list, setList] = useState<BackupMeta[]>([]);
  const [folder, setFolder] = useState('');
  const [dbSize, setDbSize] = useState(0);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [oRes, sRes] = await Promise.all([
        apiRequest('/backup') as unknown,
        apiRequest('/backup/settings') as unknown,
      ]);
      const o = ((oRes as { data?: Record<string, unknown> })?.data ?? oRes ?? {}) as {
        folder?: string;
        dbSize?: number;
        backups?: BackupMeta[];
      };
      const s = ((sRes as { data?: Record<string, unknown> })?.data ?? sRes ?? {}) as Record<
        string,
        unknown
      >;
      setList(Array.isArray(o.backups) ? o.backups : []);
      setFolder(String(o.folder ?? ''));
      setDbSize(Number(o.dbSize) || 0);
      setSettings(s);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await apiRequest('/backup', { method: 'POST' });
      await load();
      setMsg({ ok: true, text: 'Backup created ✅' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest('/backup/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (name: string) => {
    setError(null);
    try {
      const token = authService.getAccessToken();
      const res = await fetch(apiUrl(`/backup/${encodeURIComponent(name)}/download`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRestore = async (name: string) => {
    if (
      !window.confirm(
        `Restore database from "${name}"?\n\nCurrent data will be replaced by this backup. This cannot be undone.\n\nRestore works best when the backup is from the same software version.`,
      )
    ) {
      return;
    }
    setRestoring(name);
    setError(null);
    setMsg(null);
    try {
      const res = await apiRequest<{ message?: string }>(
        `/backup/${encodeURIComponent(name)}/restore`,
        { method: 'POST' },
      );
      setMsg({ ok: true, text: res?.message || 'Database restored ✅' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Delete backup "${name}"?`)) {
      return;
    }
    setError(null);
    setMsg(null);
    try {
      await apiRequest(`/backup/${encodeURIComponent(name)}`, { method: 'DELETE' });
      await load();
      setMsg({ ok: true, text: 'Backup deleted' });
    } catch (err) {
      setError((err as Error).message);
    }
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
      {/* Card 1 — Backup Now */}
      <SectionCard
        title="Backup Now"
        description="Create a full snapshot of your database — safe to download & restore anytime"
        icon={<DatabaseBackup className="h-5 w-5" />}
        tint="emerald"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <p className="font-medium">
              Database size:{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatBytes(dbSize)}
              </span>
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
              <Folder className="h-3.5 w-3.5" /> {folder || 'data/backups/'}
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <DatabaseBackup className="h-4 w-4" />
            )}
            {busy ? 'Creating…' : 'Create Backup'}
          </button>
        </div>
      </SectionCard>

      {/* Card 2 — Auto Backup */}
      <SectionCard
        title="Auto Backup"
        description="Schedule automatic backups — saved in the backup folder"
        icon={<RefreshCw className="h-5 w-5" />}
        tint="blue"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Auto Backup</p>
              <p className="text-xs text-slate-400">Enabled</p>
            </div>
            <Toggle checked={Boolean(settings.enabled)} onChange={(v) => set('enabled', v)} />
          </div>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Frequency
            </span>
            <select
              value={String(settings.frequency ?? 'daily')}
              onChange={(e) => set('frequency', e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Keep Last
            </span>
            <input
              type="number"
              min={1}
              value={String(Number(settings.keepCount) || 10)}
              onChange={(e) => set('keepCount', Math.max(1, Number(e.target.value)))}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Cloud Backup
            </span>
            <select
              value={String(settings.cloudProvider ?? 'none')}
              onChange={(e) => set('cloudProvider', e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
            >
              <option value="none">None (Local)</option>
              <option value="google_drive">Google Drive</option>
              <option value="onedrive">OneDrive</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Google Drive / OneDrive selection stores the preference — cloud upload wiring is a future
          step. Local backups are always created.
        </p>
        {error && (
          <div className="mt-3">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}
        <div className="mt-4">
          <SaveButton busy={saving} saved={saved} onClick={handleSave} label="Save Auto Backup" />
        </div>
      </SectionCard>

      {/* Card 3 — Backup History */}
      <SectionCard
        title="Backup History"
        description={`${list.length} backup${list.length === 1 ? '' : 's'} available`}
        icon={<History className="h-5 w-5" />}
        tint="violet"
      >
        {list.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No backups yet — hit “Create Backup” above.
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/60"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                    {b.kind === 'auto' ? (
                      <RefreshCw className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                    ) : (
                      <DatabaseBackup className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    )}
                    <span className="truncate font-mono text-xs">{b.fileName}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        b.kind === 'auto'
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                          : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                      }`}
                    >
                      {b.kind === 'auto' ? 'AUTO' : 'MANUAL'}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {formatDate(b.createdAt)} · {formatBytes(b.size)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => handleDownload(b.fileName)}
                    title="Download"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleRestore(b.fileName)}
                    disabled={restoring === b.fileName}
                    title="Restore"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 transition-colors hover:border-amber-400 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                  >
                    {restoring === b.fileName ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(b.fileName)}
                    title="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-500 transition-colors hover:border-rose-400 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {msg && (
          <p
            className={`mt-3 flex items-center gap-1.5 text-sm ${msg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {msg.ok ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {msg.text}
          </p>
        )}
      </SectionCard>
    </div>
  );
}

type HubTab =
  | 'company'
  | 'fiscal'
  | 'license'
  | 'api'
  | 'financial'
  | 'banking'
  | 'invoice'
  | 'stock'
  | 'gst'
  | 'dashboard'
  | 'backup'
  | 'data'
  | 'audit'
  | 'notifications'
  | 'printer'
  | 'roles'
  | 'modules'
  | 'security'
  | 'users';

const HUB_TABS: { id: HubTab; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    id: 'company',
    label: 'Company & License',
    hint: 'Account, GSTIN, License No',
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    id: 'fiscal',
    label: 'Financial Year',
    hint: 'Accounting period',
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    id: 'license',
    label: 'License Management',
    hint: 'Plan, expiry, renew, limits',
    icon: <BadgeCheck className="h-5 w-5" />,
  },
  {
    id: 'api',
    label: 'API Settings',
    hint: 'Tokens, webhooks, OAuth & integrations',
    icon: <Braces className="h-5 w-5" />,
  },
  {
    id: 'financial',
    label: 'Financial',
    hint: 'Period locks, defaults, rounding',
    icon: <Coins className="h-5 w-5" />,
  },
  {
    id: 'banking',
    label: 'Banking',
    hint: 'Bank accounts, UPI, IFSC, NEFT/RTGS',
    icon: <Landmark className="h-5 w-5" />,
  },
  {
    id: 'invoice',
    label: 'Invoice',
    hint: 'Numbering, print format, bill display',
    icon: <Receipt className="h-5 w-5" />,
  },
  {
    id: 'stock',
    label: 'Stock',
    hint: 'Valuation, batch/lot/serial, alerts',
    icon: <Package className="h-5 w-5" />,
  },
  {
    id: 'gst',
    label: 'GST',
    hint: 'Type, pricing, HSN, e-way/e-invoice',
    icon: <Percent className="h-5 w-5" />,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    hint: 'Widgets, theme, language & landing',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    id: 'backup',
    label: 'Backup & Restore',
    hint: 'Manual, auto, download & restore',
    icon: <DatabaseBackup className="h-5 w-5" />,
  },
  {
    id: 'data',
    label: 'Data Management',
    hint: 'Import/export, cleanup, archive',
    icon: <Database className="h-5 w-5" />,
  },
  {
    id: 'audit',
    label: 'Audit Trail',
    hint: 'Who changed what, old & new values',
    icon: <ScrollText className="h-5 w-5" />,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    hint: 'SMS, WhatsApp, email, alerts',
    icon: <Bell className="h-5 w-5" />,
  },
  {
    id: 'printer',
    label: 'Printer',
    hint: 'Invoice, barcode, paper & margins',
    icon: <Printer className="h-5 w-5" />,
  },
  {
    id: 'roles',
    label: 'User Roles',
    hint: 'Permissions per module',
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    id: 'users',
    label: 'Users',
    hint: 'Create & manage users',
    icon: <Users className="h-5 w-5" />,
  },
  {
    id: 'modules',
    label: 'Module Settings',
    hint: 'Finance · Sales · Purchase · Inventory',
    icon: <SlidersHorizontal className="h-5 w-5" />,
  },
  {
    id: 'security',
    label: 'Security',
    hint: 'Settings password',
    icon: <KeyRound className="h-5 w-5" />,
  },
];

function SettingsHub() {
  const [tab, setTab] = useState<HubTab>('company');

  return (
    <div className="animate-in fade-in mx-auto max-w-5xl duration-300">
      {/* Header — gradient banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-5 shadow-lg sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-inner backdrop-blur">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Settings Hub</h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-emerald-50">
                <ShieldCheck className="h-3.5 w-3.5" />
                Configure your entire ERP from one place
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem(UNLOCK_KEY);
              window.location.reload();
            }}
            title="Lock Settings"
            aria-label="Lock Settings"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-white shadow-sm backdrop-blur transition-all hover:border-red-300 hover:bg-red-500/70 hover:text-white active:scale-[0.95]"
          >
            <Lock className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Vertical tab rail — left side (Company, Fin Year, User...) */}
        <nav
          className="flex shrink-0 flex-row gap-2 overflow-x-auto lg:w-64 lg:flex-col lg:overflow-visible"
          aria-label="Settings sections"
        >
          {HUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`group flex min-w-[180px] items-center gap-3 rounded-xl border p-3 text-left transition-all lg:min-w-0 ${
                tab === t.id
                  ? 'border-emerald-500 bg-emerald-50 shadow-md dark:bg-emerald-900/30'
                  : 'border-slate-200 bg-white/80 backdrop-blur hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-700/60'
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  tab === t.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {t.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-sm font-semibold ${tab === t.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}
                >
                  {t.label}
                </span>
                <span className="block truncate text-[11px] text-slate-400">{t.hint}</span>
              </span>
              <ChevronRight
                className={`h-4 w-4 shrink-0 transition-transform ${tab === t.id ? 'text-emerald-500' : 'text-slate-300'}`}
              />
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {tab === 'company' && <CompanySection />}
          {tab === 'fiscal' && <FinancialYearSection />}
          {tab === 'license' && <LicenseSettingsSection />}
          {tab === 'api' && <ApiSettingsSection />}
          {tab === 'financial' && <FinancialSettingsSection />}
          {tab === 'banking' && <BankingSection />}
          {tab === 'invoice' && <InvoiceSettingsSection />}
          {tab === 'stock' && <StockSettingsSection />}
          {tab === 'gst' && <GstSettingsSection />}
          {tab === 'backup' && <BackupSettingsSection />}
          {tab === 'data' && <DataManagementSection />}
          {tab === 'audit' && <AuditTrailSection />}
          {tab === 'notifications' && <NotificationSettingsSection />}
          {tab === 'printer' && <PrinterSettingsSection />}
          {tab === 'roles' && <RolesSection />}
          {tab === 'users' && <UsersSection />}
          {tab === 'modules' && <ModuleSettingsSection />}
          {tab === 'dashboard' && <DashboardSettingsSection />}
          {tab === 'security' && <SecuritySection />}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PASSWORD GATE (page entry)
// ═══════════════════════════════════════════════════════════

export function SettingsPasswordGate() {
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(UNLOCK_KEY) === '1');

  useEffect(() => {
    if (unlocked) {
      return;
    }
    let cancelled = false;
    apiRequest<{ configured: boolean }>('/finance/settings/security/status')
      .then((res) => {
        if (!cancelled) {
          setConfigured(Boolean(res?.configured));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConfigured(true);
        }
      }) // status fail → verify screen
      .finally(() => {
        if (!cancelled) {
          setChecking(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [unlocked]);

  if (unlocked) {
    return <SettingsHub />;
  }

  if (checking) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const handleUnlock = () => {
    sessionStorage.setItem(UNLOCK_KEY, '1');
    setUnlocked(true);
  };

  return configured ? (
    <EnterPasswordScreen onDone={handleUnlock} />
  ) : (
    <SetPasswordScreen onDone={handleUnlock} />
  );
}

export function AccountingSettingsPage() {
  return <SettingsPasswordGate />;
}
