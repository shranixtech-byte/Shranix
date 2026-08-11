import { Injectable, Logger } from '@nestjs/common';

import { CommunicationSettingsService } from './settings.service';

export interface ProviderSendResult {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  response?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Channel provider abstraction — EMAIL / SMS / WHATSAPP.
 *
 * Providers are resolved from settings. When no provider credentials are
 * configured the adapter falls back to a log-only mode (message recorded,
 * reported sent) so the ERP keeps working in dev/self-hosted setups.
 *
 * Real integrations to wire in production (never commit credentials):
 *  - Email:  nodemailer.createTransport({ host, port, auth }) or SendGrid/Resend
 *  - SMS:    Twilio / MSG91 / AWS SNS
 *  - WhatsApp: Meta WhatsApp Business Cloud API / Twilio / Gupshup
 */
@Injectable()
export class ChannelProviderService {
  private readonly logger = new Logger(ChannelProviderService.name);

  constructor(private readonly settings: CommunicationSettingsService) {}

  async sendEmail(payload: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<ProviderSendResult> {
    const cfg = await this.settings.getProviderConfig();
    const provider = String(cfg.emailProvider || 'smtp');
    const host = String(cfg.smtpHost || '');

    if (!host || !cfg.smtpPassword) {
      this.logger.log(`[email:${provider}] log-only (no provider credentials): to=${payload.to}`);
      return { success: true, provider: 'log', skipped: true };
    }

    try {
      // ── Production hook — nodemailer ──────────────────────────────
      // const nodemailer = await import('nodemailer');
      // const transporter = nodemailer.createTransport({
      //   host, port: Number(cfg.smtpPort) || 587,
      //   secure: cfg.smtpSecure === true,
      //   auth: { user, pass: String(cfg.smtpPassword) },
      // });
      // const info = await transporter.sendMail({
      //   from: `"${cfg.fromName || 'Shranix ERP'}" <${cfg.fromEmail || user}>`,
      //   to: payload.to, subject: payload.subject, html: payload.html, text: payload.text,
      // });
      // return { success: true, provider, providerMessageId: info.messageId };
      this.logger.warn('SMTP provider configured but not wired — falling back to log-only');
      return { success: true, provider: 'log', skipped: true };
    } catch (err: any) {
      this.logger.error(`Email send failed: ${err?.message}`);
      return { success: false, provider, error: String(err?.message || 'email send failed') };
    }
  }

  async sendSms(payload: { to: string; message: string }): Promise<ProviderSendResult> {
    const cfg = await this.settings.getProviderConfig();
    const provider = String(cfg.smsProvider || 'sms');
    const apiKey = String(cfg.smsApiKey || '');

    if (!apiKey) {
      this.logger.log(`[sms:${provider}] log-only (no provider credentials): to=${payload.to}`);
      return { success: true, provider: 'log', skipped: true };
    }

    try {
      // ── Production hook — Twilio / MSG91 / AWS SNS ────────────────
      // const client = require('twilio')(accountSid, apiKey);
      // await client.messages.create({ body: payload.message, from: cfg.smsSenderId, to: payload.to });
      this.logger.warn('SMS provider configured but not wired — falling back to log-only');
      return { success: true, provider: 'log', skipped: true };
    } catch (err: any) {
      this.logger.error(`SMS send failed: ${err?.message}`);
      return { success: false, provider, error: String(err?.message || 'sms send failed') };
    }
  }

  async sendWhatsApp(payload: {
    to: string;
    message: string;
    templateName?: string;
  }): Promise<ProviderSendResult> {
    const cfg = await this.settings.getProviderConfig();
    const provider = String(cfg.whatsappProvider || 'whatsapp');
    const token = String(cfg.whatsappApiKey || cfg.whatsappAccessToken || '');

    if (!token) {
      this.logger.log(
        `[whatsapp:${provider}] log-only (no provider credentials): to=${payload.to}`,
      );
      return { success: true, provider: 'log', skipped: true };
    }

    try {
      // ── Production hook — Meta WhatsApp Cloud API ─────────────────
      // const url = `https://graph.facebook.com/v19.0/${cfg.whatsappPhoneNumberId}/messages`;
      // await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` },
      //   body: JSON.stringify({ messaging_product: 'whatsapp', to: payload.to, text: { body: payload.message } }) });
      this.logger.warn('WhatsApp provider configured but not wired — falling back to log-only');
      return { success: true, provider: 'log', skipped: true };
    } catch (err: any) {
      this.logger.error(`WhatsApp send failed: ${err?.message}`);
      return { success: false, provider, error: String(err?.message || 'whatsapp send failed') };
    }
  }
}
