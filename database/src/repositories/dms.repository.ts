import type { DatabaseClient } from '../client/index';
import { MasterDataRepository } from './masters.repository';
import {
  sqliteDocuments, pgDocuments,
  sqliteDocumentFolders, pgDocumentFolders,
  sqliteDocumentVersions, pgDocumentVersions,
  sqliteDocumentTags, pgDocumentTags,
  sqliteDigitalSignatures, pgDigitalSignatures,
  sqliteOcrResults, pgOcrResults,
  sqliteDocumentAccessLogs, pgDocumentAccessLogs,
} from '../schema/dms';

export class DocumentsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteDocuments, pgDocuments, db, isPostgres); }
}
export class DocumentFoldersRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteDocumentFolders, pgDocumentFolders, db, isPostgres); }
}
export class DocumentVersionsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteDocumentVersions, pgDocumentVersions, db, isPostgres); }
}
export class DocumentTagsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteDocumentTags, pgDocumentTags, db, isPostgres); }
}
export class DigitalSignaturesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteDigitalSignatures, pgDigitalSignatures, db, isPostgres); }
}
export class OcrResultsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteOcrResults, pgOcrResults, db, isPostgres); }
}
export class DocumentAccessLogsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteDocumentAccessLogs, pgDocumentAccessLogs, db, isPostgres); }
}
