import { MasterDataRepository } from './masters.repository';
import type { DatabaseClient } from '../client/index';
import { sqliteApprovalMatrix, pgApprovalMatrix } from '../schema/workflow';

export class ApprovalMatrixRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteApprovalMatrix, pgApprovalMatrix, db, isPostgres);
  }
}
