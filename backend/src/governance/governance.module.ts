import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';

import { LegalHoldsController } from './controllers/legal-holds.controller';
import { RetentionPoliciesController } from './controllers/retention-policies.controller';
import { LegalHoldsService } from './services/legal-holds.service';
import { RetentionPoliciesService } from './services/retention-policies.service';

@Module({
  imports: [CommonModule],
  controllers: [RetentionPoliciesController, LegalHoldsController],
  providers: [RetentionPoliciesService, LegalHoldsService],
  exports: [RetentionPoliciesService, LegalHoldsService],
})
export class GovernanceModule {}
