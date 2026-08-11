import { and, eq, lt, sql } from 'drizzle-orm';

import type { DatabaseClient } from '../client/index';
import {
  sqliteLicenses,
  pgLicenses,
  sqliteLicenseDevices,
  pgLicenseDevices,
  sqliteLicenseInstallations,
  pgLicenseInstallations,
  sqliteLicenseActivations,
  pgLicenseActivations,
  sqliteLicenseEvents,
  pgLicenseEvents,
  sqliteLicenseTransfers,
  pgLicenseTransfers,
  sqliteLicenseTokens,
  pgLicenseTokens,
} from '../schema/license';

import { MasterDataRepository } from './masters.repository';

export class LicensesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteLicenses, pgLicenses, db, isPostgres);
  }

  /**
   * ATOMIC status transition — `UPDATE ... WHERE id = ? AND status = ?`.
   * Returns true only if this call won the transition (exactly one row).
   * Guards against concurrent state-machine races.
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

  /**
   * ATOMIC device-slot claim — `UPDATE ... SET active_devices = active_devices + 1
   * WHERE id = ? AND active_devices < max_devices`. The guard lives in the SQL so
   * two concurrent activation approvals can never exceed max_devices.
   */
  async incrementActiveDevices(id: string): Promise<boolean> {
    try {
      if (this.isPostgres) {
        const rows: any[] = await (this.db as any)
          .update(this.pgTable)
          .set({
            activeDevices: sql`${this.pgTable.activeDevices} + 1`,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(eq(this.pgTable.id, id), lt(this.pgTable.activeDevices, this.pgTable.maxDevices)),
          )
          .returning({ id: this.pgTable.id });
        return rows.length === 1;
      }
      const result: any = await (this.db as any)
        .update(this.sqliteTable)
        .set({
          activeDevices: sql`${this.sqliteTable.activeDevices} + 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(this.sqliteTable.id, id),
            lt(this.sqliteTable.activeDevices, this.sqliteTable.maxDevices),
          ),
        )
        .returning({ id: this.sqliteTable.id });
      return (result || []).length === 1;
    } catch {
      return false;
    }
  }

  /**
   * Decrement active device counter (device deactivation / transfer).
   * Floored at 0 so concurrent deactivations can never push it negative.
   */
  async decrementActiveDevices(id: string): Promise<void> {
    try {
      if (this.isPostgres) {
        await (this.db as any)
          .update(this.pgTable)
          .set({
            activeDevices: sql`GREATEST(${this.pgTable.activeDevices} - 1, 0)`,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(this.pgTable.id, id));
        return;
      }
      await (this.db as any)
        .update(this.sqliteTable)
        .set({
          activeDevices: sql`MAX(${this.sqliteTable.activeDevices} - 1, 0)`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(this.sqliteTable.id, id));
    } catch {
      /* best-effort — counter is floored at 0 by the SQL guard */
    }
  }
}

export class LicenseDevicesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteLicenseDevices, pgLicenseDevices, db, isPostgres);
  }
}

export class LicenseInstallationsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteLicenseInstallations, pgLicenseInstallations, db, isPostgres);
  }
}

export class LicenseActivationsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteLicenseActivations, pgLicenseActivations, db, isPostgres);
  }

  /**
   * ATOMIC status transition for activation records — only the winning
   * concurrent request may proceed to the device-slot claim.
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

export class LicenseEventsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteLicenseEvents, pgLicenseEvents, db, isPostgres);
  }
}

export class LicenseTransfersRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteLicenseTransfers, pgLicenseTransfers, db, isPostgres);
  }
}

export class LicenseTokensRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteLicenseTokens, pgLicenseTokens, db, isPostgres);
  }
}
