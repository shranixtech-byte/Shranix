import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

/**
 * GST Calculation Engine
 *
 * Handles CGST, SGST, IGST, CESS calculations.
 * Supports reverse charge, input tax credit, output tax tracking.
 */
export interface GstCalculationInput {
  taxableValue: number;
  gstRate: number;
  supplyType: 'intra-state' | 'inter-state';
  cessPercent?: number;
  reverseCharge?: boolean;
  hsnSacCode?: string;
}

export interface GstCalculationResult {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalGst: number;
  totalAmount: number;
  gstRate: number;
  supplyType: string;
  reverseCharge: boolean;
}

export interface GstPostingInput {
  voucherId: string;
  voucherType: string;
  voucherNumber: string;
  voucherDate: string;
  gstin?: string;
  partyId?: string;
  financialYearId?: string;
  branchId?: string;
  items: Array<{
    taxableValue: number;
    gstRate: number;
    supplyType: 'intra-state' | 'inter-state';
    cessPercent?: number;
    hsnSacCode?: string;
    reverseCharge?: boolean;
  }>;
}

@Injectable()
export class GstCalculationEngine {
  private readonly logger = new Logger(GstCalculationEngine.name);

  constructor(private readonly database: DatabaseService) {}

  /**
   * Calculate GST for a single line item.
   */
  calculateGst(input: GstCalculationInput): GstCalculationResult {
    const { taxableValue, gstRate, supplyType, cessPercent = 0, reverseCharge = false } = input;

    const totalGstRate = gstRate;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (supplyType === 'intra-state') {
      // Intra-state: CGST + SGST split equally
      cgst = (taxableValue * totalGstRate) / 200; // half of total GST rate
      sgst = (taxableValue * totalGstRate) / 200;
    } else {
      // Inter-state: IGST (full rate)
      igst = (taxableValue * totalGstRate) / 100;
    }

    const cess = (taxableValue * cessPercent) / 100;
    const totalGst = cgst + sgst + igst + cess;
    const totalAmount = taxableValue + totalGst;

    return {
      taxableValue,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      cess: Math.round(cess * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      gstRate,
      supplyType,
      reverseCharge,
    };
  }

  /**
   * Calculate and post GST entries for a voucher.
   */
  async postGstEntries(
    input: GstPostingInput,
    userId?: string,
  ): Promise<{
    success: boolean;
    message: string;
    calculations: GstCalculationResult[];
    postedEntries: number;
  }> {
    const calculations: GstCalculationResult[] = [];
    const now = new Date().toISOString();
    let totalInput = 0;
    let totalOutput = 0;

    for (const item of input.items) {
      const result = this.calculateGst(item);
      calculations.push(result);

      this.logger.log(`GST Calc: ${result.taxableValue} @ ${result.gstRate}% = CGST:${result.cgst} SGST:${result.sgst} IGST:${result.igst} CESS:${result.cess}`);
    }

    // Determine input/output based on voucher type
    const inputOutput = ['purchase', 'expense', 'purchase_return'].includes(input.voucherType) ? 'input' : 'output';

    // Post GST to GST Ledger
    for (const calc of calculations) {
      // Post CGST entry
      if (calc.cgst > 0) {
        await this.database.gstLedger.create({
          voucherType: input.voucherType,
          voucherId: input.voucherId,
          voucherNumber: input.voucherNumber,
          voucherDate: input.voucherDate || now,
          gstin: input.gstin || null,
          gstType: 'CGST',
          gstRate: calc.gstRate,
          taxableValue: calc.taxableValue,
          gstAmount: calc.cgst,
          inputOutput,
          reverseCharge: input.items[0]?.reverseCharge ? 'yes' : 'no',
          hsnSacCode: input.items[0]?.hsnSacCode || null,
          financialYearId: input.financialYearId || null,
          branchId: input.branchId || null,
          createdBy: userId || null,
        } as any);
      }

      // Post SGST entry
      if (calc.sgst > 0) {
        await this.database.gstLedger.create({
          voucherType: input.voucherType,
          voucherId: input.voucherId,
          voucherNumber: input.voucherNumber,
          voucherDate: input.voucherDate || now,
          gstin: input.gstin || null,
          gstType: 'SGST',
          gstRate: calc.gstRate,
          taxableValue: calc.taxableValue,
          gstAmount: calc.sgst,
          inputOutput,
          reverseCharge: input.items[0]?.reverseCharge ? 'yes' : 'no',
          hsnSacCode: input.items[0]?.hsnSacCode || null,
          financialYearId: input.financialYearId || null,
          branchId: input.branchId || null,
          createdBy: userId || null,
        } as any);
      }

      // Post IGST entry
      if (calc.igst > 0) {
        await this.database.gstLedger.create({
          voucherType: input.voucherType,
          voucherId: input.voucherId,
          voucherNumber: input.voucherNumber,
          voucherDate: input.voucherDate || now,
          gstin: input.gstin || null,
          gstType: 'IGST',
          gstRate: calc.gstRate,
          taxableValue: calc.taxableValue,
          gstAmount: calc.igst,
          inputOutput,
          reverseCharge: input.items[0]?.reverseCharge ? 'yes' : 'no',
          hsnSacCode: input.items[0]?.hsnSacCode || null,
          financialYearId: input.financialYearId || null,
          branchId: input.branchId || null,
          createdBy: userId || null,
        } as any);
      }

      // Post CESS entry
      if (calc.cess > 0) {
        await this.database.gstLedger.create({
          voucherType: input.voucherType,
          voucherId: input.voucherId,
          voucherNumber: input.voucherNumber,
          voucherDate: input.voucherDate || now,
          gstin: input.gstin || null,
          gstType: 'CESS',
          gstRate: 0,
          taxableValue: calc.taxableValue,
          gstAmount: calc.cess,
          inputOutput,
          reverseCharge: input.items[0]?.reverseCharge ? 'yes' : 'no',
          hsnSacCode: input.items[0]?.hsnSacCode || null,
          financialYearId: input.financialYearId || null,
          branchId: input.branchId || null,
          createdBy: userId || null,
        } as any);
      }

      if (inputOutput === 'input') {totalInput += calc.totalGst;}
      else {totalOutput += calc.totalGst;}
    }

    const totalEntries = calculations.length * 4; // Up to 4 entries per calculation (CGST/SGST/IGST/CESS)

    return {
      success: true,
      message: `GST entries posted: ${totalEntries} ledger entries (Input: ${totalInput.toFixed(2)}, Output: ${totalOutput.toFixed(2)})`,
      calculations,
      postedEntries: totalEntries,
    };
  }

  /**
   * Get GST summary for a period.
   */
  async getGstSummary(params: {
    fromDate?: string;
    toDate?: string;
    gstin?: string;
    financialYearId?: string;
  }): Promise<{
    totalInputTax: number;
    totalOutputTax: number;
    netPayable: number;
    cgstInput: number;
    sgstInput: number;
    igstInput: number;
    cgstOutput: number;
    sgstOutput: number;
    igstOutput: number;
    details: any[];
  }> {
    const entries = await this.database.gstLedger.findAll({
      page: 1,
      pageSize: 10000,
    } as any);

    let totalInputTax = 0;
    let totalOutputTax = 0;
    let cgstInput = 0;
    let sgstInput = 0;
    let igstInput = 0;
    let cgstOutput = 0;
    let sgstOutput = 0;
    let igstOutput = 0;

    if (entries.data) {
      for (const entry of entries.data as any[]) {
        // Apply date filter
        if (params.fromDate && entry.voucherDate < params.fromDate) {continue;}
        if (params.toDate && entry.voucherDate > params.toDate) {continue;}
        if (params.gstin && entry.gstin !== params.gstin) {continue;}

        if (entry.inputOutput === 'input') {
          totalInputTax += Number(entry.gstAmount) || 0;
          if (entry.gstType === 'CGST') {cgstInput += Number(entry.gstAmount) || 0;}
          if (entry.gstType === 'SGST') {sgstInput += Number(entry.gstAmount) || 0;}
          if (entry.gstType === 'IGST') {igstInput += Number(entry.gstAmount) || 0;}
        } else {
          totalOutputTax += Number(entry.gstAmount) || 0;
          if (entry.gstType === 'CGST') {cgstOutput += Number(entry.gstAmount) || 0;}
          if (entry.gstType === 'SGST') {sgstOutput += Number(entry.gstAmount) || 0;}
          if (entry.gstType === 'IGST') {igstOutput += Number(entry.gstAmount) || 0;}
        }
      }
    }

    const netPayable = totalOutputTax - totalInputTax;

    return {
      totalInputTax: Math.round(totalInputTax * 100) / 100,
      totalOutputTax: Math.round(totalOutputTax * 100) / 100,
      netPayable: Math.round(netPayable * 100) / 100,
      cgstInput: Math.round(cgstInput * 100) / 100,
      sgstInput: Math.round(sgstInput * 100) / 100,
      igstInput: Math.round(igstInput * 100) / 100,
      cgstOutput: Math.round(cgstOutput * 100) / 100,
      sgstOutput: Math.round(sgstOutput * 100) / 100,
      igstOutput: Math.round(igstOutput * 100) / 100,
      details: entries.data || [],
    };
  }
}
