import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { sha256 } from '../license/numbering';
import { LicenseActivationsService } from '../license/services/license-activations.service';
import { LicenseDevicesService } from '../license/services/license-devices.service';
import { LicenseTokensService } from '../license/services/license-tokens.service';
import { LicenseValidationService } from '../license/services/license-validation.service';
import { LicensesService } from '../license/services/licenses.service';
import { PortalAuthService } from '../portal/services/portal-auth.service';

import { ActivationConfigService } from './activation-config.service';

/**
 * Phase 14 — Online Activation Engine.
 *
 * The installer/desktop client talks ONLY to these endpoints. All heavy lifting
 * (device registration, activation slots, validation, signed tokens) is
 * delegated to the Phase-13 license engine — nothing is duplicated here.
 *
 * Security invariants:
 *  - Customer identity ALWAYS comes from portal credentials verified
 *    server-side (never from the client payload).
 *  - License ownership is checked against the authenticated customer — a
 *    cross-customer license returns 404 (no existence leak).
 *  - Frontend values (customer_id, license_id, max_devices, status, expiry)
 *    are never trusted.
 *  - Activation idempotency + device-slot atomicity come from Phase 13.
 */
@Injectable()
export class ActivationService {
  private readonly logger = new Logger(ActivationService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly config: ActivationConfigService,
    private readonly portalAuth: PortalAuthService,
    private readonly licenses: LicensesService,
    private readonly activations: LicenseActivationsService,
    private readonly validation: LicenseValidationService,
    private readonly tokens: LicenseTokensService,
    private readonly devices: LicenseDevicesService,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────

  private async resolveLicense(reference: string): Promise<any> {
    const ref = String(reference || '').trim();
    if (!ref) {
      throw new BadRequestException(
        { reason: 'LICENSE_REFERENCE_REQUIRED' },
        'License reference is required',
      );
    }
    let license: any = null;
    if (ref.startsWith('lic_')) {
      license = await this.licenses.findByPublicId(ref).catch(() => null);
    }
    if (!license) {
      license = await this.licenses.findByNumber(ref).catch(() => null);
    }
    if (!license) {
      throw new NotFoundException({ reason: 'LICENSE_NOT_FOUND' }, 'License not found');
    }
    return license;
  }

  private parseJson(value: unknown): Record<string, any> {
    if (typeof value === 'string') {
      try {
        return value ? JSON.parse(value) : {};
      } catch {
        return {};
      }
    }
    return (value as Record<string, any>) || {};
  }

  private async planName(planId?: string): Promise<string | null> {
    if (!planId) {
      return null;
    }
    try {
      const plan = await this.database.plans.findById(planId);
      return (plan as any)?.name || (plan as any)?.planName || null;
    } catch {
      return null;
    }
  }

  private async buildActivationState(license: any, token: string, tokenExpiresAt: string) {
    const features = this.parseJson(license.entitlements);
    return {
      valid: true,
      licenseNumber: license.licenseNumber,
      licenseReference: license.licensePublicId,
      planName: await this.planName(license.planId),
      status: license.status,
      expiresAt: license.expiresAt,
      graceUntil: license.graceUntil,
      allowedDevices: Number(license.maxDevices) || 0,
      usedDevices: Number(license.activeDevices) || 0,
      entitlements: Object.keys(features).filter((k) => Boolean(features[k])),
      limits: this.parseJson(license.limits),
      token,
      tokenExpiresAt,
    };
  }

  private async authenticate(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const session = await this.portalAuth.login(email, password, ipAddress, userAgent);
    if (!session?.user?.customerId) {
      throw new ForbiddenException(
        { reason: 'ACCOUNT_NOT_LINKED' },
        'Account is not linked to a customer',
      );
    }
    return session;
  }

  private assertOwnership(license: any, customerId: string) {
    // 404 — never reveal that another customer's license exists.
    if (String(license.customerId) !== String(customerId)) {
      throw new NotFoundException({ reason: 'LICENSE_NOT_FOUND' }, 'License not found');
    }
  }

  // ── Online activation (primary flow) ───────────────────────────────────

  async activate(input: {
    email: string;
    password: string;
    licenseReference: string;
    activationReference: string;
    deviceIdentifierHash: string;
    deviceName?: string;
    platform?: string;
    os?: string;
    osVersion?: string;
    applicationVersion?: string;
    machineFingerprintHash?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Record<string, any>> {
    const session = await this.authenticate(
      input.email,
      input.password,
      input.ipAddress,
      input.userAgent,
    );
    const license = await this.resolveLicense(input.licenseReference);
    this.assertOwnership(license, session.user.customerId);

    try {
      const activation = await this.activations.requestActivation({
        licenseReference: license.licensePublicId,
        activationReference: input.activationReference,
        deviceIdentifierHash: input.deviceIdentifierHash,
        deviceName: input.deviceName,
        platform: input.platform,
        os: input.os,
        osVersion: input.osVersion,
        applicationVersion: input.applicationVersion,
        machineFingerprintHash: input.machineFingerprintHash,
        activationType: 'online',
        source: 'desktop-installer',
        userId: session.user.id,
      });

      // Phase 13 reports a full device limit by returning a REJECTED
      // activation (history preserved) — surface it as a controlled error.
      if (String(activation?.status) === 'REJECTED') {
        throw new BadRequestException(
          { reason: 'DEVICE_LIMIT_REACHED' },
          'Device activation limit reached',
        );
      }

      // Fresh license (activeDevices now reflects the claim)
      const fresh = await this.licenses
        .findByPublicId(license.licensePublicId)
        .catch(() => license);
      const issued = await this.tokens.issueToken(fresh, {
        ttlDays: 30,
        purpose: 'online-activation',
        userId: session.user.id,
      });

      const state = await this.buildActivationState(fresh, issued.token, issued.expiresAt);
      return { ...state, activationReference: activation.activationReference };
    } catch (err: any) {
      const reason = String(err?.message || '');
      // Fallback mapping — the REJECTED-status branch above is the primary
      // path; this only catches thrown limit errors from Phase 13.
      if (/ACTIVATION_LIMIT_REACHED|device limit|max_devices/i.test(reason)) {
        throw new BadRequestException(
          { reason: 'DEVICE_LIMIT_REACHED' },
          'Device activation limit reached',
        );
      }
      if (/not allowed|GRACE|status/i.test(reason)) {
        throw new BadRequestException(
          { reason: 'LICENSE_NOT_ACTIVATABLE' },
          'License cannot be activated in its current state',
        );
      }
      throw err;
    }
  }

  // ── Periodic online revalidation ───────────────────────────────────────

  async revalidate(input: {
    licenseReference: string;
    deviceIdentifierHash?: string;
    applicationVersion?: string;
    source?: string;
  }): Promise<Record<string, any>> {
    const result = await this.validation.validateLicense({
      licenseReference: input.licenseReference,
      deviceIdentifierHash: input.deviceIdentifierHash,
      applicationVersion: input.applicationVersion,
      source: input.source || 'desktop',
    });
    if (!result?.valid) {
      return { valid: false, reason: result.reason || 'VALIDATION_FAILED' };
    }

    // Best-effort freshness update — touch ONLY the requesting device (the
    // stored identifier is sha-256 of what the client sent). No auth boundary
    // needed: validation already confirmed the device belongs to the license.
    const rawHash = String(input.deviceIdentifierHash || '').trim();
    if (rawHash) {
      try {
        const license = await this.resolveLicense(input.licenseReference);
        const list = await this.devices.listDevices(license.id);
        const expected = sha256(rawHash);
        const now = new Date().toISOString();
        for (const dev of list || []) {
          if (dev.status === 'active' && String(dev.deviceIdentifierHash) === expected) {
            await this.database.licenseDevices
              .update(dev.id, { lastValidationAt: now, lastSeenAt: now } as any)
              .catch(() => undefined);
          }
        }
      } catch {
        /* freshness is best-effort */
      }
    }

    const cfg = await this.config.getConfig();
    const revalidateHours = Number(cfg.revalidateHours) || 12;
    return {
      valid: true,
      status: result.status,
      expiresAt: result.expiresAt,
      graceUntil: result.graceUntil,
      entitlements: result.entitlements,
      limits: result.limits,
      licenseReference: result.licenseReference,
      revalidateAfterHours: revalidateHours,
    };
  }

  // ── Trial (only when Phase 12 trial exists for the customer) ───────────

  async continueTrial(input: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Record<string, any>> {
    const cfg = await this.config.getConfig();
    if (!cfg.trialEnabled) {
      throw new BadRequestException(
        { reason: 'TRIAL_UNAVAILABLE' },
        'Trial activation is not available',
      );
    }
    const session = await this.authenticate(
      input.email,
      input.password,
      input.ipAddress,
      input.userAgent,
    );
    const customerId = session.user.customerId;

    const subsRes = await this.database.subscriptions
      .findAll({
        page: 1,
        pageSize: 10,
        filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
      } as any)
      .catch(() => ({ data: [] }));
    const subs = (subsRes?.data || []).filter((s: any) => !s.isDeleted);
    // Trial subscriptions carry status TRIAL — no other state qualifies.
    const trialSub = subs.find((s: any) => String(s.status) === 'TRIAL');
    if (!trialSub) {
      throw new BadRequestException(
        { reason: 'NO_ACTIVE_TRIAL' },
        'No active trial subscription found for this account',
      );
    }

    const license = await this.database.licenses
      .findAll({
        page: 1,
        pageSize: 5,
        filters: [{ field: 'subscriptionId', operator: 'eq', value: trialSub.id }],
      } as any)
      .then((r: any) => (r?.data || []).find((l: any) => !l.isDeleted))
      .catch(() => null);
    if (!license) {
      throw new BadRequestException(
        { reason: 'NO_TRIAL_LICENSE' },
        'No license exists for the trial subscription',
      );
    }
    const fresh = await this.licenses.findByPublicId(license.licensePublicId).catch(() => license);
    const issued = await this.tokens.issueToken(fresh, {
      ttlDays: Math.max(1, Number(cfg.trialTtlDays) || 14),
      purpose: 'trial',
      userId: session.user.id,
    });
    return this.buildActivationState(fresh, issued.token, issued.expiresAt);
  }

  // ── Offline recovery (exceptional, bounded) ────────────────────────────

  async offlineRequest(input: {
    email: string;
    password: string;
    licenseReference: string;
    deviceIdentifierHash?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Record<string, any>> {
    const session = await this.authenticate(
      input.email,
      input.password,
      input.ipAddress,
      input.userAgent,
    );
    const license = await this.resolveLicense(input.licenseReference);
    this.assertOwnership(license, session.user.customerId);
    if (!['ACTIVE', 'GRACE_PERIOD'].includes(String(license.status))) {
      throw new BadRequestException(
        { reason: 'LICENSE_NOT_ACTIVATABLE' },
        'License cannot be used offline in its current state',
      );
    }

    const cfg = await this.config.getConfig();
    const ttlDays = Math.max(1, Number(cfg.offlineTtlDays) || 7);
    const token = await this.tokens.issueOfflineLicenseToken(license, { ttlDays });
    return {
      valid: true,
      offlineToken: token,
      expiresInDays: ttlDays,
      expiresAt: new Date(Date.now() + ttlDays * 86_400_000).toISOString(),
      note: 'Offline mode is a limited recovery path — online validation is required after expiry.',
    };
  }

  async offlineVerify(token: string): Promise<Record<string, any>> {
    if (!token) {
      return { valid: false, reason: 'TOKEN_REQUIRED' };
    }
    try {
      const { payload } = await this.tokens.verifyOfflineLicenseToken(String(token));
      return {
        valid: true,
        licenseReference: payload.licPublicId || payload.sub,
        licenseNumber: payload.lic,
        planId: payload.plan,
        status: payload.status || 'ACTIVE',
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      };
    } catch (err: any) {
      return { valid: false, reason: String(err?.message || 'OFFLINE_TOKEN_INVALID') };
    }
  }

  // ── Public key (client-side token signature verification) ──────────────

  async getPublicKey(): Promise<{ publicKeyPem: string }> {
    const keys = await this.tokens.getKeys();
    return { publicKeyPem: keys.publicPem };
  }

  // ── Update metadata ─────────────────────────────────────────────────────

  async getUpdateInfo(currentVersion?: string): Promise<Record<string, any>> {
    const cfg = await this.config.getConfig();
    const latest = String(cfg.latestVersion || '').trim();
    const current = String(currentVersion || '').trim();
    const updateAvailable = Boolean(latest) && (!current || latest !== current);
    return {
      ok: true,
      channel: cfg.updateChannel || 'stable',
      currentVersion: current || null,
      latestVersion: latest || null,
      minVersion: cfg.minVersion || null,
      updateAvailable,
      updateUrl: cfg.updateUrl || '',
      signatureRequired: cfg.signatureRequired !== false,
    };
  }

  async ping(): Promise<Record<string, any>> {
    return {
      ok: true,
      service: 'shranix-activation',
      api: 'v1',
      serverTime: new Date().toISOString(),
    };
  }
}
