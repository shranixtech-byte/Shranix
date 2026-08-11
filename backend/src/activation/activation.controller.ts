import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Public } from '../common/decorators/public.decorator';

import { ActivationService } from './activation.service';

/**
 * Friendly customer-safe message map — the desktop client never sees raw
 * exception text or stack traces. Each reason maps to a human message; the
 * client further localizes/renders actions from the reason code.
 */
const FRIENDLY_MESSAGES: Record<string, string> = {
  LICENSE_NOT_FOUND:
    'We could not find a license matching those details. Please check the license number and try again.',
  LICENSE_NOT_ACTIVATABLE:
    'This license cannot be activated in its current state. Please contact support.',
  DEVICE_LIMIT_REACHED:
    'Your license has reached its active-device limit. Deactivate an existing device or upgrade your plan.',
  LICENSE_EXPIRED: 'Your SHRANIX subscription has expired. Please renew to continue using SHRANIX.',
  LICENSE_REVOKED: 'Your SHRANIX license is currently inactive. Please contact SHRANIX Support.',
  LICENSE_SUSPENDED:
    'Your SHRANIX license is currently suspended. Please contact support for assistance.',
  ACCOUNT_NOT_LINKED: 'This account is not linked to a customer organization.',
  TRIAL_UNAVAILABLE: 'Trial activation is not currently available for new installs.',
  NO_ACTIVE_TRIAL: 'No active trial was found for this account.',
  NO_TRIAL_LICENSE: 'No trial license was found for this account.',
  LICENSE_REFERENCE_REQUIRED: 'A license number is required to activate.',
};

@ApiTags('activation')
@Controller('activation')
export class ActivationController {
  constructor(private readonly service: ActivationService) {}

  private ip(req: Request): string | undefined {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
  }

  private friendly(reason: string): string {
    return (
      FRIENDLY_MESSAGES[reason] ||
      'Activation could not be completed. Please try again or contact support.'
    );
  }

  @Public()
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Online activation — authenticate customer, register device, issue signed token',
  })
  async activate(@Body() body: any, @Req() req: Request) {
    try {
      return await this.service.activate({
        email: body.email,
        password: body.password,
        licenseReference: body.licenseReference || body.licenseNumber,
        activationReference: body.activationReference,
        deviceIdentifierHash: body.deviceIdentifierHash,
        deviceName: body.deviceName,
        platform: body.platform,
        os: body.os,
        osVersion: body.osVersion,
        applicationVersion: body.applicationVersion,
        machineFingerprintHash: body.machineFingerprintHash,
        ipAddress: this.ip(req),
        userAgent: req.headers['user-agent'],
      });
    } catch (err: any) {
      const reason = err?.response?.reason || err?.message || 'ACTIVATION_FAILED';
      const status = err?.status || HttpStatus.BAD_REQUEST;
      return { ok: false, reason, message: this.friendly(reason), status };
    }
  }

  @Public()
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Periodic online revalidation for the desktop client' })
  async validate(@Body() body: any) {
    try {
      return await this.service.revalidate({
        licenseReference: body.licenseReference,
        deviceIdentifierHash: body.deviceIdentifierHash,
        applicationVersion: body.applicationVersion,
        source: body.source,
      });
    } catch (err: any) {
      return { valid: false, reason: err?.response?.reason || 'VALIDATION_FAILED' };
    }
  }

  @Public()
  @Post('trial')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Continue trial — issues a signed trial token when a Phase-12 trial exists',
  })
  async trial(@Body() body: any, @Req() req: Request) {
    try {
      return await this.service.continueTrial({
        email: body.email,
        password: body.password,
        ipAddress: this.ip(req),
        userAgent: req.headers['user-agent'],
      });
    } catch (err: any) {
      const reason = err?.response?.reason || err?.message || 'ACTIVATION_FAILED';
      return {
        ok: false,
        reason,
        message: this.friendly(reason),
        status: err?.status || HttpStatus.BAD_REQUEST,
      };
    }
  }

  @Public()
  @Post('offline/request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Exceptional offline recovery — signed, bounded offline token' })
  async offlineRequest(@Body() body: any, @Req() req: Request) {
    try {
      return await this.service.offlineRequest({
        email: body.email,
        password: body.password,
        licenseReference: body.licenseReference || body.licenseNumber,
        deviceIdentifierHash: body.deviceIdentifierHash,
        ipAddress: this.ip(req),
        userAgent: req.headers['user-agent'],
      });
    } catch (err: any) {
      const reason = err?.response?.reason || err?.message || 'ACTIVATION_FAILED';
      return {
        ok: false,
        reason,
        message: this.friendly(reason),
        status: err?.status || HttpStatus.BAD_REQUEST,
      };
    }
  }

  @Public()
  @Post('offline/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify an offline recovery token' })
  async offlineVerify(@Body() body: any) {
    return this.service.offlineVerify(body.token);
  }

  @Public()
  @Get('public-key')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'RSA public key for client-side token signature verification' })
  async publicKey() {
    return this.service.getPublicKey();
  }

  @Public()
  @Get('ping')
  @ApiOperation({ summary: 'Server availability probe' })
  async ping() {
    return this.service.ping();
  }

  @Public()
  @Get('update')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Update-channel metadata (latest/min version, download URL)' })
  async update(@Query('currentVersion') currentVersion?: string) {
    return this.service.getUpdateInfo(currentVersion);
  }
}
