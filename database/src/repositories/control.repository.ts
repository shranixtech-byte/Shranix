import type { DatabaseClient } from '../client/index';
import {
  sqliteBusinessRules,
  pgBusinessRules,
  sqliteCustomFields,
  pgCustomFields,
  sqliteCustomFieldValues,
  pgCustomFieldValues,
  sqliteTags,
  pgTags,
  sqliteRecordTags,
  pgRecordTags,
} from '../schema/control';

import { MasterDataRepository } from './masters.repository';

export class BusinessRulesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteBusinessRules, pgBusinessRules, db, isPostgres);
  }
}

export class CustomFieldsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCustomFields, pgCustomFields, db, isPostgres);
  }
}

export class CustomFieldValuesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCustomFieldValues, pgCustomFieldValues, db, isPostgres);
  }
}

export class TagsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteTags, pgTags, db, isPostgres);
  }
}

export class RecordTagsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteRecordTags, pgRecordTags, db, isPostgres);
  }
}
