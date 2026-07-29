import { MasterDataRepository } from './masters.repository';
import type { DatabaseClient } from '../client/index';
import { sqliteWorkflowInstances, pgWorkflowInstances } from '../schema/workflow';

export class WorkflowInstancesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteWorkflowInstances, pgWorkflowInstances, db, isPostgres);
  }
}
