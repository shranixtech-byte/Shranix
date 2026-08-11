import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';
import { LicenseActivationsService } from '../../license/services/license-activations.service';
import { LicenseDevicesService } from '../../license/services/license-devices.service';
import { LicenseEventsService } from '../../license/services/license-events.service';
import { LicensesService } from '../../license/services/licenses.service';

/**
 * CUSTOMER PORTAL LICENSE SURFACE — every method is scoped by the authenticated
 * portal customerId (from the token, never from the frontend). A customer can
 * only ever see/manage their OWN license. Raw device identifiers and internal
 * fields are never exposed.
 */
@Injectable()
export class PortalLicenseService {
  constructor(
    private readonly database: DatabaseService,
    private readonly licenses: LicensesService,
    private readonly devices: LicenseDevicesService,
    private readonly activations: LicenseActivationsService,
    private readonly events: LicenseEventsService,
    private readonly audit: AuditService,
  ) {}

  private async ownLicense(customerId: string): Promise<any | null> {
    return this.licenses.getForCustomer(customerId);
  }

  private customerDeviceView(device: any): Record<string, any> {
    return {
      devicePublicId: device.devicePublicId,
      deviceName: device.deviceName,
      platform: device.platform,
      os: device.os,
      applicationVersion: device.applicationVersion,
      status: device.status,
      firstSeenAt: device.firstSeenAt,
      lastSeenAt: device.lastSeenAt,
    };
  }

  /** Portal license overview — license, entitlements, devices, slots, events. */
  async getOverview(customerId: string): Promise<Record<string, any>> {
    const license = await this.ownLicense(customerId);
    if (!license) {
      return { license: null, devices: [], availableSlots: 0, events: [] };
    }
    const rawLicense = await this.database.licenses.findById(license.id).catch(() => license);
    const devices = await this.devices.listDevices(license.id);
    const activations = await this.activations.list(license.id);
    const events = await this.events.list(license.id, 50);

    return {
      license: {
        licenseNumber: license.licenseNumber,
        licenseReference: license.licensePublicId,
        licenseType: license.licenseType,
        status: license.status,
        startsAt: license.startsAt,
        expiresAt: license.expiresAt,
        graceUntil: license.graceUntil,
        autoRenew: Boolean(license.autoRenew),
        plan: license.plan,
        entitlements: license.entitlements,
        limits: {
          users: license.maxUsers,
          devices: license.maxDevices,
          branches: license.maxBranches,
          installations: license.maxInstallations,
          ...license.limits,
        },
        allowedDevices: Number(rawLicense.maxDevices) || 1,
        usedDevices: Number(rawLicense.activeDevices) || 0,
        availableSlots: Math.max(
          0,
          (Number(rawLicense.maxDevices) || 1) - (Number(rawLicense.activeDevices) || 0),
        ),
        subscription: license.subscription,
      },
      devices: devices.map((d: any) => this.customerDeviceView(d)),
      activationSummary: {
        total: activations.length,
        active: activations.filter((a: any) => String(a.status) === 'ACTIVE').length,
        pending: activations.filter((a: any) => String(a.status) === 'PENDING').length,
        rejected: activations.filter((a: any) => String(a.status) === 'REJECTED').length,
      },
      events: events.slice(0, 20).map((e: any) => ({
        eventType: e.eventType,
        eventTime: e.eventTime,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        metadata: e.metadata,
      })),
    };
  }

  /** Customer's device list (never raw hashes). */
  async getDevices(customerId: string): Promise<Record<string, any>> {
    const license = await this.ownLicense(customerId);
    if (!license) {
      return { devices: [], availableSlots: 0 };
    }
    const rawLicense = await this.database.licenses.findById(license.id).catch(() => license);
    const devices = await this.devices.listDevices(license.id);
    return {
      devices: devices.map((d: any) => this.customerDeviceView(d)),
      allowedDevices: Number(rawLicense.maxDevices) || 1,
      usedDevices: Number(rawLicense.activeDevices) || 0,
      availableSlots: Math.max(
        0,
        (Number(rawLicense.maxDevices) || 1) - (Number(rawLicense.activeDevices) || 0),
      ),
    };
  }

  /** Deactivate the customer's own device (frees a slot). */
  async deactivateDevice(
    customerId: string,
    portalUserId: string,
    body: { devicePublicId: string; reason?: string },
  ): Promise<any> {
    const license = await this.ownLicense(customerId);
    if (!license) {
      throw new NotFoundException('No license found for this customer');
    }
    if (!body?.devicePublicId) {
      throw new BadRequestException('devicePublicId is required');
    }
    // Ownership — the device must belong to THIS customer's license.
    const devices = await this.devices.listDevices(license.id);
    const owned = devices.some(
      (d: any) => d.devicePublicId === body.devicePublicId && String(d.status) === 'active',
    );
    if (!owned) {
      throw new NotFoundException('Device not found on this license');
    }
    const result = await this.devices.deactivateDevice(
      license.licensePublicId,
      body.devicePublicId,
      {
        reason: body.reason || 'Deactivated from customer portal',
        userId: portalUserId,
      },
    );
    await this.audit.log({
      userId: portalUserId,
      event: 'portal.license_device_deactivated',
      resource: 'LicenseDevice',
      action: 'deactivate',
      details: { licenseId: license.id, devicePublicId: body.devicePublicId },
    });
    return { success: true, device: result.device ? this.customerDeviceView(result.device) : null };
  }

  /** Request a device transfer (admin approves). Ownership enforced. */
  async requestTransfer(customerId: string, portalUserId: string, body: any): Promise<any> {
    const license = await this.ownLicense(customerId);
    if (!license) {
      throw new NotFoundException('No license found for this customer');
    }
    if (!body?.fromDevicePublicId || !body?.toDeviceIdentifierHash) {
      throw new BadRequestException('fromDevicePublicId and toDeviceIdentifierHash are required');
    }
    const devices = await this.devices.listDevices(license.id);
    if (!devices.some((d: any) => d.devicePublicId === body.fromDevicePublicId)) {
      throw new NotFoundException('Source device not found on this license');
    }
    const transfer = await this.devices.requestTransfer(license.licensePublicId, {
      ...body,
      userId: portalUserId,
    });
    await this.audit.log({
      userId: portalUserId,
      event: 'portal.license_transfer_requested',
      resource: 'LicenseTransfer',
      action: 'request',
      details: { licenseId: license.id, transferId: transfer.id },
    });
    return { success: true, transfer };
  }

  /** Request reactivation — audited and routed to admins (never self-serve). */
  async requestReactivation(
    customerId: string,
    portalUserId: string,
    body: { reason?: string } = {},
  ): Promise<any> {
    const license = await this.ownLicense(customerId);
    if (!license) {
      throw new NotFoundException('No license found for this customer');
    }
    await this.audit.log({
      userId: portalUserId,
      event: 'portal.license_reactivation_requested',
      resource: 'License',
      action: 'request',
      details: { licenseId: license.id, reason: body?.reason || null },
    });
    // Notify internal admins (best-effort) so an authorized user can act.
    try {
      const adminUsers = new Set<string>();
      for (const roleName of ['admin', 'owner', 'super_admin']) {
        const role = await this.database.roles.findRoleByName(roleName).catch(() => null);
        if (role) {
          const userIds = await this.database.roles.getUsersWithRole(role.id).catch(() => []);
          for (const uid of userIds) {
            adminUsers.add(uid);
          }
        }
      }
      for (const userId of adminUsers) {
        await this.database.notifications
          .create({
            userId,
            title: 'License reactivation requested',
            message: `${license.licenseNumber} — reactivation requested by customer (${license.customerId}). Reason: ${body?.reason || '—'}`,
            type: 'info',
            module: 'license',
            documentId: license.id,
            documentType: 'License',
            isRead: false,
          } as any)
          .catch(() => undefined);
      }
    } catch {
      /* best-effort */
    }
    return {
      success: true,
      message: 'Reactivation requested. An administrator will review it.',
      licenseNumber: license.licenseNumber,
    };
  }
}
