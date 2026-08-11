import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';
import { actor, publicId, sha256 } from '../numbering';

import { LicenseEventsService } from './license-events.service';
import { LicensesService } from './licenses.service';

/**
 * Device management. Only normalized/hashed identifiers are stored — raw
 * machine fingerprints are never persisted. Deactivation is the only path
 * that frees a device slot (never silently removes an active device).
 */
@Injectable()
export class LicenseDevicesService {
  private readonly logger = new Logger(LicenseDevicesService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly licenses: LicensesService,
    private readonly events: LicenseEventsService,
  ) {}

  /** Resolve a license by public id or human-readable number. */
  private async resolve(licenseReference: string): Promise<any> {
    const ref = String(licenseReference || '').trim();
    if (!ref) {
      throw new BadRequestException('licenseReference is required');
    }
    let license: any = null;
    if (ref.startsWith('lic_')) {
      license = await this.database.licenses
        .findAll({
          page: 1,
          pageSize: 5,
          filters: [{ field: 'licensePublicId', operator: 'eq', value: ref }],
        } as any)
        .then((r: any) => (r?.data || []).find((l: any) => !l.isDeleted))
        .catch(() => null);
    }
    if (!license) {
      license = await this.database.licenses
        .findAll({
          page: 1,
          pageSize: 5,
          filters: [{ field: 'licenseNumber', operator: 'eq', value: ref }],
        } as any)
        .then((r: any) => (r?.data || []).find((l: any) => !l.isDeleted))
        .catch(() => null);
    }
    if (!license) {
      throw new NotFoundException('License not found');
    }
    return license;
  }

  private async findDeviceByHash(licenseId: string, deviceHash: string): Promise<any | null> {
    const res = await this.database.licenseDevices.findAll({
      page: 1,
      pageSize: 5,
      filters: [
        { field: 'licenseId', operator: 'eq', value: licenseId },
        { field: 'deviceIdentifierHash', operator: 'eq', value: deviceHash },
      ],
    } as any);
    return (res?.data || []).find((d: any) => !d.isDeleted) || null;
  }

  private async findDeviceByPublicId(
    licenseId: string,
    devicePublicId: string,
  ): Promise<any | null> {
    const res = await this.database.licenseDevices.findAll({
      page: 1,
      pageSize: 5,
      filters: [
        { field: 'licenseId', operator: 'eq', value: licenseId },
        { field: 'devicePublicId', operator: 'eq', value: devicePublicId },
      ],
    } as any);
    return (res?.data || []).find((d: any) => !d.isDeleted) || null;
  }

  /**
   * Register (or refresh) a device + installation for a license. Idempotent per
   * (license, device hash) — repeated calls return the same device row.
   */
  async registerDevice(
    licenseReference: string,
    input: {
      deviceIdentifierHash: string;
      deviceName?: string;
      platform?: string;
      os?: string;
      applicationVersion?: string;
      installationName?: string;
      machineFingerprintHash?: string;
      osVersion?: string;
      userId?: string;
    },
  ): Promise<{ device: any; installation: any; created: boolean }> {
    const license = await this.resolve(licenseReference);
    if (!['ACTIVE', 'GRACE_PERIOD'].includes(String(license.status))) {
      throw new BadRequestException(
        `License is ${license.status} — device registration not allowed`,
      );
    }
    const rawHash = String(input.deviceIdentifierHash || '').trim();
    if (!rawHash) {
      throw new BadRequestException('deviceIdentifierHash is required');
    }
    const deviceHash = sha256(rawHash);
    const fingerprintHash = input.machineFingerprintHash
      ? sha256(String(input.machineFingerprintHash))
      : null;

    const existing = await this.findDeviceByHash(license.id, deviceHash);
    let device: any;
    let created = false;
    if (existing) {
      device = await this.database.licenseDevices.update(existing.id, {
        deviceName: input.deviceName || existing.deviceName,
        platform: input.platform || existing.platform,
        os: input.os || existing.os,
        applicationVersion: input.applicationVersion || existing.applicationVersion,
        lastSeenAt: new Date().toISOString(),
        updatedBy: input.userId || null,
      } as any);
    } else {
      created = true;
      device = await this.database.licenseDevices.create({
        devicePublicId: publicId('dev'),
        licenseId: license.id,
        customerId: license.customerId,
        deviceIdentifierHash: deviceHash,
        deviceName: input.deviceName || null,
        platform: input.platform || null,
        os: input.os || null,
        applicationVersion: input.applicationVersion || null,
        status: 'active',
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        lastValidationAt: null,
        metadata: JSON.stringify({ fingerprintHashPresent: Boolean(fingerprintHash) }),
      } as any);
    }

    // Upsert installation (binds the running app instance to the license).
    const instRes = await this.database.licenseInstallations.findAll({
      page: 1,
      pageSize: 5,
      filters: [
        { field: 'licenseId', operator: 'eq', value: license.id },
        { field: 'deviceIdentifierHash', operator: 'eq', value: deviceHash },
      ],
    } as any);
    let installation = (instRes?.data || []).find((i: any) => !i.isDeleted) || null;
    if (installation) {
      installation = await this.database.licenseInstallations.update(installation.id, {
        applicationVersion: input.applicationVersion || installation.applicationVersion,
        lastSeenAt: new Date().toISOString(),
        status: installation.status === 'stale' ? 'active' : installation.status,
      } as any);
    } else {
      installation = await this.database.licenseInstallations.create({
        installationPublicId: publicId('ins'),
        licenseId: license.id,
        customerId: license.customerId,
        installationName: input.installationName || input.deviceName || null,
        applicationVersion: input.applicationVersion || null,
        platform: input.platform || null,
        osVersion: input.osVersion || input.os || null,
        deviceIdentifierHash: deviceHash,
        machineFingerprintHash: fingerprintHash,
        status: 'active',
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        activatedAt: null,
        deactivatedAt: null,
        lastValidationAt: null,
        metadata: null,
      } as any);
    }

    if (created) {
      await this.events.record(license.id, 'DEVICE_ADDED', {
        actor: actor(input.userId),
        source: 'api',
        deviceRef: device.devicePublicId,
        installationRef: installation.installationPublicId,
        metadata: { deviceName: device.deviceName },
      });
      await this.audit.log({
        userId: actor(input.userId),
        event: 'license.device_added',
        resource: 'LicenseDevice',
        action: 'create',
        details: { licenseId: license.id, devicePublicId: device.devicePublicId },
      });
    }
    return { device, installation, created };
  }

  async listDevices(licenseId: string): Promise<any[]> {
    const res = await this.database.licenseDevices.findAll({
      page: 1,
      pageSize: 500,
      filters: [{ field: 'licenseId', operator: 'eq', value: licenseId }],
    } as any);
    return (res?.data || [])
      .filter((d: any) => !d.isDeleted)
      .sort((a: any, b: any) => String(b.firstSeenAt).localeCompare(String(a.firstSeenAt)));
  }

  /**
   * Deactivate a device — frees a slot for reactivation/transfer. Idempotent:
   * deactivating an already-inactive device succeeds silently. History is kept
   * (never deleted).
   */
  async deactivateDevice(
    licenseReference: string,
    devicePublicId: string,
    opts: { reason?: string; userId?: string } = {},
  ): Promise<any> {
    const license = await this.resolve(licenseReference);
    const device = await this.findDeviceByPublicId(license.id, devicePublicId);
    if (!device) {
      throw new NotFoundException('Device not found on this license');
    }
    if (String(device.status) === 'inactive') {
      return { device, alreadyInactive: true };
    }

    await this.database.licenseDevices.update(device.id, {
      status: 'inactive',
      updatedBy: opts.userId || null,
    } as any);
    // Close the device's active activation (idempotent claim).
    const actRes = await this.database.licenseActivations.findAll({
      page: 1,
      pageSize: 10,
      filters: [
        { field: 'licenseId', operator: 'eq', value: license.id },
        { field: 'deviceId', operator: 'eq', value: device.id },
        { field: 'status', operator: 'eq', value: 'ACTIVE' },
      ],
    } as any);
    for (const act of actRes?.data || []) {
      const claimed = await this.database.licenseActivations.claimTransition(
        act.id,
        'ACTIVE',
        'DEACTIVATED',
      );
      if (claimed) {
        await this.database.licenseActivations.update(act.id, {
          deactivatedAt: new Date().toISOString(),
          reason: opts.reason || null,
          metadata: JSON.stringify({ deactivatedBy: actor(opts.userId) }),
        } as any);
      }
    }
    await this.database.licenses.decrementActiveDevices(license.id);

    await this.events.record(license.id, 'DEVICE_DEACTIVATED', {
      actor: actor(opts.userId),
      source: opts.userId ? 'api' : 'customer',
      deviceRef: device.devicePublicId,
      metadata: { reason: opts.reason || null },
    });
    await this.audit.log({
      userId: actor(opts.userId),
      event: 'license.device_deactivated',
      resource: 'LicenseDevice',
      action: 'deactivate',
      details: { licenseId: license.id, devicePublicId, reason: opts.reason || null },
    });
    return { device: await this.findDeviceByPublicId(license.id, devicePublicId) };
  }

  /**
   * Request a controlled device transfer. Pending until approved; approval
   * deactivates the old device (freeing the slot) then activates the new one.
   */
  async requestTransfer(
    licenseReference: string,
    input: {
      transferPublicId?: string;
      fromDevicePublicId: string;
      toDeviceIdentifierHash: string;
      toDeviceName?: string;
      reason?: string;
      userId?: string;
    },
  ): Promise<any> {
    const license = await this.resolve(licenseReference);
    const fromDevice = await this.findDeviceByPublicId(license.id, input.fromDevicePublicId);
    if (!fromDevice) {
      throw new NotFoundException('Source device not found on this license');
    }

    // Idempotent per transferPublicId (client-generated reference).
    if (input.transferPublicId) {
      const dupRes = await this.database.licenseTransfers.findAll({
        page: 1,
        pageSize: 5,
        filters: [{ field: 'transferPublicId', operator: 'eq', value: input.transferPublicId }],
      } as any);
      const dup = (dupRes?.data || []).find((t: any) => !t.isDeleted);
      if (dup) {
        return this.findTransfer(dup.id);
      }
    }

    const rawToHash = String(input.toDeviceIdentifierHash || '').trim();
    if (!rawToHash) {
      throw new BadRequestException('toDeviceIdentifierHash is required for a transfer');
    }
    const toHash = sha256(rawToHash);
    const transfer = await this.database.licenseTransfers.create({
      transferPublicId: input.transferPublicId || publicId('trf'),
      licenseId: license.id,
      fromDeviceId: fromDevice.id,
      toDeviceId: null,
      fromDeviceRef: fromDevice.devicePublicId,
      toDeviceRef: null,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      requestedBy: input.userId || null,
      approvedAt: null,
      approvedBy: null,
      reason: input.reason || null,
      metadata: JSON.stringify({
        toDeviceIdentifierHash: toHash,
        toDeviceName: input.toDeviceName || null,
      }),
    } as any);

    await this.events.record(license.id, 'DEVICE_TRANSFERRED', {
      actor: actor(input.userId),
      source: 'api',
      deviceRef: fromDevice.devicePublicId,
      metadata: { status: 'requested', transferId: transfer.id },
    });
    return this.findTransfer(transfer.id);
  }

  async findTransfer(id: string): Promise<any> {
    const t = await this.database.licenseTransfers.findById(id).catch(() => null);
    if (!t || t.isDeleted) {
      throw new NotFoundException('Transfer request not found');
    }
    return t;
  }

  /**
   * Approve a pending transfer — deactivate old device, register + activate the
   * new device, mark transfer completed. Never silently drops devices.
   */
  async approveTransfer(id: string, opts: { userId?: string } = {}): Promise<any> {
    const transfer = await this.findTransfer(id);
    if (String(transfer.status) !== 'pending') {
      throw new BadRequestException(`Transfer already ${transfer.status}`);
    }
    const license = await this.database.licenses.findById(transfer.licenseId).catch(() => null);
    if (!license || license.isDeleted) {
      throw new NotFoundException('License not found');
    }
    let meta: any = {};
    try {
      meta = transfer.metadata ? JSON.parse(transfer.metadata) : {};
    } catch {
      /* ignore */
    }
    const toHash = String(meta.toDeviceIdentifierHash || '');

    // Free the old device slot (track claims — only decrement when a claim won).
    let oldDevice: any = null;
    let oldActivationClaimed = false;
    if (transfer.fromDeviceId) {
      oldDevice = await this.database.licenseDevices
        .findById(transfer.fromDeviceId)
        .catch(() => null);
      if (oldDevice && String(oldDevice.status) === 'active') {
        await this.database.licenseDevices.update(oldDevice.id, {
          status: 'inactive',
          updatedBy: opts.userId || null,
        } as any);
        const actRes = await this.database.licenseActivations.findAll({
          page: 1,
          pageSize: 10,
          filters: [
            { field: 'deviceId', operator: 'eq', value: oldDevice.id },
            { field: 'status', operator: 'eq', value: 'ACTIVE' },
          ],
        } as any);
        for (const act of actRes?.data || []) {
          const claimed = await this.database.licenseActivations.claimTransition(
            act.id,
            'ACTIVE',
            'DEACTIVATED',
          );
          if (claimed) {
            oldActivationClaimed = true;
            await this.database.licenseActivations.update(act.id, {
              deactivatedAt: new Date().toISOString(),
              metadata: JSON.stringify({ transferId: transfer.id }),
            } as any);
          }
        }
        if (oldActivationClaimed) {
          await this.database.licenses.decrementActiveDevices(license.id);
        }
      }
    }

    // Register + activate the new device. If the slot cannot be claimed, ROLL
    // the transfer back: old device stays active, transfer rejected — never a
    // partial state where a slot is lost.
    let toDevice: any = null;
    let newSlotClaimed = false;
    if (toHash) {
      const registered = await this.registerDevice(license.licensePublicId, {
        deviceIdentifierHash: toHash,
        deviceName: meta.toDeviceName || null,
        userId: opts.userId,
      });
      toDevice = registered.device;
      const claimed = await this.database.licenses.incrementActiveDevices(license.id);
      if (claimed) {
        newSlotClaimed = true;
        await this.database.licenseActivations.create({
          activationPublicId: publicId('act'),
          licenseId: license.id,
          installationId: registered.installation.id,
          deviceId: toDevice.id,
          activationType: 'device_transfer',
          status: 'ACTIVE',
          activationReference: publicId('act'),
          requestedAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          deactivatedAt: null,
          lastValidationAt: null,
          reason: transfer.reason || 'Device transfer',
          metadata: JSON.stringify({ transferId: transfer.id }),
          requestedBy: transfer.requestedBy,
          approvedBy: opts.userId || null,
        } as any);
      }
    }

    if (toHash && !newSlotClaimed) {
      // Rollback — restore the old device's slot so nothing is lost.
      if (oldDevice && oldActivationClaimed) {
        await this.database.licenseDevices.update(oldDevice.id, {
          status: 'active',
          updatedBy: opts.userId || null,
        } as any);
        await this.database.licenses.incrementActiveDevices(license.id);
        const oldActs = await this.database.licenseActivations.findAll({
          page: 1,
          pageSize: 10,
          filters: [
            { field: 'deviceId', operator: 'eq', value: oldDevice.id },
            { field: 'status', operator: 'eq', value: 'DEACTIVATED' },
          ],
        } as any);
        for (const act of oldActs?.data || []) {
          const reClaimed = await this.database.licenseActivations.claimTransition(
            act.id,
            'DEACTIVATED',
            'ACTIVE',
          );
          if (reClaimed) {
            await this.database.licenseActivations.update(act.id, {
              deactivatedAt: null,
              metadata: JSON.stringify({ transferRollback: true }),
            } as any);
            break;
          }
        }
      }
      await this.database.licenseTransfers.update(transfer.id, {
        status: 'rejected',
        approvedAt: new Date().toISOString(),
        approvedBy: opts.userId || null,
        metadata: JSON.stringify({ ...meta, rejectionReason: 'ACTIVATION_LIMIT_REACHED' }),
      } as any);
      await this.events.record(license.id, 'LIMIT_REACHED', {
        actor: actor(opts.userId),
        source: 'api',
        deviceRef: transfer.fromDeviceRef,
        metadata: { transferId: transfer.id, reason: 'ACTIVATION_LIMIT_REACHED' },
      });
      throw new BadRequestException(
        'Device transfer failed — activation limit reached. Old device restored.',
      );
    }

    await this.database.licenseTransfers.update(transfer.id, {
      toDeviceId: toDevice?.id || null,
      toDeviceRef: toDevice?.devicePublicId || null,
      status: 'completed',
      approvedAt: new Date().toISOString(),
      approvedBy: opts.userId || null,
    } as any);

    await this.events.record(license.id, 'DEVICE_TRANSFERRED', {
      actor: actor(opts.userId),
      source: 'api',
      deviceRef: transfer.fromDeviceRef,
      metadata: {
        status: 'completed',
        transferId: transfer.id,
        toDeviceRef: toDevice?.devicePublicId || null,
      },
    });
    await this.audit.log({
      userId: actor(opts.userId),
      event: 'license.device_transferred',
      resource: 'LicenseDevice',
      action: 'transfer',
      details: {
        licenseId: license.id,
        transferId: transfer.id,
        fromDeviceRef: transfer.fromDeviceRef,
      },
    });
    return this.findTransfer(transfer.id);
  }

  async listTransfers(licenseId: string): Promise<any[]> {
    const res = await this.database.licenseTransfers.findAll({
      page: 1,
      pageSize: 200,
      filters: [{ field: 'licenseId', operator: 'eq', value: licenseId }],
    } as any);
    return (res?.data || [])
      .filter((t: any) => !t.isDeleted)
      .sort((a: any, b: any) => String(b.requestedAt).localeCompare(String(a.requestedAt)));
  }
}
