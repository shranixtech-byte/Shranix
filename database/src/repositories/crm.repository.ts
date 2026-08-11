import type { DatabaseClient } from '../client/index';
import {
  sqliteLeads,
  pgLeads,
  sqliteOpportunities,
  pgOpportunities,
  sqliteFollowUps,
  pgFollowUps,
  sqliteCrmTasks,
  pgCrmTasks,
  sqliteCallLogs,
  pgCallLogs,
  sqliteMeetings,
  pgMeetings,
  sqliteCrmNotes,
  pgCrmNotes,
  sqliteLeadActivities,
  pgLeadActivities,
  sqliteLeadConversions,
  pgLeadConversions,
} from '../schema';

import { MasterDataRepository } from './masters.repository';

// ═════════════════════════════════════════════════════════
// CRM repositories (Phase 6) — typed repos over real tables
// ═════════════════════════════════════════════════════════

export class LeadsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteLeads, pgLeads, db, isPostgres);
  }
}

export class OpportunitiesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteOpportunities, pgOpportunities, db, isPostgres);
  }
}

export class FollowUpsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteFollowUps, pgFollowUps, db, isPostgres);
  }
}

export class CrmTasksRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCrmTasks, pgCrmTasks, db, isPostgres);
  }
}

export class CallLogsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCallLogs, pgCallLogs, db, isPostgres);
  }
}

export class MeetingsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteMeetings, pgMeetings, db, isPostgres);
  }
}

export class CrmNotesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCrmNotes, pgCrmNotes, db, isPostgres);
  }
}

export class LeadActivitiesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteLeadActivities, pgLeadActivities, db, isPostgres);
  }
}

export class LeadConversionsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteLeadConversions, pgLeadConversions, db, isPostgres);
  }
}
