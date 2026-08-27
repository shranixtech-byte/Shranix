import {
  TrendingUp,
  ShoppingCart,
  Receipt,
  Users,
  Package,
  Database,
  ArrowUp,
  ArrowDown,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

export interface KPICardItem {
  id: string;
  title: string;
  value: string;
  subLabel: string;
  changePercent?: number | null;
  icon: LucideIcon;
  colorScheme: 'emerald' | 'blue' | 'purple' | 'orange' | 'cyan' | 'amber';
  onClick?: () => void;
}

interface KPICardsRowProps {
  items?: KPICardItem[];
  onCardClick?: (cardId: string) => void;
}

const colorStyles: Record<
  string,
  {
    iconBox: string;
    iconColor: string;
    trendColor: string;
  }
> = {
  emerald: {
    iconBox: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    trendColor: 'text-emerald-600 dark:text-emerald-400',
  },
  blue: {
    iconBox: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
    iconColor: 'text-blue-600 dark:text-blue-400',
    trendColor: 'text-emerald-600 dark:text-emerald-400',
  },
  purple: {
    iconBox: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
    iconColor: 'text-purple-600 dark:text-purple-400',
    trendColor: 'text-emerald-600 dark:text-emerald-400',
  },
  orange: {
    iconBox: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400',
    iconColor: 'text-orange-600 dark:text-orange-400',
    trendColor: 'text-emerald-600 dark:text-emerald-400',
  },
  cyan: {
    iconBox: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    trendColor: 'text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    iconBox: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
    iconColor: 'text-amber-600 dark:text-amber-400',
    trendColor: 'text-emerald-600 dark:text-emerald-400',
  },
};

export function KPICardsRow({ items, onCardClick }: KPICardsRowProps) {
  const defaultItems: KPICardItem[] = [
    {
      id: 'today-sales',
      title: 'आजची विक्री',
      value: '₹2,45,800',
      subLabel: 'कालच्या तुलनेत',
      changePercent: 18.6,
      icon: TrendingUp,
      colorScheme: 'emerald',
    },
    {
      id: 'today-purchase',
      title: 'आजची खरेदी',
      value: '₹1,82,500',
      subLabel: 'कालच्या तुलनेत',
      changePercent: 12.4,
      icon: ShoppingCart,
      colorScheme: 'blue',
    },
    {
      id: 'today-invoices',
      title: 'आजची देयके (Invoices)',
      value: '64',
      subLabel: 'कालच्या तुलनेत',
      changePercent: 8.7,
      icon: Receipt,
      colorScheme: 'purple',
    },
    {
      id: 'total-customers',
      title: 'एकूण ग्राहक',
      value: '1,236',
      subLabel: 'एकूण नोंदणीकृत',
      changePercent: 10.2,
      icon: Users,
      colorScheme: 'orange',
    },
    {
      id: 'total-products',
      title: 'एकूण उत्पादने',
      value: '1,542',
      subLabel: 'सक्रिय उत्पादने',
      changePercent: 5.6,
      icon: Package,
      colorScheme: 'cyan',
    },
    {
      id: 'stock-value',
      title: 'एकूण स्टॉक मूल्य',
      value: '₹1.20 Cr',
      subLabel: 'सध्याचे मूल्य',
      changePercent: 9.3,
      icon: Database,
      colorScheme: 'amber',
    },
  ];

  const cards = items && items.length > 0 ? items : defaultItems;

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => {
        const cs = colorStyles[card.colorScheme] || colorStyles.emerald;
        const Icon = card.icon;
        const isPositive = (card.changePercent ?? 0) >= 0;

        return (
          <div
            key={card.id}
            onClick={() => {
              if (card.onClick) {
                card.onClick();
              } else if (onCardClick) {
                onCardClick(card.id);
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (card.onClick) {
                  card.onClick();
                } else if (onCardClick) {
                  onCardClick(card.id);
                }
              }
            }}
            className={cn(
              'shadow-2xs hover:shadow-xs group relative flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 sm:rounded-2xl sm:p-3.5 dark:border-white/[0.08] dark:bg-[#111827] dark:hover:border-white/[0.15]',
            )}
          >
            <div className="flex items-center gap-2.5">
              {/* Icon Box */}
              <div
                className={cn(
                  'h-8.5 w-8.5 flex shrink-0 items-center justify-center rounded-lg border transition-transform duration-150 group-hover:scale-105',
                  cs.iconBox,
                )}
              >
                <Icon className="h-4.5 w-4.5" strokeWidth={1.85} />
              </div>

              {/* Title & Value */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold leading-tight text-slate-500 dark:text-slate-400">
                  {card.title}
                </p>
                <p className="font-poppins truncate text-base font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[17px] dark:text-white">
                  {card.value}
                </p>
              </div>
            </div>

            {/* SubLabel & Trend Comparison Footer */}
            <div className="mt-2 flex items-center justify-between border-t border-slate-100/80 pt-1.5 text-[10.5px] font-medium leading-none text-slate-400 dark:border-white/[0.04] dark:text-slate-400">
              <span className="truncate">{card.subLabel}</span>
              {card.changePercent !== undefined && card.changePercent !== null && (
                <span
                  className={cn(
                    'ml-1 inline-flex shrink-0 items-center text-[10.5px] font-bold',
                    isPositive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400',
                  )}
                >
                  {isPositive ? (
                    <ArrowUp className="mr-0.5 inline h-3 w-3 stroke-[2.5]" />
                  ) : (
                    <ArrowDown className="mr-0.5 inline h-3 w-3 stroke-[2.5]" />
                  )}
                  {Math.abs(card.changePercent)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
