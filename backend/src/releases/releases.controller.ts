import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { ReleasesService } from './releases.service';

/**
 * PHASE 16 — Release administration (16.1, 16.8).
 * Publishing and revocation are separate permissions so ordinary support
 * users can never publish or revoke production releases.
 */
@ApiTags('Releases')
@Controller('releases')
@UseGuards(JwtAuthGuard)
export class ReleasesController {
  constructor(private readonly releases: ReleasesService) {}

  // ── Authenticated download (token IS the authorization) ─
  @Public()
  @Get('download/:token')
  @ApiOperation({
    summary:
      'Resolve a short-lived authenticated download (HMAC token, expiry + eligibility checked)',
  })
  async download(@Param('token') token: string) {
    return this.releases.resolveDownloadAccess(token);
  }

  // ── Read ───────────────────────────────────────────────
  @Get()
  @Permissions('release.view')
  @ApiOperation({ summary: 'List releases (filters: channel, status, version, platform)' })
  async list(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('version') version?: string,
    @Query('platform') platform?: string,
    @Query('search') search?: string,
  ) {
    return this.releases.listReleases({
      page: Number(page),
      pageSize: Number(pageSize),
      channel,
      status,
      version,
      platform,
      search,
    });
  }

  @Get(':id')
  @Permissions('release.view')
  @ApiOperation({ summary: 'Release detail incl. packages' })
  async get(@Param('id') id: string) {
    return this.releases.getRelease(id);
  }

  @Get('channels')
  @Permissions('release.view')
  @ApiOperation({ summary: 'Release channels with version policy' })
  async channels() {
    return this.releases.listChannels();
  }

  @Get('version-policy')
  @Permissions('release.view')
  @ApiOperation({ summary: 'Version compatibility policy (blocked/critical/min/recommended)' })
  async versionPolicy(@Query('channel') channel?: string) {
    return this.releases.listVersionPolicy({ channel });
  }

  // ── Management ─────────────────────────────────────────
  @Post()
  @Permissions('release.manage')
  @ApiOperation({ summary: 'Create a DRAFT release' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.releases.createRelease({ ...body, userId });
  }

  @Patch(':id')
  @Permissions('release.manage')
  @ApiOperation({ summary: 'Edit a DRAFT release' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.releases.updateRelease(id, { ...body, userId });
  }

  @Post(':id/packages')
  @Permissions('release.manage')
  @ApiOperation({ summary: 'Attach a package (checksum + signature metadata) to a release' })
  async addPackage(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.releases.addPackage(id, { ...body, userId });
  }

  @Post('channels')
  @Permissions('release.manage')
  @ApiOperation({ summary: 'Create/update a release channel (min/recommended version policy)' })
  async upsertChannel(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.releases.ensureChannel({ ...body, userId });
  }

  @Post('version-policy')
  @Permissions('release.manage')
  @ApiOperation({
    summary: 'Set per-version compatibility policy (blocked/critical/min/recommended)',
  })
  async setVersionPolicy(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.releases.setVersionPolicy({ ...body, userId });
  }

  // ── Lifecycle (permission-separated) ───────────────────
  @Post(':id/publish')
  @Permissions('release.publish')
  @ApiOperation({ summary: 'Publish a release (DRAFT/TESTING/STAGED → PUBLISHED)' })
  async publish(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.releases.publishRelease(id, { userId });
  }

  @Post(':id/deprecate')
  @Permissions('release.manage')
  @ApiOperation({ summary: 'Deprecate a release' })
  async deprecate(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.releases.deprecateRelease(id, { reason: body?.reason, userId });
  }

  @Post(':id/revoke')
  @Permissions('release.revoke')
  @ApiOperation({ summary: 'Revoke a release — never offered as a valid update again' })
  async revoke(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.releases.revokeRelease(id, { reason: body?.reason, userId });
  }
}
