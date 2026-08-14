import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';
import { actor, round2 } from '../numbering.util';

const COUPON_STATUSES = ['active', 'inactive', 'expired'];

/**
 * Drizzle (>=0.45) wraps driver errors as { query, params, cause } where the
 * original error lives on `.cause` (code e.g. SQLITE_CONSTRAINT_UNIQUE / 23505).
 * Detect unique-constraint violations across both shapes.
 */
function isUniqueConstraintError(err: unknown): boolean {
  const e = err as { message?: string; cause?: { message?: string; code?: string } };
  const msg = `${e?.message || ''} ${e?.cause?.message || ''}`;
  return /UNIQUE|already exists|duplicate/i.test(msg);
}

@Injectable()
export class CouponsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    query: { page?: number; pageSize?: number; status?: string; search?: string } = {},
  ) {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    const res = await this.database.coupons.findAll({
      page: Number(query.page) || 1,
      pageSize: Number(query.pageSize) || 50,
      filters,
    } as any);
    let data = (res?.data || []).filter((c: any) => !c.isDeleted);
    if (query.search) {
      const q = String(query.search).toLowerCase();
      data = data.filter(
        (c: any) =>
          String(c.couponCode || '')
            .toLowerCase()
            .includes(q) ||
          String(c.description || '')
            .toLowerCase()
            .includes(q),
      );
    }
    // attach redemption counts
    const enriched = await Promise.all(
      data.map(async (c: any) => {
        const redRes = await this.database.couponRedemptions.findAll({
          page: 1,
          pageSize: 10000,
          filters: [{ field: 'couponId', operator: 'eq', value: c.id }],
        } as any);
        return { ...c, usedCount: (redRes?.data || []).length };
      }),
    );
    return { data: enriched, total: enriched.length, page: 1, pageSize: enriched.length };
  }

  async findById(id: string): Promise<any> {
    const coupon = await this.database.coupons.findById(id).catch(() => null);
    if (!coupon || coupon.isDeleted) {
      throw new NotFoundException('Coupon not found');
    }
    const redRes = await this.database.couponRedemptions.findAll({
      page: 1,
      pageSize: 10000,
      filters: [{ field: 'couponId', operator: 'eq', value: id }],
    } as any);
    return { ...coupon, usedCount: (redRes?.data || []).length };
  }

  async create(body: any, userId?: string): Promise<any> {
    const code = String(body.couponCode || '')
      .trim()
      .toUpperCase();
    if (!code) {
      throw new BadRequestException('couponCode is required');
    }
    if (!['percent', 'fixed'].includes(body.discountType || 'percent')) {
      throw new BadRequestException('discountType must be percent or fixed');
    }
    if (Number(body.discountValue) <= 0) {
      throw new BadRequestException('discountValue must be > 0');
    }
    let attempts = 0;
    while (attempts < 5) {
      try {
        const coupon = await this.database.coupons.create({
          couponCode: code,
          description: body.description || null,
          discountType: body.discountType || 'percent',
          discountValue: Math.abs(Number(body.discountValue) || 0),
          maxDiscount:
            body.maxDiscount !== undefined ? Math.max(0, Number(body.maxDiscount) || 0) : null,
          minBillingAmount: Math.max(0, Number(body.minBillingAmount) || 0),
          startDate: body.startDate || null,
          endDate: body.endDate || null,
          usageLimit:
            body.usageLimit !== undefined ? Math.max(0, Number(body.usageLimit) || 0) : null,
          perCustomerLimit: Math.max(1, Number(body.perCustomerLimit) || 1),
          applicablePlanIds: JSON.stringify(body.applicablePlanIds || []),
          status: body.status && COUPON_STATUSES.includes(body.status) ? body.status : 'active',
          createdBy: userId || null,
          updatedBy: userId || null,
        } as any);
        await this.audit.log({
          userId: actor(userId),
          event: 'commercial.coupon_created',
          resource: 'Coupon',
          action: 'create',
          details: { couponId: coupon.id, couponCode: coupon.couponCode },
        });
        return this.findById(coupon.id);
      } catch (err: any) {
        const dup = isUniqueConstraintError(err) || /coupon_code/i.test(String(err?.message || ''));
        if (!dup || attempts >= 4) {
          throw err;
        }
        attempts += 1;
      }
    }
    throw new BadRequestException('Could not create coupon');
  }

  async update(id: string, body: any, userId?: string): Promise<any> {
    const coupon = await this.database.coupons.findById(id).catch(() => null);
    if (!coupon || coupon.isDeleted) {
      throw new NotFoundException('Coupon not found');
    }
    const updates: Record<string, any> = {};
    if (body.description !== undefined) {
      updates.description = body.description || null;
    }
    if (body.discountType !== undefined) {
      if (!['percent', 'fixed'].includes(body.discountType)) {
        throw new BadRequestException('discountType must be percent or fixed');
      }
      updates.discountType = body.discountType;
    }
    if (body.discountValue !== undefined) {
      updates.discountValue = Math.abs(Number(body.discountValue) || 0);
    }
    if (body.maxDiscount !== undefined) {
      updates.maxDiscount = Math.max(0, Number(body.maxDiscount) || 0);
    }
    if (body.minBillingAmount !== undefined) {
      updates.minBillingAmount = Math.max(0, Number(body.minBillingAmount) || 0);
    }
    if (body.startDate !== undefined) {
      updates.startDate = body.startDate || null;
    }
    if (body.endDate !== undefined) {
      updates.endDate = body.endDate || null;
    }
    if (body.usageLimit !== undefined) {
      updates.usageLimit = Math.max(0, Number(body.usageLimit) || 0);
    }
    if (body.perCustomerLimit !== undefined) {
      updates.perCustomerLimit = Math.max(1, Number(body.perCustomerLimit) || 1);
    }
    if (body.applicablePlanIds !== undefined) {
      updates.applicablePlanIds = JSON.stringify(body.applicablePlanIds || []);
    }
    if (body.status !== undefined) {
      if (!COUPON_STATUSES.includes(body.status)) {
        throw new BadRequestException('Invalid status');
      }
      updates.status = body.status;
    }
    updates.updatedBy = userId || null;
    await this.database.coupons.update(id, updates as any);
    await this.audit.log({
      userId: actor(userId),
      event: 'commercial.coupon_updated',
      resource: 'Coupon',
      action: 'update',
      details: { couponId: id, changes: Object.keys(updates) },
    });
    return this.findById(id);
  }

  async delete(id: string, userId?: string): Promise<{ success: boolean }> {
    const coupon = await this.database.coupons.findById(id).catch(() => null);
    if (!coupon || coupon.isDeleted) {
      throw new NotFoundException('Coupon not found');
    }
    await this.database.coupons.softDelete(id);
    await this.audit.log({
      userId: actor(userId),
      event: 'commercial.coupon_deleted',
      resource: 'Coupon',
      action: 'delete',
      details: { couponId: id, couponCode: coupon.couponCode },
    });
    return { success: true };
  }

  /** Validate a coupon for a given customer + plan + billing amount. */
  async validateCoupon(input: {
    code: string;
    customerId: string;
    planId?: string;
    amount?: number;
  }): Promise<{ valid: boolean; coupon?: any; discountAmount?: number; reason?: string }> {
    const code = String(input.code || '')
      .trim()
      .toUpperCase();
    const res = await this.database.coupons.findAll({
      page: 1,
      pageSize: 10,
      filters: [{ field: 'couponCode', operator: 'eq', value: code }],
    } as any);
    const coupon = (res?.data || []).find((c: any) => !c.isDeleted);
    if (!coupon) {
      return { valid: false, reason: 'Invalid coupon code' };
    }
    const now = new Date().toISOString().slice(0, 10);
    if (coupon.status === 'inactive') {
      return { valid: false, reason: 'Coupon is inactive' };
    }
    if (coupon.status === 'expired') {
      return { valid: false, reason: 'Coupon has expired' };
    }
    if (coupon.startDate && String(coupon.startDate).slice(0, 10) > now) {
      return { valid: false, reason: 'Coupon is not active yet' };
    }
    if (coupon.endDate && String(coupon.endDate).slice(0, 10) < now) {
      return { valid: false, reason: 'Coupon has expired' };
    }
    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageLimit > 0) {
      const redRes = await this.database.couponRedemptions.findAll({
        page: 1,
        pageSize: 10000,
        filters: [{ field: 'couponId', operator: 'eq', value: coupon.id }],
      } as any);
      const used = (redRes?.data || []).length;
      if (used >= coupon.usageLimit) {
        return { valid: false, reason: 'Coupon usage limit reached' };
      }
    }
    // Per-customer limit — count rows for this customer
    const custRes = await this.database.couponRedemptions.findAll({
      page: 1,
      pageSize: 10000,
      filters: [
        { field: 'couponId', operator: 'eq', value: coupon.id },
        { field: 'customerId', operator: 'eq', value: input.customerId },
      ],
    } as any);
    if ((custRes?.data || []).length >= (Number(coupon.perCustomerLimit) || 1)) {
      return { valid: false, reason: 'Coupon already used for this customer' };
    }
    // Plan applicability
    if (input.planId) {
      const planIds: string[] = JSON.parse(String(coupon.applicablePlanIds || '[]'));
      if (planIds.length > 0 && !planIds.includes(input.planId)) {
        return { valid: false, reason: 'Coupon does not apply to this plan' };
      }
    }
    const amount = Number(input.amount) || 0;
    if (amount > 0 && amount < Number(coupon.minBillingAmount)) {
      return {
        valid: false,
        reason: `Minimum billing amount for this coupon is ₹${Number(coupon.minBillingAmount).toFixed(2)}`,
      };
    }
    let discount = 0;
    if (coupon.discountType === 'percent') {
      discount = round2((amount * Number(coupon.discountValue)) / 100);
      if (
        coupon.maxDiscount !== null &&
        coupon.maxDiscount !== undefined &&
        Number(coupon.maxDiscount) > 0
      ) {
        discount = Math.min(discount, Number(coupon.maxDiscount));
      }
    } else {
      discount = round2(Math.min(Number(coupon.discountValue), amount));
    }
    return { valid: true, coupon, discountAmount: discount };
  }

  /**
   * ATOMIC redemption — the unique (coupon_id, customer_id) index prevents a
   * customer redeeming the same coupon twice even under concurrency. Returns
   * the redemption row, or throws on duplicate.
   */
  async redeem(input: {
    couponId: string;
    customerId: string;
    subscriptionId?: string;
    billingInvoiceId?: string;
    discountAmount: number;
    userId?: string;
  }): Promise<any> {
    const coupon = await this.database.coupons.findById(input.couponId).catch(() => null);
    if (!coupon || coupon.isDeleted) {
      throw new BadRequestException('Coupon not found');
    }
    // Re-check the global usage limit immediately before insert — closes the
    // validate-then-redeem gap for sequential abuse. (The per-customer unique
    // index already hard-blocks per-customer duplicates atomically.)
    if (
      coupon.usageLimit !== null &&
      coupon.usageLimit !== undefined &&
      Number(coupon.usageLimit) > 0
    ) {
      const redRes = await this.database.couponRedemptions.findAll({
        page: 1,
        pageSize: 10000,
        filters: [{ field: 'couponId', operator: 'eq', value: input.couponId }],
      } as any);
      if ((redRes?.data || []).length >= Number(coupon.usageLimit)) {
        throw new BadRequestException('Coupon usage limit reached');
      }
    }
    try {
      const redemption = await this.database.couponRedemptions.create({
        couponId: input.couponId,
        customerId: input.customerId,
        subscriptionId: input.subscriptionId || null,
        billingInvoiceId: input.billingInvoiceId || null,
        discountAmount: round2(input.discountAmount),
        redeemedAt: new Date().toISOString(),
        createdBy: input.userId || null,
      } as any);
      await this.audit.log({
        userId: actor(input.userId),
        event: 'commercial.coupon_used',
        resource: 'Coupon',
        action: 'redeem',
        details: {
          couponId: input.couponId,
          couponCode: coupon.couponCode,
          customerId: input.customerId,
          discountAmount: input.discountAmount,
        },
      });
      return redemption;
    } catch (err: any) {
      if (isUniqueConstraintError(err)) {
        throw new BadRequestException('Coupon already used for this customer');
      }
      throw err;
    }
  }

  async expireDueCoupons(): Promise<number> {
    const res = await this.database.coupons.findAll({ page: 1, pageSize: 5000 } as any);
    const today = new Date().toISOString().slice(0, 10);
    let changed = 0;
    for (const c of res?.data || []) {
      if (
        !c.isDeleted &&
        c.status === 'active' &&
        c.endDate &&
        String(c.endDate).slice(0, 10) < today
      ) {
        try {
          await this.database.coupons.update(c.id, { status: 'expired' } as any);
          changed += 1;
        } catch {
          /* best-effort */
        }
      }
    }
    return changed;
  }
}
