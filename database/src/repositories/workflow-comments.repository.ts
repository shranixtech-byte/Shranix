import { MasterDataRepository } from './masters.repository';
import type { DatabaseClient } from '../client/index';
import { sqliteWorkflowComments, pgWorkflowComments } from '../schema/workflow';

export class WorkflowCommentsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteWorkflowComments, pgWorkflowComments, db, isPostgres);
  }
}
