import { AlertCircle, CheckCircle2, Loader2, ScanLine } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { QuickCreateModal } from '@/components/ui/QuickCreateModal';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/services/api-client';

import type { ProductRecord } from './product-selection-screen';

interface BarcodeScanModalProps {
  open: boolean;
  onClose: () => void;
  onFound: (product: ProductRecord) => void;
}

/**
 * Scanner-gun barcode / QR scan modal.
 *
 * Scanner gun ek keyboard-wedge device hai — wo code type karke Enter maarta hai.
 * Enter (ya 400ms debounce, bina-Enter wale gun ke liye) par code lookup hota hai
 * aur product turant invoice me add ho jata hai. Modal khula rehta hai taaki
 * lagatar scanning ho sake.
 */
export function BarcodeScanModal({ open, onClose, onFound }: BarcodeScanModalProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);

  // Open hone par reset + focus; close/unmount par timer saaf
  useEffect(() => {
    if (open) {
      setValue('');
      setFeedback(null);
      busyRef.current = false;
      setBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [open]);

  const normalizeCode = (raw: string): string => {
    let code = raw.trim();
    if (!code) {
      return '';
    }
    // QR code URL encode karta ho (product page) → query param ya last path segment hi asli code hota hai
    if (/^https?:\/\//i.test(code)) {
      try {
        const url = new URL(code);
        const qCode =
          url.searchParams.get('code') ||
          url.searchParams.get('sku') ||
          url.searchParams.get('id') ||
          url.searchParams.get('p');
        if (qCode) {
          code = qCode;
        } else {
          const segments = url.pathname.split('/').filter(Boolean);
          const last = segments[segments.length - 1];
          if (last) {
            code = decodeURIComponent(last);
          }
        }
      } catch {
        /* URL nahi bana → as-is use karo */
      }
    }
    return code;
  };

  const submit = useCallback(
    async (raw: string) => {
      const code = normalizeCode(raw);
      if (!code || busyRef.current) {
        return;
      }
      busyRef.current = true;
      setBusy(true);
      setFeedback(null);
      try {
        const res = await apiRequest<ProductRecord | null>(
          `/inventory/products/lookup?code=${encodeURIComponent(code)}`,
        );
        const product = (res as { data?: ProductRecord | null } | null)?.data ?? res;
        if (product?.id) {
          setFeedback({ ok: true, text: `✓ ${product.name}` });
          setValue('');
          onFound(product);
        } else {
          setFeedback({ ok: false, text: `Product nahi mila: ${code}` });
          setValue('');
        }
      } catch (err) {
        setFeedback({ ok: false, text: `Scan error: ${(err as Error).message}` });
        setValue('');
      } finally {
        setBusy(false);
        busyRef.current = false;
        // Lagatar scanning — input wapas focus karo
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    [onFound],
  );

  const handleChange = useCallback(
    (v: string) => {
      setValue(v);
      setFeedback(null);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      // Bina-Enter wale scanner gun ke liye debounce auto-submit
      if (v.trim().length >= 3) {
        timerRef.current = setTimeout(() => {
          void submit(v);
        }, 400);
      }
    },
    [submit],
  );

  return (
    <QuickCreateModal open={open} onClose={onClose} title="Barcode / QR Scan" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          <ScanLine className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Scanner gun se barcode ya QR scan karo — product apne aap invoice me add ho jayega.{' '}
            <span className="font-semibold">(Manual code type karke Enter bhi daba sakte ho)</span>
          </p>
        </div>

        {/* Scan input — gun yahin type karta hai */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (timerRef.current) {
                  clearTimeout(timerRef.current);
                  timerRef.current = null;
                }
                void submit(value);
              }
            }}
            placeholder="Scan karo..."
            autoComplete="off"
            autoFocus
            className={cn(
              'h-12 w-full rounded-xl border bg-white px-4 pr-10 text-base font-medium tracking-wide text-slate-900 outline-none transition-all',
              'placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
              'dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500',
            )}
            aria-label="Barcode/QR scan input"
          />
          {busy && (
            <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-emerald-500" />
          )}
        </div>

        {/* Last scan feedback */}
        {feedback && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
              feedback.ok
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
            )}
          >
            {feedback.ok ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="min-w-0 truncate">{feedback.text}</span>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          Lagatar scan kar sakte ho — modal khula rahega ·{' '}
          <kbd className="rounded border border-slate-300 bg-slate-100 px-1 font-mono text-[10px] dark:border-slate-600 dark:bg-slate-700">
            Esc
          </kbd>{' '}
          band kare
        </p>
      </div>
    </QuickCreateModal>
  );
}
