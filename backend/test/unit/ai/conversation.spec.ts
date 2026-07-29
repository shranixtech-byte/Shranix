import { ConversationService } from '../../../src/ai/services/conversation.service';

describe('ConversationService', () => {
  let service: ConversationService;

  beforeEach(() => {
    service = new ConversationService();
  });

  describe('createConversation', () => {
    it('should create a conversation with an id', () => {
      const conv = service.createConversation('user-1', 'Test Conversation');
      expect(conv.id).toBeDefined();
      expect(conv.userId).toBe('user-1');
      expect(conv.title).toBe('Test Conversation');
      expect(conv.messages).toHaveLength(0);
    });

    it('should create with metadata', () => {
      const conv = service.createConversation('user-1', 'Test', { source: 'test' });
      expect(conv.metadata).toEqual({ source: 'test' });
    });
  });

  describe('getConversation', () => {
    it('should return a created conversation', () => {
      const created = service.createConversation('user-1', 'Test');
      const found = service.getConversation(created.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it('should return undefined for non-existent conversation', () => {
      expect(service.getConversation('non-existent')).toBeUndefined();
    });
  });

  describe('getUserConversations', () => {
    it('should return all conversations for a user', () => {
      service.createConversation('user-1', 'Conv 1');
      service.createConversation('user-1', 'Conv 2');
      const convs = service.getUserConversations('user-1');
      expect(convs).toHaveLength(2);
    });

    it('should return empty for user with no conversations', () => {
      const convs = service.getUserConversations('user-2');
      expect(convs).toHaveLength(0);
    });

    it('should return conversations ordered by updatedAt desc', () => {
      service.createConversation('user-1', 'Older');
      const convs = service.getUserConversations('user-1');
      expect(convs[0].title).toBe('Older');
    });
  });

  describe('addMessage', () => {
    it('should add a message to a conversation', () => {
      const conv = service.createConversation('user-1', 'Test');
      const updated = service.addMessage(conv.id, {
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      });
      expect(updated).toBeDefined();
      expect(updated!.messages).toHaveLength(1);
      expect(updated!.messages[0].content).toBe('Hello');
    });

    it('should return undefined for non-existent conversation', () => {
      const result = service.addMessage('non-existent', {
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      });
      expect(result).toBeUndefined();
    });

    it('should auto-title from first user message', () => {
      const conv = service.createConversation('user-1', 'New Conversation');
      service.addMessage(conv.id, {
        role: 'user',
        content: 'What are my sales numbers for this quarter?',
        timestamp: new Date(),
      });
      const updated = service.getConversation(conv.id);
      expect(updated!.title).toContain('What are my sales numbers');
    });
  });

  describe('deleteConversation', () => {
    it('should delete a conversation', () => {
      const conv = service.createConversation('user-1', 'Test');
      const deleted = service.deleteConversation(conv.id);
      expect(deleted).toBe(true);
      expect(service.getConversation(conv.id)).toBeUndefined();
    });

    it('should return false for non-existent conversation', () => {
      expect(service.deleteConversation('non-existent')).toBe(false);
    });
  });

  describe('clearUserConversations', () => {
    it('should clear all conversations for a user', () => {
      service.createConversation('user-1', 'Conv 1');
      service.createConversation('user-1', 'Conv 2');
      const count = service.clearUserConversations('user-1');
      expect(count).toBe(2);
      expect(service.getUserConversations('user-1')).toHaveLength(0);
    });
  });
});
