import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';

import { LeadsController } from './controllers/leads.controller';
import { OpportunitiesController } from './controllers/opportunities.controller';
import { LeadsService } from './services/leads.service';
import { OpportunitiesService } from './services/opportunities.service';

@Module({
  imports: [CommonModule],
  controllers: [LeadsController, OpportunitiesController],
  providers: [LeadsService, OpportunitiesService],
  exports: [LeadsService, OpportunitiesService],
})
export class CrmModule {}
