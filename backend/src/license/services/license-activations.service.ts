import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';
import { actor, publicId } from '../numbering';

import { LicenseDevicesService } from './license-devices.service';
import { LicenseEventsService } from './license-events.service';
import { LicensesService } from './licenses.service';

/**
 * ACTIVATION SERVICE — the enforcement point for max_devices.
 *
 * Flow for an online activation request:
 *   1. Idempotency check on activationReference (no duplicate activations).
 *   2. Device/installation registered via LicenseDevicesService.
 *   3. Activation row created PENDING → ACTIVATION_REQUESTED event.
 *   4. Atomic approval: claimTransition(PENDING → ACTIVE) wins the race, then
 *      licenses.incrementActiveDevices() — the SQL guard `active_devices <
 *      max_devices` makes it impossible for concurrent requests to exceed the
 *      limit. If the slot claim fails → REJECTED + LIMIT_REACHED.
 *
 * Admin-approved activations stay PENDING until an authorized admin approves.
 */
@Injectable()
export class LicenseActivationsService {
  private readonly logger = new Logger(LicenseActivationsService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly licenses: LicensesService,
    private readonly devices: LicenseDevicesService,
    private readonly events: LicenseEventsService,
  ) {}

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

  /**
   * Idempotent activation request. Repeated calls with the same
   * activationReference return the existing record — duplicate activation
   * requests never create duplicate activations.
   */
  async requestActivation(input: {
    licenseReference: string;
    activationReference: string;
    deviceIdentifierHash: string;
    deviceName?: string;
    platform?: string;
    os?: string;
    osVersion?: string;
    applicationVersion?: string;
    machineFingerprintHash?: string;
    activationType?: string;
    userId?: string;
    source?: string;
  }): Promise<any> {
    const license = await this.resolve(input.licenseReference);
    if (!['ACTIVE', 'GRACE_PERIOD'].includes(String(license.status))) {
      throw new BadRequestException(`License is ${license.status} — activation not allowed`);
    }
    const reference = String(input.activationReference || '').trim();
    if (!reference) {
      throw new BadRequestException('activationReference is required for idempotent activation');
    }
    const rawHash = String(input.deviceIdentifierHash || '').trim();
    if (!rawHash) {
      throw new BadRequestException('deviceIdentifierHash is required');
    }

    // Idempotency — return the existing record for the same reference.
    const dupRes = await this.database.licenseActivations.findAll({
      page: 1,
      pageSize: 5,
      filters: [{ field: 'activationReference', operator: 'eq', value: reference }],
    } as any);
    const dup = (dupRes?.data || []).find((a: any) => !a.isDeleted);
    if (dup) {
      return this.findById(dup.id);
    }

    const registered = await this.devices.registerDevice(license.licensePublicId, {
      deviceIdentifierHash: rawHash,
      deviceName: input.deviceName,
      platform: input.platform,
      os: input.os,
      osVersion: input.osVersion,
      applicationVersion: input.applicationVersion,
      machineFingerprintHash: input.machineFingerprintHash,
      userId: input.userId,
    });

    const activationType = String(input.activationType || 'online').toLowerCase();
    const activation = await this.database.licenseActivations.create({
      activationPublicId: publicId('act'),
      licenseId: license.id,
      installationId: registered.installation.id,
      deviceId: registered.device.id,
      activationType,
      status: 'PENDING',
      activationReference: reference,
      requestedAt: new Date().toISOString(),
      approvedAt: null,
      deactivatedAt: null,
      lastValidationAt: null,
      reason: null,
      metadata: JSON.stringify({ deviceName: registered.device.deviceName || null }),
      requestedBy: input.userId || null,
      approvedBy: null,
    } as any);

    await this.events.record(license.id, 'ACTIVATION_REQUESTED', {
      actor: actor(input.userId),
      source: input.source || 'api',
      installationRef: registered.installation.installationPublicId,
      deviceRef: registered.device.devicePublicId,
      metadata: { activationType, activationId: activation.id },
    });
    await this.audit.log({
      userId: actor(input.userId),
      event: 'license.activation_requested',
      resource: 'LicenseActivation',
      action: 'request',
      details: { licenseId: license.id, activationId: activation.id, activationType },
    });

    if (activationType === 'online' || activationType === 'recovery') {
      return this.approve(activation.id, { userId: input.userId, source: input.source || 'api' });
    }
    // admin_approved / offline stay PENDING until an authorized approver acts.
    return this.findById(activation.id);
  }

  /**
   * Approve a PENDING activation. Only the winner of the atomic claim may
   * proceed; the device-slot increment is guarded in SQL so concurrent
   * approvals can never exceed max_devices. Returns ACTIVATION_LIMIT_REACHED
   * as a rejected record when the limit is hit (never silently deactivates).
   */
  async approve(id: string, opts: { userId?: string; source?: string } = {}): Promise<any> {
    const activation = await this.database.licenseActivations.findById(id).catch(() => null);
    if (!activation || activation.isDeleted) {
      throw new NotFoundException('Activation not found');
    }
    if (String(activation.status) === 'ACTIVE') {
      return this.findById(id);
    }
    if (String(activation.status) !== 'PENDING') {
      throw new BadRequestException(`Activation already ${activation.status}`);
    }

    const claimed = await this.database.licenseActivations.claimTransition(id, 'PENDING', 'ACTIVE');
    if (!claimed) {
      throw new BadRequestException('Activation changed concurrently — retry');
    }

    const slotClaimed = await this.database.licenses.incrementActiveDevices(activation.licenseId);
    if (!slotClaimed) {
      // Limit reached — roll the activation to REJECTED (claim ACTIVE → REJECTED).
      await this.database.licenseActivations.claimTransition(id, 'ACTIVE', 'REJECTED');
      let deviceName: string | null = null;
      try {
        const meta = activation.metadata ? JSON.parse(activation.metadata) : {};
        deviceName = String(meta?.deviceName ?? '') || null;
      } catch {
        /* ignore */
      }
      await this.database.licenseActivations.update(id, {
        reason: 'ACTIVATION_LIMIT_REACHED',
        metadata: JSON.stringify({ deviceName }),
      } as any);
      await this.events.record(activation.licenseId, 'LIMIT_REACHED', {
        actor: actor(opts.userId),
        source: opts.source || 'api',
        deviceRef: activation.deviceId ? await this.devicePublicId(activation.deviceId) : null,
        metadata: { activationId: id, licenseId: activation.licenseId },
      });
      await this.events.record(activation.licenseId, 'ACTIVATION_REJECTED', {
        actor: actor(opts.userId),
        source: opts.source || 'api',
        deviceRef: activation.deviceId ? await this.devicePublicId(activation.deviceId) : null,
        metadata: { activationId: id, reason: 'ACTIVATION_LIMIT_REACHED' },
      });
      await this.audit.log({
        userId: actor(opts.userId),
        event: 'license.activation_rejected',
        resource: 'LicenseActivation',
        action: 'reject',
        details: {
          licenseId: activation.licenseId,
          activationId: id,
          reason: 'ACTIVATION_LIMIT_REACHED',
        },
      });
      return this.findById(id);
    }

    await this.database.licenseActivations.update(id, {
      approvedAt: new Date().toISOString(),
      lastValidationAt: new Date().toISOString(),
      approvedBy: opts.userId || null,
    } as any);
    await this.events.record(activation.licenseId, 'ACTIVATION_APPROVED', {
      actor: actor(opts.userId),
      source: opts.source || 'api',
      deviceRef: activation.deviceId ? await this.devicePublicId(activation.deviceId) : null,
      metadata: { activationId: id },
    });
    await this.audit.log({
      userId: actor(opts.userId),
      event: 'license.activation_approved',
      resource: 'LicenseActivation',
      action: 'approve',
      details: { licenseId: activation.licenseId, activationId: id },
    });
    return this.findById(id);
  }

  async reject(id: string, body: { reason?: string; userId?: string }): Promise<any> {
    const activation = await this.database.licenseActivations.findById(id).catch(() => null);
    if (!activation || activation.isDeleted) {
      throw new NotFoundException('Activation not found');
    }
    if (String(activation.status) !== 'PENDING') {
      throw new BadRequestException(`Activation already ${activation.status}`);
    }
    const claimed = await this.database.licenseActivations.claimTransition(
      id,
      'PENDING',
      'REJECTED',
    );
    if (!claimed) {
      throw new BadRequestException('Activation changed concurrently — retry');
    }
    await this.database.licenseActivations.update(id, {
      reason: body.reason || 'Rejected by approver',
      metadata: JSON.stringify({ rejectedBy: actor(body.userId) }),
    } as any);
    await this.events.record(activation.licenseId, 'ACTIVATION_REJECTED', {
      actor: actor(body.userId),
      source: 'api',
      deviceRef: activation.deviceId ? await this.devicePublicId(activation.deviceId) : null,
      metadata: { activationId: id, reason: body.reason || null },
    });
    await this.audit.log({
      userId: actor(body.userId),
      event: 'license.activation_rejected',
      resource: 'LicenseActivation',
      action: 'reject',
      details: { licenseId: activation.licenseId, activationId: id, reason: body.reason || null },
    });
    return this.findById(id);
  }

  async list(licenseId: string): Promise<any[]> {
    const res = await this.database.licenseActivations.findAll({
      page: 1,
      pageSize: 500,
      filters: [{ field: 'licenseId', operator: 'eq', value: licenseId }],
    } as any);
    return (res?.data || [])
      .filter((a: any) => !a.isDeleted)
      .sort((a: any, b: any) => String(b.requestedAt).localeCompare(String(a.requestedAt)));
  }

  async findById(id: string): Promise<any> {
    const activation = await this.database.licenseActivations.findById(id).catch(() => null);
    if (!activation || activation.isDeleted) {
      throw new NotFoundException('Activation not found');
    }
    const device = activation.deviceId
      ? await this.database.licenseDevices.findById(activation.deviceId).catch(() => null)
      : null;
    let parsedMeta: Record<string, any> = {};
    try {
      parsedMeta = activation.metadata ? JSON.parse(activation.metadata) : {};
    } catch {
      /* ignore */
    }
    return {
      ...activation,
      metadata: parsedMeta,
      device: device
        ? {
            devicePublicId: device.devicePublicId,
            deviceName: device.deviceName,
            platform: device.platform,
          }
        : null,
    };
  }

  private async devicePublicId(deviceId: string): Promise<string | null> {
    const d = await this.database.licenseDevices.findById(deviceId).catch(() => null);
    return d?.devicePublicId || null;
  }
}
