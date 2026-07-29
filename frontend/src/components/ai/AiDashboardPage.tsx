import { Bot, Lightbulb, TrendingUp, Zap, ShieldCheck, Cpu, Sparkles, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { AiCopilotPanel } from './AiCopilotPanel';
import { ForecastWidget, type ForecastPoint } from './ForecastWidget';
import { InsightCard, type Insight } from './InsightCard';

interface AiHealth {
  provider: string;
  model: string;
  available: boolean;
  latencyMs: number;
  fallbackAvailable: boolean;
}

interface ForecastData {
  metric: string;
  currentValue: number;
  forecastValue: number;
  changePercent: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  dataPoints: ForecastPoint[];
}

export const AiDashboardPage: React.FC = () => {
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [forecasts, setForecasts] = useState<Record<string, ForecastData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [healthRes, insightsRes, salesFc, revenueFc, cashflowFc] = await Promise.all([
        fetch('/api/ai/health').then((r) => r.ok ? r.json() : null),
        fetch('/api/ai/insights').then((r) => r.ok ? r.json() : []),
        fetch('/api/ai/forecast/sales?periods=6').then((r) => r.ok ? r.json() : null),
        fetch('/api/ai/forecast/revenue?periods=4').then((r) => r.ok ? r.json() : null),
        fetch('/api/ai/forecast/cashflow?periods=3').then((r) => r.ok ? r.json() : null),
      ]);

      setHealth(healthRes);
      setInsights(Array.isArray(insightsRes) ? insightsRes : []);
      setForecasts({
        sales: salesFc,
        revenue: revenueFc,
        cashflow: cashflowFc,
      });
    } catch {
      setError('Failed to load AI dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Cpu className="h-6 w-6 animate-pulse text-blue-500" />
          <span className="text-sm">Initializing AI Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <Sparkles className="h-6 w-6 text-blue-600" />
            AI Intelligence Hub
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            AI-powered insights, forecasts, and automation for your ERP
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCopilotOpen(!isCopilotOpen)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            <Bot className="h-4 w-4" />
            Open Copilot
          </button>
          <button
            onClick={loadDashboardData}
            className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20">
          {error}
        </div>
      )}

      {/* AI Health Status */}
      {health && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
          <ShieldCheck className={`h-5 w-5 ${health.available ? 'text-green-500' : 'text-red-500'}`} />
          <div className="text-sm">
            <span className="font-medium text-gray-900 dark:text-white">{health.provider}/{health.model}</span>
            <span className="mx-2 text-gray-300">|</span>
            <span className={health.available ? 'text-green-600' : 'text-red-600'}>
              {health.available ? 'Available' : 'Unavailable'} ({health.latencyMs}ms)
            </span>
            {health.fallbackAvailable && (
              <span className="ml-2 text-xs text-amber-600">Fallback ready</span>
            )}
          </div>
        </div>
      )}

      {/* Insights Grid */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          AI Insights
        </h2>
        {insights.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No insights available. Enable an AI provider to generate insights.</p>
        )}
      </div>

      {/* Forecasts */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Predictive Forecasts
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {forecasts.sales && (
            <ForecastWidget
              title="Sales Revenue Forecast"
              metric="Monthly Sales"
              unit="₹"
              currentValue={forecasts.sales.currentValue}
              forecastValue={forecasts.sales.forecastValue}
              changePercent={forecasts.sales.changePercent}
              data={forecasts.sales.dataPoints}
            />
          )}
          {forecasts.revenue && (
            <ForecastWidget
              title="Revenue Forecast"
              metric="Quarterly Revenue"
              unit="₹"
              currentValue={forecasts.revenue.currentValue}
              forecastValue={forecasts.revenue.forecastValue}
              changePercent={forecasts.revenue.changePercent}
              data={forecasts.revenue.dataPoints}
            />
          )}
          {forecasts.cashflow && (
            <ForecastWidget
              title="Cash Flow Forecast"
              metric="Monthly Cash Flow"
              unit="₹"
              currentValue={forecasts.cashflow.currentValue}
              forecastValue={forecasts.cashflow.forecastValue}
              changePercent={forecasts.cashflow.changePercent}
              data={forecasts.cashflow.dataPoints}
            />
          )}
          {!forecasts.sales && !forecasts.revenue && !forecasts.cashflow && (
            <p className="col-span-3 text-sm text-gray-400">No forecast data available. Enable an AI provider for predictions.</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Zap className="h-5 w-5 text-amber-500" />
          AI Capabilities
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: Bot, label: 'ERP Copilot', desc: 'Ask questions about your data', path: '#copilot', color: 'blue' },
            { icon: Lightbulb, label: 'Smart Insights', desc: 'Proactive business analysis', path: '#insights', color: 'amber' },
            { icon: TrendingUp, label: 'Forecasts', desc: 'Predictive trend analysis', path: '#forecasts', color: 'green' },
            { icon: Zap, label: 'Automation', desc: 'AI-assisted task automation', path: '#automation', color: 'purple' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => item.path === '#copilot' && setIsCopilotOpen(true)}
              className={`rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-900`}
            >
              <div className={`mb-2 inline-flex rounded-lg p-2 bg-${item.color}-100 text-${item.color}-600`}>
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</h3>
              <p className="mt-0.5 text-xs text-gray-500">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Copilot Panel */}
      <AiCopilotPanel />
    </div>
  );
};
