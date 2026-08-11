import { and, eq } from 'drizzle-orm';

import type { DatabaseClient } from '../client/index';
import {
  sqlitePortalUsers,
  pgPortalUsers,
  sqlitePortalResetTokens,
  pgPortalResetTokens,
  sqlitePortalTickets,
  pgPortalTickets,
  sqlitePortalTicketMessages,
  pgPortalTicketMessages,
  sqlitePortalPayments,
  pgPortalPayments,
  sqlitePortalNotifications,
  pgPortalNotifications,
} from '../schema/portal';

import { MasterDataRepository } from './masters.repository';

export class PortalUsersRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePortalUsers, pgPortalUsers, db, isPostgres);
  }
}

export class PortalResetTokensRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePortalResetTokens, pgPortalResetTokens, db, isPostgres);
  }
}

export class PortalTicketsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePortalTickets, pgPortalTickets, db, isPostgres);
  }
}

export class PortalTicketMessagesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePortalTicketMessages, pgPortalTicketMessages, db, isPostgres);
  }
}

export class PortalPaymentsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePortalPayments, pgPortalPayments, db, isPostgres);
  }

  /**
   * ATOMIC status transition — `UPDATE ... SET status = ? WHERE id = ? AND status = ?`.
   * Returns true only if this call won the transition (affected exactly one row).
   * Guards against double-payment races: two concurrent verifications can never
   * both claim the same payment.
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

export class PortalNotificationsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePortalNotifications, pgPortalNotifications, db, isPostgres);
  }
}
