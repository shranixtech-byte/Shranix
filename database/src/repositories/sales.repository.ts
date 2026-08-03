import { like } from 'drizzle-orm';

import type { DatabaseClient } from '../client/index';
import {
  sqliteSalesQuotations,
  pgSalesQuotations,
  sqliteQuotationItems,
  pgQuotationItems,
  sqliteSalesOrders,
  pgSalesOrders,
  sqliteSalesOrderItems,
  pgSalesOrderItems,
  sqliteDeliveryChallans,
  pgDeliveryChallans,
  sqliteChallanItems,
  pgChallanItems,
  sqliteSalesInvoices,
  pgSalesInvoices,
  sqliteInvoiceItems,
  pgInvoiceItems,
  sqliteSalesReturns,
  pgSalesReturns,
  sqliteReturnItems,
  pgReturnItems,
  sqliteCustomerPriceList,
  pgCustomerPriceList,
  sqliteSalesApprovals,
  pgSalesApprovals,
  sqliteSalesSettings,
  pgSalesSettings,
  sqliteApprovalHistory,
  pgApprovalHistory,
  sqliteApprovalComments,
  pgApprovalComments,
  sqliteApprovalNotifications,
  pgApprovalNotifications,
  sqliteApprovalMatrices,
  pgApprovalMatrices,
  sqliteApprovalRules,
  pgApprovalRules,
  sqliteCreditProfiles,
  pgCreditProfiles,
  sqliteCreditOverrides,
  pgCreditOverrides,
  sqliteCreditNotes,
  pgCreditNotes,
  sqliteDebitNotes,
  pgDebitNotes,
} from '../schema/sales';

import { MasterDataRepository } from './masters.repository';

export class SalesQuotationsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSalesQuotations, pgSalesQuotations, db, isPostgres);
  }
}
export class QuotationItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteQuotationItems, pgQuotationItems, db, isPostgres);
  }
}
export class SalesOrdersRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSalesOrders, pgSalesOrders, db, isPostgres);
  }
}
export class SalesOrderItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSalesOrderItems, pgSalesOrderItems, db, isPostgres);
  }
}
export class DeliveryChallansRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteDeliveryChallans, pgDeliveryChallans, db, isPostgres);
  }
}
export class ChallanItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteChallanItems, pgChallanItems, db, isPostgres);
  }
}
export class SalesInvoicesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSalesInvoices, pgSalesInvoices, db, isPostgres);
  }

  /**
   * Next-number sequence ke liye max sequence nikaalo — INCLUDING soft-deleted rows.
   *
   * Kyunki `invoice_number` ka UNIQUE index soft-deleted rows ke numbers ko bhi
   * block karta hai (soft-delete row DELETE nahi karta). Agar sirf non-deleted rows
   * count karein toh deleted invoice ka number dobara generate ho sakta hai →
   * UNIQUE constraint error (jaise: saari invoices delete hone par getNextNumber
   * hamesha SLCA26-001 deta tha).
   */
  async findMaxSequenceForPrefix(prefix: string): Promise<number> {
    const active = (this as any).activeDb || this.db;
    const rows = await active
      .select({ invoiceNumber: this.table.invoiceNumber })
      .from(this.table)
      .where(like(this.table.invoiceNumber, `${prefix}%`))
      .limit(10000);
    let max = 0;
    for (const r of rows as any[]) {
      const num = String(r.invoiceNumber || '');
      // Prefix strip karke LEADING digits parse karo — suffix (jaise /26 ya -A) sequence
      // ko kabhi confuse nahi karega. Numeric-only suffix (bina separator, jaise '26')
      // sequence se alag nahi ho sakta — UI hint suffix ko '/' se start karne ko kehta hai.
      const rest = num.startsWith(prefix) ? num.slice(prefix.length) : num;
      const m = rest.match(/^(\d+)/);
      if (m) {
        const s = parseInt(m[1], 10);
        if (!isNaN(s) && s > max) {
          max = s;
        }
      }
    }
    return max;
  }
}
export class InvoiceItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteInvoiceItems, pgInvoiceItems, db, isPostgres);
  }
}
export class SalesReturnsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSalesReturns, pgSalesReturns, db, isPostgres);
  }
}
export class ReturnItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteReturnItems, pgReturnItems, db, isPostgres);
  }
}
export class CustomerPriceListRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCustomerPriceList, pgCustomerPriceList, db, isPostgres);
  }
}
export class SalesApprovalsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSalesApprovals, pgSalesApprovals, db, isPostgres);
  }
}
export class SalesSettingsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSalesSettings, pgSalesSettings, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// NEW: Persisted repositories (Phase 1 Critical Fixes)
// ═════════════════════════════════════════════════════════
export class ApprovalHistoryRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteApprovalHistory, pgApprovalHistory, db, isPostgres);
  }
}
export class ApprovalCommentsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteApprovalComments, pgApprovalComments, db, isPostgres);
  }
}
export class ApprovalNotificationsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteApprovalNotifications, pgApprovalNotifications, db, isPostgres);
  }
}
export class ApprovalMatricesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteApprovalMatrices, pgApprovalMatrices, db, isPostgres);
  }
}
export class ApprovalRulesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteApprovalRules, pgApprovalRules, db, isPostgres);
  }
}
export class CreditProfilesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCreditProfiles, pgCreditProfiles, db, isPostgres);
  }
}
export class CreditOverridesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCreditOverrides, pgCreditOverrides, db, isPostgres);
  }
}
export class CreditNotesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCreditNotes, pgCreditNotes, db, isPostgres);
  }
}
export class DebitNotesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteDebitNotes, pgDebitNotes, db, isPostgres);
  }
}
