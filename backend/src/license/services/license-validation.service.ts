import { Injectable, Logger } from '@nestjs/common';

import { EntitlementsService } from '../../commercial/services/entitlements.service';
import { DatabaseService } from '../../database/database.service';
import { publicId, sha256 } from '../numbering';

import { LicenseEventsService } from './license-events.service';
import { LicensesService } from './licenses.service';

/**
 * CENTRALIZED LICENSE VALIDATION — validateLicense() is the single entry point
 * the installer/desktop (Phase 14) will call. Returns a controlled response
 * and NEVER exposes: DB credentials, internal ids unnecessarily, customer
 * secrets, raw machine identifiers, or internal security rules.
 */
@Injectable()
export class LicenseValidationService {
  private readonly logger = new Logger(LicenseValidationService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly entitlements: EntitlementsService,
    private readonly licenses: LicensesService,
    private readonly events: LicenseEventsService,
  ) {}

  async validateLicense(input: {
    licenseReference: string;
    installationId?: string;
    deviceIdentifierHash?: string;
    applicationVersion?: string;
    source?: string;
  }): Promise<Record<string, any>> {
    const ref = String(input.licenseReference || '').trim();
    const validationReference = publicId('val');
    const fail = (reason: string, license?: any): Record<string, any> => {
      if (license) {
        this.events
          .record(license.id, 'VALIDATION_FAILED', {
            actor: null,
            source: input.source || 'api',
            metadata: { validationReference, reason },
          })
          .catch(() => undefined);
        this.database.licenses
          .update(license.id, { lastValidatedAt: new Date().toISOString() } as any)
          .catch(() => undefined);
      }
      return { valid: false, reason, validationReference };
    };

    let license: any = null;
    try {
      if (ref.startsWith('lic_')) {
        license = await this.licenses.findByPublicId(ref).catch(() => null);
      }
      if (!license) {
        license = await this.licenses.findByNumber(ref).catch(() => null);
      }
    } catch {
      /* handled below */
    }
    if (!license) {
      return fail('LICENSE_NOT_FOUND');
    }

    // 1. License status
    if (String(license.status) === 'REVOKED') {
      return fail('LICENSE_REVOKED', license);
    }
    if (String(license.status) === 'CANCELLED') {
      return fail('LICENSE_CANCELLED', license);
    }
    if (String(license.status) === 'SUSPENDED') {
      return fail('LICENSE_SUSPENDED', license);
    }

    // 2. Expiry / grace
    const now = new Date();
    const expiresAt = String(license.expiresAt || '');
    const graceUntil = String(license.graceUntil || '');
    if (expiresAt && now.toISOString().slice(0, 10) > String(expiresAt).slice(0, 10)) {
      const inGrace =
        graceUntil && now.toISOString().slice(0, 10) <= String(graceUntil).slice(0, 10);
      if (!inGrace) {
        // Move to EXPIRED through the guarded machine (idempotent).
        if (String(license.status) === 'ACTIVE' || String(license.status) === 'GRACE_PERIOD') {
          this.licenses
            .transition(license.id, 'EXPIRED', {
              eventType: 'LICENSE_EXPIRED',
              reason: 'License expired',
              metadata: { source: 'validation' },
            })
            .catch(() => undefined);
        }
        return fail('LICENSE_EXPIRED', license);
      }
      if (String(license.status) !== 'GRACE_PERIOD') {
        this.licenses
          .transition(license.id, 'GRACE_PERIOD', {
            eventType: 'LICENSE_GRACE_PERIOD',
            reason: 'In grace period',
            metadata: { source: 'validation' },
          })
          .catch(() => undefined);
      }
    }

    // 3. Subscription eligibility — subscription remains the commercial truth.
    const subscription = await this.entitlements.getActiveSubscription(license.customerId);
    if (!subscription) {
      return fail('SUBSCRIPTION_NOT_ACTIVE', license);
    }
    if (['SUSPENDED', 'EXPIRED', 'CANCELLED'].includes(String(subscription.status))) {
      this.licenses.syncFromSubscription(license, subscription).catch(() => undefined);
      return fail(`SUBSCRIPTION_${subscription.status}`, license);
    }
    if (String(subscription.status) === 'PENDING_PAYMENT' && String(license.status) === 'PENDING') {
      return fail('SUBSCRIPTION_PENDING_PAYMENT', license);
    }

    // 4. Installation authorization (when provided)
    let installationOk = true;
    let installationRef: string | null = null;
    if (input.installationId) {
      const instRes = await this.database.licenseInstallations.findAll({
        page: 1,
        pageSize: 5,
        filters: [
          { field: 'installationPublicId', operator: 'eq', value: String(input.installationId) },
        ],
      } as any);
      const installation = (instRes?.data || []).find((i: any) => !i.isDeleted);
      if (!installation || String(installation.licenseId) !== license.id) {
        return fail('INSTALLATION_NOT_AUTHORIZED', license);
      }
      if (String(installation.status) === 'inactive') {
        return fail('INSTALLATION_DEACTIVATED', license);
      }
      installationOk = true;
      installationRef = installation.installationPublicId;
    }

    // 5. Device authorization + active activation
    let deviceRef: string | null = null;
    if (input.deviceIdentifierHash) {
      const hash = sha256(String(input.deviceIdentifierHash));
      const devRes = await this.database.licenseDevices.findAll({
        page: 1,
        pageSize: 5,
        filters: [
          { field: 'licenseId', operator: 'eq', value: license.id },
          { field: 'deviceIdentifierHash', operator: 'eq', value: hash },
        ],
      } as any);
      const device = (devRes?.data || []).find((d: any) => !d.isDeleted);
      if (!device) {
        return fail('DEVICE_NOT_REGISTERED', license);
      }
      if (String(device.status) === 'inactive') {
        return fail('DEVICE_DEACTIVATED', license);
      }
      const actRes = await this.database.licenseActivations.findAll({
        page: 1,
        pageSize: 5,
        filters: [
          { field: 'licenseId', operator: 'eq', value: license.id },
          { field: 'deviceId', operator: 'eq', value: device.id },
          { field: 'status', operator: 'eq', value: 'ACTIVE' },
        ],
      } as any);
      if ((actRes?.data || []).length === 0) {
        return fail('DEVICE_NOT_ACTIVATED', license);
      }
      deviceRef = device.devicePublicId;
    }

    void installationOk;
    void deviceRef;

    // 6. Success — controlled response
    let entitlements: Record<string, any> = {};
    let limits: Record<string, number> = {};
    try {
      entitlements = license.entitlements ? JSON.parse(license.entitlements) : {};
    } catch {
      /* ignore */
    }
    try {
      limits = license.limits ? JSON.parse(license.limits) : {};
    } catch {
      /* ignore */
    }

    await this.database.licenses.update(license.id, {
      lastValidatedAt: new Date().toISOString(),
    } as any);
    await this.events.record(license.id, 'LICENSE_VALIDATED', {
      actor: null,
      source: input.source || 'api',
      installationRef,
      deviceRef,
      metadata: {
        validationReference,
        applicationVersion: input.applicationVersion || null,
      },
    });

    return {
      valid: true,
      status: String(license.status),
      expiresAt,
      graceUntil,
      licenseReference: license.licensePublicId,
      licenseNumber: license.licenseNumber,
      entitlements: Object.keys(entitlements).filter((k) => Boolean(entitlements[k])),
      limits,
      validationReference,
    };
  }
}
