import { and, eq } from 'drizzle-orm';

import type { DatabaseClient } from '../client/index';
import {
  sqlitePlans,
  pgPlans,
  sqlitePlanVersions,
  pgPlanVersions,
  sqliteSubscriptions,
  pgSubscriptions,
  sqliteSubscriptionEvents,
  pgSubscriptionEvents,
  sqliteBillingInvoices,
  pgBillingInvoices,
  sqliteBillingPayments,
  pgBillingPayments,
  sqliteCoupons,
  pgCoupons,
  sqliteCouponRedemptions,
  pgCouponRedemptions,
  sqliteUsageRecords,
  pgUsageRecords,
  sqliteCommercialReminders,
  pgCommercialReminders,
} from '../schema/commercial';

import { MasterDataRepository } from './masters.repository';

export class PlansRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePlans, pgPlans, db, isPostgres);
  }
}

export class PlanVersionsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePlanVersions, pgPlanVersions, db, isPostgres);
  }
}

export class SubscriptionsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSubscriptions, pgSubscriptions, db, isPostgres);
  }
}

export class SubscriptionEventsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSubscriptionEvents, pgSubscriptionEvents, db, isPostgres);
  }
}

export class BillingInvoicesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteBillingInvoices, pgBillingInvoices, db, isPostgres);
  }
}

export class BillingPaymentsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteBillingPayments, pgBillingPayments, db, isPostgres);
  }

  /**
   * ATOMIC status transition — `UPDATE ... WHERE id = ? AND status = ?`.
   * Returns true only if this call won the transition (exactly one row).
   * Guards against double-payment races: two concurrent webhook/verify calls
   * can never both claim the same payment.
   */
  async claimTransition(id: string, fromStatus: string, toStatus: string): Promise<boolean> {
    try {
      if (this.isPostgres) {
        const rows: any[] = await (this.db as any)
          .update(this.pgTable)
          .set({ status: toStatus, updatedAt: new Date().toISOString() })
          .where(and(eq(this.pgTable.id, id), eq(this.pgTable.status, fromStatus)))
          .returning({ id: this.pgTable.id });
        return rows.length === 1;
      }
      const result: any = await (this.db as any)
        .update(this.sqliteTable)
        .set({ status: toStatus, updatedAt: new Date().toISOString() })
        .where(and(eq(this.sqliteTable.id, id), eq(this.sqliteTable.status, fromStatus)))
        .returning({ id: this.sqliteTable.id });
      return (result || []).length === 1;
    } catch {
      return false;
    }
  }
}

export class CouponsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCoupons, pgCoupons, db, isPostgres);
  }
}

export class CouponRedemptionsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCouponRedemptions, pgCouponRedemptions, db, isPostgres);
  }
}

export class UsageRecordsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteUsageRecords, pgUsageRecords, db, isPostgres);
  }
}

export class CommercialRemindersRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCommercialReminders, pgCommercialReminders, db, isPostgres);
  }
}
