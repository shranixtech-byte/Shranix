// ═════════════════════════════════════════════════════════
// PHASE 8 — QUOTATION SHARE MODAL (Email · WhatsApp · PDF · Print)
//
// One place to send a quotation to the customer:
//   • Print            — browser print dialog (exact A4 preview)
//   • Download PDF     — server-side Puppeteer PDF (same engine as invoice)
//   • Email PDF        — generate PDF → download → open mail client with
//                        subject/body (PDF attach ke liye — SMTP nahi)
//   • WhatsApp PDF     — generate PDF → download → open WhatsApp chat with
//                        the quotation message (file attach ke liye WA API)
//   • Duplicate Copy   — OFFICE COPY + CUSTOMER COPY with CUT HERE line
//
// The A4 preview renders the exact HTML (`renderQuotationPdfWithCopies`) that
// the PDF engine receives — what you see is what gets printed/shared.
// ═════════════════════════════════════════════════════════

import {
  Check,
  Download,
  Loader2,
  Mail,
  MessageSquare,
  Printer,
  Send,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  QUOTATION_PDF_CSS,
  renderQuotationPdfWithCopies,
  type QuotationPdfData,
} from '@/pages/sales/quotation-pdf-template';
import { apiRequest } from '@/services/api-client';
import { downloadPdfBlob } from '@/services/invoice-pdf.service';
import {
  downloadQuotationPdf,
  generateQuotationPdfBlob,
  loadQuotationPdfData,
} from '@/services/quotation-pdf.service';

// Print CSS — sirf A4 preview print hota hai, baaki UI hidden
const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body { height: auto !important; overflow: visible !important; }
  body * { visibility: hidden; }
  #quote-pdf-preview, #quote-pdf-preview * { visibility: visible; }
  #quote-pdf-preview {
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

const safeName = (n: string) => String(n || 'quotation').replace(/[^A-Za-z0-9._-]/g, '_');

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

export function QuotationShareModal({
  quoteId,
  onClose,
}: {
  quoteId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<QuotationPdfData | null>(null);
  const [quoteNumber, setQuoteNumber] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [duplicate, setDuplicate] = useState(false);
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

  // Load quotation + defaults
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: d, quoteNumber: num } = await loadQuotationPdfData(quoteId);
        if (cancelled) {
          return;
        }
        setData(d);
        setQuoteNumber(num);
        setEmailTo(d.customerEmail || '');
        setEmailSubject(`Quotation ${num} from ${d.companyName || 'Company'}`);
        setEmailMessage(
          `Namaste ${d.customerName},\n\nAapka quotation ${num} is email ke saath hai.\nTotal: ${fmtINR(d.grandTotal)}\n\nDhanyawad!\n${d.companyName || 'Company'}`,
        );
        setWaMobile(d.customerMobile || '');
        setWaMessage(
          `Namaste ${d.customerName},\n\nAapka quotation ${num} taiyar hai.\nTotal: ${fmtINR(d.grandTotal)}\n\nDhanyawad!\n${d.companyName || 'Company'}`,
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
  }, [quoteId]);

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

  // Preview HTML — exact same render the PDF engine receives
  const previewHtml = useMemo(
    () => (data ? renderQuotationPdfWithCopies(data, duplicate) : ''),
    [data, duplicate],
  );

  // Best-effort: successful send → mark quotation as sent (backend requires approval)
  const markSent = useCallback(
    (via: string) => {
      apiRequest(`/sales/quotations/${quoteId}/send`, {
        method: 'POST',
        body: JSON.stringify({ via }),
      }).catch(() => undefined);
    },
    [quoteId],
  );

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownload = useCallback(async () => {
    setPdfBusy(true);
    setActionError(null);
    try {
      await downloadQuotationPdf(quoteId, { duplicate });
    } catch (err) {
      setActionError((err as Error).message || 'PDF generate nahi hua');
    } finally {
      setPdfBusy(false);
    }
  }, [quoteId, duplicate]);

  const handleSendEmail = useCallback(async () => {
    const to = emailTo.trim();
    if (!to) {
      return;
    }
    setEmailBusy(true);
    setActionError(null);
    try {
      const blob = await generateQuotationPdfBlob(quoteId, { duplicate });
      const name = safeName(quoteNumber);
      downloadPdfBlob(blob, `${name}.pdf`);
      const mailto = `mailto:${to}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(`${emailMessage}\n\n(PDF attachment: ${name}.pdf)`)}`;
      window.location.href = mailto;
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
      markSent('email');
    } catch (err) {
      setActionError((err as Error).message || 'PDF generate nahi hua');
    } finally {
      setEmailBusy(false);
    }
  }, [emailTo, emailSubject, emailMessage, quoteId, quoteNumber, duplicate, markSent]);

  const handleSendWhatsApp = useCallback(async () => {
    const digits = waMobile.replace(/\D/g, '');
    if (!digits) {
      return;
    }
    setWaBusy(true);
    setActionError(null);
    try {
      const blob = await generateQuotationPdfBlob(quoteId, { duplicate });
      const name = safeName(quoteNumber);
      downloadPdfBlob(blob, `${name}.pdf`);
      const wa = digits.length === 10 ? `91${digits}` : digits;
      window.open(
        `https://wa.me/${wa}?text=${encodeURIComponent(waMessage)}`,
        '_blank',
        'noopener,noreferrer',
      );
      setWaSent(true);
      setTimeout(() => setWaSent(false), 3000);
      markSent('whatsapp');
    } catch (err) {
      setActionError((err as Error).message || 'PDF generate nahi hua');
    } finally {
      setWaBusy(false);
    }
  }, [waMobile, waMessage, quoteId, quoteNumber, duplicate, markSent]);

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
          Quotation load ho raha hai...
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
            {quoteNumber || '—'}
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Quotation Share
            </h2>
            <p className="text-[11px] text-slate-400">
              Print · Email · WhatsApp · PDF{duplicate ? ' · 2 copies' : ''}
            </p>
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
              icon={pdfBusy ? undefined : <Download className="h-4 w-4" />}
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

          {/* Duplicate Copy */}
          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-700">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={duplicate}
                onChange={(e) => setDuplicate(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Duplicate Copy
                </span>
                <span className="block text-[11px] text-slate-400">
                  OFFICE COPY + CUSTOMER COPY with a CUT HERE line — exactly like the credit-tax
                  invoice
                </span>
              </span>
            </label>
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
                {!emailTo.trim() && (
                  <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                    Customer ka email nahi mila — manually type karo
                  </p>
                )}
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
                  rows={3}
                  className={inputCls}
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={<Send className="h-3.5 w-3.5" />}
                loading={emailBusy}
                disabled={!emailTo.trim()}
                onClick={() => void handleSendEmail()}
              >
                {emailSent ? '✓ PDF Ready' : 'Email PDF'}
              </Button>
              {emailSent && (
                <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" /> PDF download ho gaya — mail client mein attach karo
                </p>
              )}
            </div>
          )}

          {/* WhatsApp form */}
          {waOpen && (
            <div className="mt-5 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-800 dark:bg-emerald-950/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Send via WhatsApp
              </p>
              <div>
                <FieldLabel>Customer Mobile *</FieldLabel>
                <input
                  type="tel"
                  value={waMobile}
                  onChange={(e) => setWaMobile(e.target.value)}
                  placeholder="+91 9876543210"
                  className={inputCls}
                />
                {!waMobile.replace(/\D/g, '') && (
                  <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                    Customer ka mobile nahi mila — manually type karo
                  </p>
                )}
              </div>
              <div>
                <FieldLabel>Message</FieldLabel>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={3}
                  className={inputCls}
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={<Send className="h-3.5 w-3.5" />}
                loading={waBusy}
                disabled={!waMobile.replace(/\D/g, '')}
                onClick={() => void handleSendWhatsApp()}
              >
                {waSent ? '✓ PDF Ready' : 'WhatsApp PDF'}
              </Button>
              {waSent && (
                <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" /> PDF download ho gaya — WhatsApp chat mein attach
                  karo
                </p>
              )}
            </div>
          )}
        </aside>

        {/* Preview */}
        <div className="min-w-0 flex-1 overflow-auto bg-slate-100 p-6 dark:bg-slate-900">
          <div
            id="quote-pdf-preview"
            className="mx-auto w-fit rounded-sm"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              width: zoom < 100 ? `${(100 / zoom) * 100}%` : undefined,
            }}
          >
            <style>{QUOTATION_PDF_CSS}</style>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      </div>
    </div>
  );
}
