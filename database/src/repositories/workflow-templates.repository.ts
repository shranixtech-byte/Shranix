import { MasterDataRepository } from './masters.repository';
import type { DatabaseClient } from '../client/index';
import { sqliteWorkflowTemplates, pgWorkflowTemplates } from '../schema/workflow';

export class WorkflowTemplatesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteWorkflowTemplates, pgWorkflowTemplates, db, isPostgres);
  }
}
