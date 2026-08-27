import { ChevronRight, CalendarCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/utils';

export interface ExpiryAlertItem {
  id: string;
  name: string;
  expiryDate: string;
  daysLeft: number;
  quantityText: string;
  category?: string;
}

interface ExpiryAlertsCardProps {
  items?: ExpiryAlertItem[];
  onViewAll?: () => void;
}

export function ExpiryAlertsCard({ items = [], onViewAll }: ExpiryAlertsCardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'0-7' | '8-15' | '16-30' | '30+'>('0-7');

  const filteredItems = items.filter((item) => {
    if (activeTab === '0-7') {return item.daysLeft <= 7;}
    if (activeTab === '8-15') {return item.daysLeft > 7 && item.daysLeft <= 15;}
    if (activeTab === '16-30') {return item.daysLeft > 15 && item.daysLeft <= 30;}
    return item.daysLeft > 30;
  });

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      navigate('/inventory/batches');
    }
  };

  return (
    <div className="shadow-2xs hover:shadow-xs flex h-full flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3 transition-all duration-150 sm:rounded-2xl sm:p-3.5 dark:border-white/[0.08] dark:bg-[#111827]">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-100/80 pb-1.5 dark:border-white/[0.06]">
          <h3 className="font-poppins text-xs font-bold leading-none text-slate-900 sm:text-sm dark:text-white">
            एक्स्पायरी अलर्ट{' '}
            <span className="text-xs font-normal text-slate-400">(Expiry Alerts)</span>
          </h3>
          <button
            onClick={handleViewAll}
            className="group flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            <span>सर्व पहा</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="mt-2 flex gap-1 rounded-lg bg-slate-100/80 p-0.5 dark:bg-white/[0.04]">
          {(
            [
              { key: '0-7', label: '0–7 दिवस' },
              { key: '8-15', label: '8–15 दिवस' },
              { key: '16-30', label: '16–30 दिवस' },
              { key: '30+', label: '30+ दिवस' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 rounded-md py-0.5 text-center text-[10px] font-semibold transition-all duration-150 sm:text-[11px]',
                activeTab === tab.key
                  ? 'shadow-xs bg-white font-bold text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items List / Empty State */}
      <div className="my-1.5 flex flex-1 flex-col justify-center space-y-1 overflow-hidden sm:space-y-1.5">
        {filteredItems.length > 0 ? (
          filteredItems.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-1 sm:py-1.5 dark:border-white/[0.04] dark:bg-white/[0.02]"
            >
              <div className="min-w-0 flex-1 pr-2">
                <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                  {item.name}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-rose-500 dark:text-rose-400">
                    {item.expiryDate}
                  </span>
                  <span>•</span>
                  <span>{item.quantityText}</span>
                </div>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide',
                  item.daysLeft <= 7
                    ? 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-400'
                    : item.daysLeft <= 15
                      ? 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-400'
                      : 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-400',
                )}
              >
                {item.daysLeft <= 0 ? 'कालबाह्य' : `${item.daysLeft} दिवस शिल्लक`}
              </span>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <CalendarCheck className="mb-1 h-6 w-6 text-slate-300 dark:text-slate-600" />
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              या कालावधीत कोणतेही एक्स्पायरी अलर्ट नाहीत.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-100/80 pt-1 text-[11px] text-slate-500 dark:border-white/[0.06] dark:text-slate-400">
        <span className="font-bold text-rose-600 dark:text-rose-400">
          {items.filter((i) => i.daysLeft <= 7).length} उत्पादने
        </span>{' '}
        पुढील ७ दिवसांत कालबाह्य होत आहेत
      </div>
    </div>
  );
}
