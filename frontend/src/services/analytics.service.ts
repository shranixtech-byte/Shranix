import { apiRequest } from './api-client';

// ═════════════════════════════════════════════════════════
// TYPES — mirrors backend/src/analytics/analytics.service.ts
// ═════════════════════════════════════════════════════════

export type AnalyticsFormat = 'currency' | 'number' | 'percent' | 'date';

export interface AnalyticsKpi {
  key: string;
  label: string;
  value: number;
  format?: AnalyticsFormat;
  trend?: 'up' | 'down' | 'flat';
  color?: string;
}

export interface AnalyticsChartSeries {
  key: string;
  name: string;
  color: string;
}

export interface AnalyticsChart {
  title: string;
  type: 'bar' | 'area';
  data: Record<string, unknown>[];
  series: AnalyticsChartSeries[];
  height?: number;
}

export interface AnalyticsTableColumn {
  key: string;
  label: string;
  format?: AnalyticsFormat;
}

export interface AnalyticsTable {
  title: string;
  columns: AnalyticsTableColumn[];
  rows: Record<string, unknown>[];
}

export interface AnalyticsPayload {
  generatedAt: string;
  kpis: AnalyticsKpi[];
  charts: AnalyticsChart[];
  tables: AnalyticsTable[];
}

// ═════════════════════════════════════════════════════════
// API — GET /analytics/*
// ═════════════════════════════════════════════════════════

export async function getAnalytics(endpoint: string): Promise<AnalyticsPayload> {
  return apiRequest<AnalyticsPayload>(`/analytics/${endpoint}`);
}

export const getAnalyticsOverview = () => getAnalytics('overview');
export const getSalesAnalytics = () => getAnalytics('sales');
export const getPurchaseAnalytics = () => getAnalytics('purchase');
export const getInventoryAnalytics = () => getAnalytics('inventory');
export const getFinanceAnalytics = () => getAnalytics('finance');
export const getGstAnalytics = () => getAnalytics('gst');
export const getCustomerAnalytics = () => getAnalytics('customers');
export const getSupplierAnalytics = () => getAnalytics('suppliers');
export const getWarehouseAnalytics = () => getAnalytics('warehouses');
export const getProfitabilityAnalytics = () => getAnalytics('profitability');
export const getCashFlowAnalytics = () => getAnalytics('cashflow');
export const getGrowthAnalytics = () => getAnalytics('growth');
export const getTopBottomAnalytics = () => getAnalytics('top-bottom');
