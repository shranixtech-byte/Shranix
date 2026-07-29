import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import React from 'react';

export interface ForecastPoint {
  period: string;
  actual?: number;
  predicted: number;
  lowerBound?: number;
  upperBound?: number;
}

interface ForecastWidgetProps {
  title: string;
  metric: string;
  unit: string;
  currentValue: number;
  forecastValue: number;
  changePercent: number;
  data: ForecastPoint[];
}

export const ForecastWidget: React.FC<ForecastWidgetProps> = ({
  title,
  metric,
  unit,
  currentValue,
  forecastValue,
  changePercent,
  data,
}) => {
  const isUp = changePercent > 0;
  const isDown = changePercent < 0;
  const maxVal = Math.max(...data.map(d => Math.max(d.actual || 0, d.predicted)));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
      <p className="text-xs text-gray-500 mt-0.5">{metric}</p>

      <div className="mt-3 flex items-end gap-4">
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Current</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {unit}{currentValue.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-1 mb-1">
          {isUp ? <TrendingUp className="h-4 w-4 text-green-500" /> : isDown ? <TrendingDown className="h-4 w-4 text-red-500" /> : <Minus className="h-4 w-4 text-gray-400" />}
          <span className={`text-sm font-semibold ${isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-gray-500'}`}>
            {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[10px] text-gray-400 uppercase">Forecast</p>
        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
          {unit}{forecastValue.toLocaleString()}
        </p>
      </div>

      {/* Mini Bar Chart */}
      <div className="mt-3 flex items-end gap-1 h-16">
        {data.slice(-8).map((point, i) => {
          const actualH = point.actual ? (point.actual / maxVal) * 100 : 0;
          const forecastH = (point.predicted / maxVal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
              {point.actual !== undefined && (
                <div
                  className="w-full rounded-t-sm bg-blue-500"
                  style={{ height: `${actualH}%` }}
                  title={`Actual: ${point.actual}`}
                />
              )}
              <div
                className={`w-full rounded-t-sm ${point.actual !== undefined ? 'bg-blue-300' : 'bg-blue-400'}`}
                style={{ height: `${forecastH}%`, opacity: point.actual !== undefined ? 0.5 : 1 }}
                title={`Predicted: ${point.predicted}`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-400">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-sm bg-blue-500" />
          <span>Actual</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-sm bg-blue-300 opacity-50" />
          <span>Predicted</span>
        </div>
      </div>
    </div>
  );
};
