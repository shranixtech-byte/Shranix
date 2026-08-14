import type { DatabaseClient } from '../client/index';
import {
  sqliteSoftwareReleases,
  pgSoftwareReleases,
  sqliteReleasePackages,
  pgReleasePackages,
  sqliteReleaseChannels,
  pgReleaseChannels,
  sqliteVersionCompatibility,
  pgVersionCompatibility,
} from '../schema/release';

import { MasterDataRepository } from './masters.repository';

export class SoftwareReleasesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSoftwareReleases, pgSoftwareReleases, db, isPostgres);
  }
}

export class ReleasePackagesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteReleasePackages, pgReleasePackages, db, isPostgres);
  }
}

export class ReleaseChannelsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteReleaseChannels, pgReleaseChannels, db, isPostgres);
  }
}

export class VersionCompatibilityRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteVersionCompatibility, pgVersionCompatibility, db, isPostgres);
  }
}
