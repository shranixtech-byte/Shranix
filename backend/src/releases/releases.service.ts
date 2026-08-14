import * as crypto from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { publicId } from '../license/numbering';
import { SecurityEventsService } from '../security/security-events.service';

/**
 * PHASE 16 — CENTRAL LICENSE SERVER: software release/version registry.
 *
 * The persistent registry replaces the Phase-14 KV-config stub as the source
 * of truth for `GET /activation/update`. The client NEVER provides download
 * URLs or versions — the server resolves the appropriate release for the
 * requested platform/architecture/channel and returns package metadata the
 * client must verify (sha-256 checksum + signature) before executing.
 *
 * Release status: DRAFT | TESTING | STAGED | PUBLISHED | DEPRECATED | REVOKED
 * Channels:      STABLE | BETA | INTERNAL | CUSTOMER_SPECIFIC
 * Update verdicts: UPDATE_AVAILABLE | UPDATE_RECOMMENDED | UPDATE_REQUIRED |
 *                  VERSION_SUPPORTED | VERSION_BLOCKED
 */
export const RELEASE_STATUSES = [
  'DRAFT',
  'TESTING',
  'STAGED',
  'PUBLISHED',
  'DEPRECATED',
  'REVOKED',
] as const;
export const RELEASE_CHANNELS = ['STABLE', 'BETA', 'INTERNAL', 'CUSTOMER_SPECIFIC'] as const;
const DOWNLOAD_GROUP = 'release_download';
const DOWNLOAD_TTL_MINUTES = 15;

export const UPDATE_VERDICTS = {
  UPDATE_AVAILABLE: 'UPDATE_AVAILABLE',
  UPDATE_RECOMMENDED: 'UPDATE_RECOMMENDED',
  UPDATE_REQUIRED: 'UPDATE_REQUIRED',
  VERSION_SUPPORTED: 'VERSION_SUPPORTED',
  VERSION_BLOCKED: 'VERSION_BLOCKED',
} as const;

/** Numeric-dot version compare — '1.10.0' > '1.9.0'. Optional 'v' prefix. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    String(v)
      .replace(/^v/i, '')
      .split(/[.\-+]/)
      .map((p) => {
        const n = Number.parseInt(p, 10);
        return Number.isFinite(n) ? n : 0;
      });
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) {
      return x > y ? 1 : -1;
    }
  }
  return 0;
}

@Injectable()
export class ReleasesService {
  private readonly logger = new Logger(ReleasesService.name);

  constructor(
    private readonly database: DatabaseService,
    @Optional() private readonly security?: SecurityEventsService,
  ) {}

  // ── Releases ───────────────────────────────────────────

  async createRelease(input: {
    version: string;
    buildNumber?: string;
    platform?: string;
    architecture?: string;
    channel?: string;
    releaseNotes?: string;
    critical?: boolean;
    assignedCustomerIds?: string[];
    userId?: string;
  }): Promise<any> {
    const version = String(input.version || '').trim();
    if (!version) {
      throw new BadRequestException('version is required');
    }
    const channel = String(input.channel || 'STABLE').toUpperCase();
    if (!RELEASE_CHANNELS.includes(channel as any)) {
      throw new BadRequestException('Unknown release channel');
    }
    const platform = String(input.platform || 'windows').toLowerCase();
    const architecture = String(input.architecture || 'x64').toLowerCase();
    const dup = await this.findByVersionChannelPlatform(version, channel, platform, architecture);
    if (dup) {
      throw new BadRequestException(
        'A release with this version already exists for the channel/platform/architecture',
      );
    }
    const release = await this.database.softwareReleases.create({
      releaseId: publicId('rel'),
      version,
      buildNumber: input.buildNumber || null,
      platform,
      architecture,
      channel,
      status: 'DRAFT',
      releaseNotes: input.releaseNotes || null,
      critical: Boolean(input.critical),
      releasedAt: null,
      createdBy: input.userId || null,
      publishedBy: null,
      publishedAt: null,
      deprecatedAt: null,
      revokedAt: null,
      revocationReason: null,
      metadata: JSON.stringify({
        assignedCustomerIds: Array.isArray(input.assignedCustomerIds)
          ? input.assignedCustomerIds
          : [],
      }),
    } as any);
    await this.security?.record({
      eventType: 'ADMIN_OVERRIDE',
      severity: 'LOW',
      source: 'admin',
      actor: input.userId || null,
      metadata: { action: 'release_created', releaseId: release.releaseId, version },
    });
    return this.mapRelease(release);
  }

  private async findByVersionChannelPlatform(
    version: string,
    channel: string,
    platform: string,
    architecture: string,
  ): Promise<any | null> {
    const res = await this.database.softwareReleases.findAll({
      page: 1,
      pageSize: 5,
      filters: [
        { field: 'version', operator: 'eq', value: version },
        { field: 'channel', operator: 'eq', value: channel },
        { field: 'platform', operator: 'eq', value: platform },
        { field: 'architecture', operator: 'eq', value: architecture },
      ],
    } as any);
    return (res?.data || []).find((r: any) => !r.isDeleted) || null;
  }

  async updateRelease(
    id: string,
    patch: {
      buildNumber?: string;
      releaseNotes?: string;
      critical?: boolean;
      assignedCustomerIds?: string[];
      userId?: string;
    },
  ): Promise<any> {
    const release = await this.findById(id);
    if (release.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT releases can be edited');
    }
    let metadata: any = {};
    try {
      metadata = release.metadata ? JSON.parse(release.metadata) : {};
    } catch {
      /* ignore */
    }
    const updated = await this.database.softwareReleases.update(id, {
      ...(patch.buildNumber !== undefined ? { buildNumber: patch.buildNumber } : {}),
      ...(patch.releaseNotes !== undefined ? { releaseNotes: patch.releaseNotes } : {}),
      ...(patch.critical !== undefined ? { critical: Boolean(patch.critical) } : {}),
      metadata: JSON.stringify({
        ...metadata,
        ...(patch.assignedCustomerIds !== undefined
          ? { assignedCustomerIds: patch.assignedCustomerIds }
          : {}),
      }),
      updatedBy: patch.userId || null,
    } as any);
    return this.mapRelease(updated);
  }

  /** Publish — permission-controlled. Only DRAFT/TESTING/STAGED may publish. */
  async publishRelease(id: string, opts: { userId?: string } = {}): Promise<any> {
    const release = await this.findById(id);
    if (['PUBLISHED', 'REVOKED'].includes(release.status)) {
      throw new BadRequestException(`Release is already ${release.status}`);
    }
    if (release.status === 'DEPRECATED') {
      throw new BadRequestException('A deprecated release cannot be published');
    }
    const packageCount = await this.database.releasePackages
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'releaseId', operator: 'eq', value: id }],
      } as any)
      .then((r: any) => r?.data?.length || 0);
    const updated = await this.database.softwareReleases.update(id, {
      status: 'PUBLISHED',
      publishedBy: opts.userId || null,
      publishedAt: new Date().toISOString(),
      releasedAt: new Date().toISOString(),
    } as any);
    await this.security?.record({
      eventType: 'ADMIN_OVERRIDE',
      severity: 'MEDIUM',
      source: 'admin',
      actor: opts.userId || null,
      metadata: {
        action: 'release_published',
        releaseId: release.releaseId,
        version: release.version,
        channel: release.channel,
        packageCount,
      },
    });
    return this.mapRelease(updated);
  }

  async deprecateRelease(
    id: string,
    opts: { reason?: string; userId?: string } = {},
  ): Promise<any> {
    const release = await this.findById(id);
    if (release.status === 'REVOKED') {
      throw new BadRequestException('A revoked release cannot be deprecated');
    }
    const updated = await this.database.softwareReleases.update(id, {
      status: 'DEPRECATED',
      deprecatedAt: new Date().toISOString(),
      metadata: JSON.stringify({
        ...this.parseMeta(release.metadata),
        deprecationReason: opts.reason || null,
      }),
    } as any);
    return this.mapRelease(updated);
  }

  /**
   * Revoke — a revoked release is NEVER offered as a valid update. The
   * release record + package metadata are preserved (audit), but resolution
   * skips it entirely.
   */
  async revokeRelease(id: string, opts: { reason?: string; userId?: string } = {}): Promise<any> {
    const release = await this.findById(id);
    const updated = await this.database.softwareReleases.update(id, {
      status: 'REVOKED',
      revokedAt: new Date().toISOString(),
      revocationReason: opts.reason || null,
    } as any);
    await this.security?.record({
      eventType: 'LICENSE_REVOKED_EMERGENCY',
      severity: 'HIGH',
      source: 'admin',
      actor: opts.userId || null,
      metadata: {
        action: 'release_revoked',
        releaseId: release.releaseId,
        version: release.version,
        channel: release.channel,
        reason: opts.reason || null,
      },
    });
    return this.mapRelease(updated);
  }

  async findById(id: string): Promise<any> {
    const release = await this.database.softwareReleases.findById(id).catch(() => null);
    if (!release || release.isDeleted) {
      throw new NotFoundException('Release not found');
    }
    return release;
  }

  async getRelease(id: string): Promise<any> {
    const release = await this.findById(id);
    return this.mapRelease(release, await this.packagesFor(id));
  }

  async listReleases(
    filters: {
      page?: number;
      pageSize?: number;
      channel?: string;
      status?: string;
      version?: string;
      platform?: string;
      search?: string;
    } = {},
  ): Promise<{ data: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const f: { field: string; operator: string; value: string }[] = [];
    if (filters.channel) {
      f.push({ field: 'channel', operator: 'eq', value: String(filters.channel).toUpperCase() });
    }
    if (filters.status) {
      f.push({ field: 'status', operator: 'eq', value: String(filters.status).toUpperCase() });
    }
    if (filters.version) {
      f.push({ field: 'version', operator: 'eq', value: filters.version });
    }
    if (filters.platform) {
      f.push({ field: 'platform', operator: 'eq', value: String(filters.platform).toLowerCase() });
    }
    const result = await this.database.softwareReleases.findAll({
      page: Math.max(1, Number(filters.page) || 1),
      pageSize: Math.min(Math.max(Number(filters.pageSize) || 50, 1), 200),
      search: filters.search || undefined,
      searchFields: ['releaseId', 'version', 'buildNumber', 'channel', 'status'],
      filters: f.length > 0 ? f : undefined,
      sorts: [{ field: 'createdAt', direction: 'desc' }],
    } as any);
    const data = (result.data || [])
      .filter((r: any) => !r.isDeleted)
      .map((r: any) => this.mapRelease(r));
    return {
      data,
      total: Number(result.total || 0),
      page: Number(result.page || 1),
      pageSize: Number(result.pageSize || filters.pageSize || 50),
      totalPages: Number(result.totalPages || 0),
    };
  }

  private parseMeta(value: any): Record<string, any> {
    if (typeof value === 'string') {
      try {
        return value ? JSON.parse(value) : {};
      } catch {
        return {};
      }
    }
    return value || {};
  }

  private mapRelease(release: any, packages: any[] = []): Record<string, any> {
    const meta = this.parseMeta(release.metadata);
    return {
      id: release.id,
      releaseId: release.releaseId,
      version: release.version,
      buildNumber: release.buildNumber,
      platform: release.platform,
      architecture: release.architecture,
      channel: release.channel,
      status: release.status,
      critical: Boolean(release.critical),
      releaseNotes: release.releaseNotes,
      releasedAt: release.releasedAt,
      publishedAt: release.publishedAt,
      deprecatedAt: release.deprecatedAt,
      revokedAt: release.revokedAt,
      revocationReason: release.revocationReason,
      createdBy: release.createdBy,
      publishedBy: release.publishedBy,
      assignedCustomerIds: meta.assignedCustomerIds || [],
      packages,
    };
  }

  // ── Packages ───────────────────────────────────────────

  async addPackage(
    releaseId: string,
    input: {
      fileName: string;
      platform: string;
      architecture: string;
      packageUrl: string;
      packageSize?: number;
      checksum: string;
      checksumAlgorithm?: string;
      signature?: string;
      signatureAlgorithm?: string;
      signatureMetadata?: Record<string, any>;
      userId?: string;
    },
  ): Promise<any> {
    const release = await this.findById(releaseId);
    if (release.status !== 'DRAFT' && release.status !== 'TESTING' && release.status !== 'STAGED') {
      throw new BadRequestException('Packages can only be attached to unpublished releases');
    }
    if (!input.fileName || !input.packageUrl || !input.checksum) {
      throw new BadRequestException('fileName, packageUrl and checksum are required');
    }
    const dup = await this.database.releasePackages
      .findAll({
        page: 1,
        pageSize: 5,
        filters: [
          { field: 'releaseId', operator: 'eq', value: releaseId },
          { field: 'platform', operator: 'eq', value: String(input.platform).toLowerCase() },
          {
            field: 'architecture',
            operator: 'eq',
            value: String(input.architecture).toLowerCase(),
          },
        ],
      } as any)
      .then((r: any) => (r?.data || []).find((p: any) => !p.isDeleted));
    if (dup) {
      throw new BadRequestException('A package already exists for this platform/architecture');
    }
    const pkg = await this.database.releasePackages.create({
      releaseId,
      fileName: input.fileName,
      platform: String(input.platform).toLowerCase(),
      architecture: String(input.architecture).toLowerCase(),
      packageUrl: input.packageUrl,
      packageSize: input.packageSize ? Number(input.packageSize) : null,
      checksum: String(input.checksum).toLowerCase(),
      checksumAlgorithm: String(input.checksumAlgorithm || 'sha256').toLowerCase(),
      signature: input.signature || null,
      signatureAlgorithm: input.signatureAlgorithm || null,
      signatureMetadata: input.signatureMetadata ? JSON.stringify(input.signatureMetadata) : null,
      status: 'active',
      uploadedAt: new Date().toISOString(),
      uploadedBy: input.userId || null,
    } as any);
    return this.mapPackage(pkg);
  }

  private async packagesFor(releaseId: string): Promise<any[]> {
    const res = await this.database.releasePackages.findAll({
      page: 1,
      pageSize: 50,
      filters: [{ field: 'releaseId', operator: 'eq', value: releaseId }],
    } as any);
    return (res?.data || []).filter((p: any) => !p.isDeleted).map((p: any) => this.mapPackage(p));
  }

  private mapPackage(pkg: any): Record<string, any> {
    let sigMeta: Record<string, any> | null = null;
    try {
      sigMeta = pkg.signatureMetadata ? JSON.parse(pkg.signatureMetadata) : null;
    } catch {
      /* ignore */
    }
    return {
      id: pkg.id,
      fileName: pkg.fileName,
      platform: pkg.platform,
      architecture: pkg.architecture,
      packageUrl: pkg.packageUrl,
      packageSize: pkg.packageSize ? Number(pkg.packageSize) : null,
      checksum: pkg.checksum,
      checksumAlgorithm: pkg.checksumAlgorithm,
      signature: pkg.signature,
      signatureAlgorithm: pkg.signatureAlgorithm,
      signatureMetadata: sigMeta,
      uploadedAt: pkg.uploadedAt,
    };
  }

  // ── Channels + version policy ──────────────────────────

  async ensureChannel(input: {
    channelCode: string;
    name?: string;
    description?: string;
    minVersion?: string;
    recommendedVersion?: string;
    isActive?: boolean;
    userId?: string;
  }): Promise<any> {
    const code = String(input.channelCode || '').toUpperCase();
    if (!RELEASE_CHANNELS.includes(code as any)) {
      throw new BadRequestException('Unknown release channel');
    }
    const existing = await this.database.releaseChannels
      .findAll({
        page: 1,
        pageSize: 5,
        filters: [{ field: 'channelCode', operator: 'eq', value: code }],
      } as any)
      .then((r: any) => (r?.data || []).find((c: any) => !c.isDeleted));
    if (existing) {
      const updated = await this.database.releaseChannels.update(existing.id, {
        ...(input.minVersion !== undefined ? { minVersion: input.minVersion } : {}),
        ...(input.recommendedVersion !== undefined
          ? { recommendedVersion: input.recommendedVersion }
          : {}),
        ...(input.isActive !== undefined ? { isActive: Boolean(input.isActive) } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        updatedBy: input.userId || null,
      } as any);
      return updated;
    }
    return this.database.releaseChannels.create({
      channelCode: code,
      name: input.name || code,
      description: input.description || null,
      minVersion: input.minVersion || null,
      recommendedVersion: input.recommendedVersion || null,
      isActive: input.isActive !== false,
      updatedBy: input.userId || null,
    } as any);
  }

  async listChannels(): Promise<any[]> {
    const res = await this.database.releaseChannels.findAll({
      page: 1,
      pageSize: 50,
    } as any);
    return (res?.data || []).filter((c: any) => !c.isDeleted);
  }

  /** Set/refresh the per-version compatibility policy (blocked/critical/min). */
  async setVersionPolicy(input: {
    version: string;
    channel?: string;
    minSupportedVersion?: string;
    recommendedVersion?: string;
    blocked?: boolean;
    blockedReason?: string;
    critical?: boolean;
    notes?: string;
    userId?: string;
  }): Promise<any> {
    const version = String(input.version || '').trim();
    if (!version) {
      throw new BadRequestException('version is required');
    }
    const channel = String(input.channel || 'STABLE').toUpperCase();
    const existing = await this.database.versionCompatibility
      .findAll({
        page: 1,
        pageSize: 5,
        filters: [
          { field: 'version', operator: 'eq', value: version },
          { field: 'channel', operator: 'eq', value: channel },
        ],
      } as any)
      .then((r: any) => (r?.data || []).find((v: any) => !v.isDeleted));
    if (existing) {
      return this.database.versionCompatibility.update(existing.id, {
        ...(input.minSupportedVersion !== undefined
          ? { minSupportedVersion: input.minSupportedVersion }
          : {}),
        ...(input.recommendedVersion !== undefined
          ? { recommendedVersion: input.recommendedVersion }
          : {}),
        ...(input.blocked !== undefined ? { blocked: Boolean(input.blocked) } : {}),
        ...(input.blockedReason !== undefined ? { blockedReason: input.blockedReason } : {}),
        ...(input.critical !== undefined ? { critical: Boolean(input.critical) } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        updatedBy: input.userId || null,
      } as any);
    }
    return this.database.versionCompatibility.create({
      version,
      channel,
      minSupportedVersion: input.minSupportedVersion || null,
      recommendedVersion: input.recommendedVersion || null,
      blocked: Boolean(input.blocked),
      blockedReason: input.blockedReason || null,
      critical: Boolean(input.critical),
      notes: input.notes || null,
      updatedBy: input.userId || null,
    } as any);
  }

  async listVersionPolicy(filters: { channel?: string; page?: number; pageSize?: number } = {}) {
    const f: { field: string; operator: string; value: string }[] = [];
    if (filters.channel) {
      f.push({ field: 'channel', operator: 'eq', value: String(filters.channel).toUpperCase() });
    }
    const result = await this.database.versionCompatibility.findAll({
      page: Math.max(1, Number(filters.page) || 1),
      pageSize: Math.min(Math.max(Number(filters.pageSize) || 50, 1), 200),
      filters: f.length > 0 ? f : undefined,
      sorts: [{ field: 'createdAt', direction: 'desc' }],
    } as any);
    const data = (result.data || [])
      .filter((r: any) => !r.isDeleted)
      .map((r: any) => ({
        id: r.id,
        version: r.version,
        channel: r.channel,
        minSupportedVersion: r.minSupportedVersion,
        recommendedVersion: r.recommendedVersion,
        blocked: Boolean(r.blocked),
        blockedReason: r.blockedReason,
        critical: Boolean(r.critical),
        notes: r.notes,
      }));
    return {
      data,
      total: Number(result.total || 0),
      page: Number(result.page || 1),
      pageSize: Number(result.pageSize || filters.pageSize || 50),
      totalPages: Number(result.totalPages || 0),
    };
  }

  // ── Authenticated download access (16 production gate) ──

  private downloadSecretCache: string | null = null;

  private async kvGet(group: string, key: string): Promise<string> {
    const rows = await this.database.gstAuditSettings.findAll({
      filters: [
        { field: 'settingGroup', operator: 'eq', value: group },
        { field: 'settingKey', operator: 'eq', value: key },
      ],
      pageSize: 5,
    } as any);
    const row = (rows?.data || [])[0] as any;
    return row ? String(row.settingValue || '') : '';
  }

  private async kvSet(group: string, key: string, value: string): Promise<void> {
    const rows = await this.database.gstAuditSettings.findAll({
      filters: [
        { field: 'settingGroup', operator: 'eq', value: group },
        { field: 'settingKey', operator: 'eq', value: key },
      ],
      pageSize: 5,
    } as any);
    const row = (rows?.data || [])[0] as any;
    if (row) {
      await this.database.gstAuditSettings.update(row.id, { settingValue: value } as any);
    } else {
      await this.database.gstAuditSettings.create({
        settingGroup: group,
        settingKey: key,
        settingValue: value,
        dataType: 'text',
      } as any);
    }
  }

  /**
   * Download-signing secret — env override (RELEASE_DOWNLOAD_SECRET) or a
   * runtime-generated secret persisted in the KV store. Never exposed.
   */
  private async getDownloadSecret(): Promise<string> {
    if (this.downloadSecretCache) {
      return this.downloadSecretCache;
    }
    const env = process.env.RELEASE_DOWNLOAD_SECRET?.trim();
    if (env) {
      this.downloadSecretCache = env;
      return env;
    }
    const stored = await this.kvGet(DOWNLOAD_GROUP, 'secret');
    if (stored) {
      this.downloadSecretCache = stored;
      return stored;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    await this.kvSet(DOWNLOAD_GROUP, 'secret', generated).catch(() => undefined);
    this.downloadSecretCache = generated;
    return generated;
  }

  /**
   * Issue a short-lived, signed download token for a release. Eligibility is
   * checked AT ISSUANCE: the release must be PUBLISHED (never revoked), and
   * customer-specific releases require an authorized customerId. The token is
   * an HMAC over (releaseId, expiry) — the client never sees storage paths.
   */
  async createDownloadAccess(
    releaseId: string,
    opts: { customerId?: string; ttlMinutes?: number } = {},
  ): Promise<{ token: string; expiresAt: string }> {
    // Row id (internal) — resolves fast and never depends on user input ids.
    const release = await this.database.softwareReleases.findById(releaseId).catch(() => null);
    if (!release || release.isDeleted) {
      throw new NotFoundException('Release not found');
    }
    if (String(release.status) !== 'PUBLISHED') {
      throw new BadRequestException('Only published releases are downloadable');
    }
    if (String(release.channel) === 'CUSTOMER_SPECIFIC') {
      const meta = this.parseMeta(release.metadata);
      const assigned = meta.assignedCustomerIds || [];
      if (assigned.length > 0 && !assigned.includes(String(opts.customerId || ''))) {
        await this.security?.record({
          eventType: 'UNAUTHORIZED_LICENSE_ACCESS',
          severity: 'HIGH',
          customerId: opts.customerId || null,
          source: 'api',
          metadata: { stage: 'release_download_eligibility', releaseId },
        });
        throw new UnauthorizedException('Not authorized to download this release');
      }
    }
    const secret = await this.getDownloadSecret();
    const ttlMs = (Number(opts.ttlMinutes) || DOWNLOAD_TTL_MINUTES) * 60_000;
    const exp = Date.now() + ttlMs;
    const payload = `${release.id}.${exp}`;
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const token = Buffer.from(`relDl.${payload}.${hmac}`, 'utf8').toString('base64url');
    return { token, expiresAt: new Date(exp).toISOString() };
  }

  /**
   * Verify a download token (signature + expiry) and re-check the release is
   * still PUBLISHED. Returns package metadata the client verifies (checksum /
   * signature) before executing — never internal paths.
   */
  async resolveDownloadAccess(token: string): Promise<Record<string, any>> {
    if (!token) {
      throw new UnauthorizedException('Download token required');
    }
    let decoded: string;
    try {
      decoded = Buffer.from(String(token), 'base64url').toString('utf8');
    } catch {
      throw new UnauthorizedException('Invalid download token');
    }
    const parts = decoded.split('.');
    // relDl.<releaseId>.<exp>.<hmac>
    if (parts.length !== 4 || parts[0] !== 'relDl') {
      throw new UnauthorizedException('Invalid download token');
    }
    const [, releaseId, expRaw, hmacPart] = parts;
    const exp = Number(expRaw);
    if (!Number.isFinite(exp) || Date.now() >= exp) {
      await this.security?.record({
        eventType: 'REPLAY_DETECTED',
        severity: 'LOW',
        source: 'api',
        metadata: { stage: 'download_token_expired' },
      });
      throw new UnauthorizedException('Download token expired');
    }
    const secret = await this.getDownloadSecret();
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${releaseId}.${exp}`)
      .digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hmacPart))) {
      await this.security?.record({
        eventType: 'SIGNATURE_FAILURE',
        severity: 'MEDIUM',
        source: 'api',
        metadata: { stage: 'download_token_hmac' },
      });
      throw new UnauthorizedException('Invalid download token signature');
    }
    const release = await this.database.softwareReleases.findById(releaseId).catch(() => null);
    if (!release || release.isDeleted) {
      throw new NotFoundException('Release not found');
    }
    if (String(release.status) !== 'PUBLISHED') {
      // Revoked/deprecated releases are never downloadable (16.11).
      throw new UnauthorizedException('Release is no longer available for download');
    }
    const packages = await this.packagesFor(release.id);
    const pkg = packages.find(
      (p: any) => p.platform === release.platform && p.architecture === release.architecture,
    );
    if (!pkg) {
      throw new NotFoundException('No package for this release/platform');
    }
    return {
      releaseId: release.releaseId,
      version: release.version,
      fileName: pkg.fileName,
      packageUrl: pkg.packageUrl,
      packageSize: pkg.packageSize,
      checksum: pkg.checksum,
      checksumAlgorithm: pkg.checksumAlgorithm,
      signature: pkg.signature,
      signatureAlgorithm: pkg.signatureAlgorithm,
      signatureMetadata: pkg.signatureMetadata,
      expiresAt: new Date(exp).toISOString(),
    };
  }

  // ── Update resolution (16.5) ───────────────────────────

  /**
   * Resolve the correct update response for a client. The client never
   * supplies versions/URLs — everything is derived server-side from the
   * registry + version policy. A REVOKED release is never offered.
   */
  async resolveUpdate(input: {
    currentVersion?: string;
    platform?: string;
    architecture?: string;
    channel?: string;
    customerId?: string;
  }): Promise<Record<string, any>> {
    const current = String(input.currentVersion || '').trim();
    const platform = String(input.platform || 'windows').toLowerCase();
    const architecture = String(input.architecture || 'x64').toLowerCase();
    const requestedChannel = String(input.channel || 'STABLE').toUpperCase();

    // Latest PUBLISHED release (never REVOKED/DEPRECATED) for the target.
    const candidates = await this.database.softwareReleases.findAll({
      page: 1,
      pageSize: 50,
      filters: [
        { field: 'channel', operator: 'eq', value: requestedChannel },
        { field: 'status', operator: 'eq', value: 'PUBLISHED' },
        { field: 'platform', operator: 'eq', value: platform },
        { field: 'architecture', operator: 'eq', value: architecture },
      ],
    } as any);
    const published = (candidates?.data || [])
      .filter((r: any) => !r.isDeleted)
      .sort((a: any, b: any) => compareVersions(b.version, a.version));
    const latest = published[0] || null;

    // Customer-specific channel: only authorized customers get a release.
    if (requestedChannel === 'CUSTOMER_SPECIFIC' && latest) {
      const meta = this.parseMeta(latest.metadata);
      const assigned = meta.assignedCustomerIds || [];
      if (input.customerId && assigned.length > 0 && !assigned.includes(String(input.customerId))) {
        await this.security?.record({
          eventType: 'UNAUTHORIZED_LICENSE_ACCESS',
          severity: 'HIGH',
          customerId: input.customerId || null,
          source: 'api',
          metadata: { stage: 'customer_specific_release', releaseId: latest.releaseId },
        });
        return this.emptyUpdate(input, 'UNAUTHORIZED_RELEASE');
      }
    }

    // Version policy from channel + explicit version-compatibility rows.
    const channelRow = await this.database.releaseChannels
      .findAll({
        page: 1,
        pageSize: 5,
        filters: [{ field: 'channelCode', operator: 'eq', value: requestedChannel }],
      } as any)
      .then((r: any) => (r?.data || []).find((c: any) => !c.isDeleted));
    let policy: any = null;
    if (current) {
      policy = await this.database.versionCompatibility
        .findAll({
          page: 1,
          pageSize: 5,
          filters: [
            { field: 'version', operator: 'eq', value: current },
            { field: 'channel', operator: 'eq', value: requestedChannel },
          ],
        } as any)
        .then((r: any) => (r?.data || []).find((v: any) => !v.isDeleted));
    }
    const minSupported = policy?.minSupportedVersion || channelRow?.minVersion || null;
    const recommended = policy?.recommendedVersion || channelRow?.recommendedVersion || null;
    const blocked = Boolean(policy?.blocked);
    const critical = Boolean(policy?.critical);

    // BLOCKED version → never offer an update path to the blocked version;
    // the client is told the verdict and must be upgraded off it.
    if (blocked && current) {
      return this.buildUpdateResponse({
        verdict: UPDATE_VERDICTS.VERSION_BLOCKED,
        current,
        latest,
        minSupported,
        recommended,
        channel: requestedChannel,
        blockedReason: policy?.blockedReason,
      });
    }

    if (!latest) {
      return this.buildUpdateResponse({
        verdict: UPDATE_VERDICTS.VERSION_SUPPORTED,
        current,
        latest: null,
        minSupported,
        recommended,
        channel: requestedChannel,
      });
    }

    const cmp = current ? compareVersions(latest.version, current) : 1;
    if (cmp <= 0) {
      return this.buildUpdateResponse({
        verdict: UPDATE_VERDICTS.VERSION_SUPPORTED,
        current,
        latest,
        minSupported,
        recommended,
        channel: requestedChannel,
      });
    }

    let verdict: string = UPDATE_VERDICTS.UPDATE_AVAILABLE;
    if (critical || (minSupported && compareVersions(current, minSupported) < 0)) {
      verdict = UPDATE_VERDICTS.UPDATE_REQUIRED;
    } else if (recommended && compareVersions(current, recommended) < 0) {
      verdict = UPDATE_VERDICTS.UPDATE_RECOMMENDED;
    }
    return this.buildUpdateResponse({
      verdict,
      current,
      latest,
      minSupported,
      recommended,
      channel: requestedChannel,
    });
  }

  private async buildUpdateResponse(input: {
    verdict: string;
    current: string;
    latest: any | null;
    minSupported: string | null;
    recommended: string | null;
    channel: string;
    blockedReason?: string | null;
  }): Promise<Record<string, any>> {
    const base: Record<string, any> = {
      verdict: input.verdict,
      currentVersion: input.current || null,
      latestVersion: input.latest?.version || null,
      minimumSupportedVersion: input.minSupported,
      recommendedVersion: input.recommended,
      releaseChannel: input.channel,
      updateRequired: input.verdict === UPDATE_VERDICTS.UPDATE_REQUIRED,
      updateAvailable: [
        UPDATE_VERDICTS.UPDATE_AVAILABLE as string,
        UPDATE_VERDICTS.UPDATE_RECOMMENDED as string,
        UPDATE_VERDICTS.UPDATE_REQUIRED as string,
      ].includes(input.verdict),
      updateRecommended: input.verdict === UPDATE_VERDICTS.UPDATE_RECOMMENDED,
      blockedReason: input.blockedReason || null,
    };
    if (input.latest) {
      const packages = await this.packagesFor(input.latest.id);
      const pkg = packages.find(
        (p: any) =>
          p.platform === input.latest.platform && p.architecture === input.latest.architecture,
      );
      base.releaseId = input.latest.releaseId;
      base.releaseStatus = input.latest.status;
      base.critical = Boolean(input.latest.critical);
      base.releaseNotes = input.latest.releaseNotes;
      if (pkg) {
        try {
          const access = await this.createDownloadAccess(input.latest.id);
          base.packageMetadata = {
            fileName: pkg.fileName,
            platform: pkg.platform,
            architecture: pkg.architecture,
            packageSize: pkg.packageSize,
            checksum: pkg.checksum,
            checksumAlgorithm: pkg.checksumAlgorithm,
            signature: pkg.signature,
            signatureAlgorithm: pkg.signatureAlgorithm,
            signatureMetadata: pkg.signatureMetadata,
            downloadToken: access.token,
            downloadTokenExpiresAt: access.expiresAt,
          };
        } catch {
          base.packageMetadata = {
            fileName: pkg.fileName,
            platform: pkg.platform,
            architecture: pkg.architecture,
            packageSize: pkg.packageSize,
            checksum: pkg.checksum,
            checksumAlgorithm: pkg.checksumAlgorithm,
            signature: pkg.signature,
            signatureAlgorithm: pkg.signatureAlgorithm,
            signatureMetadata: pkg.signatureMetadata,
          };
        }
      } else {
        base.packageMetadata = null;
      }
    }
    return base;
  }

  private emptyUpdate(input: any, reason: string): Record<string, any> {
    return {
      verdict: UPDATE_VERDICTS.VERSION_SUPPORTED,
      reason,
      currentVersion: String(input.currentVersion || '').trim() || null,
      latestVersion: null,
      minimumSupportedVersion: null,
      recommendedVersion: null,
      releaseChannel: String(input.channel || 'STABLE').toUpperCase(),
      updateRequired: false,
      updateAvailable: false,
    };
  }

  /** True when the registry has at least one release (drives KV fallback). */
  async hasReleases(): Promise<boolean> {
    const res = await this.database.softwareReleases.findAll({ page: 1, pageSize: 1 } as any);
    return (res?.data || []).filter((r: any) => !r.isDeleted).length > 0;
  }
}
