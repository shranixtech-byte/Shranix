import { ChevronRight, Package2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface TopProductItem {
  id: string;
  name: string;
  quantityText: string;
  revenue: string;
  percentage: number;
  image?: string;
}

interface TopSellingProductsCardProps {
  products?: TopProductItem[];
  onViewAll?: () => void;
}

export function TopSellingProductsCard({ products = [], onViewAll }: TopSellingProductsCardProps) {
  const navigate = useNavigate();

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      navigate('/inventory/products');
    }
  };

  return (
    <div className="shadow-2xs hover:shadow-xs flex h-full flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3 transition-all duration-150 sm:rounded-2xl sm:p-3.5 dark:border-white/[0.08] dark:bg-[#111827]">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-100/80 pb-1.5 dark:border-white/[0.06]">
          <h3 className="font-poppins text-xs font-bold leading-none text-slate-900 sm:text-sm dark:text-white">
            सर्वाधिक विक्री उत्पादने{' '}
            <span className="text-xs font-normal text-slate-400">(Top Products)</span>
          </h3>
          <button
            onClick={handleViewAll}
            className="group flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            <span>सर्व पहा</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Product List / Empty State */}
      <div className="my-1.5 flex flex-1 flex-col justify-center space-y-1 overflow-hidden sm:space-y-1.5">
        {products.length > 0 ? (
          products.slice(0, 3).map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-1 sm:py-1.5 dark:border-white/[0.04] dark:bg-white/[0.02]"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-[10px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                    <span>{item.quantityText}</span>
                    <span>•</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {item.revenue}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar / Share */}
              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-slate-200 sm:block dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                    style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                  />
                </div>
                <span className="font-poppins min-w-[28px] text-right text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Package2 className="mb-1 h-6 w-6 text-slate-300 dark:text-slate-600" />
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              सध्या विक्रीची कोणतीही आकडेवारी उपलब्ध नाही.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-100/80 pt-1 text-[11px] text-slate-500 dark:border-white/[0.06] dark:text-slate-400">
        शीर्ष उत्पादनांची आकडेवारी वास्तविक विक्रीवर आधारित आहे
      </div>
    </div>
  );
}
