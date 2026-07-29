import { CircuitBreakerService } from '../../../src/ai/services/circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    service = new CircuitBreakerService();
  });

  describe('call', () => {
    it('should return successful result', async () => {
      const result = await service.call('test', async () => 'success');
      expect(result).toBe('success');
    });

    it('should retry on failure and use fallback', async () => {
      let attempts = 0;
      const result = await service.call('retry-test', async () => {
        attempts++;
        if (attempts < 3) throw new Error('Temporary failure');
        return 'success-after-retry';
      });
      expect(result).toBe('success-after-retry');
      expect(attempts).toBe(3);
    });

    it('should use fallback when all retries exhausted', async () => {
      const result = await service.call('fallback-test', async () => {
        throw new Error('Always fails');
      }, async () => 'fallback-result');
      expect(result).toBe('fallback-result');
    });

    it('should open circuit after threshold failures', async () => {
      // Force failures with minimal retries by reducing threshold
      for (let i = 0; i < 6; i++) {
        try {
          await service.call('open-circuit', async () => {
            throw new Error('Fail');
          }, async () => 'fallback', 3000, 0);
        } catch { /* expected */ }
      }

      const status = service.getStatus('open-circuit');
      expect(status.state).toBe('open');
    }, 10000);
  });

  describe('getStatus', () => {
    it('should return closed state for unknown circuit', () => {
      const status = service.getStatus('unknown');
      expect(status.state).toBe('closed');
      expect(status.failures).toBe(0);
    });
  });
});
