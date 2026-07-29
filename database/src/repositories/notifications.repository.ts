import { MasterDataRepository } from './masters.repository';
import type { DatabaseClient } from '../client/index';
import { sqliteNotifications, pgNotifications } from '../schema/workflow';

export class NotificationsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteNotifications, pgNotifications, db, isPostgres);
  }
}
