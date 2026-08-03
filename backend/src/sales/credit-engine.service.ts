import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type WarningLevel = 'green' | 'amber' | 'red' | 'critical';

export interface CreditCheckResult {
  canPost: boolean;
  warnings: string[];
  errors: string[];
  creditStatus: 'ok' | 'warning' | 'blocked';
  requiredApproval: boolean;
}

export interface CreditOverride {
  id: string;
  customerId: string;
  overrideBy: string;
  overrideByName: string;
  overrideRole: string;
  reason: string;
  oldLimit: number;
  newLimit: number;
  approvedBy: string;
  timestamp: string;
}

export interface AgeingBucket {
  bucket: string;
  daysMin: number;
  daysMax: number;
  amount: number;
  count: number;
}

export interface RecoveryData {
  pendingCollection: number;
  todayCollection: number;
  collectionEfficiency: number;
  collectionTrend: { date: string; amount: number }[];
}

export interface CreditHealthScore {
  score: number;
  outstandingScore: number;
  overdueScore: number;
  paymentHistoryScore: number;
  returnedChequesScore: number;
  salesVolumeScore: number;
  approvalHistoryScore: number;
  creditUtilizationScore: number;
  latePaymentScore: number;
  badge: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
}

@Injectable()
export class SalesCreditEngineService {
  private readonly logger = new Logger(SalesCreditEngineService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  // ═════════════════════════════════════════════════════════
  // DASHBOARD
  // ═════════════════════════════════════════════════════════
  async getDashboard(): Promise<any> {
    const result = await this.database.creditProfiles.findAll({ page: 1, pageSize: 1000 });
    const all = result?.data || [];
    const totalCreditLimit = all.reduce((s: number, p: any) => s + Number(p.creditLimit || 0), 0);
    const totalOutstanding = all.reduce((s: number, p: any) => s + Number(p.outstanding || 0), 0);
    const totalOverdue = all.reduce((s: number, p: any) => s + Number(p.overdueAmount || 0), 0);

    return {
      summary: {
        totalCustomers: all.length,
        totalCreditLimit,
        totalOutstanding,
        totalOverdue,
        creditUtilization:
          totalCreditLimit > 0 ? Math.round((totalOutstanding / totalCreditLimit) * 100) : 0,
        blockedCustomers: all.filter((p: any) => p.isBlocked).length,
        nearLimitCustomers: all.filter(
          (p: any) => !p.isBlocked && p.outstanding > p.creditLimit * 0.8,
        ).length,
        highRiskCustomers: all.filter(
          (p: any) => p.riskCategory === 'high' || p.riskCategory === 'critical',
        ).length,
        averageHealthScore:
          all.length > 0
            ? Math.round(
                all.reduce((s: number, p: any) => s + Number(p.healthScore || 0), 0) / all.length,
              )
            : 0,
      },
      warningDistribution: {
        green: all.filter((p: any) => p.warningLevel === 'green').length,
        amber: all.filter((p: any) => p.warningLevel === 'amber').length,
        red: all.filter((p: any) => p.warningLevel === 'red').length,
        critical: all.filter((p: any) => p.warningLevel === 'critical').length,
      },
      riskDistribution: {
        low: all.filter((p: any) => p.riskCategory === 'low').length,
        medium: all.filter((p: any) => p.riskCategory === 'medium').length,
        high: all.filter((p: any) => p.riskCategory === 'high').length,
        critical: all.filter((p: any) => p.riskCategory === 'critical').length,
      },
      topOutstanding: [...all].sort((a: any, b: any) => b.outstanding - a.outstanding).slice(0, 10),
    };
  }

  // ═════════════════════════════════════════════════════════
  // CREDIT CUSTOMERS LIST
  // ═════════════════════════════════════════════════════════
  async getCustomers(
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      riskCategory?: string;
      isBlocked?: string;
      warningLevel?: string;
      sortBy?: string;
      sortDir?: string;
    } = {},
  ): Promise<any> {
    return this.database.creditProfiles.findAll({
      ...params,
      page: params.page || 1,
      pageSize: params.pageSize || 50,
    });
  }

  // ═════════════════════════════════════════════════════════
  // SINGLE CUSTOMER CREDIT PROFILE
  // ═════════════════════════════════════════════════════════
  async getCustomerProfile(customerId: string): Promise<any> {
    const result = await this.database.creditProfiles.findAll({ page: 1, pageSize: 1000 });
    const profile = (result?.data || []).find((p: any) => p.customerId === customerId);
    if (!profile) {
      throw new NotFoundException(`Customer credit profile not found: ${customerId}`);
    }
    return profile;
  }

  async upsertProfile(customerId: string, data: Partial<any>): Promise<any> {
    const result = await this.database.creditProfiles.findAll({ page: 1, pageSize: 1000 });
    const existing = (result?.data || []).find((p: any) => p.customerId === customerId);
    const now = new Date().toISOString();
    if (existing) {
      const oldLimit = existing.creditLimit;
      await this.database.creditProfiles.update(existing.id, { ...data, updatedAt: now });
      if (data.creditLimit !== undefined && oldLimit !== data.creditLimit) {
        await this.audit.log({
          userId: 'system',
          event: 'credit_limit_changed',
          resource: 'customer_credit',
          action: 'update',
          details: { customerId, oldLimit, newLimit: data.creditLimit },
        });
      }
      return this.database.creditProfiles.findById(existing.id);
    }
    // Create new profile
    return this.database.creditProfiles.create({
      customerId,
      customerName: data.customerName || '',
      customerCode: data.customerCode || '',
      creditLimit: data.creditLimit || 0,
      creditDays: data.creditDays || 0,
      securityDeposit: 0,
      openingBalance: 0,
      outstanding: 0,
      availableCredit: data.creditLimit || 0,
      blockedAmount: 0,
      overdueAmount: 0,
      maxInvoiceAmount: data.creditLimit || 0,
      preferredPaymentMode: 'credit',
      creditRating: 'A',
      riskCategory: 'low',
      healthScore: 100,
      isBlocked: false,
      blockReason: '',
      warningLevel: 'green',
      averagePaymentDays: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateProfile(customerId: string, data: Partial<any>): Promise<any> {
    return this.upsertProfile(customerId, data);
  }

  /**
   * Posting ke baad udhaar (unpaid balance) ko profile ke outstanding mein add karo.
   * Idempotent nahi hai — caller ko sirf successfully-posted invoice ke liye call karna chahiye.
   * Missing profile hone par ledger master se auto-provision karta hai (checkCredit jaisa).
   */
  async addOutstanding(customerId: string, amount: number): Promise<any> {
    // backfill: false — abhi-posted invoice ka status pehle hi 'posted' ho chuka hai,
    // isliye backfill usko bhi sum kar lega aur delta dobara add hokar double-count ho jayega.
    const profile = await this.getOrProvisionProfile(customerId, { backfill: false });
    if (!profile) {
      return null;
    }

    const delta = Math.round(Number(amount || 0) * 100) / 100;
    if (delta <= 0) {
      return profile;
    }

    const newOutstanding = Math.round((Number(profile.outstanding || 0) + delta) * 100) / 100;
    const creditLimit = Number(profile.creditLimit || 0);
    const now = new Date().toISOString();
    await this.database.creditProfiles.update(profile.id, {
      outstanding: newOutstanding,
      availableCredit: Math.max(0, creditLimit - newOutstanding),
      updatedAt: now,
    });
    this.logger.log(
      `Credit profile ${customerId}: outstanding ${profile.outstanding || 0} → ${newOutstanding}`,
    );
    return this.database.creditProfiles.findById(profile.id);
  }

  /**
   * Profile dhundho; missing ho to ledger_master (customer master) se auto-provision
   * karo aur posted invoices se historical udhaar backfill karo. Profile milne par
   * wahi return, warna null.
   */
  private async getOrProvisionProfile(
    customerId: string,
    opts: { backfill?: boolean } = {},
  ): Promise<any | null> {
    let profile: any;
    let provisioned = false;
    try {
      profile = await this.getCustomerProfile(customerId);
    } catch {
      // Profile missing (e.g. customer created before credit-engine sync, or profile
      // creation failed silently). Don't hard-fail the whole invoice — try to
      // auto-provision from the customer master record (ledger_master) which carries
      // the real creditLimit/creditDays.
      const customer = await this.database.ledgerMaster.findById(customerId).catch(() => null);
      if (!customer) {
        return null;
      }
      try {
        profile = await this.upsertProfile(customerId, {
          customerName: (customer as any).partyId || 'Customer',
          customerCode: (customer as any).accountId || '',
          creditLimit: Number((customer as any).creditLimit) || 0,
          creditDays: Number((customer as any).creditDays) || 0,
        });
        provisioned = true;
        this.logger.log(
          `Auto-provisioned credit profile for customer ${customerId} from ledger master`,
        );
      } catch (err) {
        this.logger.warn(
          `Auto-provision credit profile failed for ${customerId}: ${(err as Error).message}`,
        );
        return null;
      }
    }

    // Naya profile outstanding: 0 se start hota hai — pehle se posted invoices ka
    // unpaid balance (udhaar) backfill karo taaki credit check real exposure dekhe.
    // Existing profile par bhi backfill tab karo jab outstanding 0 ho (stale data fix)
    // — jab koi posted balance nahi hoga to sum 0 hi rahega, isliye yeh safe hai.
    if (opts.backfill !== false && (provisioned || Number(profile.outstanding || 0) === 0)) {
      await this.backfillHistoricalOutstanding(customerId, profile);
    }
    return profile;
  }

  /** Posted invoices (status='posted') ke balance_amount ka sum profile ke outstanding mein daalo. */
  private async backfillHistoricalOutstanding(customerId: string, profile: any): Promise<void> {
    try {
      const result = await this.database.salesInvoices.findAll({
        filters: [
          { field: 'customerId', operator: 'eq' as const, value: customerId },
          { field: 'status', operator: 'eq' as const, value: 'posted' },
        ],
        page: 1,
        pageSize: 10000,
      } as any);
      const historical =
        Math.round(
          (result?.data || []).reduce(
            (s: number, inv: any) => s + Number(inv.balanceAmount || 0),
            0,
          ) * 100,
        ) / 100;
      if (historical > 0) {
        const creditLimit = Number(profile.creditLimit || 0);
        await this.database.creditProfiles.update(profile.id, {
          outstanding: historical,
          availableCredit: Math.max(0, creditLimit - historical),
          updatedAt: new Date().toISOString(),
        });
        this.logger.log(
          `Backfilled outstanding ₹${historical} for customer ${customerId} from posted invoices`,
        );
      }
    } catch (err) {
      this.logger.warn(`Outstanding backfill skipped for ${customerId}: ${(err as Error).message}`);
    }
  }

  // ═════════════════════════════════════════════════════════
  // CREDIT CHECK
  // ═════════════════════════════════════════════════════════
  async checkCredit(customerId: string, invoiceAmount: number): Promise<CreditCheckResult> {
    // Sales Settings → enforceCreditLimit toggle: OFF asta tar credit blocks
    // (limit/overdue) sirf warnings ban jate hain — bill kabhi block nahi hota.
    // Shopkeeper-friendly default: enforcement ON (strict) hamesha chalu rahe.
    let enforce = true;
    try {
      const r = await this.database.salesSettings.findAll({ page: 1, pageSize: 1 } as any);
      const settings = r.data?.[0];
      enforce = settings?.enforceCreditLimit !== false;
    } catch {
      /* best-effort: default strict */
    }

    const profile = await this.getOrProvisionProfile(customerId, { backfill: true });
    if (!profile) {
      return {
        canPost: false,
        warnings: [],
        errors: ['Customer credit profile not found'],
        creditStatus: 'blocked',
        requiredApproval: false,
      };
    }

    const warnings: string[] = [];
    const errors: string[] = [];

    if (profile.isBlocked) {
      errors.push(`Customer is blocked: ${profile.blockReason || 'Unknown reason'}`);
      return { canPost: false, warnings, errors, creditStatus: 'blocked', requiredApproval: false };
    }

    const projectedOutstanding = Number(profile.outstanding || 0) + invoiceAmount;
    const creditLimit = Number(profile.creditLimit || 0);

    if (projectedOutstanding > creditLimit) {
      warnings.push(
        `Invoice would exceed credit limit by ${(projectedOutstanding - creditLimit).toFixed(2)}`,
      );
    }
    if (projectedOutstanding > creditLimit * 1.2) {
      const msg = `Invoice exceeds credit limit by more than 20%. Current: ${profile.outstanding}, Invoice: ${invoiceAmount}, Limit: ${creditLimit}`;
      if (enforce) {
        errors.push(msg);
        return {
          canPost: false,
          warnings,
          errors,
          creditStatus: 'blocked',
          requiredApproval: true,
        };
      }
      warnings.push(msg);
    }

    const overdueAmount = Number(profile.overdueAmount || 0);
    if (overdueAmount > 0) {
      warnings.push(`Customer has overdue amount of ${overdueAmount}`);
    }
    if (overdueAmount > creditLimit * 0.5) {
      const msg = 'Overdue amount exceeds 50% of credit limit. Cannot post invoice.';
      if (enforce) {
        errors.push(msg);
        return {
          canPost: false,
          warnings,
          errors,
          creditStatus: 'blocked',
          requiredApproval: true,
        };
      }
      warnings.push(msg);
    }

    if (profile.riskCategory === 'critical') {
      const msg = 'Customer is in critical risk category. Cannot post invoice without approval.';
      if (enforce) {
        errors.push(msg);
        return {
          canPost: false,
          warnings,
          errors,
          creditStatus: 'blocked',
          requiredApproval: true,
        };
      }
      warnings.push(msg);
    }
    if (profile.riskCategory === 'high' && invoiceAmount > creditLimit * 0.3) {
      warnings.push('High risk customer. Invoice requires manager approval.');
      // enforceCreditLimit OFF asta tar credit approval bhi requirement nahi
      // (toggle credit-gating band karta hai)
      return {
        canPost: true,
        warnings,
        errors,
        creditStatus: 'warning',
        requiredApproval: enforce,
      };
    }

    if (invoiceAmount > Number(profile.maxInvoiceAmount || 0)) {
      const msg = `Invoice amount ${invoiceAmount} exceeds maximum invoice amount ${profile.maxInvoiceAmount}`;
      if (enforce) {
        errors.push(msg);
        return {
          canPost: false,
          warnings,
          errors,
          creditStatus: 'blocked',
          requiredApproval: true,
        };
      }
      warnings.push(msg);
    }

    if (projectedOutstanding > creditLimit * 0.9) {
      warnings.push(
        `Credit utilization will be ${((projectedOutstanding / (creditLimit || 1)) * 100).toFixed(0)}% after this invoice`,
      );
    }
    if (profile.warningLevel === 'red' || profile.warningLevel === 'amber') {
      warnings.push(`Customer warning level: ${profile.warningLevel}`);
    }

    return {
      canPost: true,
      warnings,
      errors,
      creditStatus: warnings.length > 0 ? 'warning' : 'ok',
      requiredApproval: false,
    };
  }

  // ═════════════════════════════════════════════════════════
  // MANAGER OVERRIDE
  // ═════════════════════════════════════════════════════════
  async override(
    customerId: string,
    overrideBy: string,
    overrideByName: string,
    overrideRole: string,
    reason: string,
    newLimit?: number,
  ): Promise<any> {
    let profile: any;
    try {
      profile = await this.getCustomerProfile(customerId);
    } catch {
      throw new NotFoundException('Customer credit profile not found');
    }

    const overrideRoles = ['admin', 'manager', 'accounts_head'];
    if (!overrideRoles.includes(overrideRole)) {
      throw new BadRequestException(`User role ${overrideRole} does not have override permission`);
    }

    const oldLimit = profile.creditLimit;
    if (newLimit && newLimit > 0) {
      await this.updateProfile(customerId, { creditLimit: newLimit });
    }

    const override = await this.database.creditOverrides.create({
      customerId,
      overrideBy,
      overrideByName,
      overrideRole,
      reason,
      oldLimit,
      newLimit: newLimit || oldLimit,
      approvedBy: overrideBy,
      timestamp: new Date().toISOString(),
    });

    await this.audit.log({
      userId: overrideBy,
      event: 'credit_override',
      resource: 'customer_credit',
      action: 'override',
      details: { customerId, oldLimit, newLimit: newLimit || oldLimit, reason, overrideRole },
    });
    this.logger.log(
      `Credit override: ${overrideByName} (${overrideRole}) overrode credit for ${customerId}. Reason: ${reason}`,
    );
    return override;
  }

  // ═════════════════════════════════════════════════════════
  // AGEING REPORT
  // ═════════════════════════════════════════════════════════
  async getAgeing(
    params: { page?: number; pageSize?: number; search?: string } = {},
  ): Promise<any> {
    const result = await this.database.creditProfiles.findAll({ page: 1, pageSize: 1000 });
    let data = result?.data || [];
    if (params.search) {
      const q = params.search.toLowerCase();
      data = data.filter(
        (p: any) =>
          (p.customerName || '').toLowerCase().includes(q) ||
          (p.customerCode || '').toLowerCase().includes(q),
      );
    }
    data.sort((a: any, b: any) => (b.overdueAmount || 0) - (a.overdueAmount || 0));
    const total = data.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const start = (page - 1) * pageSize;

    const ageingSummary: AgeingBucket[] = [];
    const now = Date.now();
    for (const p of data) {
      const lpd = p.lastPaymentDate;
      const daysSincePayment = lpd ? Math.floor((now - new Date(lpd).getTime()) / 86400000) : 999;
      const overdue = Number(p.overdueAmount || 0);
      if (daysSincePayment <= 30) {
        this.addToBucket(ageingSummary, '0-30', overdue);
      } else if (daysSincePayment <= 60) {
        this.addToBucket(ageingSummary, '31-60', overdue);
      } else if (daysSincePayment <= 90) {
        this.addToBucket(ageingSummary, '61-90', overdue);
      } else if (daysSincePayment <= 180) {
        this.addToBucket(ageingSummary, '91-180', overdue);
      } else {
        this.addToBucket(ageingSummary, '180+', overdue);
      }
    }

    return {
      data: data.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      ageingSummary,
    };
  }

  private addToBucket(buckets: AgeingBucket[], label: string, amount: number): void {
    const existing = buckets.find((b) => b.bucket === label);
    if (existing) {
      existing.amount += amount;
      existing.count++;
    } else {
      buckets.push({ bucket: label, daysMin: 0, daysMax: 0, amount, count: 1 });
    }
  }

  // ═════════════════════════════════════════════════════════
  // RECOVERY DASHBOARD
  // ═════════════════════════════════════════════════════════
  async getRecovery(): Promise<RecoveryData> {
    const result = await this.database.creditProfiles.findAll({ page: 1, pageSize: 1000 });
    const all = result?.data || [];
    const totalOutstanding = all.reduce((s: number, p: any) => s + Number(p.outstanding || 0), 0);
    const totalOverdue = all.reduce((s: number, p: any) => s + Number(p.overdueAmount || 0), 0);
    const collectionTrend: { date: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      // Calculate from actual data if available
      const dayTotal = all
        .filter(
          (p: any) => p.updatedAt && new Date(p.updatedAt).toDateString() === d.toDateString(),
        )
        .reduce((s: number, p: any) => s + Number(p.outstanding || 0), 0);
      collectionTrend.push({ date: d.toISOString().split('T')[0], amount: dayTotal || 0 });
    }
    return {
      pendingCollection: totalOutstanding,
      todayCollection: all
        .filter(
          (p: any) => p.updatedAt && new Date(p.updatedAt).toDateString() === now.toDateString(),
        )
        .reduce((s: number, p: any) => s + Number(p.outstanding || 0), 0),
      collectionEfficiency:
        totalOutstanding > 0
          ? Math.round(((totalOutstanding - totalOverdue) / totalOutstanding) * 100)
          : 100,
      collectionTrend,
    };
  }

  // ═════════════════════════════════════════════════════════
  // BLOCK / RELEASE CUSTOMER
  // ═════════════════════════════════════════════════════════
  async blockCustomer(customerId: string, reason: string, actionBy: string): Promise<any> {
    // Verify customer exists
    await this.getCustomerProfile(customerId).catch(() => {
      throw new NotFoundException('Customer not found');
    });
    await this.updateProfile(customerId, { isBlocked: true, blockReason: reason });
    await this.audit.log({
      userId: actionBy,
      event: 'customer_blocked',
      resource: 'customer_credit',
      action: 'block',
      details: { customerId, reason },
    });
    return this.getCustomerProfile(customerId);
  }

  async releaseCustomer(customerId: string, reason: string, actionBy: string): Promise<any> {
    // Verify customer exists
    await this.getCustomerProfile(customerId).catch(() => {
      throw new NotFoundException('Customer not found');
    });
    await this.updateProfile(customerId, { isBlocked: false, blockReason: '' });
    await this.audit.log({
      userId: actionBy,
      event: 'customer_released',
      resource: 'customer_credit',
      action: 'release',
      details: { customerId, reason },
    });
    return this.getCustomerProfile(customerId);
  }

  // ═════════════════════════════════════════════════════════
  // HEALTH SCORE CALCULATION
  // ═════════════════════════════════════════════════════════
  calculateHealthScore(profile: any): CreditHealthScore {
    const limit = Number(profile.creditLimit || 1);
    const outstanding = Number(profile.outstanding || 0);
    const overdue = Number(profile.overdueAmount || 0);
    const creditDays = Number(profile.creditDays || 30);
    const avgPaymentDays = Number(profile.averagePaymentDays || 0);

    const cu = Math.min(outstanding / limit, 1);
    const outstandingScore = Math.round((1 - cu) * 25);
    const overdueScore = overdue > 0 ? Math.max(0, 15 - Math.round(overdue / 10000)) : 15;
    const paymentHistoryScore =
      avgPaymentDays > 0
        ? Math.max(0, 10 - Math.round(Math.max(0, avgPaymentDays - creditDays) / 5))
        : 10;
    const returnedChequesScore = 10;
    const salesVolumeScore = 10;
    const approvalHistoryScore = 10;
    const creditUtilizationScore = Math.round((1 - cu) * 10);
    const latePaymentScore =
      avgPaymentDays > creditDays
        ? Math.max(0, 10 - Math.round((avgPaymentDays - creditDays) / 5))
        : 10;

    const total =
      outstandingScore +
      overdueScore +
      paymentHistoryScore +
      returnedChequesScore +
      salesVolumeScore +
      approvalHistoryScore +
      creditUtilizationScore +
      latePaymentScore;
    const score = Math.min(Math.max(total, 0), 100);
    let badge: CreditHealthScore['badge'];
    if (score >= 80) {
      badge = 'excellent';
    } else if (score >= 60) {
      badge = 'good';
    } else if (score >= 40) {
      badge = 'fair';
    } else if (score >= 20) {
      badge = 'poor';
    } else {
      badge = 'critical';
    }

    return {
      score,
      outstandingScore,
      overdueScore,
      paymentHistoryScore,
      returnedChequesScore,
      salesVolumeScore,
      approvalHistoryScore,
      creditUtilizationScore,
      latePaymentScore,
      badge,
    };
  }

  // ═════════════════════════════════════════════════════════
  // REMINDER ENGINE
  // ═════════════════════════════════════════════════════════
  async getReminders(): Promise<{
    dueSoon: any[];
    dueToday: any[];
    overdue: any[];
    critical: any[];
  }> {
    const result = await this.database.creditProfiles.findAll({ page: 1, pageSize: 1000 });
    const all = result?.data || [];
    const now = new Date();
    // Overdue Alert — Settings Hub → Sales: overdueAlert on asta tar dueSoon
    // threshold overdueAlertDays (default 5) hona chahiye, hardcoded -5 nahi.
    let alertDays = 5;
    try {
      const r = await this.database.salesSettings.findAll({ page: 1, pageSize: 1 } as any);
      const settings = r.data?.[0];
      if (settings?.overdueAlert && Number(settings.overdueAlertDays) > 0) {
        alertDays = Number(settings.overdueAlertDays);
      }
    } catch {
      /* best-effort: default 5 */
    }
    const dueSoon = all.filter(
      (p: any) =>
        !p.isBlocked &&
        Number(p.outstanding || 0) > 0 &&
        p.lastPaymentDate &&
        Math.floor((now.getTime() - new Date(p.lastPaymentDate).getTime()) / 86400000) >=
          Math.max(0, Number(p.creditDays || 0) - alertDays),
    );
    const dueToday = all.filter(
      (p: any) =>
        Number(p.outstanding || 0) > 0 &&
        p.lastPaymentDate &&
        Math.floor((now.getTime() - new Date(p.lastPaymentDate).getTime()) / 86400000) >=
          Number(p.creditDays || 0),
    );
    const overdue = all.filter((p: any) => Number(p.overdueAmount || 0) > 0);
    const critical = all.filter(
      (p: any) => p.riskCategory === 'critical' || p.warningLevel === 'critical',
    );
    return { dueSoon, dueToday, overdue, critical };
  }
}
