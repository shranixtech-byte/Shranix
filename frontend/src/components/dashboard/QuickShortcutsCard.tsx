import { ShoppingCart, Receipt, ArrowRightLeft, UserPlus, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function QuickShortcutsCard() {
  const navigate = useNavigate();

  const shortcuts = [
    {
      id: 'new-sale',
      label: 'नवीन विक्री',
      icon: ShoppingCart,
      color: 'text-teal-600 dark:text-teal-400',
      path: '/sales/invoices/create',
    },
    {
      id: 'new-purchase',
      label: 'नवीन खरेदी',
      icon: Receipt,
      color: 'text-blue-600 dark:text-blue-400',
      path: '/purchase/invoices',
    },
    {
      id: 'stock-transfer',
      label: 'स्टॉक ट्रान्सफर',
      icon: ArrowRightLeft,
      color: 'text-emerald-600 dark:text-emerald-400',
      path: '/inventory/create-transfer',
    },
    {
      id: 'new-customer',
      label: 'नवीन ग्राहक',
      icon: UserPlus,
      color: 'text-teal-600 dark:text-teal-400',
      path: '/customers',
    },
    {
      id: 'reports',
      label: 'अहवाल',
      icon: BarChart3,
      color: 'text-indigo-600 dark:text-indigo-400',
      path: '/sales/reports/dashboard',
    },
  ];

  return (
    <div className="shadow-2xs hover:shadow-xs flex h-full flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3 transition-all duration-150 sm:rounded-2xl sm:p-3.5 dark:border-white/[0.08] dark:bg-[#111827]">
      {/* Header */}
      <div className="border-b border-slate-100/80 pb-1.5 dark:border-white/[0.06]">
        <h3 className="font-poppins text-xs font-bold leading-none text-slate-900 sm:text-sm dark:text-white">
          शॉर्टकट्स <span className="text-xs font-normal text-slate-400">(Shortcuts)</span>
        </h3>
      </div>

      {/* Buttons Row - Clean 5-button flex row with full width distribution and no text clipping */}
      <div className="mt-2 flex w-full items-center gap-1 sm:gap-1.5">
        {shortcuts.map((sc) => {
          const Icon = sc.icon;
          return (
            <button
              key={sc.id}
              onClick={() => navigate(sc.path)}
              className="flex min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-slate-200/80 bg-slate-50/80 px-1.5 py-1.5 text-[11px] font-bold text-slate-700 transition-all duration-150 hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700 active:scale-95 sm:gap-1.5 sm:px-2 sm:text-xs dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${sc.color}`} strokeWidth={1.85} />
              <span className="whitespace-nowrap">{sc.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
