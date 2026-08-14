import type { DatabaseClient } from '../client/index';
import { sqliteSecurityEvents, pgSecurityEvents } from '../schema/security';

import { MasterDataRepository } from './masters.repository';

/**
 * Security events — append-only log for the Phase-15 security event engine.
 * Rows are never edited or deleted by ordinary flows; new facts are new rows.
 */
export class SecurityEventsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSecurityEvents, pgSecurityEvents, db, isPostgres);
  }
}
