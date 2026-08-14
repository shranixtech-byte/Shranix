import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';

import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Combined health check' })
  @HttpCode(HttpStatus.OK)
  async check() {
    return this.health.getHealth();
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness probe (is the server running?)' })
  @HttpCode(HttpStatus.OK)
  async live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness probe (is the server ready to serve?)' })
  @HttpCode(HttpStatus.OK)
  async ready() {
    return this.health.getReadiness();
  }

  @Get('metrics')
  @Public()
  @ApiOperation({ summary: 'Prometheus-style metrics endpoint' })
  @HttpCode(HttpStatus.OK)
  async metrics() {
    return this.health.getMetrics();
  }

  @Get('status')
  @Public()
  @ApiOperation({ summary: 'Customer-safe status snapshot (status page, 17.42)' })
  @HttpCode(HttpStatus.OK)
  async statusSnapshot() {
    return this.health.getStatusSnapshot();
  }
}
