import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

export type ModalSize = 'sm' | 'md' | 'lg' | 'fullscreen';

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  fullscreen: 'max-w-[95vw] max-h-[95vh]',
};

export interface QuickCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title: string;
  size?: ModalSize;
  children: ReactNode;
  className?: string;
}

export function QuickCreateModal({
  open,
  onClose,
  title,
  size = 'md',
  children,
  className,
  onSuccess: _onSuccess,
}: QuickCreateModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  // Render via portal so the modal content is NEVER nested inside a parent
  // <form> element. Previously a modal opened from inside a form (e.g. the
  // customer quick-create in the invoice form) rendered its own <form> nested
  // inside the parent form — invalid HTML that caused the browser to
  // natively submit the outer form on Save, reloading the page and dropping
  // the in-memory session (→ login page). Portaling to document.body
  // completely removes the nesting.
  return createPortal(
    <div
      ref={overlayRef}
      className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm duration-200"
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          'w-full rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800',
          size === 'fullscreen' ? 'flex flex-col overflow-hidden' : '',
          sizeClasses[size],
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className={cn('p-6', size === 'fullscreen' ? 'flex-1 overflow-y-auto' : '')}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
