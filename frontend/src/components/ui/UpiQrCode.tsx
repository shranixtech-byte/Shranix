import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

// UPI deep-link payload: upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>
export function buildUpiPayload(opts: {
  upiId: string;
  name?: string;
  amount?: number;
  note?: string;
}): string {
  const { upiId, name, amount, note } = opts;
  const params = new URLSearchParams();
  params.set('pa', (upiId || '').trim());
  if (name) {
    params.set('pn', name);
  }
  if (amount && amount > 0) {
    params.set('am', amount.toFixed(2));
  }
  params.set('cu', 'INR');
  if (note) {
    params.set('tn', note.slice(0, 30));
  }
  return `upi://pay?${params.toString()}`;
}

// Real scannable UPI QR — qrcode library se generate hota hai (GPay/PhonePe/Paytm sab scan karenge)
export function UpiQrCode({
  upiId,
  payload: rawPayload,
  name,
  amount,
  note,
  size = 150,
  className,
  showId = true,
}: {
  upiId: string;
  /** Ready-made UPI payload (upi://pay?...) — diya ho to seedha QR banega, dobara encode nahi hoga */
  payload?: string;
  name?: string;
  amount?: number;
  note?: string;
  size?: number;
  className?: string;
  showId?: boolean;
}) {
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState(false);
  const mounted = useRef(true);

  const source = rawPayload ?? (upiId.trim() ? buildUpiPayload({ upiId, name, amount, note }) : '');

  useEffect(() => {
    mounted.current = true;
    setError(false);
    if (!source) {
      setDataUrl('');
      return;
    }
    let cancelled = false;
    // Dynamic import — qrcode browser build (CJS) ko import default ke roop mein use karo
    import('qrcode')
      .then((mod) => {
        if (cancelled || !mounted.current) {
          return;
        }
        const QRCode = (mod as any).default ?? mod;
        QRCode.toDataURL(source, {
          width: size,
          margin: 1,
          color: { dark: '#0F172A', light: '#FFFFFF' },
        })
          .then((url: string) => {
            if (!cancelled && mounted.current) {
              setDataUrl(url);
            }
          })
          .catch(() => {
            if (!cancelled && mounted.current) {
              setError(true);
            }
          });
      })
      .catch(() => {
        if (!cancelled && mounted.current) {
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [source, size]);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`UPI QR — ${upiId}`}
          width={size}
          height={size}
          className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-600"
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-[10px] text-slate-400 dark:border-slate-600 dark:bg-slate-800"
        >
          {error ? 'QR generate nahi hua' : 'QR load ho raha hai...'}
        </div>
      )}
      {showId && !rawPayload && upiId.trim() && (
        <p className="max-w-full truncate text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          {upiId.trim()}
        </p>
      )}
    </div>
  );
}
