import { ArrowUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PurchaseDataPoint {
  date: string;
  amount: number;
}

interface PeriodData {
  data: PurchaseDataPoint[];
  total: string;
  changePercent: number;
  label: string;
}

interface PurchaseOverviewCardProps {
  totalPurchases?: string;
  changePercent?: number;
  periodLabel?: string;
  chartData?: PurchaseDataPoint[];
  overviewData?: {
    weekly?: PeriodData;
    monthly?: PeriodData;
    yearly?: PeriodData;
  };
}

const defaultWeeklyData: PurchaseDataPoint[] = [
  { date: '18 Aug', amount: 98000 },
  { date: '19 Aug', amount: 135000 },
  { date: '20 Aug', amount: 122000 },
  { date: '21 Aug', amount: 154000 },
  { date: '22 Aug', amount: 138000 },
  { date: '23 Aug', amount: 110000 },
  { date: '24 Aug', amount: 145000 },
];

const defaultMonthlyData: PurchaseDataPoint[] = [
  { date: 'Week 1', amount: 340000 },
  { date: 'Week 2', amount: 480000 },
  { date: 'Week 3', amount: 410000 },
  { date: 'Week 4', amount: 560000 },
];

const defaultYearlyData: PurchaseDataPoint[] = [
  { date: 'Q1', amount: 1250000 },
  { date: 'Q2', amount: 1680000 },
  { date: 'Q3', amount: 1950000 },
  { date: 'Q4', amount: 2420000 },
];

const formatYAxis = (value: number) => {
  if (value >= 10000000) {return `${(value / 10000000).toFixed(0)}Cr`;}
  if (value >= 100000) {return `${(value / 100000).toFixed(0)}L`;}
  if (value >= 1000) {return `${(value / 1000).toFixed(0)}K`;}
  return `${value}`;
};

export function PurchaseOverviewCard({
  totalPurchases = '₹8,72,300',
  changePercent = 11.2,
  periodLabel = 'या आठवड्यात',
  chartData,
  overviewData,
}: PurchaseOverviewCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

  const selectedDataObj =
    selectedPeriod === 'month'
      ? overviewData?.monthly
      : selectedPeriod === 'year'
        ? overviewData?.yearly
        : overviewData?.weekly;

  const currentData =
    chartData && chartData.length > 0
      ? chartData
      : selectedDataObj?.data && selectedDataObj.data.length > 0
        ? selectedDataObj.data
        : selectedPeriod === 'month'
          ? defaultMonthlyData
          : selectedPeriod === 'year'
            ? defaultYearlyData
            : defaultWeeklyData;

  const currentTotal =
    selectedDataObj?.total ||
    (selectedPeriod === 'month'
      ? '₹17,90,000'
      : selectedPeriod === 'year'
        ? '₹73.00 L'
        : totalPurchases);

  const currentChangePercent =
    selectedDataObj?.changePercent !== undefined ? selectedDataObj.changePercent : changePercent;

  const currentLabel =
    selectedDataObj?.label ||
    (selectedPeriod === 'month'
      ? 'या महिन्यात'
      : selectedPeriod === 'year'
        ? 'या वर्षात'
        : periodLabel);

  return (
    <div className="shadow-2xs hover:shadow-xs flex h-full flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3 transition-all duration-150 sm:rounded-2xl sm:p-3.5 dark:border-white/[0.08] dark:bg-[#111827]">
      {/* Header with Title & Period Dropdown */}
      <div className="flex items-center justify-between border-b border-slate-100/80 pb-1.5 dark:border-white/[0.06]">
        <div>
          <h3 className="font-poppins text-xs font-bold leading-none text-slate-900 sm:text-sm dark:text-white">
            खरेदी आढावा{' '}
            <span className="text-xs font-normal text-slate-400">(Purchase Overview)</span>
          </h3>
        </div>

        {/* Period Selector Dropdown */}
        <div className="relative">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="cursor-pointer appearance-none rounded-lg border border-slate-200/80 bg-slate-50/80 py-1 pl-2.5 pr-6 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200"
          >
            <option value="week">या आठवड्यात</option>
            <option value="month">या महिन्यात</option>
            <option value="year">या वर्षात</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Main Metric Stat & Trend */}
      <div className="mt-1.5 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-slate-400">एकूण:</span>
          <span className="font-poppins text-base font-extrabold leading-none tracking-tight text-slate-900 sm:text-lg dark:text-white">
            {currentTotal}
          </span>
        </div>
        <span className="inline-flex items-center gap-0.5 text-xs font-bold leading-none text-emerald-600 dark:text-emerald-400">
          <ArrowUp className="h-3 w-3 stroke-[2.5]" />
          {currentChangePercent}% {currentLabel}
        </span>
      </div>

      {/* Smooth Area Chart */}
      <div className="mt-1.5 min-h-[110px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={currentData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="purchaseOverviewGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              dy={2}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              tickFormatter={formatYAxis}
              dx={-2}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="shadow-xs rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
                      <p className="text-[10px] font-medium text-slate-400">
                        {payload[0].payload.date}
                      </p>
                      <p className="font-poppins text-xs font-extrabold text-blue-600 dark:text-blue-400">
                        ₹{Number(payload[0].value).toLocaleString('en-IN')}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#purchaseOverviewGrad)"
              dot={{ r: 2.5, fill: '#3B82F6', stroke: '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 4, fill: '#3B82F6', stroke: '#ffffff', strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
