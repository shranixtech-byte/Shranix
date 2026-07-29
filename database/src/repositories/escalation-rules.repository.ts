import { MasterDataRepository } from './masters.repository';
import type { DatabaseClient } from '../client/index';
import { sqliteEscalationRules, pgEscalationRules } from '../schema/workflow';

export class EscalationRulesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteEscalationRules, pgEscalationRules, db, isPostgres);
  }
}
