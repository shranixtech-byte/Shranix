import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

import { GlPostingEngine } from './gl-posting.engine';
import { ReportEngine } from './report-engine';

/**
 * Financial Scheduler
 *
 * Background job runner for scheduled posting operations.
 * Uses manual scheduling (call methods directly or via cron endpoint).
 * For production use, install @nestjs/schedule and add @Cron decorators.
 */
export interface ScheduledJob {
  id: string;
  name: string;
  type: 'auto_post' | 'report_generation' | 'period_lock' | 'snapshot' | 'recurring';
  status: 'pending' | 'running' | 'completed' | 'failed';
  lastRun?: string;
  nextRun?: string;
  result?: any;
  error?: string;
}

@Injectable()
export class FinancialScheduler {
  private readonly logger = new Logger(FinancialScheduler.name);
  private jobs: ScheduledJob[] = [];
  private _isRunning = false;

  constructor(
    private readonly database: DatabaseService,
    private readonly glPosting: GlPostingEngine,
    private readonly reportEngine: ReportEngine,
  ) {}

  /**
   * Auto-post pending tax entries.
   */
  async autoPostPendingEntries(): Promise<void> {
    if (this._isRunning) {return;}
    this._isRunning = true;
    this.logger.log('Scheduler: Auto-posting pending tax entries...');

    try {
      const pendingPostings = await this.database.taxPostings.findAll({ page: 1, pageSize: 100 } as any);
      if (!pendingPostings.data || pendingPostings.data.length === 0) {
        this.logger.log('No pending postings found');
        return;
      }

      for (const posting of pendingPostings.data as any[]) {
        if (posting.status === 'posted' || posting.status === 'cancelled') {continue;}
        try {
          const result = await this.glPosting.applyPostingRules({
            id: posting.id,
            type: posting.sourceType || 'auto',
            number: posting.sourceNumber || posting.id,
            date: posting.createdAt || new Date().toISOString(),
            amount: Number(posting.amount || 0),
            financialYearId: posting.financialYearId,
          });
          this.logger.log(`Auto-posted ${posting.id}: ${result.message}`);
        } catch (error) {
          this.logger.error(`Failed to auto-post ${posting.id}: ${(error as Error).message}`);
        }
      }
    } finally {
      this._isRunning = false;
    }
  }

  /**
   * Generate daily financial snapshots.
   */
  async generateDailySnapshots(): Promise<void> {
    this.logger.log('Scheduler: Generating daily financial snapshots...');
    try {
      const trialBalance = await this.reportEngine.generateTrialBalance({});
      const profitLoss = await this.reportEngine.generateProfitLoss({});
      const balanceSheet = await this.reportEngine.generateBalanceSheet({});

      await this.database.financialSnapshots.create({
        snapshotType: 'trial_balance',
        snapshotDate: new Date().toISOString().split('T')[0],
        data: JSON.stringify(trialBalance),
        totalDebit: trialBalance.summary.totalDebit,
        totalCredit: trialBalance.summary.totalCredit,
      } as any);

      await this.database.financialSnapshots.create({
        snapshotType: 'profit_loss',
        snapshotDate: new Date().toISOString().split('T')[0],
        data: JSON.stringify(profitLoss),
        totalDebit: profitLoss.netProfit > 0 ? profitLoss.netProfit : 0,
        totalCredit: profitLoss.netProfit < 0 ? Math.abs(profitLoss.netProfit) : 0,
      } as any);

      await this.database.financialSnapshots.create({
        snapshotType: 'balance_sheet',
        snapshotDate: new Date().toISOString().split('T')[0],
        data: JSON.stringify(balanceSheet),
        totalDebit: balanceSheet.assets.total,
        totalCredit: balanceSheet.liabilities.total + balanceSheet.equity.total,
      } as any);

      this.logger.log('Daily snapshots generated successfully');
    } catch (error) {
      this.logger.error(`Failed to generate daily snapshots: ${(error as Error).message}`);
    }
  }

  /**
   * Check and enforce period locks.
   */
  async enforcePeriodLocks(): Promise<void> {
    this.logger.log('Scheduler: Checking period locks...');
    try {
      const locks = await this.database.periodLocks.findAll({ page: 1, pageSize: 100 } as any);
      if (!locks.data) {return;}

      const now = new Date().toISOString().split('T')[0];
      for (const lock of locks.data as any[]) {
        if (lock.isLocked) {continue;}
        if (lock.periodEnd && lock.periodEnd < now) {
          await this.database.periodLocks.update(lock.id, { isLocked: true } as any);
          this.logger.log(`Auto-locked period: ${lock.periodKey} (${lock.periodType})`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to enforce period locks: ${(error as Error).message}`);
    }
  }

  /**
   * Schedule a one-time posting job.
   */
  async schedulePostingJob(
    name: string,
    type: ScheduledJob['type'],
    jobFn: () => Promise<any>,
  ): Promise<ScheduledJob> {
    const job: ScheduledJob = {
      id: crypto.randomUUID(),
      name,
      type,
      status: 'pending',
      nextRun: new Date().toISOString(),
    };

    this.jobs.push(job);
    this.logger.log(`Scheduled job: ${name} (${type})`);

    try {
      job.status = 'running';
      const result = await jobFn();
      job.status = 'completed';
      job.result = result;
      job.lastRun = new Date().toISOString();
      this.logger.log(`Job completed: ${name}`);
    } catch (error) {
      job.status = 'failed';
      job.error = (error as Error).message;
      this.logger.error(`Job failed: ${name} - ${(error as Error).message}`);
    }

    return job;
  }

  getJobs(): ScheduledJob[] {
    return this.jobs;
  }

  getJob(id: string): ScheduledJob | undefined {
    return this.jobs.find((j) => j.id === id);
  }

  async retryJob(id: string): Promise<ScheduledJob | null> {
    const job = this.jobs.find((j) => j.id === id);
    if (!job || job.status !== 'failed') {return null;}
    job.status = 'pending';
    job.error = undefined;
    return job;
  }

  getHealth(): { isRunning: boolean; activeJobs: number; completedJobs: number; failedJobs: number } {
    return {
      isRunning: this._isRunning,
      activeJobs: this.jobs.filter((j) => j.status === 'running').length,
      completedJobs: this.jobs.filter((j) => j.status === 'completed').length,
      failedJobs: this.jobs.filter((j) => j.status === 'failed').length,
    };
  }
}
