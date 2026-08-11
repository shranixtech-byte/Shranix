import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';
import { SalesModule } from '../sales/sales.module';

import { CrmDashboardController } from './controllers/dashboard.controller';
import {
  ActivitiesController,
  CallLogsController,
  CrmNotesController,
  CrmTasksController,
  FollowUpsController,
  MeetingsController,
} from './controllers/engagement.controller';
import { LeadsController } from './controllers/leads.controller';
import { OpportunitiesController } from './controllers/opportunities.controller';
import { CrmDashboardService } from './services/crm-dashboard.service';
import {
  ActivitiesService,
  CallLogsService,
  CrmNotesService,
  CrmTasksService,
  FollowUpsService,
  MeetingsService,
} from './services/engagement.service';
import { LeadsService } from './services/leads.service';
import { OpportunitiesService } from './services/opportunities.service';

@Module({
  imports: [CommonModule, SalesModule],
  controllers: [
    LeadsController,
    OpportunitiesController,
    FollowUpsController,
    CrmTasksController,
    CallLogsController,
    MeetingsController,
    CrmNotesController,
    ActivitiesController,
    CrmDashboardController,
  ],
  providers: [
    LeadsService,
    OpportunitiesService,
    FollowUpsService,
    CrmTasksService,
    CallLogsService,
    MeetingsService,
    CrmNotesService,
    ActivitiesService,
    CrmDashboardService,
  ],
  exports: [
    LeadsService,
    OpportunitiesService,
    FollowUpsService,
    CrmTasksService,
    ActivitiesService,
  ],
})
export class CrmModule {}
