import { NotificationService } from '../../src/notifications/notification.service';
import { NotificationSettingsService } from '../../src/notifications/settings.service';

// NOTE: vitest (esbuild transform) decorator metadata emit nahi karta,
// isliye Nest DI constructor params auto-wire nahi kar sakta. Isi liye
// repo ka pattern hai — services ko direct instantiate karna
// (dekho src/auth/tests/auth.service.spec.ts).

function createService(channelEnabled: boolean): NotificationService {
  const settings = { isChannelEnabled: async () => channelEnabled } as NotificationSettingsService;
  return new NotificationService(settings);
}

describe('NotificationService', () => {
  let service: NotificationService;

  beforeAll(() => {
    service = createService(true);
  });

  describe('sendEmail', () => {
    it('should return success for valid email options', async () => {
      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sendSms', () => {
    it('should return success for valid SMS options', async () => {
      const result = await service.sendSms({
        to: '+1234567890',
        message: 'Test message',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sendPush', () => {
    it('should return success for valid push options', async () => {
      const result = await service.sendPush({
        deviceToken: 'device-token-123',
        title: 'Test',
        body: 'Test body',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('channel gating', () => {
    it('should skip (not fail) when the email channel is disabled in settings', async () => {
      const disabledService = createService(false);
      const result = await disabledService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
    });

    it('should skip (not fail) when the SMS channel is disabled in settings', async () => {
      const disabledService = createService(false);
      const result = await disabledService.sendSms({ to: '+1234567890', message: 'Test' });
      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
    });

    it('should skip (not fail) when the push channel is disabled in settings', async () => {
      const disabledService = createService(false);
      const result = await disabledService.sendPush({
        deviceToken: 'device-token-123',
        title: 'Test',
        body: 'Test body',
      });
      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
    });
  });
});
