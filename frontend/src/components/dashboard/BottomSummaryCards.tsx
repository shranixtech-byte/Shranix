import { Calendar, FileText, Lock, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BottomSummaryCardsProps {
  pendingOrders?: number;
  pendingInvoices?: number;
  outstandingAmount?: string;
  cashInHand?: string;
}

export function BottomSummaryCards({
  pendingOrders = 18,
  pendingInvoices = 23,
  outstandingAmount = '₹18,75,230',
  cashInHand = '₹5,32,450',
}: BottomSummaryCardsProps) {
  const navigate = useNavigate();

  const cards = [
    {
      id: 'pending-orders',
      title: 'पेंडिंग ऑर्डर्स',
      value: String(pendingOrders),
      icon: Calendar,
      path: '/sales/orders',
    },
    {
      id: 'pending-invoices',
      title: 'पेंडिंग इन्व्हॉइसेस',
      value: String(pendingInvoices),
      icon: FileText,
      path: '/sales/invoices',
    },
    {
      id: 'outstanding-amount',
      title: 'थकबाकी रक्कम',
      value: outstandingAmount,
      icon: Lock,
      path: '/customers/outstanding',
    },
    {
      id: 'cash-in-hand',
      title: 'कॅश इन हँड',
      value: cashInHand,
      icon: Wallet,
      path: '/finance/cash-book',
    },
  ];

  return (
    <div className="grid h-full grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.id}
            onClick={() => navigate(card.path)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(card.path);
              }
            }}
            className="shadow-2xs hover:shadow-xs group flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 sm:rounded-2xl sm:p-3.5 dark:border-white/[0.08] dark:bg-[#111827]"
          >
            {/* Icon box */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition-transform duration-150 group-hover:scale-105 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Icon className="h-4.5 w-4.5" strokeWidth={1.85} />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold leading-tight text-slate-500 dark:text-slate-400">
                {card.title}
              </p>
              <p className="font-poppins truncate text-base font-extrabold leading-tight text-slate-900 sm:text-lg dark:text-white">
                {card.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
