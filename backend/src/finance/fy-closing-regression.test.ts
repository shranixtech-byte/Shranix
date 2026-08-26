import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

describe('Financial Year Closing Regression Tests', () => {
  describe('Bug 1: FinancialClosingEngineService was a stub returning fake success', () => {
    it('service now contains real closing logic', () => {
      const filePath = join(process.cwd(), 'src', 'gst_audit', 'services.ts');
      const source = readFileSync(filePath, 'utf-8');

      // Should NOT contain the old stub message
      expect(source).not.toContain('not yet implemented');

      // Should contain real closing logic
      expect(source).toContain('year_end_closing');
      expect(source).toContain('year_end_transfer');
      expect(source).toContain('retainedEarnings');
      expect(source).toContain('revenueAccountsClosed');
    });

    it('closeYear validates financial year exists', async () => {
      const { FinancialClosingEngineService } = await import('../gst_audit/services');

      // Create a mock database
      const mockDatabase = {
        financialYears: {
          findById: async () => null,
        },
      };

      const service = new FinancialClosingEngineService(mockDatabase as any);
      await expect(
        service.closeYear({ financialYearId: 'nonexistent', closingType: 'full' }),
      ).rejects.toThrow('not found');
    });

    it('closeYear rejects already closed FY', async () => {
      const { FinancialClosingEngineService } = await import('../gst_audit/services');

      const mockDatabase = {
        financialYears: {
          findById: async () => ({
            id: 'fy-1',
            name: 'FY 2025-26',
            isClosed: true,
            startDate: '2025-04-01',
            endDate: '2026-03-31',
          }),
        },
      };

      const service = new FinancialClosingEngineService(mockDatabase as any);
      const result = await service.closeYear({
        financialYearId: 'fy-1',
        closingType: 'full',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('already closed');
    });

    it('closeYear rejects when GL entries are unbalanced', async () => {
      const { FinancialClosingEngineService } = await import('../gst_audit/services');

      const mockDatabase = {
        financialYears: {
          findById: async () => ({
            id: 'fy-1',
            name: 'FY 2025-26',
            isClosed: false,
            isActive: true,
            startDate: '2025-04-01',
            endDate: '2026-03-31',
          }),
        },
        glEntries: {
          findAll: async () => ({
            data: [
              { accountId: 'acc-1', debit: 1000, credit: 0 },
              { accountId: 'acc-2', debit: 0, credit: 500 },
            ],
          }),
        },
      };

      const service = new FinancialClosingEngineService(mockDatabase as any);
      const result = await service.closeYear({
        financialYearId: 'fy-1',
        closingType: 'full',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('unbalanced');
      expect(result.message).toContain('1000');
      expect(result.message).toContain('500');
    });
  });

  describe('Bug 2: executeClosing controller endpoint was a stub', () => {
    it('controller uses real FinancialClosingEngineService', () => {
      const filePath = join(process.cwd(), 'src', 'automation', 'controllers.ts');
      const source = readFileSync(filePath, 'utf-8');

      // Should import FinancialClosingEngineService
      expect(source).toContain('FinancialClosingEngineService');

      // Should inject it into IntegrationController
      expect(source).toContain('private readonly financialClosing: FinancialClosingEngineService');

      // Should call financialClosing.closeYear
      expect(source).toContain('this.financialClosing.closeYear');

      // Should NOT contain the old stub
      expect(source).not.toContain('not yet implemented');
    });
  });

  describe('Bug 3: FinancialClosingEngineService was declared with no constructor args', () => {
    it('service now requires DatabaseService', () => {
      const filePath = join(process.cwd(), 'src', 'gst_audit', 'services.ts');
      const source = readFileSync(filePath, 'utf-8');

      // Should have database injection
      expect(source).toContain('constructor(private readonly database: DatabaseService)');
    });
  });
});
