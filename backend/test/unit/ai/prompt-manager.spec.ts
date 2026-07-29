import { PromptManagerService } from '../../../src/ai/services/prompt-manager.service';

describe('PromptManagerService', () => {
  let service: PromptManagerService;

  beforeEach(() => {
    service = new PromptManagerService();
  });

  describe('getAll', () => {
    it('should return all registered templates', () => {
      const templates = service.getAll();
      expect(templates.length).toBeGreaterThanOrEqual(6);
      expect(templates.map((t) => t.id)).toContain('copilot-general');
      expect(templates.map((t) => t.id)).toContain('insight-analysis');
      expect(templates.map((t) => t.id)).toContain('nl-query');
    });
  });

  describe('get', () => {
    it('should return a template by id', () => {
      const template = service.get('copilot-general');
      expect(template).toBeDefined();
      expect(template!.name).toBe('General ERP Copilot');
    });

    it('should return undefined for unknown template', () => {
      expect(service.get('unknown-template')).toBeUndefined();
    });
  });

  describe('buildPrompt', () => {
    it('should build a prompt with variables', () => {
      const result = service.buildPrompt('copilot-general', {
        query: 'What are today\'s sales?',
        context: 'Sales data available',
      });
      expect(result.systemPrompt).toContain('SHRANIX Krushi ERP');
      expect(result.userPrompt).toContain('What are today\'s sales?');
      expect(result.userPrompt).toContain('Sales data available');
    });

    it('should throw for unknown template', () => {
      expect(() => service.buildPrompt('unknown', {})).toThrow('Prompt template not found');
    });
  });

  describe('register', () => {
    it('should allow registering a new template', () => {
      service.register({
        id: 'test-template',
        name: 'Test',
        systemPrompt: 'You are a test assistant.',
        userPromptTemplate: 'Test query: {query}',
      });
      expect(service.get('test-template')).toBeDefined();
    });
  });
});
