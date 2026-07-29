import { MasterDataRepository } from './masters.repository';
import type { DatabaseClient } from '../client/index';
import { sqliteWorkflowHistory, pgWorkflowHistory } from '../schema/workflow';

export class WorkflowHistoryRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteWorkflowHistory, pgWorkflowHistory, db, isPostgres);
  }
}
