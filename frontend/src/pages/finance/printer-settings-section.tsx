import { Copy, Loader2, Printer, RotateCcw, Ruler } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { apiRequest } from '@/services/api-client';

import { ErrorBanner, FieldText, SaveButton, SectionCard } from './settings-ui';

// ── Types ──────────────────────────────────────────────
export interface PrinterSettingsRecord {
  invoicePrinter?: string;
  barcodePrinter?: string;
  thermalPrinter?: string;
  labelPrinter?: string;
  defaultPrinter?: string;
  paperSize?: string;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  copies?: number;
}

const PAPER_SIZES = [
  { value: 'a4', label: 'A4 — 210 × 297 mm' },
  { value: 'a5', label: 'A5 — 148 × 210 mm' },
  { value: 'a6', label: 'A6 — 105 × 148 mm' },
  { value: 'thermal_58', label: 'Thermal 58 mm' },
  { value: 'thermal_80', label: 'Thermal 80 mm' },
  { value: 'letter', label: 'Letter — 216 × 279 mm' },
  { value: 'legal', label: 'Legal — 216 × 356 mm' },
];

const selectCls =
  'mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800';

export function PrinterSettingsSection() {
  const [form, setForm] = useState<PrinterSettingsRecord>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiRequest('/printer/settings')) as unknown;
      const s = ((res as { data?: Record<string, unknown> })?.data ?? res ?? {}) as Record<
        string,
        unknown
      >;
      setForm(s as PrinterSettingsRecord);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof PrinterSettingsRecord>(key: K, value: PrinterSettingsRecord[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest('/printer/settings', { method: 'PUT', body: JSON.stringify(form) });
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
      {/* Card 1 — Printers */}
      <SectionCard
        title="Printers"
        description="Name or port of each printer used by the shop"
        icon={<Printer className="h-5 w-5" />}
        tint="violet"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldText
            label="Invoice Printer"
            value={form.invoicePrinter ?? ''}
            onChange={(v) => set('invoicePrinter', v)}
            placeholder="e.g. EPSON L3250 / USB001"
          />
          <FieldText
            label="Barcode Printer"
            value={form.barcodePrinter ?? ''}
            onChange={(v) => set('barcodePrinter', v)}
            placeholder="e.g. ZEBRA ZD421 / USB002"
          />
          <FieldText
            label="Thermal Printer"
            value={form.thermalPrinter ?? ''}
            onChange={(v) => set('thermalPrinter', v)}
            placeholder="e.g. TVS EPRIMO / 58mm roll"
          />
          <FieldText
            label="Label Printer"
            value={form.labelPrinter ?? ''}
            onChange={(v) => set('labelPrinter', v)}
            placeholder="e.g. TSC TTP-247 / USB003"
          />
        </div>
        <label className="mt-4 block max-w-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Default Printer
          </span>
          <select
            value={String(form.defaultPrinter ?? 'invoice')}
            onChange={(e) => set('defaultPrinter', e.target.value)}
            className={selectCls}
          >
            <option value="invoice">Invoice Printer</option>
            <option value="barcode">Barcode Printer</option>
            <option value="thermal">Thermal Printer</option>
            <option value="label">Label Printer</option>
          </select>
        </label>
        <p className="mt-2 text-[11px] text-slate-400">
          These are the printer names shown in the print dialog / used by the document engine.
        </p>
      </SectionCard>

      {/* Card 2 — Paper & Margins */}
      <SectionCard
        title="Paper & Margins"
        description="Default paper size and print margins in millimetres"
        icon={<Ruler className="h-5 w-5" />}
        tint="sky"
      >
        <label className="block max-w-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Paper Size</span>
          <select
            value={String(form.paperSize ?? 'a4')}
            onChange={(e) => set('paperSize', e.target.value)}
            className={selectCls}
          >
            {PAPER_SIZES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FieldText
            label="Top (mm)"
            type="number"
            value={String(form.marginTop ?? 5)}
            onChange={(v) => set('marginTop', Number(v) || 0)}
          />
          <FieldText
            label="Right (mm)"
            type="number"
            value={String(form.marginRight ?? 5)}
            onChange={(v) => set('marginRight', Number(v) || 0)}
          />
          <FieldText
            label="Bottom (mm)"
            type="number"
            value={String(form.marginBottom ?? 5)}
            onChange={(v) => set('marginBottom', Number(v) || 0)}
          />
          <FieldText
            label="Left (mm)"
            type="number"
            value={String(form.marginLeft ?? 5)}
            onChange={(v) => set('marginLeft', Number(v) || 0)}
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Saved as defaults — the print dialog / document engine reads these for margin &amp; paper
          wiring.
        </p>
      </SectionCard>

      {/* Card 3 — Copies */}
      <SectionCard
        title="Copies"
        description="Default number of copies per print job"
        icon={<Copy className="h-5 w-5" />}
        tint="emerald"
      >
        <div className="max-w-xs">
          <FieldText
            label="Default Copies"
            type="number"
            value={String(form.copies ?? 1)}
            onChange={(v) => set('copies', Math.max(1, Number(v) || 1))}
            hint="Customer + Office / Transport copies are controlled from Invoice settings"
          />
        </div>
      </SectionCard>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      <div className="flex flex-wrap items-center gap-3">
        <SaveButton busy={busy} saved={saved} onClick={handleSave} label="Save Printer Settings" />
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>
    </div>
  );
}
