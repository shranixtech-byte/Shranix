import * as crypto from 'node:crypto';

import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { SecurityEventsService } from '../../security/security-events.service';
import { publicId, sha256 } from '../numbering';

/**
 * SIGNED LICENSE TOKENS — asymmetric cryptography (RSA-2048).
 *
 * Private signing key NEVER leaves the server and is never committed to git:
 *   - env overrides: LICENSE_TOKEN_PRIVATE_KEY / LICENSE_TOKEN_PUBLIC_KEY (PEM)
 *   - fallback: generated at first use and persisted in the KV secret store
 *     (shranix_gst_audit_settings, group 'license_keys')
 *
 * PHASE 15 hardening:
 *   - Key rotation (15.6): a key RING with a current key + retired previous
 *     verification keys, each with a key id (kid). New tokens always use the
 *     current key; verification resolves the public key by kid so tokens
 *     issued under an old key keep validating through rotation (graceful
 *     migration — rotation never invalidates legitimate tokens).
 *   - Algorithm whitelist (15.5): the verification algorithm is a fixed
 *     server policy ('rsa-sha256'). It is NEVER taken from token metadata, so
 *     algorithm-confusion attacks ('none', 'HS256', …) cannot pass.
 *   - nbf (not-before) claim enforced.
 *   - Offline tokens are bound to the requesting installation/device
 *     (15.36) — copying an offline token to another installation fails.
 *   - Failures emit security events (SIGNATURE_FAILURE / TOKEN_TAMPER /
 *     INVALID_TOKEN) for the Phase-15 dashboard.
 *
 * Token format: SHRNXT1.<base64url(payload)>.<base64url(rsa-sha256 signature)>
 * Payload is NOT trusted without signature verification.
 */
const TOKEN_GROUP = 'license_keys';
const ISSUER = 'shranix-license-server';
const AUDIENCE = 'shranix-erp';
/** Current token version. Version 1 (pre-Phase-15) tokens stay verifiable. */
const TOKEN_VERSION = 2;
const MIN_SUPPORTED_VERSION = 1;
const PREFIX = 'SHRNXT1';
/** PHASE 15.5 — explicit algorithm policy. Never derived from token metadata. */
const ALLOWED_ALGORITHMS = ['rsa-sha256'] as const;
const SIGNING_ALGORITHM = 'sha256' as const;
const MAX_PREVIOUS_KEYS = 3;

interface KeyRingEntry {
  kid: string;
  privatePem: string;
  publicPem: string;
  activatedAt: string;
}

interface KeyRing {
  current: KeyRingEntry;
  previous: KeyRingEntry[];
}

@Injectable()
export class LicenseTokensService {
  private readonly logger = new Logger(LicenseTokensService.name);
  private keyRingCache: KeyRing | null = null;

  constructor(
    private readonly database: DatabaseService,
    @Optional() private readonly security?: SecurityEventsService,
  ) {}

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

  private async generateKeyPair(): Promise<{ privateKey: string; publicKey: string }> {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { privateKey, publicKey };
  }

  /**
   * Resolve the current key ring. Precedence: env override (kid 'env') →
   * persisted ring → runtime-generated ring (persisted, never committed).
   */
  async getKeyRing(): Promise<KeyRing> {
    if (this.keyRingCache) {
      return this.keyRingCache;
    }
    const envPrivate = process.env.LICENSE_TOKEN_PRIVATE_KEY?.trim();
    const envPublic = process.env.LICENSE_TOKEN_PUBLIC_KEY?.trim();
    if (envPrivate && envPublic) {
      this.keyRingCache = {
        current: {
          kid: 'env',
          privatePem: envPrivate.replace(/\\n/g, '\n'),
          publicPem: envPublic.replace(/\\n/g, '\n'),
          activatedAt: new Date().toISOString(),
        },
        previous: [],
      };
      return this.keyRingCache;
    }
    const stored = await this.kvGet('keyRing');
    if (stored) {
      try {
        const ring = JSON.parse(stored) as KeyRing;
        if (ring?.current?.privatePem && ring?.current?.publicPem) {
          this.keyRingCache = {
            current: ring.current,
            previous: Array.isArray(ring.previous) ? ring.previous : [],
          };
          return this.keyRingCache;
        }
      } catch {
        /* fall through to regeneration */
      }
    }
    const { privateKey, publicKey } = await this.generateKeyPair();
    this.keyRingCache = {
      current: {
        kid: 'key_1',
        privatePem: privateKey,
        publicPem: publicKey,
        activatedAt: new Date().toISOString(),
      },
      previous: [],
    };
    await this.kvSet('keyRing', JSON.stringify(this.keyRingCache)).catch(() => undefined);
    return this.keyRingCache;
  }

  /** Current signing keys — public-key endpoint compatibility. */
  async getKeys(): Promise<{ privatePem: string; publicPem: string }> {
    const ring = await this.getKeyRing();
    return { privatePem: ring.current.privatePem, publicPem: ring.current.publicPem };
  }

  /** Resolve a verification key by kid — current or a retired previous key. */
  private resolvePublicKey(ring: KeyRing, kid: string): string | null {
    if (ring.current.kid === kid) {
      return ring.current.publicPem;
    }
    const prev = ring.previous.find((k) => k.kid === kid);
    return prev ? prev.publicPem : null;
  }

  /** Current kid — exposed so clients/tests can observe rotation. */
  async getCurrentKid(): Promise<string> {
    const ring = await this.getKeyRing();
    return ring.current.kid;
  }

  /**
   * PHASE 15.6 — rotate the signing key.
   * Current key is retired to the previous-verification set (capped), a new
   * key is generated and persisted, and outstanding tokens stay valid
   * (verification resolves the old kid). In-app rotation is disabled while
   * env-configured keys are in use (that deployment manages keys externally).
   */
  async rotateSigningKey(): Promise<{
    rotated: boolean;
    previousKid: string;
    currentKid: string;
    note: string;
  }> {
    const envPrivate = process.env.LICENSE_TOKEN_PRIVATE_KEY?.trim();
    if (envPrivate) {
      return {
        rotated: false,
        previousKid: 'env',
        currentKid: 'env',
        note: 'Keys are managed via environment overrides — rotate them in your deployment/secret manager.',
      };
    }
    const ring = await this.getKeyRing();
    const previousKid = ring.current.kid;
    const maxKidNum = Math.max(
      1,
      ...[ring.current.kid, ...ring.previous.map((k) => k.kid)]
        .map((k) => Number(String(k).replace(/^key_/, '')))
        .filter((n) => Number.isFinite(n) && n > 0),
    );
    const { privateKey, publicKey } = await this.generateKeyPair();
    const next: KeyRing = {
      current: {
        kid: `key_${maxKidNum + 1}`,
        privatePem: privateKey,
        publicPem: publicKey,
        activatedAt: new Date().toISOString(),
      },
      previous: [ring.current, ...ring.previous].slice(0, MAX_PREVIOUS_KEYS),
    };
    await this.kvSet('keyRing', JSON.stringify(next));
    this.keyRingCache = next;
    this.logger.warn(
      `License signing key rotated: ${previousKid} retired, ${next.current.kid} active`,
    );
    await this.security?.record({
      eventType: 'KEY_ROTATED',
      severity: 'HIGH',
      source: 'admin',
      actor: 'system',
      metadata: {
        previousKid,
        currentKid: next.current.kid,
        retiredVerificationKeys: next.previous.map((k) => k.kid),
      },
    });
    return {
      rotated: true,
      previousKid,
      currentKid: next.current.kid,
      note: 'New tokens use the new key; previously issued tokens remain verifiable during the retirement window.',
    };
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
    opts: {
      ttlDays?: number;
      userId?: string;
      purpose?: string;
      deviceIdentifierHash?: string;
    } = {},
  ): Promise<{ token: string; jti: string; expiresAt: string }> {
    const ring = await this.getKeyRing();
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
    const payload: Record<string, any> = {
      ver: TOKEN_VERSION,
      kid: ring.current.kid,
      alg: 'rsa-sha256',
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
      nbf: now,
      exp: now + ttlDays * 86_400,
      jti,
      purpose: opts.purpose || 'online',
    };
    // Offline tokens are bound to the requesting device/installation (15.36).
    if (opts.deviceIdentifierHash) {
      payload.dev = sha256(String(opts.deviceIdentifierHash));
    }
    const body = this.base64url(Buffer.from(JSON.stringify(payload), 'utf8'));
    const signature = crypto.sign(
      SIGNING_ALGORITHM,
      Buffer.from(body, 'utf8'),
      ring.current.privatePem,
    );
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
   * Verify a token cryptographically and check revocation + expiry + issuer +
   * audience + key id + not-before. Returns the signed payload. Throws on any
   * tamper/expiry/revoke. The signing algorithm is a fixed server policy — it
   * is never taken from the token (PHASE 15.5).
   */
  async verifyToken(token: string): Promise<{ valid: true; payload: any }> {
    const parts = String(token || '').split('.');
    if (parts.length !== 3 || parts[0] !== PREFIX) {
      await this.security?.record({
        eventType: 'TOKEN_TAMPER',
        severity: 'MEDIUM',
        source: 'api',
        metadata: { stage: 'format' },
      });
      throw new BadRequestException('Invalid license token format');
    }
    const ring = await this.getKeyRing();
    const body = parts[1];
    const sig = this.b64ToBuf(parts[2]);
    let payload: any;
    try {
      payload = JSON.parse(this.b64ToBuf(body).toString('utf8'));
    } catch {
      await this.security?.record({
        eventType: 'TOKEN_TAMPER',
        severity: 'MEDIUM',
        source: 'api',
        metadata: { stage: 'payload' },
      });
      throw new BadRequestException('Malformed license token payload');
    }

    // PHASE 15.5 — algorithm confusion protection: reject any declared
    // algorithm that is not in the server's whitelist.
    if (payload.alg && !ALLOWED_ALGORITHMS.includes(payload.alg)) {
      await this.security?.record({
        eventType: 'INVALID_TOKEN',
        severity: 'MEDIUM',
        source: 'api',
        metadata: { stage: 'algorithm', declared: String(payload.alg).slice(0, 32) },
      });
      throw new BadRequestException('License token algorithm not allowed');
    }

    // PHASE 15.6 — resolve the verification key by kid. Tokens issued before
    // key rotation (kid missing / older kid) verify against the matching key;
    // an unknown kid is rejected.
    const kid = payload.kid ? String(payload.kid) : ring.current.kid;
    const publicPem = this.resolvePublicKey(ring, kid);
    if (!publicPem) {
      await this.security?.record({
        eventType: 'INVALID_TOKEN',
        severity: 'HIGH',
        source: 'api',
        metadata: { stage: 'key_id', kid },
      });
      throw new BadRequestException('License token key id not recognized');
    }

    const ok = crypto.verify(SIGNING_ALGORITHM, Buffer.from(body, 'utf8'), publicPem, sig);
    if (!ok) {
      await this.security?.record({
        eventType: 'SIGNATURE_FAILURE',
        severity: 'MEDIUM',
        source: 'api',
        metadata: { kid },
      });
      throw new BadRequestException('License token signature invalid');
    }
    const ver = Number(payload.ver);
    if (!Number.isFinite(ver) || ver < MIN_SUPPORTED_VERSION || ver > TOKEN_VERSION) {
      await this.security?.record({
        eventType: 'INVALID_TOKEN',
        severity: 'MEDIUM',
        source: 'api',
        metadata: { stage: 'version', declared: String(payload.ver) },
      });
      throw new BadRequestException('Unsupported license token version');
    }
    if (payload.iss !== ISSUER || payload.aud !== AUDIENCE) {
      await this.security?.record({
        eventType: 'INVALID_TOKEN',
        severity: 'MEDIUM',
        source: 'api',
        metadata: { stage: 'issuer_audience' },
      });
      throw new BadRequestException('License token issuer/audience mismatch');
    }
    const nowMs = Date.now();
    if (payload.nbf && nowMs < Number(payload.nbf) * 1000) {
      throw new BadRequestException('License token not yet valid');
    }
    if (nowMs >= Number(payload.exp) * 1000) {
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
      await this.security?.record({
        eventType: 'INVALID_TOKEN',
        severity: 'MEDIUM',
        source: 'api',
        metadata: { stage: 'unknown_jti' },
      });
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
      await this.security?.record({
        eventType: 'INVALID_LICENSE',
        severity: 'MEDIUM',
        source: 'api',
        metadata: { stage: 'unknown_sub' },
      });
      throw new BadRequestException('License token references an unknown license');
    }
    if (['REVOKED', 'CANCELLED', 'SUSPENDED', 'EXPIRED'].includes(String(license.status))) {
      await this.security?.record({
        eventType: 'INVALID_LICENSE',
        severity: 'HIGH',
        licenseId: license.id,
        customerId: license.customerId,
        source: 'api',
        metadata: { stage: 'license_status', status: license.status },
      });
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
  async issueOfflineLicenseToken(
    license: any,
    opts: { ttlDays?: number; deviceIdentifierHash?: string } = {},
  ): Promise<string> {
    const res = await this.issueToken(license, {
      ttlDays: Math.min(Number(opts.ttlDays) || 30, 90),
      purpose: 'offline',
      deviceIdentifierHash: opts.deviceIdentifierHash,
    });
    return res.token;
  }

  /**
   * Verify an offline token (signature + expiry + revocation + installation
   * binding). When the token is bound to a device and a device hash is
   * supplied, a mismatch rejects the token — copied offline tokens fail on
   * another installation (PHASE 15.36).
   */
  async verifyOfflineLicenseToken(
    token: string,
    opts: { deviceIdentifierHash?: string } = {},
  ): Promise<{ valid: true; payload: any }> {
    const { payload } = await this.verifyToken(token);
    if (payload.dev) {
      const supplied = opts.deviceIdentifierHash ? sha256(String(opts.deviceIdentifierHash)) : null;
      if (supplied && supplied !== payload.dev) {
        await this.security?.record({
          eventType: 'DEVICE_MISMATCH',
          severity: 'HIGH',
          source: 'api',
          metadata: { stage: 'offline_token_binding' },
        });
        throw new BadRequestException('Offline token is bound to a different installation');
      }
    }
    return { valid: true, payload };
  }

  async revokeOfflineToken(token: string, reason?: string): Promise<void> {
    await this.revokeToken(token, reason || 'Offline token revoked');
  }
}
