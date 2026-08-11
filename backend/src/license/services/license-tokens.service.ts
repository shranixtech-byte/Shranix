import * as crypto from 'node:crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { publicId } from '../numbering';

/**
 * SIGNED LICENSE TOKENS — asymmetric cryptography (RSA-2048).
 *
 * Private signing key NEVER leaves the server and is never committed to git:
 *   - env overrides: LICENSE_TOKEN_PRIVATE_KEY / LICENSE_TOKEN_PUBLIC_KEY (PEM)
 *   - fallback: generated at first use and persisted in the KV secret store
 *     (shranix_gst_audit_settings, group 'license_keys') — same mechanism the
 *     existing license settings stub uses.
 *
 * Token format: SHRNXT1.<base64url(payload)>.<base64url(rsa-sha256 signature)>
 * Payload is NOT trusted without signature verification. Encoded data alone is
 * never treated as proof of authorization.
 *
 * Offline hooks (issueOfflineLicenseToken / verifyOfflineLicenseToken /
 * revokeOfflineToken) are the Phase-14 interfaces — NOT exposed as public APIs.
 * Offline tokens expire and are revocable, so offline mode can never become an
 * unlimited permanent bypass.
 */
const TOKEN_GROUP = 'license_keys';
const ISSUER = 'shranix-license-server';
const AUDIENCE = 'shranix-erp';
const TOKEN_VERSION = 1;
const PREFIX = 'SHRNXT1';

@Injectable()
export class LicenseTokensService {
  private readonly logger = new Logger(LicenseTokensService.name);
  private keyCache: { privatePem: string; publicPem: string } | null = null;

  constructor(private readonly database: DatabaseService) {}

  // ── Key management ─────────────────────────────────────
  private async kvGet(key: string): Promise<string> {
    const rows = await this.database.gstAuditSettings.findAll({
      filters: [
        { field: 'settingGroup', operator: 'eq', value: TOKEN_GROUP },
        { field: 'settingKey', operator: 'eq', value: key },
      ],
      pageSize: 5,
    } as any);
    const row = (rows?.data || [])[0] as any;
    return row ? String(row.settingValue || '') : '';
  }

  private async kvSet(key: string, value: string): Promise<void> {
    const rows = await this.database.gstAuditSettings.findAll({
      filters: [
        { field: 'settingGroup', operator: 'eq', value: TOKEN_GROUP },
        { field: 'settingKey', operator: 'eq', value: key },
      ],
      pageSize: 5,
    } as any);
    const row = (rows?.data || [])[0] as any;
    if (row) {
      await this.database.gstAuditSettings.update(row.id, {
        settingValue: value,
        dataType: 'text',
      } as any);
    } else {
      await this.database.gstAuditSettings.create({
        settingGroup: TOKEN_GROUP,
        settingKey: key,
        settingValue: value,
        dataType: 'text',
      } as any);
    }
  }

  async getKeys(): Promise<{ privatePem: string; publicPem: string }> {
    if (this.keyCache) {
      return this.keyCache;
    }
    // 1. env override (PEM)
    const envPrivate = process.env.LICENSE_TOKEN_PRIVATE_KEY?.trim();
    const envPublic = process.env.LICENSE_TOKEN_PUBLIC_KEY?.trim();
    if (envPrivate && envPublic) {
      this.keyCache = {
        privatePem: envPrivate.replace(/\\n/g, '\n'),
        publicPem: envPublic.replace(/\\n/g, '\n'),
      };
      return this.keyCache;
    }
    // 2. persisted KV
    const storedPrivate = await this.kvGet('privateKeyPem');
    const storedPublic = await this.kvGet('publicKeyPem');
    if (storedPrivate && storedPublic) {
      this.keyCache = { privatePem: storedPrivate, publicPem: storedPublic };
      return this.keyCache;
    }
    // 3. generate + persist (runtime-generated, never committed to git)
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    this.keyCache = { privatePem: privateKey, publicPem: publicKey };
    await this.kvSet('privateKeyPem', privateKey).catch(() => undefined);
    await this.kvSet('publicKeyPem', publicKey).catch(() => undefined);
    return this.keyCache;
  }

  // ── Token issue / verify ───────────────────────────────
  private base64url(buf: Buffer): string {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private b64ToBuf(b64: string): Buffer {
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    return Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
  }

  async issueToken(
    license: any,
    opts: { ttlDays?: number; userId?: string; purpose?: string } = {},
  ): Promise<{ token: string; jti: string; expiresAt: string }> {
    const keys = await this.getKeys();
    // Accept both raw rows (JSON strings) and enriched views (already parsed)
    let features: Record<string, any> = {};
    let limits: Record<string, number> = {};
    try {
      features =
        typeof license.entitlements === 'string'
          ? license.entitlements
            ? JSON.parse(license.entitlements)
            : {}
          : license.entitlements || {};
    } catch {
      /* ignore */
    }
    try {
      limits =
        typeof license.limits === 'string'
          ? license.limits
            ? JSON.parse(license.limits)
            : {}
          : license.limits || {};
    } catch {
      /* ignore */
    }
    const ttlDays = Math.max(1, Number(opts.ttlDays) || 30);
    const now = Math.floor(Date.now() / 1000);
    const jti = publicId('tok');
    const payload = {
      ver: TOKEN_VERSION,
      iss: ISSUER,
      aud: AUDIENCE,
      sub: license.licensePublicId,
      cus: license.customerId,
      lic: license.licenseNumber,
      plan: license.planId,
      typ: license.licenseType,
      features: Object.keys(features).filter((k) => Boolean(features[k])),
      limits: limits as Record<string, number>,
      iat: now,
      exp: now + ttlDays * 86_400,
      jti,
      purpose: opts.purpose || 'online',
    };
    const body = this.base64url(Buffer.from(JSON.stringify(payload), 'utf8'));
    const signature = crypto.sign('sha256', Buffer.from(body, 'utf8'), keys.privatePem);
    const token = `${PREFIX}.${body}.${this.base64url(signature)}`;

    await this.database.licenseTokens.create({
      licenseId: license.id,
      tokenVersion: TOKEN_VERSION,
      tokenJti: jti,
      token,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date((now + ttlDays * 86_400) * 1000).toISOString(),
      status: 'active',
      revokedAt: null,
      revokedReason: null,
    } as any);
    return { token, jti, expiresAt: new Date((now + ttlDays * 86_400) * 1000).toISOString() };
  }

  /**
   * Verify a token cryptographically and check revocation + expiry + issuer /
   * audience. Returns the signed payload. Throws on any tamper/expiry/revoke.
   */
  async verifyToken(token: string): Promise<{ valid: true; payload: any }> {
    const parts = String(token || '').split('.');
    if (parts.length !== 3 || parts[0] !== PREFIX) {
      throw new BadRequestException('Invalid license token format');
    }
    const keys = await this.getKeys();
    const body = parts[1];
    const sig = this.b64ToBuf(parts[2]);
    let payload: any;
    try {
      payload = JSON.parse(this.b64ToBuf(body).toString('utf8'));
    } catch {
      throw new BadRequestException('Malformed license token payload');
    }
    const ok = crypto.verify('sha256', Buffer.from(body, 'utf8'), keys.publicPem, sig);
    if (!ok) {
      throw new BadRequestException('License token signature invalid');
    }
    if (Number(payload.ver) !== TOKEN_VERSION) {
      throw new BadRequestException('Unsupported license token version');
    }
    if (payload.iss !== ISSUER || payload.aud !== AUDIENCE) {
      throw new BadRequestException('License token issuer/audience mismatch');
    }
    if (Date.now() >= Number(payload.exp) * 1000) {
      throw new BadRequestException('License token expired');
    }
    const tokenRow = await this.database.licenseTokens
      .findAll({
        page: 1,
        pageSize: 5,
        filters: [{ field: 'tokenJti', operator: 'eq', value: payload.jti }],
      } as any)
      .then((r: any) => (r?.data || []).find((t: any) => !t.isDeleted))
      .catch(() => null);
    if (!tokenRow) {
      throw new BadRequestException('License token not found');
    }
    if (String(tokenRow.status) === 'revoked') {
      throw new BadRequestException('License token revoked');
    }
    if (String(tokenRow.status) === 'expired') {
      throw new BadRequestException('License token expired');
    }
    // Online license-status check — a revoked/suspended/expired license must
    // never keep validating through previously-issued tokens.
    const license = await this.database.licenses
      .findAll({
        page: 1,
        pageSize: 5,
        filters: [{ field: 'licensePublicId', operator: 'eq', value: payload.sub }],
      } as any)
      .then((r: any) => (r?.data || []).find((l: any) => !l.isDeleted))
      .catch(() => null);
    if (!license) {
      throw new BadRequestException('License token references an unknown license');
    }
    if (['REVOKED', 'CANCELLED', 'SUSPENDED', 'EXPIRED'].includes(String(license.status))) {
      throw new BadRequestException(`License token invalid — license is ${license.status}`);
    }
    return { valid: true, payload };
  }

  /** Revoke every outstanding (active) token for a license. */
  async revokeAllForLicense(licenseId: string, reason?: string): Promise<void> {
    const rows = await this.database.licenseTokens
      .findAll({
        page: 1,
        pageSize: 1000,
        filters: [{ field: 'licenseId', operator: 'eq', value: licenseId }],
      } as any)
      .catch(() => ({ data: [] }));
    for (const row of rows?.data || []) {
      if (String(row.status) === 'active') {
        await this.database.licenseTokens
          .update(row.id, {
            status: 'revoked',
            revokedAt: new Date().toISOString(),
            revokedReason: reason || 'License state change',
          } as any)
          .catch(() => undefined);
      }
    }
  }

  async revokeToken(tokenOrJti: string, reason?: string): Promise<void> {
    const rows = await this.database.licenseTokens.findAll({
      page: 1,
      pageSize: 5,
      filters: [
        {
          field: tokenOrJti.startsWith('tok_') ? 'tokenJti' : 'token',
          operator: 'eq',
          value: tokenOrJti,
        },
      ],
    } as any);
    const row = (rows?.data || []).find((t: any) => !t.isDeleted);
    if (row && String(row.status) !== 'revoked') {
      await this.database.licenseTokens.update(row.id, {
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        revokedReason: reason || 'Manual revocation',
      } as any);
    }
  }

  // ── Phase-14 offline hooks (NOT public APIs yet) ───────
  /** Offline token with a bounded lifetime — never unlimited. */
  async issueOfflineLicenseToken(license: any, opts: { ttlDays?: number } = {}): Promise<string> {
    const res = await this.issueToken(license, {
      ttlDays: Math.min(Number(opts.ttlDays) || 30, 90),
      purpose: 'offline',
    });
    return res.token;
  }

  /** Verify an offline token (signature + expiry + revocation). */
  async verifyOfflineLicenseToken(token: string): Promise<{ valid: true; payload: any }> {
    return this.verifyToken(token);
  }

  async revokeOfflineToken(token: string, reason?: string): Promise<void> {
    await this.revokeToken(token, reason || 'Offline token revoked');
  }
}
