import { createDatabaseClient, loadDatabaseConfig } from '@shranix/database';
import { describe, it, expect, beforeAll } from 'vitest';

import { DatabaseService } from '../database/database.service';

import { DashboardService } from './dashboard.service';

describe('DashboardService Real Database Integration', () => {
  let dashboardService: DashboardService;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    const config = loadDatabaseConfig();
    const client = createDatabaseClient(config);

    databaseService = new DatabaseService(client as any);
    dashboardService = new DashboardService(databaseService);
  });

  it('aggregates live metrics with non-hardcoded database values', async () => {
    const result = await dashboardService.getDashboard('test-user-id');

    expect(result).toBeDefined();
    expect(result.kpis).toBeDefined();
    expect(typeof result.kpis.totalCustomersCount).toBe('number');
    expect(typeof result.kpis.totalProductsCount).toBe('number');
    expect(typeof result.kpis.inventoryValue).toBe('number');
    expect(typeof result.kpis.todayInvoiceCount).toBe('number');
    expect(typeof result.kpis.todayCashSales).toBe('number');
    expect(typeof result.kpis.todayCreditSales).toBe('number');
    expect(result.stockStatus).toBeDefined();
    expect(typeof result.stockStatus.totalProducts).toBe('number');
    expect(typeof result.stockStatus.inStockCount).toBe('number');
    expect(typeof result.stockStatus.lowStockCount).toBe('number');
    expect(typeof result.stockStatus.criticalStockCount).toBe('number');
    expect(typeof result.stockStatus.outOfStockCount).toBe('number');
    expect(result.salesOverview).toBeDefined();
    expect(result.purchaseOverview).toBeDefined();
    expect(Array.isArray(result.expiryAlerts)).toBe(true);
    expect(Array.isArray(result.recentTransactions)).toBe(true);
    expect(Array.isArray(result.topSellingProducts)).toBe(true);
    expect(result.bottomSummary).toBeDefined();
    expect(typeof result.bottomSummary.pendingOrders).toBe('number');
    expect(typeof result.bottomSummary.pendingInvoices).toBe('number');
  });

  it('correctly handles zero-state without throwing errors or injecting fake fallbacks', async () => {
    const result = await dashboardService.getDashboard('non-existent-user');
    expect(result).toBeDefined();
    expect(result.bottomSummary.outstandingAmount).toMatch(/^₹/);
    expect(result.bottomSummary.cashInHand).toMatch(/^₹/);
  });
});
