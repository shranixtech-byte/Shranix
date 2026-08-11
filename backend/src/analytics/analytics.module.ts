import { Module } from '@nestjs/common';

import { KpiEngineService } from '../automation/kpi-engine.service';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

/**
 * BI Analytics module — read-only analytics over existing source-of-truth
 * data. DatabaseModule is @Global so no explicit import is required.
 */
@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, KpiEngineService],
})
export class AnalyticsModule {}
