import type { DatabaseClient } from '../client/index';
import {
  sqliteCommunicationTemplates,
  pgCommunicationTemplates,
  sqliteCommunications,
  pgCommunications,
  sqliteCommunicationPreferences,
  pgCommunicationPreferences,
  sqliteCommunicationCampaigns,
  pgCommunicationCampaigns,
} from '../schema/communication';

import { MasterDataRepository } from './masters.repository';

export class CommunicationTemplatesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCommunicationTemplates, pgCommunicationTemplates, db, isPostgres);
  }
}

export class CommunicationsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCommunications, pgCommunications, db, isPostgres);
  }
}

export class CommunicationPreferencesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCommunicationPreferences, pgCommunicationPreferences, db, isPostgres);
  }
}

export class CommunicationCampaignsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCommunicationCampaigns, pgCommunicationCampaigns, db, isPostgres);
  }
}
