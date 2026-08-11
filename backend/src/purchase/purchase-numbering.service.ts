import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

/**
 * ═════════════════════════════════════════════════════════
 * PURCHASE NUMBERING (Phase 3.3 — G4)
 *
 * One numbering system for all purchase documents — settings prefixes +
 * next-number counters from `purchase_settings` (PO / Quotation / GRN /
 * Invoice / Return). Uses the same pattern as Sales `DocumentNumberingService`:
 *   seq = max(settings counter, highest existing number + 1)
 * including soft-deleted rows (their numbers stay in the UNIQUE index).
 *
 * Number formats (padStart 4):
 *   PO-0001 · QTN-0001 · GRN-0001 · PI-0001 · PR-0001
 * ═════════════════════════════════════════════════════════
 */
@Injectable()
export class PurchaseNumberingService {
  private readonly logger = new Logger(PurchaseNumberingService.name);

  constructor(private readonly database: DatabaseService) {}

  /** Load the first purchase-settings row (single-company config). */
  async loadSettings(): Promise<any> {
    try {
      const r = await this.database.purchaseSettings.findAll({ page: 1, pageSize: 1 } as any);
      return r.data?.[0] || null;
    } catch {
      return null;
    }
  }

  /** Shared next-number logic with max-seq scan + counter persistence. */
  private async nextSequenced(
    repo: any,
    field: string,
    prefix: string,
    counter?: number,
    settingsId?: string,
    counterField?: string,
  ): Promise<string> {
    let maxSeq = 0;
    try {
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
        await this.database.purchaseSettings.update(settingsId, { [counterField]: seq + 1 });
      } catch (err) {
        this.logger.warn(`Failed to advance ${counterField} counter: ${(err as Error).message}`);
      }
    }
    return number;
  }

  /** Next Purchase Order number (e.g. PO-0001). */
  async nextPoNumber(settings?: any): Promise<string> {
    return this.nextSequenced(
      this.database.purchaseOrders,
      'poNumber',
      settings?.poPrefix || 'PO-',
      settings?.poNextNumber,
      settings?.id,
      'poNextNumber',
    );
  }

  /** Next Purchase Quotation number (e.g. QTN-0001). */
  async nextQuoteNumber(settings?: any): Promise<string> {
    return this.nextSequenced(
      this.database.purchaseQuotations,
      'quoteNumber',
      settings?.quotationPrefix || 'QTN-',
      settings?.quotationNextNumber,
      settings?.id,
      'quotationNextNumber',
    );
  }

  /** Next GRN number (e.g. GRN-0001). */
  async nextGrnNumber(settings?: any): Promise<string> {
    return this.nextSequenced(
      this.database.grn,
      'grnNumber',
      settings?.grnPrefix || 'GRN-',
      settings?.grnNextNumber,
      settings?.id,
      'grnNextNumber',
    );
  }

  /** Next Purchase Invoice number (e.g. PI-0001). */
  async nextInvoiceNumber(settings?: any): Promise<string> {
    return this.nextSequenced(
      this.database.purchaseInvoices,
      'invoiceNumber',
      settings?.invoicePrefix || 'PI-',
      settings?.invoiceNextNumber,
      settings?.id,
      'invoiceNextNumber',
    );
  }

  /** Next Purchase Return number (e.g. PR-0001). */
  async nextReturnNumber(settings?: any): Promise<string> {
    return this.nextSequenced(
      this.database.purchaseReturns,
      'returnNumber',
      settings?.returnPrefix || 'PR-',
      settings?.returnNextNumber,
      settings?.id,
      'returnNextNumber',
    );
  }
}
