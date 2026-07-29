import { Injectable } from '@nestjs/common';

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokens?: number;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ConversationService {
  private readonly conversations: Map<string, Conversation> = new Map();
  private readonly userConversations: Map<string, string[]> = new Map();

  createConversation(userId: string, title: string, metadata?: Record<string, unknown>): Conversation {
    const id = crypto.randomUUID();
    const conversation: Conversation = {
      id,
      userId,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
    };

    this.conversations.set(id, conversation);

    const userList = this.userConversations.get(userId) || [];
    userList.push(id);
    this.userConversations.set(userId, userList);

    return conversation;
  }

  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  getUserConversations(userId: string, limit = 20): Conversation[] {
    const ids = this.userConversations.get(userId) || [];
    return ids
      .map((id) => this.conversations.get(id))
      .filter((c): c is Conversation => !!c)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }

  addMessage(conversationId: string, message: ConversationMessage): Conversation | undefined {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {return undefined;}

    conversation.messages.push(message);
    conversation.updatedAt = new Date();

    // Auto-title from first user message
    if (conversation.title === 'New Conversation' && message.role === 'user') {
      conversation.title = message.content.substring(0, 80) + (message.content.length > 80 ? '...' : '');
    }

    return conversation;
  }

  deleteConversation(id: string): boolean {
    const conversation = this.conversations.get(id);
    if (!conversation) {return false;}

    this.conversations.delete(id);

    const userList = this.userConversations.get(conversation.userId) || [];
    const index = userList.indexOf(id);
    if (index >= 0) {
      userList.splice(index, 1);
    }

    return true;
  }

  clearUserConversations(userId: string): number {
    const ids = this.userConversations.get(userId) || [];
    ids.forEach((id) => this.conversations.delete(id));
    this.userConversations.delete(userId);
    return ids.length;
  }
}
