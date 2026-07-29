import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';

import { BudgetsController } from './controllers/budgets.controller';
import { BudgetsService } from './services/budgets.service';

@Module({
  imports: [CommonModule],
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class AdvancedFinanceModule {}
