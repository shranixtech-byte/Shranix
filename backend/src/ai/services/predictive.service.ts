import { Injectable } from '@nestjs/common';

import { AiService } from './ai.service';

/**
 * Predictive Analytics Service — SIMULATED / NOT PRODUCTION READY
 * ================================================================
 * This service generates SIMULATED forecast data for development and testing.
 *
 * IMPORTANT: This is NOT real AI/ML prediction.
 * - Data points are randomly generated
 * - Forecast values use simple trend-based math with randomness
 * - Confidence scores are artificially generated
 * - No real machine learning models are used
 *
 * To make this production-ready:
 * 1. Integrate with a real ML provider (e.g., TensorFlow.js, Azure ML, AWS Forecast)
 * 2. Use actual historical data from the ERP database
 * 3. Train models on real business patterns
 * 4. Validate predictions against actual outcomes
 *
 * SECURITY: This service does NOT perform any ERP mutations.
 * AI-generated recommendations must never bypass normal ERP permissions.
 */

export interface ForecastResult {
  /** Whether this result is simulated (always true in current implementation) */
  isSimulated: boolean;
  metric: string;
  currentValue: number;
  forecastValue: number;
  changePercent: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  dataPoints: Array<{ period: string; actual?: number; predicted: number }>;
}

@Injectable()
export class PredictiveService {
  constructor(private readonly aiService: AiService) {}

  async forecastSales(periods = 6): Promise<ForecastResult> {
    return this.generateForecast('Sales Revenue', 125000, periods, 'monthly');
  }

  async forecastPurchases(periods = 6): Promise<ForecastResult> {
    return this.generateForecast('Purchase Volume', 85000, periods, 'monthly');
  }

  async forecastInventory(periods = 3): Promise<ForecastResult> {
    return this.generateForecast('Inventory Turnover', 2.5, periods, 'monthly');
  }

  async forecastRevenue(periods = 4): Promise<ForecastResult> {
    return this.generateForecast('Revenue', 250000, periods, 'quarterly');
  }

  async forecastCashFlow(periods = 3): Promise<ForecastResult> {
    return this.generateForecast('Cash Flow', 50000, periods, 'monthly');
  }

  async getTrendAnalysis(
    metric: string,
    historicalData: number[],
  ): Promise<{ trend: 'up' | 'down' | 'stable'; changePercent: number; description: string }> {
    if (historicalData.length < 2) {
      return {
        trend: 'stable',
        changePercent: 0,
        description: 'Insufficient data for trend analysis.',
      };
    }

    const first = historicalData[0];
    const last = historicalData[historicalData.length - 1];
    const changePercent = first > 0 ? ((last - first) / first) * 100 : 0;
    const trend: 'up' | 'down' | 'stable' =
      changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable';

    try {
      const response = await this.aiService.completeWithTemplate('forecast-analysis', {
        data: JSON.stringify({ metric, historicalData, changePercent, trend }),
        currentPeriod: new Date().toISOString().split('T')[0],
        forecastPeriods: '3',
      });
      return { trend, changePercent, description: response.content };
    } catch {
      return {
        trend,
        changePercent,
        description: `${metric} has a ${trend}ward trend with ${Math.abs(changePercent).toFixed(1)}% change.`,
      };
    }
  }

  private generateForecast(
    metric: string,
    currentValue: number,
    periods: number,
    _frequency: string,
  ): ForecastResult {
    // SIMULATED forecast — not real AI/ML prediction
    // Simple trend-based forecast
    const variability = 0.1; // 10% random variation
    const trend = (Math.random() - 0.4) * 0.05; // Slight upward bias
    const dataPoints: Array<{ period: string; actual?: number; predicted: number }> = [];

    // Historical data points (simulated)
    for (let i = periods; i > 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const actual =
        currentValue * (1 + trend * (periods - i) + (Math.random() - 0.5) * variability);
      dataPoints.push({
        period: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
        actual: Math.round(actual),
        predicted: Math.round(actual),
      });
    }

    // Forecast data points
    let forecastValue = currentValue;
    for (let i = 1; i <= periods; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      forecastValue = forecastValue * (1 + trend + (Math.random() - 0.5) * variability * 0.5);
      dataPoints.push({
        period: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
        predicted: Math.round(forecastValue),
      });
    }

    const changePercent = ((forecastValue - currentValue) / currentValue) * 100;
    const trendDir: 'up' | 'down' | 'stable' =
      changePercent > 3 ? 'up' : changePercent < -3 ? 'down' : 'stable';

    return {
      metric,
      currentValue: Math.round(currentValue),
      forecastValue: Math.round(forecastValue),
      changePercent: Math.round(changePercent * 10) / 10,
      confidence: 0.7 + Math.random() * 0.2,
      isSimulated: true,
      trend: trendDir,
      dataPoints,
    };
  }
}
