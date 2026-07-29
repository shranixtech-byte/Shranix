import { Injectable } from '@nestjs/common';

import { AiService } from './ai.service';
import { ConversationService } from './conversation.service';

@Injectable()
export class CopilotService {
  constructor(
    private readonly aiService: AiService,
    private readonly conversationService: ConversationService,
  ) {}

  async chat(
    message: string,
    history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    userId: string,
    conversationId?: string,
  ) {
    // Get or create conversation
    let conversation = conversationId
      ? this.conversationService.getConversation(conversationId)
      : this.conversationService.createConversation(userId, 'New Conversation', { source: 'copilot' });

    if (!conversation) {
      conversation = this.conversationService.createConversation(userId, message.substring(0, 80), { source: 'copilot' });
    }

    // Add user message to history
    this.conversationService.addMessage(conversation.id, {
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Build context from ERP data (simplified)
    const context = await this.buildERPContext(message);

    // Build messages with system prompt
    const messages = [
      {
        role: 'system' as const,
        content: `You are the SHRANIX Krushi ERP AI Copilot. You help users understand their ERP data.
Current ERP Context: ${context}
Be helpful, accurate, and concise. When referencing specific data, mention the numbers clearly. If you don't have enough context, ask the user for more details.`,
      },
      ...history.slice(-10),
      { role: 'user' as const, content: message },
    ];

    // Get AI response
    const response = await this.aiService.complete({ messages }, userId);

    // Add assistant message to history
    this.conversationService.addMessage(conversation.id, {
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
    });

    return {
      response: response.content,
      conversationId: conversation.id,
      usage: response.usage,
    };
  }

  async explainReport(reportType: string, data: Record<string, unknown>) {
    const response = await this.aiService.completeWithTemplate('copilot-general', {
      query: `Explain this ${reportType} report in simple terms:`,
      context: JSON.stringify(data, null, 2),
    });
    return { explanation: response.content };
  }

  async explainKPI(kpiName: string, value: number, trend: string, context: string) {
    const response = await this.aiService.complete({
      messages: [
        {
          role: 'system',
          content: `Explain the ERP KPI "${kpiName}" (current value: ${value}, trend: ${trend}) in simple business terms. Context: ${context}. Tell the user what this means, whether it's good or bad, and what actions they might consider.`,
        },
        { role: 'user', content: `What does ${kpiName} = ${value} mean for my business?` },
      ],
    });
    return { explanation: response.content };
  }

  private async buildERPContext(query: string): Promise<string> {
    const keywords = query.toLowerCase();
    const contextParts: string[] = [];

    if (keywords.includes('sales') || keywords.includes('revenue')) {
      contextParts.push('Sales module available: quotations, orders, delivery challans, invoices, returns, customer price lists');
    }
    if (keywords.includes('purchase') || keywords.includes('supplier') || keywords.includes('vendor')) {
      contextParts.push('Purchase module available: orders, quotations, GRN, invoices, returns, supplier price lists');
    }
    if (keywords.includes('inventory') || keywords.includes('stock') || keywords.includes('warehouse')) {
      contextParts.push('Inventory module available: items, stock, warehouses, transfers, adjustments, cycle counts');
    }
    if (keywords.includes('finance') || keywords.includes('account') || keywords.includes('gl') || keywords.includes('ledger')) {
      contextParts.push('Finance module available: chart of accounts, journal entries, GL, trial balance, P&L, balance sheet, cash flow');
    }
    if (keywords.includes('gst') || keywords.includes('tax') || keywords.includes('return')) {
      contextParts.push('GST module available: registrations, returns, input/output tax, reverse charge, tax ledger');
    }
    if (keywords.includes('workflow') || keywords.includes('approval') || keywords.includes('pending')) {
      contextParts.push('Workflow module available: approvals, tasks, escalations, notifications');
    }
    if (keywords.includes('document') || keywords.includes('dms') || keywords.includes('file') || keywords.includes('attachment')) {
      contextParts.push('DMS module available: document management, versioning, digital signatures, OCR');
    }

    return contextParts.length > 0 ? contextParts.join('. ') : 'General ERP context - the user can ask about sales, purchases, inventory, finance, GST, workflow, or documents.';
  }
}
