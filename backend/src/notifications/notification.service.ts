import { Injectable, Logger } from '@nestjs/common';

import { NotificationSettingsService, type NotificationChannel } from './settings.service';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

export interface SmsOptions {
  to: string;
  message: string;
}

export interface PushOptions {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly settings: NotificationSettingsService) {}

  /** Channel disabled hai to skip — settings se gate. */
  private async channelEnabled(channel: NotificationChannel): Promise<boolean> {
    return this.settings.isChannelEnabled(channel);
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; skipped?: boolean }> {
    if (!(await this.channelEnabled('email'))) {
      this.logger.log('Email channel disabled in settings — skipped');
      return { success: true, skipped: true }; // skipped is NOT a failure
    }
    this.logger.log(`Email: to=${options.to} subject="${options.subject}"`);

    // In production, integrate with nodemailer or SendGrid:
    //   const transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });
    //   await transporter.sendMail({ from, to, subject, html });
    // Or: const sg = require('@sendgrid/mail'); sg.setApiKey(process.env.SENDGRID_API_KEY);
    //     await sg.send({ to, from, subject, html });

    this.logger.warn('Email provider not configured — message logged only');
    return { success: true };
  }

  async sendSms(options: SmsOptions): Promise<{ success: boolean; skipped?: boolean }> {
    if (!(await this.channelEnabled('sms'))) {
      this.logger.log('SMS channel disabled in settings — skipped');
      return { success: true, skipped: true }; // skipped is NOT a failure
    }
    this.logger.log(`SMS: to=${options.to} message="${options.message}"`);

    // In production, integrate with Twilio, AWS SNS, or similar:
    //   const twilio = require('twilio')(accountSid, authToken);
    //   await twilio.messages.create({ body, from, to });

    this.logger.warn('SMS provider not configured — message logged only');
    return { success: true };
  }

  async sendPush(options: PushOptions): Promise<{ success: boolean; skipped?: boolean }> {
    if (!(await this.channelEnabled('push'))) {
      this.logger.log('Push channel disabled in settings — skipped');
      return { success: true, skipped: true }; // skipped is NOT a failure
    }
    this.logger.log(`Push: to=${options.deviceToken} title="${options.title}"`);

    // In production, integrate with Firebase Cloud Messaging or Apple Push:
    //   const admin = require('firebase-admin');
    //   await admin.messaging().send({ token, notification: { title, body }, data });

    this.logger.warn('Push provider not configured — message logged only');
    return { success: true };
  }
}
