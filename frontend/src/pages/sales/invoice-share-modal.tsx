// ═════════════════════════════════════════════════════════
// INVOICE SHARE MODAL (Print · Email · WhatsApp · PDF)
// Saved invoice (list page se) → KrushiBill preview + share actions.
// Phase 3: Delivery Challan → Invoice ke baad customer ko bhejna.
// ═════════════════════════════════════════════════════════

import { Download, Loader2, Mail, MessageSquare, Printer, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { downloadPdfBlob } from '@/services/invoice-pdf.service';
import {
  downloadSavedInvoicePdf,
  generateSavedInvoicePdfBlob,
  loadInvoicePdfData,
} from '@/services/saved-invoice-pdf.service';

import { KRUSHI_BILL_CSS, renderKrushiBill, type KrushiBillData } from './krushi-bill-template';

const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body { height: auto !important; overflow: visible !important; }
  body * { visibility: hidden; }
  #invoice-preview, #invoice-preview * { visibility: visible; }
  #invoice-preview {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
    overflow: visible !important;
    box-shadow: none !important;
    border: none !important;
    background: #fff !important;
  }
}
`;

const fmtINR = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const safeName = (n: string) => String(n || 'invoice').replace(/[^A-Za-z0-9._-]/g, '_');

// ── Sidebar action button ────────────────────────────────
function ActionButton({
  icon,
  label,
  sub,
  onClick,
  busy,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin text-emerald-500" /> : icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {sub && <span className="shrink-0 text-[10px] text-slate-400">{sub}</span>}
    </button>
  );
}

const inputCls =
  'mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </label>
  );
}

// ═════════════════════════════════════════════════════════
// MODAL
// ═════════════════════════════════════════════════════════

export function InvoiceShareModal({
  invoiceId,
  onClose,
}: {
  invoiceId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<KrushiBillData | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [grandTotal, setGrandTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [zoom, setZoom] = useState(70);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Email form
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // WhatsApp form
  const [waOpen, setWaOpen] = useState(false);
  const [waMobile, setWaMobile] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [waBusy, setWaBusy] = useState(false);
  const [waSent, setWaSent] = useState(false);

  // Load invoice + defaults
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadInvoicePdfData(invoiceId);
        if (cancelled) {
          return;
        }
        setData(loaded.data);
        setInvoiceNumber(loaded.invoiceNumber);
        setCustomerName(loaded.customerName);
        setGrandTotal(loaded.grandTotal);
        setEmailTo(loaded.customerEmail || '');
        setEmailSubject(`Invoice ${loaded.invoiceNumber} from ${loaded.companyName || 'Company'}`);
        setEmailMessage(
          `Namaste ${loaded.customerName},\n\nAapka invoice ${loaded.invoiceNumber} is email ke saath hai.\nTotal: ${fmtINR(loaded.grandTotal)}\n\nDhanyawad!\n${loaded.companyName || 'Company'}`,
        );
        setWaMobile(loaded.customerMobile || '');
        setWaMessage(
          `Namaste ${loaded.customerName},\n\nAapka invoice ${loaded.invoiceNumber} taiyar hai.\nTotal: ${fmtINR(loaded.grandTotal)}\n\nDhanyawad!\n${loaded.companyName || 'Company'}`,
        );
      } catch (err) {
        if (!cancelled) {
          setLoadError((err as Error).message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Preview HTML — exact wahi render jo PDF engine ko jata hai
  const previewHtml = useMemo(() => (data ? renderKrushiBill(data) : ''), [data]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownload = useCallback(async () => {
    setPdfBusy(true);
    setActionError(null);
    try {
      await downloadSavedInvoicePdf(invoiceId);
    } catch (err) {
      setActionError((err as Error).message || 'PDF generate nahi hua');
    } finally {
      setPdfBusy(false);
    }
  }, [invoiceId]);

  const handleSendEmail = useCallback(async () => {
    const to = emailTo.trim();
    if (!to) {
      return;
    }
    setEmailBusy(true);
    setActionError(null);
    try {
      const blob = await generateSavedInvoicePdfBlob(invoiceId);
      const name = safeName(invoiceNumber);
      downloadPdfBlob(blob, `${name}.pdf`);
      const mailto = `mailto:${to}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(`${emailMessage}\n\n(PDF attachment: ${name}.pdf)`)}`;
      window.location.href = mailto;
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    } catch (err) {
      setActionError((err as Error).message || 'PDF generate nahi hua');
    } finally {
      setEmailBusy(false);
    }
  }, [emailTo, emailSubject, emailMessage, invoiceId, invoiceNumber]);

  const handleSendWhatsApp = useCallback(async () => {
    const digits = waMobile.replace(/\D/g, '');
    if (!digits) {
      return;
    }
    setWaBusy(true);
    setActionError(null);
    try {
      const blob = await generateSavedInvoicePdfBlob(invoiceId);
      const name = safeName(invoiceNumber);
      downloadPdfBlob(blob, `${name}.pdf`);
      const wa = digits.length === 10 ? `91${digits}` : digits;
      window.open(
        `https://wa.me/${wa}?text=${encodeURIComponent(waMessage)}`,
        '_blank',
        'noopener,noreferrer',
      );
      setWaSent(true);
      setTimeout(() => setWaSent(false), 3000);
    } catch (err) {
      setActionError((err as Error).message || 'PDF generate nahi hua');
    } finally {
      setWaBusy(false);
    }
  }, [waMobile, waMessage, invoiceId, invoiceNumber]);

  // ── Loading / error states ──
  if (loadError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-xl dark:border-red-800 dark:bg-slate-800">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">Load nahi hua</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{loadError}</p>
          <Button variant="secondary" className="mt-4" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 rounded-xl bg-white px-5 py-4 text-sm text-slate-600 shadow-xl dark:bg-slate-800 dark:text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
          Invoice load ho raha hai...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/60 backdrop-blur-sm">
      <style>{PRINT_CSS}</style>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex min-w-0 items-center gap-3">
          <span className="rounded-lg bg-emerald-100 px-2.5 py-1 font-mono text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {invoiceNumber || '—'}
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Invoice Share</h2>
            <p className="text-[11px] text-slate-400">Print · Email · WhatsApp · PDF</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 overflow-auto border-r border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Send to Customer
          </p>
          <div className="space-y-2">
            <ActionButton
              icon={<Printer className="h-4 w-4" />}
              label="Print"
              sub="Ctrl+P"
              onClick={handlePrint}
            />
            <ActionButton
              icon={<Download className="h-4 w-4" />}
              label={pdfBusy ? 'Generating...' : 'Download PDF'}
              busy={pdfBusy}
              onClick={() => void handleDownload()}
            />
            <ActionButton
              icon={<Mail className="h-4 w-4" />}
              label="Email PDF"
              onClick={() => {
                setWaOpen(false);
                setEmailOpen((o) => !o);
              }}
            />
            <ActionButton
              icon={<MessageSquare className="h-4 w-4" />}
              label="WhatsApp PDF"
              onClick={() => {
                setEmailOpen(false);
                setWaOpen((o) => !o);
              }}
            />
          </div>

          {/* Customer summary */}
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {customerName || 'Customer'}
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
              {fmtINR(grandTotal)}
            </p>
          </div>

          {/* Zoom */}
          <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(30, z - 10))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[44px] text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(150, z + 10))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {actionError && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
              {actionError}
            </p>
          )}

          {/* Email form */}
          {emailOpen && (
            <div className="mt-5 space-y-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-800 dark:bg-blue-950/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Send via Email
              </p>
              <div>
                <FieldLabel>To *</FieldLabel>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="customer@email.com"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Subject</FieldLabel>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Message</FieldLabel>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={4}
                  className={inputCls}
                />
              </div>
              {emailSent && (
                <p className="rounded-md bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                  ✅ PDF download hua — mail client khula!
                </p>
              )}
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                disabled={!emailTo.trim() || emailBusy}
                onClick={() => void handleSendEmail()}
              >
                {emailBusy ? 'Generating...' : 'Generate PDF & Send Email'}
              </Button>
            </div>
          )}

          {/* WhatsApp form */}
          {waOpen && (
            <div className="mt-5 space-y-3 rounded-xl border border-green-200 bg-green-50/60 p-3 dark:border-green-800 dark:bg-green-950/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                Send via WhatsApp
              </p>
              <div>
                <FieldLabel>Mobile *</FieldLabel>
                <input
                  type="tel"
                  value={waMobile}
                  onChange={(e) => setWaMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Message</FieldLabel>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={4}
                  className={inputCls}
                />
              </div>
              {waSent && (
                <p className="rounded-md bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                  ✅ WhatsApp khula!
                </p>
              )}
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                disabled={!waMobile.replace(/\D/g, '') || waBusy}
                onClick={() => void handleSendWhatsApp()}
              >
                {waBusy ? 'Generating...' : 'Generate PDF & Send WhatsApp'}
              </Button>
            </div>
          )}
        </aside>

        {/* Preview */}
        <div className="min-h-0 flex-1 overflow-auto bg-slate-200/70 p-6 dark:bg-slate-900/50">
          <div
            id="invoice-preview"
            className="mx-auto w-fit origin-top bg-white shadow-2xl transition-all"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <style>{KRUSHI_BILL_CSS}</style>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      </div>
    </div>
  );
}
