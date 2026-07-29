import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../../src/notifications/notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
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
});
