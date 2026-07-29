import { TokenTrackerService } from '../../../src/ai/services/token-tracker.service';

describe('TokenTrackerService', () => {
  let service: TokenTrackerService;

  beforeEach(() => {
    service = new TokenTrackerService();
  });

  describe('track', () => {
    it('should track token usage', () => {
      service.track({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        provider: 'openai',
        model: 'gpt-4o',
        timestamp: new Date(),
      });

      const usage = service.getTotalUsage();
      expect(usage.totalTokens).toBe(150);
      expect(usage.totalRequests).toBe(1);
    });

    it('should accumulate multiple requests', () => {
      for (let i = 0; i < 5; i++) {
        service.track({
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          provider: 'openai',
          model: 'gpt-4o',
          timestamp: new Date(),
        });
      }

      const usage = service.getTotalUsage();
      expect(usage.totalTokens).toBe(750);
      expect(usage.totalRequests).toBe(5);
    });
  });

  describe('getUsageByProvider', () => {
    it('should aggregate usage by provider', () => {
      service.track({
        promptTokens: 100, completionTokens: 50, totalTokens: 150,
        provider: 'openai', model: 'gpt-4o', timestamp: new Date(),
      });
      service.track({
        promptTokens: 200, completionTokens: 100, totalTokens: 300,
        provider: 'ollama', model: 'llama3.2', timestamp: new Date(),
      });

      const byProvider = service.getUsageByProvider();
      expect(Object.keys(byProvider)).toHaveLength(2);
      expect(byProvider.openai).toBeDefined();
      expect(byProvider.ollama).toBeDefined();
      expect(byProvider.openai.tokens).toBe(150);
      expect(byProvider.ollama.tokens).toBe(300);
    });
  });

  describe('getUsageByUser', () => {
    it('should return usage for a specific user', () => {
      service.track({
        promptTokens: 100, completionTokens: 50, totalTokens: 150,
        provider: 'openai', model: 'gpt-4o', timestamp: new Date(), userId: 'user-1',
      });
      service.track({
        promptTokens: 200, completionTokens: 100, totalTokens: 300,
        provider: 'ollama', model: 'llama3.2', timestamp: new Date(), userId: 'user-2',
      });

      const usage = service.getUsageByUser('user-1');
      expect(usage.totalTokens).toBe(150);
      expect(usage.requests).toBe(1);
    });
  });

  describe('getRecentUsage', () => {
    it('should return usage within specified hours', () => {
      service.track({
        promptTokens: 100, completionTokens: 50, totalTokens: 150,
        provider: 'openai', model: 'gpt-4o', timestamp: new Date(),
      });
      const recent = service.getRecentUsage(24);
      expect(recent).toHaveLength(1);
    });
  });
});
