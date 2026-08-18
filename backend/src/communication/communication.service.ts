import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { NotificationSettingsService } from '../notifications/settings.service';

import { ChannelProviderService } from './providers.service';
import { CommunicationSettingsService } from './settings.service';
import { TemplateEngineService } from './template-engine.service';

export interface SendCommunicationInput {
  channel: 'email' | 'sms' | 'whatsapp' | 'in_app';
  templateCode?: string;
  to: string;
  subject?: string;
  message?: string;
  variables?: Record<string, unknown>;
  recipientType?: string;
  recipientId?: string;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  scheduledAt?: string;
  batchId?: string;
  userId?: string;
  skipPreference?: boolean; // mandatory/system notifications bypass prefs
}

/**
 * Central Communication Engine.
 *
 * send() → resolves template → renders → checks preferences → persists a
 * communication log row (queued) → dispatches via the channel provider →
 * records delivery status. Failures are retried by processRetries().
 *
 * Communication NEVER throws into the caller: ERP transactions must not
 * break because an email failed (Phase 7.17).
 */
@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);
  private readonly rateWindow = new Map<string, number[]>(); // channel → timestamps

  /** H6 — Maximum retry age in days. Messages older than this are permanently failed. */
  static readonly MAX_RETRY_AGE_DAYS = 7;

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly templates: TemplateEngineService,
    private readonly providers: ChannelProviderService,
    private readonly settings: CommunicationSettingsService,
    private readonly notifSettings?: NotificationSettingsService,
  ) {}

  /**
   * Fire-and-forget send. Returns the persisted log row. Never throws for
   * provider failures (only for invalid input like missing recipient).
   */
  async send(input: SendCommunicationInput): Promise<any> {
    if (!input.to) {
      throw new BadRequestException('Recipient address (to) is required');
    }

    const channel = input.channel || 'email';
    let subject = input.subject || '';
    let body = input.message || '';

    // Template-driven rendering
    if (input.templateCode) {
      const tpl =
        (await this.templates.findByCode(input.templateCode, channel)) ||
        (await this.templates.findByCode(input.templateCode, undefined, 'en'));
      if (!tpl) {
        throw new NotFoundException(`Template ${input.templateCode} not found for ${channel}`);
      }
      const rendered = this.templates.render(tpl, input.variables || {});
      subject = rendered.subject || subject;
      body = rendered.body;
    }

    // Preference gate — mandatory/system messages bypass (skipPreference)
    if (
      !input.skipPreference &&
      (input.recipientType === 'customer' || input.recipientType === 'supplier')
    ) {
      const allowed = await this.isChannelAllowed(
        input.recipientType,
        input.recipientId || '',
        channel,
        input.templateCode || '',
      );
      if (!allowed) {
        // Record as skipped to keep a trace without bothering the recipient.
        return this.database.communications.create({
          channel,
          templateCode: input.templateCode || null,
          subject: subject || null,
          messageBody: body,
          recipientType: input.recipientType || null,
          recipientId: input.recipientId || null,
          recipientAddress: input.to,
          referenceType: input.referenceType || null,
          referenceId: input.referenceId || null,
          referenceNumber: input.referenceNumber || null,
          status: 'cancelled',
          provider: 'preference',
          createdBy: input.userId || null,
        } as any);
      }
    }

    const logRow = await this.database.communications.create({
      channel,
      templateCode: input.templateCode || null,
      subject: subject || null,
      messageBody: body,
      recipientType: input.recipientType || null,
      recipientId: input.recipientId || null,
      recipientAddress: input.to,
      referenceType: input.referenceType || null,
      referenceId: input.referenceId || null,
      referenceNumber: input.referenceNumber || null,
      status: 'queued',
      scheduledAt: input.scheduledAt || null,
      attempts: 0,
      maxAttempts: (await this.settings.retryConfig()).maxAttempts,
      batchId: input.batchId || null,
      createdBy: input.userId || null,
    } as any);

    // Scheduled messages are not dispatched now.
    if (input.scheduledAt && new Date(input.scheduledAt).getTime() > Date.now()) {
      this.logger.log(`Communication ${logRow.id} scheduled for ${input.scheduledAt}`);
      return logRow;
    }

    await this.dispatch(logRow);
    return this.database.communications.findById(logRow.id) ?? logRow;
  }

  /** Attempt dispatch of a queued row via the channel provider. */
  async dispatch(logRow: any): Promise<void> {
    const id = logRow.id;

    // Admin channel toggle gate — the existing notification settings still apply.
    const isInApp = logRow.channel === 'in_app';
    const gateChannel = isInApp ? 'push' : logRow.channel;
    if (this.notifSettings && !(await this.notifSettings.isChannelEnabled(gateChannel))) {
      await this.database.communications.update(id, {
        status: 'cancelled',
        provider: 'disabled',
        failureReason: 'Channel disabled in notification settings',
      } as any);
      return;
    }

    // In-app notifications dispatch through the existing notifications table.
    if (isInApp) {
      await this.database.communications.update(id, {
        status: 'delivered',
        provider: 'in_app',
        sentAt: new Date().toISOString(),
        deliveredAt: new Date().toISOString(),
        attempts: (logRow.attempts || 0) + 1,
        lastAttemptAt: new Date().toISOString(),
      } as any);
      try {
        await this.database.notifications.create({
          userId: logRow.recipientId || logRow.recipientAddress,
          title: logRow.subject || logRow.templateCode || 'Notification',
          message: logRow.messageBody || '',
          type: 'reminder',
          module: logRow.referenceType || null,
          documentId: logRow.referenceId || null,
          documentType: logRow.referenceType || null,
          isRead: false,
        } as any);
      } catch {
        /* in-app row is best-effort; the log entry remains */
      }
      return;
    }

    await this.database.communications.update(id, {
      status: 'sending',
      lastAttemptAt: new Date().toISOString(),
      attempts: (logRow.attempts || 0) + 1,
    } as any);

    if (!(await this.withinRateLimit(logRow.channel))) {
      await this.markForRetry(id, 'Rate limit exceeded');
      return;
    }

    let result;
    try {
      if (logRow.channel === 'email') {
        result = await this.providers.sendEmail({
          to: logRow.recipientAddress,
          subject: logRow.subject || '',
          html: logRow.messageBody || '',
          text: logRow.messageBody || '',
        });
      } else if (logRow.channel === 'sms') {
        result = await this.providers.sendSms({
          to: logRow.recipientAddress,
          message: logRow.messageBody || '',
        });
      } else if (logRow.channel === 'whatsapp') {
        result = await this.providers.sendWhatsApp({
          to: logRow.recipientAddress,
          message: logRow.messageBody || '',
        });
      } else {
        result = {
          success: false,
          provider: 'unknown',
          error: `Unsupported channel ${logRow.channel}`,
        };
      }
    } catch (err: any) {
      result = {
        success: false,
        provider: 'error',
        error: String(err?.message || 'dispatch error'),
      };
    }

    if (result?.success) {
      await this.database.communications.update(id, {
        status: 'sent',
        provider: result.provider || logRow.provider || 'log',
        providerMessageId: result.providerMessageId || null,
        providerResponse: result.response || null,
        sentAt: new Date().toISOString(),
      } as any);
    } else {
      await this.markForRetry(id, result?.error || 'dispatch failed', result?.provider);
    }
  }

  private async markForRetry(id: string, reason: string, provider?: string) {
    const row = await this.database.communications.findById(id).catch(() => null);
    if (!row) {
      return;
    }
    const { maxAttempts, retryDelayMinutes } = await this.settings.retryConfig();
    const attempts = Number(row.attempts) || 0;
    if (attempts >= maxAttempts) {
      await this.database.communications.update(id, {
        status: 'failed',
        failureReason: reason,
        failedAt: new Date().toISOString(),
        provider: provider || row.provider,
      } as any);
      return;
    }
    await this.database.communications.update(id, {
      status: 'failed',
      failureReason: reason,
      nextRetryAt: new Date(Date.now() + retryDelayMinutes * 60_000).toISOString(),
      provider: provider || row.provider,
    } as any);
  }

  /**
   * Background worker — process due queued/failed messages.
   * H6: Failed messages older than MAX_RETRY_AGE_DAYS are permanently failed.
   */
  async processDue(): Promise<{ processed: number }> {
    // Queued rows (scheduled time reached)
    const queued = await this.database.communications.findAll({
      page: 1,
      pageSize: 50,
      filters: [
        { field: 'status', operator: 'eq', value: 'queued' },
        { field: 'scheduledAt', operator: 'lte', value: new Date().toISOString() },
      ],
    } as any);
    let processed = 0;
    for (const row of queued.data || []) {
      try {
        await this.dispatch(row);
        processed += 1;
      } catch {
        /* continue */
      }
    }

    // H6: Failed rows past their retry window — but not older than MAX_RETRY_AGE_DAYS
    const maxRetryAge = new Date(
      Date.now() - CommunicationService.MAX_RETRY_AGE_DAYS * 86_400_000,
    ).toISOString();
    const retryable = await this.database.communications.findAll({
      page: 1,
      pageSize: 50,
      filters: [
        { field: 'status', operator: 'eq', value: 'failed' },
        { field: 'nextRetryAt', operator: 'lte', value: new Date().toISOString() },
        { field: 'createdAt', operator: 'gte', value: maxRetryAge },
      ],
    } as any);
    for (const row of retryable.data || []) {
      try {
        await this.dispatch(row);
        processed += 1;
      } catch {
        /* continue */
      }
    }

    // H6: Permanently fail messages older than max retry age
    const expired = await this.database.communications.findAll({
      page: 1,
      pageSize: 50,
      filters: [
        { field: 'status', operator: 'eq', value: 'failed' },
        { field: 'nextRetryAt', operator: 'lte', value: new Date().toISOString() },
        { field: 'createdAt', operator: 'lt', value: maxRetryAge },
      ],
    } as any);
    for (const row of expired.data || []) {
      try {
        await this.database.communications.update(row.id, {
          status: 'expired',
          failureReason: `Exceeded max retry age (${CommunicationService.MAX_RETRY_AGE_DAYS} days)`,
        } as any);
      } catch {
        /* continue */
      }
    }

    return { processed };
  }

  private async withinRateLimit(channel: string): Promise<boolean> {
    const limit = await this.settings.rateLimitPerMinute();
    const now = Date.now();
    const windowStart = now - 60_000;
    const timestamps = (this.rateWindow.get(channel) || []).filter((t) => t >= windowStart);
    if (timestamps.length >= limit) {
      return false;
    }
    timestamps.push(now);
    this.rateWindow.set(channel, timestamps);
    return true;
  }

  private async isChannelAllowed(
    recipientType: string,
    recipientId: string,
    channel: string,
    templateCode: string,
  ): Promise<boolean> {
    // Derive category from template code
    let category = 'system';
    const tpl = await this.templates.findByCode(templateCode, undefined, 'en').catch(() => null);
    if (tpl?.category) {
      category = tpl.category;
    }
    if (category === 'system') {
      return true; // system notifications cannot be disabled
    }
    const prefs = await this.database.communicationPreferences.findAll({
      page: 1,
      pageSize: 50,
      filters: [
        { field: 'entityType', operator: 'eq', value: recipientType },
        { field: 'entityId', operator: 'eq', value: recipientId },
        { field: 'channel', operator: 'eq', value: channel },
        { field: 'category', operator: 'eq', value: category },
      ],
    } as any);
    // Default: allowed unless an explicit disabled preference exists
    const disabled = (prefs.data || []).find((p: any) => p.enabled === false);
    return !disabled;
  }

  // ═════════════════════════════════════════════════════════
  // LOG / HISTORY
  // ═════════════════════════════════════════════════════════
  async list(query: {
    page?: number;
    pageSize?: number;
    channel?: string;
    status?: string;
    referenceType?: string;
    referenceId?: string;
    recipientId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const filters: any[] = [];
    if (query.channel) {
      filters.push({ field: 'channel', operator: 'eq', value: query.channel });
    }
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.referenceType) {
      filters.push({ field: 'referenceType', operator: 'eq', value: query.referenceType });
    }
    if (query.referenceId) {
      filters.push({ field: 'referenceId', operator: 'eq', value: query.referenceId });
    }
    if (query.recipientId) {
      filters.push({ field: 'recipientId', operator: 'eq', value: query.recipientId });
    }
    if (query.dateFrom) {
      filters.push({ field: 'createdAt', operator: 'gte', value: query.dateFrom });
    }
    if (query.dateTo) {
      filters.push({ field: 'createdAt', operator: 'lte', value: query.dateTo });
    }
    return this.database.communications.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(filters.length ? { filters } : {}),
    } as any);
  }

  async findById(id: string) {
    const row = await this.database.communications.findById(id);
    if (!row || row.isDeleted) {
      throw new NotFoundException('Communication not found');
    }
    return row;
  }

  async retry(id: string, userId?: string) {
    const row = await this.database.communications.findById(id);
    if (!row || row.isDeleted) {
      throw new NotFoundException('Communication not found');
    }
    if (row.status !== 'failed' && row.status !== 'queued') {
      throw new BadRequestException(
        `Only failed/queued communications can be retried (current: ${row.status})`,
      );
    }
    await this.database.communications.update(id, {
      status: 'queued',
      nextRetryAt: null,
      failureReason: null,
    } as any);
    await this.audit.log({
      userId: userId || '',
      event: 'communication.retried',
      resource: 'communication',
      action: 'retry',
      details: { communicationId: id },
    });
    await this.dispatch({ ...row, status: 'queued', attempts: row.attempts || 0 });
    return this.database.communications.findById(id);
  }

  // ═════════════════════════════════════════════════════════
  // PREFERENCES
  // ═════════════════════════════════════════════════════════
  async getPreferences(entityType: string, entityId: string) {
    const res = await this.database.communicationPreferences.findAll({
      page: 1,
      pageSize: 100,
      filters: [
        { field: 'entityType', operator: 'eq', value: entityType },
        { field: 'entityId', operator: 'eq', value: entityId },
      ],
    } as any);
    return res;
  }

  async setPreferences(entityType: string, entityId: string, rows: any[], userId?: string) {
    for (const row of rows || []) {
      const existing = await this.database.communicationPreferences.findAll({
        page: 1,
        pageSize: 1,
        filters: [
          { field: 'entityType', operator: 'eq', value: entityType },
          { field: 'entityId', operator: 'eq', value: entityId },
          { field: 'channel', operator: 'eq', value: row.channel },
          { field: 'category', operator: 'eq', value: row.category || 'system' },
        ],
      } as any);
      if (existing.data.length > 0) {
        await this.database.communicationPreferences.update(existing.data[0].id, {
          enabled: row.enabled !== false,
          preferred: row.preferred === true,
        });
      } else {
        await this.database.communicationPreferences.create({
          entityType,
          entityId,
          channel: row.channel,
          category: row.category || 'system',
          enabled: row.enabled !== false,
          preferred: row.preferred === true,
          createdBy: userId || null,
        } as any);
      }
    }
    return this.getPreferences(entityType, entityId);
  }

  // ═════════════════════════════════════════════════════════
  // CAMPAIGNS (bulk)
  // ═════════════════════════════════════════════════════════
  async createCampaign(data: any, userId?: string) {
    if (!data.campaignName || !data.channel) {
      throw new BadRequestException('campaignName and channel are required');
    }
    const audience = Array.isArray(data.audience) ? data.audience : [];
    return this.database.communicationCampaigns.create({
      campaignName: data.campaignName,
      channel: data.channel,
      templateCode: data.templateCode || null,
      audience: audience.length ? JSON.stringify(audience) : null,
      recipientCount: audience.length,
      status: data.scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: data.scheduledAt || null,
      createdBy: userId || null,
    } as any);
  }

  async runCampaign(id: string, userId?: string) {
    const camp = await this.database.communicationCampaigns.findById(id);
    if (!camp || camp.isDeleted) {
      throw new NotFoundException('Campaign not found');
    }
    if (camp.status === 'completed' || camp.status === 'sending') {
      throw new BadRequestException(`Campaign already ${camp.status}`);
    }
    const audience = camp.audience ? JSON.parse(camp.audience) : [];
    if (!audience.length) {
      throw new BadRequestException('Campaign has no recipients');
    }
    const batchId = `CAMP-${id.slice(0, 8)}`;
    await this.database.communicationCampaigns.update(id, {
      status: 'sending',
      startedAt: new Date().toISOString(),
    } as any);

    let sent = 0;
    let failed = 0;
    for (const recipient of audience) {
      try {
        const log = await this.send({
          channel: camp.channel,
          templateCode: camp.templateCode || undefined,
          to: recipient.address,
          recipientType: recipient.recipientType || null,
          recipientId: recipient.recipientId || null,
          variables: recipient.variables || {},
          batchId,
          userId,
        });
        if (log?.status === 'cancelled') {
          // preference/disabled-skip — not a send, not a failure
        } else {
          sent += 1;
        }
      } catch {
        failed += 1;
      }
    }
    await this.database.communicationCampaigns.update(id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      sentCount: sent,
      failedCount: failed,
    } as any);
    await this.audit.log({
      userId: userId || '',
      event: 'campaign.completed',
      resource: 'communication',
      action: 'bulk',
      details: { campaignId: id, sent, failed },
    });
    return this.database.communicationCampaigns.findById(id);
  }

  async listCampaigns(query: { page?: number; pageSize?: number }) {
    return this.database.communicationCampaigns.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    } as any);
  }

  // ═════════════════════════════════════════════════════════
  // REPORTS
  // ═════════════════════════════════════════════════════════
  async reports(query: { dateFrom?: string; dateTo?: string }) {
    const all = await this.database.communications.findAll({
      page: 1,
      pageSize: 5000,
    } as any);
    const rows = (all.data || []).filter((r: any) => {
      if (query.dateFrom && r.createdAt < query.dateFrom) {
        return false;
      }
      if (query.dateTo && r.createdAt > query.dateTo) {
        return false;
      }
      return true;
    });

    const byChannel: Record<string, { sent: number; delivered: number; failed: number }> = {};
    const byStatus: Record<string, number> = {};
    const byTemplate: Record<string, number> = {};
    for (const r of rows) {
      const ch = r.channel || 'other';
      byChannel[ch] = byChannel[ch] || { sent: 0, delivered: 0, failed: 0 };
      byChannel[ch].sent += 1;
      if (r.status === 'delivered' || r.status === 'read' || r.status === 'sent') {
        byChannel[ch].delivered += 1;
      }
      if (r.status === 'failed') {
        byChannel[ch].failed += 1;
      }
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      const t = r.templateCode || 'direct';
      byTemplate[t] = (byTemplate[t] || 0) + 1;
    }

    const total = rows.length;
    return {
      total,
      sent: rows.filter((r: any) => !['failed', 'cancelled'].includes(r.status)).length,
      failed: rows.filter((r: any) => r.status === 'failed').length,
      byChannel,
      byStatus,
      byTemplate,
    };
  }
}
