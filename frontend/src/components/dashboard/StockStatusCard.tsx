import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface StockStatusItem {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface StockStatusCardProps {
  totalProducts?: number;
  inStockCount?: number;
  lowStockCount?: number;
  criticalStockCount?: number;
  outOfStockCount?: number;
  onViewAll?: () => void;
}

export function StockStatusCard({
  totalProducts = 1542,
  inStockCount = 1430,
  lowStockCount = 61,
  criticalStockCount = 36,
  outOfStockCount = 15,
  onViewAll,
}: StockStatusCardProps) {
  const navigate = useNavigate();

  const total =
    totalProducts || inStockCount + lowStockCount + criticalStockCount + outOfStockCount || 1;

  const stockData: StockStatusItem[] = [
    {
      name: 'Low Stock',
      count: lowStockCount,
      percentage: Number(((lowStockCount / total) * 100).toFixed(2)),
      color: '#EF4444', // Red
    },
    {
      name: 'Critical Stock',
      count: criticalStockCount,
      percentage: Number(((criticalStockCount / total) * 100).toFixed(2)),
      color: '#F97316', // Orange
    },
    {
      name: 'Out of Stock',
      count: outOfStockCount,
      percentage: Number(((outOfStockCount / total) * 100).toFixed(2)),
      color: '#F59E0B', // Amber
    },
    {
      name: 'In Stock',
      count: inStockCount,
      percentage: Number(((inStockCount / total) * 100).toFixed(2)),
      color: '#10B981', // Green
    },
  ];

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      navigate('/inventory/products');
    }
  };

  return (
    <div className="shadow-2xs hover:shadow-xs flex h-full flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3 transition-all duration-150 sm:rounded-2xl sm:p-3.5 dark:border-white/[0.08] dark:bg-[#111827]">
      {/* Header with Title & View All */}
      <div className="flex items-center justify-between border-b border-slate-100/80 pb-1.5 dark:border-white/[0.06]">
        <div>
          <h3 className="font-poppins text-xs font-bold leading-none text-slate-900 sm:text-sm dark:text-white">
            स्टॉक स्थिती <span className="text-xs font-normal text-slate-400">(Stock Status)</span>
          </h3>
        </div>
        <button
          onClick={handleViewAll}
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400"
        >
          View All <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Donut Chart & Legend Row */}
      <div className="mt-1.5 flex min-h-[110px] flex-1 items-center justify-between gap-3">
        {/* Left Donut Chart with Center Text */}
        <div className="relative flex h-[115px] w-[115px] shrink-0 items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as StockStatusItem;
                    return (
                      <div className="shadow-xs rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
                        <p className="text-[10px] font-bold text-slate-900 dark:text-white">
                          {data.name}
                        </p>
                        <p
                          className="font-poppins text-xs font-extrabold"
                          style={{ color: data.color }}
                        >
                          {data.count} ({data.percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={stockData}
                dataKey="count"
                nameKey="name"
                innerRadius={34}
                outerRadius={52}
                paddingAngle={2.5}
                stroke="none"
              >
                {stockData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Total Text */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-medium leading-none text-slate-400">एकूण</span>
            <span className="font-poppins text-xs font-extrabold leading-tight text-slate-900 sm:text-sm dark:text-white">
              {total.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Right Legend List */}
        <div className="w-full flex-1 space-y-1">
          {stockData.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between text-xs leading-tight"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                  {item.name}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-right font-medium text-slate-500">
                <span className="font-poppins text-xs font-bold text-slate-900 dark:text-white">
                  {item.count.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
