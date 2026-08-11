import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CommercialDashboardService } from '../services/commercial-dashboard.service';
import { CommercialReportsService } from '../services/commercial-reports.service';
import { CommercialSchedulerService } from '../services/commercial-scheduler.service';
import { CommercialSettingsService } from '../services/commercial-settings.service';
import { EntitlementsService } from '../services/entitlements.service';

@ApiTags('Commercial')
@Controller('commercial')
@UseGuards(JwtAuthGuard)
export class CommercialController {
  constructor(
    private readonly dashboard: CommercialDashboardService,
    private readonly reports: CommercialReportsService,
    private readonly entitlementService: EntitlementsService,
    private readonly settings: CommercialSettingsService,
    private readonly scheduler: CommercialSchedulerService,
  ) {}

  @Get('dashboard')
  @Permissions('commercial.view')
  @ApiOperation({ summary: 'Commercial dashboard KPIs and trends' })
  async getDashboard() {
    return this.dashboard.getDashboard();
  }

  // ── Reports ────────────────────────────────────────────
  @Get('reports/subscriptions')
  @Permissions('commercial.reports')
  @ApiOperation({ summary: 'Subscription register' })
  async subscriptionRegister(
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.subscriptionRegister({ status, from, to });
  }

  @Get('reports/active')
  @Permissions('commercial.reports')
  @ApiOperation({ summary: 'Active subscriptions' })
  async active() {
    return this.reports.activeSubscriptions();
  }

  @Get('reports/expiring')
  @Permissions('commercial.reports')
  @ApiOperation({ summary: 'Expiring subscriptions' })
  async expiring(@Query('days') days = 30) {
    return this.reports.expiringSubscriptions(Number(days));
  }

  @Get('reports/trials')
  @Permissions('commercial.reports')
  @ApiOperation({ summary: 'Trial subscriptions' })
  async trials() {
    return this.reports.trialReport();
  }

  @Get('reports/lifecycle/:eventType')
  @Permissions('commercial.reports')
  @ApiOperation({ summary: 'Lifecycle report by event type' })
  async lifecycle(
    @Param('eventType') eventType: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.lifecycleReport(eventType, { from, to });
  }

  @Get('reports/revenue')
  @Permissions('commercial.reports')
  @ApiOperation({ summary: 'Revenue report' })
  async revenue(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.reports.revenueReport({ from, to, status });
  }

  @Get('reports/payments')
  @Permissions('commercial.reports')
  @ApiOperation({ summary: 'Payment report' })
  async payments(
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.paymentReport({ status, from, to });
  }

  @Get('reports/refunds')
  @Permissions('commercial.reports')
  @ApiOperation({ summary: 'Refund report' })
  async refunds(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reports.refundReport({ from, to });
  }

  @Get('reports/coupons')
  @Permissions('commercial.reports')
  @ApiOperation({ summary: 'Coupon usage report' })
  async couponUsage() {
    return this.reports.couponUsageReport();
  }

  @Get('reports/mrr')
  @Permissions('commercial.reports')
  @ApiOperation({ summary: 'MRR / ARR' })
  async mrr() {
    return this.reports.mrrArr();
  }

  @Get('reports/churn')
  @Permissions('commercial.reports')
  @ApiOperation({ summary: 'Churn report' })
  async churn(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reports.churnReport({ from, to });
  }

  // ── Entitlements + usage ───────────────────────────────
  @Get('entitlements/:customerId')
  @Permissions('commercial.view')
  @ApiOperation({ summary: 'Full entitlement resolution for a customer' })
  async getEntitlements(@Param('customerId') customerId: string) {
    return this.entitlementService.getEntitlements(customerId);
  }

  @Get('usage/:customerId')
  @Permissions('commercial.view')
  @ApiOperation({ summary: 'Live usage vs plan limits for a customer' })
  async usage(@Param('customerId') customerId: string) {
    const ent = await this.entitlementService.getEntitlements(customerId);
    const resources = [
      'users',
      'branches',
      'warehouses',
      'customers',
      'products',
      'invoices',
      'sales_orders',
      'purchase_orders',
      'storage',
      'api_requests',
    ];
    const rows: any[] = [];
    for (const r of resources) {
      const check = await this.entitlementService.checkLimit(customerId, r);
      rows.push(check);
    }
    const subscription = ent.subscription;
    if (subscription) {
      const snapshot = await this.entitlementService.snapshotUsage(customerId, subscription.id);
      return { entitlements: ent, usage: rows, snapshot };
    }
    return { entitlements: ent, usage: rows, snapshot: [] };
  }

  @Post('usage/:customerId/snapshot')
  @Permissions('commercial.view')
  @ApiOperation({ summary: 'Snapshot current usage' })
  async snapshot(@Param('customerId') customerId: string) {
    const ent = await this.entitlementService.getEntitlements(customerId);
    if (!ent.subscription) {
      return { snapshot: [] };
    }
    return {
      snapshot: await this.entitlementService.snapshotUsage(customerId, ent.subscription.id),
    };
  }

  // ── Settings ───────────────────────────────────────────
  @Get('settings')
  @Permissions('commercial.settings')
  @ApiOperation({ summary: 'Commercial settings (secrets masked)' })
  async getSettings() {
    return this.settings.getSettings();
  }

  @Post('settings')
  @Permissions('commercial.settings')
  @ApiOperation({ summary: 'Update commercial settings' })
  async updateSettings(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.settings.updateSettings(body, userId);
  }

  @Post('scheduler/run')
  @Permissions('commercial.settings')
  @ApiOperation({ summary: 'Run subscription worker now (admin)' })
  async runScheduler() {
    return this.scheduler.runNow();
  }
}
