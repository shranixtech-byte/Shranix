import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

export interface QuoteNumberingSettings {
  id?: string;
  autoQuoteNumber?: boolean;
  quotePrefix?: string;
  quoteNextNumber?: number;
  quoteFyPrefix?: boolean;
  quoteBranchPrefix?: boolean;
}

export interface NumberContext {
  financialYearId?: string | null;
  branchId?: string | null;
}

export interface OrderNumberingSettings {
  id?: string;
  autoOrderNumber?: boolean;
  orderPrefix?: string;
  orderNextNumber?: number;
}

export interface ChallanNumberingSettings {
  id?: string;
  challanPrefix?: string;
  challanNextNumber?: number;
}

/** Derive a compact financial-year code, e.g. "FY 2026-27" → "26-27", "2025-26" → "25-26". */
function fyCodeOf(fy: { name?: string; startDate?: string }): string | null {
  const name = String(fy?.name ?? '');
  const match = name.match(/(\d{2,4})\s*[-/]\s*(\d{2,4})/);
  if (match) {
    const start = match[1].padStart(4, '0');
    const end = match[2].slice(-2);
    return `${start.slice(-2)}-${end}`;
  }
  if (fy?.startDate) {
    return String(fy.startDate).slice(0, 4);
  }
  return null;
}

@Injectable()
export class DocumentNumberingService {
  private readonly logger = new Logger(DocumentNumberingService.name);

  constructor(private readonly database: DatabaseService) {}

  /**
   * Generate the next quotation number from sales settings and persist the
   * incremented counter. Formats:
   *  - plain:            SQ-0001
   *  - FY prefix:        SQ-26-27-0001
   *  - FY + branch:      SQ-26-27-BLR-0001
   *  - branch only:      SQ-BLR-0001
   */
  async nextQuoteNumber(
    settings: QuoteNumberingSettings,
    ctx: NumberContext = {},
  ): Promise<string> {
    const prefix = settings?.quotePrefix || 'SQ-';
    const parts: string[] = [prefix];

    if (settings?.quoteFyPrefix && ctx.financialYearId) {
      try {
        const fy = await this.database.financialYears.findById(ctx.financialYearId);
        const code = fy ? fyCodeOf(fy) : null;
        if (code) {
          parts.push(`${code}-`);
        }
      } catch {
        /* unknown FY → skip prefix, keep sequence */
      }
    }

    if (settings?.quoteBranchPrefix && ctx.branchId) {
      try {
        const branch = await this.database.branches.findById(ctx.branchId);
        if (branch?.code) {
          parts.push(`${branch.code}-`);
        }
      } catch {
        /* unknown branch → skip prefix */
      }
    }

    // Sequence = max(settings counter, highest existing number + 1). Soft-deleted
    // quotations keep their numbers in the UNIQUE index — reusing one would 500,
    // exactly like the invoice-number bug fixed earlier (findMaxSequenceForPrefix).
    const basePrefix = parts.join('');
    let maxSeq = 0;
    try {
      const repo = this.database.salesQuotations as any;
      if (typeof repo?.findMaxSequenceForPrefix === 'function') {
        maxSeq = await repo.findMaxSequenceForPrefix('quoteNumber', basePrefix);
      }
    } catch {
      /* best-effort: fall back to the settings counter */
    }
    const seq = Math.max(Math.max(1, Number(settings?.quoteNextNumber) || 1), maxSeq + 1);
    parts.push(String(seq).padStart(4, '0'));
    const number = parts.join('');

    if (settings?.id) {
      try {
        await this.database.salesSettings.update(settings.id, { quoteNextNumber: seq + 1 });
      } catch (err) {
        this.logger.warn(`Failed to advance quote counter: ${(err as Error).message}`);
      }
    }
    return number;
  }

  /**
   * Generate the next sales-order number (e.g. SO-0001) from sales settings and
   * persist the incremented counter. Always auto-generates — conversion flows have
   * no user-typed number, so a value is produced even when autoOrderNumber is off
   * (using the settings counter as the starting point).
   */
  async nextOrderNumber(
    settings: OrderNumberingSettings,
    _ctx: NumberContext = {},
  ): Promise<string> {
    return this.nextSequenced(
      'salesOrders',
      'orderNumber',
      settings?.orderPrefix || 'SO-',
      settings?.orderNextNumber,
      settings?.id,
      'orderNextNumber',
    );
  }

  /**
   * Generate the next delivery-challan number (e.g. DC-0001) from sales settings
   * and persist the incremented counter.
   */
  async nextChallanNumber(settings: ChallanNumberingSettings): Promise<string> {
    return this.nextSequenced(
      'deliveryChallans',
      'challanNumber',
      settings?.challanPrefix || 'DC-',
      settings?.challanNextNumber,
      settings?.id,
      'challanNextNumber',
    );
  }

  /**
   * Shared next-number logic: max(settings counter, highest existing number + 1)
   * with soft-deleted rows counted (their numbers stay in the UNIQUE index), then
   * persist the advanced counter on the sales-settings row.
   */
  private async nextSequenced(
    repoKey: 'salesOrders' | 'deliveryChallans',
    field: 'orderNumber' | 'challanNumber',
    prefix: string,
    counter?: number,
    settingsId?: string,
    counterField?: 'orderNextNumber' | 'challanNextNumber',
  ): Promise<string> {
    let maxSeq = 0;
    try {
      const repo = this.database[repoKey] as any;
      if (typeof repo?.findMaxSequenceForPrefix === 'function') {
        maxSeq = await repo.findMaxSequenceForPrefix(field, prefix);
      }
    } catch {
      /* best-effort: fall back to the settings counter */
    }
    const seq = Math.max(Math.max(1, Number(counter) || 1), maxSeq + 1);
    const number = `${prefix}${String(seq).padStart(4, '0')}`;

    if (settingsId && counterField) {
      try {
        await this.database.salesSettings.update(settingsId, { [counterField]: seq + 1 });
      } catch (err) {
        this.logger.warn(`Failed to advance ${counterField} counter: ${(err as Error).message}`);
      }
    }
    return number;
  }
}
