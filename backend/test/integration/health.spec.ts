import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../../src/health/health.service';
import { DatabaseService } from '../../src/database/database.service';

describe('HealthService', () => {
  let service: HealthService;
  let mockDb: Partial<DatabaseService>;

  beforeAll(async () => {
    mockDb = {
      users: {
        findAll: async () => ({ data: [], total: 0, page: 1, pageSize: 1, totalPages: 0 }),
      } as any,
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = moduleFixture.get<HealthService>(HealthService);
  });

  describe('getHealth', () => {
    it('should return health status with services', async () => {
      const result = await service.getHealth();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('services');
      expect(result).toHaveProperty('uptime');
    });
  });

  describe('getReadiness', () => {
    it('should return readiness with database check', async () => {
      const result = await service.getReadiness();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('checks');
      expect(result.checks).toHaveProperty('database');
    });
  });

  describe('getMetrics', () => {
    it('should return system metrics', async () => {
      const result = await service.getMetrics();
      expect(result).toHaveProperty('uptime_seconds');
      expect(result).toHaveProperty('memory_usage_mb');
      expect(result).toHaveProperty('memory_total_mb');
      expect(result).toHaveProperty('cpu_usage');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
