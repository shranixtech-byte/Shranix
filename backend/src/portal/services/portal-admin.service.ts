import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';
import { PORTAL_ROLES, num } from '../portal-isolation.helper';

@Injectable()
export class PortalAdminService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /** Create a portal user for a customer — argon2 hashed, never plain text. */
  async createPortalUser(data: any, adminUserId: string) {
    const email = String(data.email || '')
      .toLowerCase()
      .trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException('Valid email is required');
    }
    if (!data.customerId) {
      throw new BadRequestException('customerId is required');
    }
    if (String(data.password || '').length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    const role = String(data.role || 'viewer');
    if (!PORTAL_ROLES.includes(role as any)) {
      throw new BadRequestException(`Invalid role: ${role}`);
    }
    const customer = await this.database.customers
      .findById(String(data.customerId))
      .catch(() => null);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    const existing = await this.database.portalUsers
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'email', operator: 'eq', value: email }],
      } as any)
      .catch(() => ({ data: [] }));
    if ((existing.data || []).length > 0) {
      throw new BadRequestException('A portal user with this email already exists');
    }

    const passwordHash = await argon2.hash(String(data.password), {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 1,
      parallelism: 1,
    });
    const user = await this.database.portalUsers.create({
      customerId: String(data.customerId),
      email,
      passwordHash,
      name: data.name || customer.name || email,
      mobile: data.mobile || null,
      role,
      status: data.status || 'active',
      isVerified: data.skipVerification ? true : false,
      verifiedAt: data.skipVerification ? new Date().toISOString() : null,
      failedLoginAttempts: 0,
      tokenVersion: 0,
      createdBy: adminUserId,
    } as any);

    await this.audit
      .log({
        userId: adminUserId,
        event: 'portal.user_created',
        resource: 'portal',
        action: 'create',
        details: { portalUserId: user.id, email, customerId: user.customerId, role },
      })
      .catch(() => {});
    return this.safeUser(user);
  }

  async listPortalUsers(customerId?: string, status?: string) {
    const filters: any[] = [];
    if (customerId) {
      filters.push({ field: 'customerId', operator: 'eq', value: customerId });
    }
    if (status) {
      filters.push({ field: 'status', operator: 'eq', value: status });
    }
    const res = await this.database.portalUsers
      .findAll({ page: 1, pageSize: 500, ...(filters.length ? { filters } : {}) } as any)
      .catch(() => ({ data: [] }));
    return (res.data || [])
      .filter((u: any) => !u.isDeleted)
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((u: any) => this.safeUser(u));
  }

  async updatePortalUser(id: string, data: any, adminUserId: string) {
    const user = await this.database.portalUsers.findById(id).catch(() => null);
    if (!user) {
      throw new NotFoundException('Portal user not found');
    }
    const patch: any = {};
    if (data.status && ['active', 'inactive', 'blocked', 'pending'].includes(data.status)) {
      patch.status = data.status;
    }
    if (data.role && PORTAL_ROLES.includes(data.role as any)) {
      patch.role = data.role;
    }
    if (data.name !== undefined) {
      patch.name = data.name;
    }
    if (data.mobile !== undefined) {
      patch.mobile = data.mobile;
    }
    if (data.password) {
      if (String(data.password).length < 6) {
        throw new BadRequestException('Password must be at least 6 characters');
      }
      patch.passwordHash = await argon2.hash(String(data.password), {
        type: argon2.argon2id,
        memoryCost: 19_456,
        timeCost: 1,
        parallelism: 1,
      });
      patch.tokenVersion = (Number(user.tokenVersion) || 0) + 1; // force re-login
    }
    patch.updatedBy = adminUserId;
    await this.database.portalUsers.update(id, patch as any);
    await this.audit
      .log({
        userId: adminUserId,
        event: 'portal.user_updated',
        resource: 'portal',
        action: 'update',
        details: { portalUserId: id, patch: Object.keys(patch) },
      })
      .catch(() => {});
    return { updated: true, id };
  }

  /** Analytics for internal admins — no private customer details leaked. */
  async analytics() {
    const [users, payments, tickets] = await Promise.all([
      this.database.portalUsers
        .findAll({ page: 1, pageSize: 5000 } as any)
        .catch(() => ({ data: [] })),
      this.database.portalPayments
        .findAll({ page: 1, pageSize: 5000 } as any)
        .catch(() => ({ data: [] })),
      this.database.portalTickets
        .findAll({ page: 1, pageSize: 5000 } as any)
        .catch(() => ({ data: [] })),
    ]);
    const usersArr = (users.data || []).filter((u: any) => !u.isDeleted);
    const paymentsArr = (payments.data || []).filter((p: any) => !p.isDeleted);
    const ticketsArr = (tickets.data || []).filter((t: any) => !t.isDeleted);

    const totalOnline = paymentsArr
      .filter((p: any) => p.status === 'completed')
      .reduce((s: number, p: any) => s + num(p.amount), 0);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    return {
      portalUsers: usersArr.length,
      activeUsers: usersArr.filter((u: any) => u.status === 'active').length,
      blockedUsers: usersArr.filter((u: any) => u.status === 'blocked').length,
      loggedInLast30Days: usersArr.filter(
        (u: any) => u.lastLoginAt && u.lastLoginAt >= thirtyDaysAgo,
      ).length,
      byRole: {
        admin: usersArr.filter((u: any) => u.role === 'admin').length,
        accounts: usersArr.filter((u: any) => u.role === 'accounts').length,
        purchase: usersArr.filter((u: any) => u.role === 'purchase').length,
        viewer: usersArr.filter((u: any) => u.role === 'viewer').length,
      },
      payments: {
        total: paymentsArr.length,
        completed: paymentsArr.filter((p: any) => p.status === 'completed').length,
        failed: paymentsArr.filter((p: any) => p.status === 'failed').length,
        volume: Math.round(totalOnline * 100) / 100,
      },
      tickets: {
        total: ticketsArr.length,
        open: ticketsArr.filter((t: any) => t.status === 'open' || t.status === 'in_progress')
          .length,
        resolved: ticketsArr.filter((t: any) => t.status === 'resolved' || t.status === 'closed')
          .length,
      },
    };
  }

  private safeUser(u: any) {
    return {
      id: u.id,
      customerId: u.customerId,
      email: u.email,
      name: u.name,
      mobile: u.mobile,
      role: u.role,
      status: u.status,
      isVerified: !!u.isVerified,
      lastLoginAt: u.lastLoginAt || null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }
}
