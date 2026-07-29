import { NLQueryService } from '../../../src/ai/services/nl-query.service';

// Mock AiService
const mockAiService = {
  complete: vi.fn().mockResolvedValue({ content: 'Test response' }),
  completeWithTemplate: vi.fn().mockResolvedValue({ content: 'Generated response for your query.' }),
};

describe('NLQueryService', () => {
  let service: NLQueryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NLQueryService(mockAiService as any);
  });

  describe('parseQuery', () => {
    it('should detect sales intent', async () => {
      const result = await service.parseQuery('Show today\'s sales');
      expect(result.entity).toBe('sales');
      expect(result.timeframe).toBe('today');
    });

    it('should detect purchase intent', async () => {
      const result = await service.parseQuery('List pending purchase orders');
      expect(result.entity).toBe('purchase');
      expect(result.filters.status).toBe('pending');
    });

    it('should detect inventory intent', async () => {
      const result = await service.parseQuery('Show low stock products');
      expect(result.entity).toBe('inventory');
      expect(result.filters.condition).toBe('low_stock');
    });

    it('should detect finance intent', async () => {
      const result = await service.parseQuery('What is my current profit?');
      expect(result.entity).toBe('finance');
    });

    it('should detect GST intent', async () => {
      const result = await service.parseQuery('GST payable this month');
      expect(result.entity).toBe('gst');
      expect(result.timeframe).toBe('this_month');
    });

    it('should detect count intent', async () => {
      const result = await service.parseQuery('How many pending approvals?');
      expect(result.intent).toBe('count');
    });

    it('should detect trend intent', async () => {
      const result = await service.parseQuery('Sales growth this year');
      expect(result.intent).toBe('trend');
      expect(result.timeframe).toBe('this_year');
    });

    it('should default to list intent for unknown queries', async () => {
      const result = await service.parseQuery('Something random');
      expect(result.intent).toBe('list');
    });
  });

  describe('executeQuery', () => {
    it('should return an answer for a given question', async () => {
      const result = await service.executeQuery('Show today\'s sales', 'user-1');
      expect(result.answer).toBeDefined();
      expect(result.data).toBeDefined();
    });
  });
});
