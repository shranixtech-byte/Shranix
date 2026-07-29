import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private readonly database: DatabaseService) {}

  async getHealth() {
    const [dbStatus, uptime] = await Promise.all([
      this.checkDatabase(),
      this.getUptime(),
    ]);

    return {
      status: dbStatus.status === 'healthy' ? 'ok' : 'degraded',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
      },
      uptime,
    };
  }

  async getReadiness() {
    const dbStatus = await this.checkDatabase();
    const ready = dbStatus.status === 'healthy';

    return {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
      },
    };
  }

  async getMetrics() {
    return {
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      memory_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      cpu_usage: process.cpuUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase() {
    try {
      const users = await (this.database.users as any).findAll({ page: 1, pageSize: 1 });
      return { status: 'healthy', details: `Connected (${users.total} users)` };
    } catch (error) {
      this.logger.error('Database health check failed', (error as Error).message);
      return { status: 'unhealthy', details: (error as Error).message };
    }
  }

  private async getUptime() {
    const seconds = Math.floor((Date.now() - this.startTime) / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return { seconds, days, hours, minutes };
  }
}
