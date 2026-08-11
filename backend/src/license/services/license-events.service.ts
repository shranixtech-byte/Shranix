import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

/**
 * IMMUTABLE license event log. Rows are never edited or deleted by ordinary
 * flows — new facts are new rows. The only supported mutation is soft-delete
 * by an explicit admin action (never part of normal license operations).
 */
@Injectable()
export class LicenseEventsService {
  private readonly logger = new Logger(LicenseEventsService.name);

  constructor(private readonly database: DatabaseService) {}

  async record(
    licenseId: string,
    eventType: string,
    opts: {
      fromStatus?: string | null;
      toStatus?: string | null;
      actor?: string | null;
      source?: string;
      installationRef?: string | null;
      deviceRef?: string | null;
      metadata?: Record<string, any> | null;
    } = {},
  ): Promise<void> {
    try {
      await this.database.licenseEvents.create({
        licenseId,
        eventType,
        eventTime: new Date().toISOString(),
        fromStatus: opts.fromStatus ?? null,
        toStatus: opts.toStatus ?? null,
        actor: opts.actor || null,
        source: opts.source || 'api',
        installationRef: opts.installationRef || null,
        deviceRef: opts.deviceRef || null,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
      } as any);
    } catch (err) {
      this.logger.warn(`License event ${eventType} record failed: ${(err as Error).message}`);
    }
  }

  async list(licenseId: string, limit = 500): Promise<any[]> {
    const res = await this.database.licenseEvents.findAll({
      page: 1,
      pageSize: limit,
      filters: [{ field: 'licenseId', operator: 'eq', value: licenseId }],
    } as any);
    return (res?.data || [])
      .filter((e: any) => !e.isDeleted)
      .sort((a: any, b: any) => String(b.eventTime).localeCompare(String(a.eventTime)));
  }

  /** True when an event with the given type + metadata key already exists (dedupe). */
  async hasEventWithMeta(
    licenseId: string,
    eventType: string,
    metaKey: string,
    metaValue: string,
  ): Promise<boolean> {
    const events = await this.list(licenseId, 2000);
    return events.some((e: any) => {
      if (e.eventType !== eventType) {
        return false;
      }
      try {
        const meta = e.metadata ? JSON.parse(e.metadata) : {};
        return String(meta?.[metaKey]) === String(metaValue);
      } catch {
        return false;
      }
    });
  }
}
