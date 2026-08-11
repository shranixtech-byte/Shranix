import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class LicenseDashboardService {
  constructor(private readonly database: DatabaseService) {}

  async getDashboard(): Promise<Record<string, any>> {
    const [licRes, devRes, actRes, evtRes] = await Promise.all([
      this.database.licenses.findAll({ page: 1, pageSize: 10000 } as any),
      this.database.licenseDevices.findAll({ page: 1, pageSize: 10000 } as any),
      this.database.licenseActivations.findAll({ page: 1, pageSize: 10000 } as any),
      this.database.licenseEvents.findAll({ page: 1, pageSize: 10000 } as any),
    ]);
    const licenses = (licRes?.data || []).filter((l: any) => !l.isDeleted);
    const devices = (devRes?.data || []).filter((d: any) => !d.isDeleted);
    const activations = (actRes?.data || []).filter((a: any) => !a.isDeleted);
    const events = (evtRes?.data || []).filter((e: any) => !e.isDeleted);

    const byStatus: Record<string, number> = {};
    let activeDevices = 0;
    let availableSlots = 0;
    for (const l of licenses) {
      byStatus[String(l.status)] = (byStatus[String(l.status)] || 0) + 1;
      activeDevices += Number(l.activeDevices) || 0;
      availableSlots += Math.max(0, (Number(l.maxDevices) || 0) - (Number(l.activeDevices) || 0));
    }

    const now = new Date().toISOString();
    const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const upcomingExpiry = licenses
      .filter(
        (l: any) =>
          ['ACTIVE', 'GRACE_PERIOD'].includes(String(l.status)) &&
          l.expiresAt &&
          l.expiresAt <= in30 &&
          l.expiresAt >= now,
      )
      .sort((a: any, b: any) => String(a.expiresAt).localeCompare(String(b.expiresAt)))
      .slice(0, 10);

    const last30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const activationAttempts = activations.filter((a: any) => a.requestedAt >= last30).length;
    const failedActivations = activations.filter(
      (a: any) => a.requestedAt >= last30 && ['REJECTED', 'EXPIRED'].includes(String(a.status)),
    ).length;

    const recentEvents = events
      .sort((a: any, b: any) => String(b.eventTime).localeCompare(String(a.eventTime)))
      .slice(0, 15)
      .map((e: any) => ({
        eventType: e.eventType,
        eventTime: e.eventTime,
        licenseId: e.licenseId,
        metadata: e.metadata || null,
      }));

    return {
      totalLicenses: licenses.length,
      byStatus,
      active: byStatus.ACTIVE || 0,
      trial: licenses.filter((l: any) => String(l.licenseType) === 'TRIAL').length,
      gracePeriod: byStatus.GRACE_PERIOD || 0,
      suspended: byStatus.SUSPENDED || 0,
      expired: byStatus.EXPIRED || 0,
      revoked: byStatus.REVOKED || 0,
      cancelled: byStatus.CANCELLED || 0,
      pending: byStatus.PENDING || 0,
      totalDevices: devices.length,
      activeDevices,
      availableDeviceSlots: availableSlots,
      activationAttempts,
      failedActivations,
      upcomingExpiry,
      recentEvents,
    };
  }
}
