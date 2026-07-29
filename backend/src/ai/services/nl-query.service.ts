import { Injectable } from '@nestjs/common';

import { AiService } from './ai.service';

interface ParsedQuery {
  intent: 'list' | 'count' | 'trend' | 'compare' | 'analyze' | 'unknown';
  entity: 'sales' | 'purchase' | 'inventory' | 'finance' | 'gst' | 'workflow' | 'master' | 'unknown';
  filters: Record<string, string>;
  timeframe: 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'custom' | 'all';
  aggregation: 'sum' | 'count' | 'average' | 'trend' | 'none';
}

@Injectable()
export class NLQueryService {
  constructor(private readonly aiService: AiService) {}

  async parseQuery(question: string): Promise<ParsedQuery> {
    const q = question.toLowerCase();

    // Intent detection (simple keyword-based)
    const intent = this.detectIntent(q);
    const entity = this.detectEntity(q);
    const timeframe = this.detectTimeframe(q);
    const filters = this.extractFilters(q);

    return { intent, entity, filters, timeframe, aggregation: 'sum' };
  }

  async executeQuery(question: string, userId: string): Promise<{ answer: string; data?: unknown }> {
    const parsed = await this.parseQuery(question);

    const answer = await this.generateAnswer(parsed, question, userId);

    return { answer, data: parsed };
  }

  private detectIntent(q: string): ParsedQuery['intent'] {
    if (q.includes('show') || q.includes('list') || q.includes('display') || q.includes('get')) {return 'list';}
    if (q.includes('count') || q.includes('how many') || q.includes('total number')) {return 'count';}
    if (q.includes('trend') || q.includes('growth') || q.includes('increase') || q.includes('decrease') || q.includes('change')) {return 'trend';}
    if (q.includes('compare') || q.includes('vs') || q.includes('versus') || q.includes('difference')) {return 'compare';}
    if (q.includes('analyze') || q.includes('why') || q.includes('explain') || q.includes('reason')) {return 'analyze';}
    if (q.startsWith('top') || q.startsWith('best') || q.startsWith('worst')) {return 'analyze';}
    return 'list';
  }

  private detectEntity(q: string): ParsedQuery['entity'] {
    // Check compound/more specific patterns first
    if (q.includes('purchase order') || q.includes('purchase invoice') || q.includes('purchase return')) {return 'purchase';}
    if (q.includes('sales order') || q.includes('sales invoice') || q.includes('sales return') || q.includes('delivery challan')) {return 'sales';}
    if (q.includes('goods receipt') || q.includes('grn')) {return 'purchase';}

    // Simple keyword matching
    if ((q.includes('purchase') || q.includes('supplier') || q.includes('vendor') || q.includes('po ')) && !q.includes('sale')) {return 'purchase';}
    if (q.includes('sale') || q.includes('customer') || q.includes('quotation')) {return 'sales';}
    if (q.includes('order') && q.includes('pending')) {return 'purchase';}
    if (q.includes('order')) {return 'sales';}
    if (q.includes('invoice')) {return q.includes('purchase') ? 'purchase' : 'sales';}
    if (q.includes('stock') || q.includes('inventory') || q.includes('warehouse') || q.includes('item') || q.includes('product') || q.includes('material')) {return 'inventory';}
    if (q.includes('finance') || q.includes('account') || q.includes('gl') || q.includes('ledger') || q.includes('balance') || q.includes('profit') || q.includes('expense')) {return 'finance';}
    if (q.includes('gst') || q.includes('tax')) {return 'gst';}
    if (q.includes('approval') || q.includes('pending') || q.includes('task') || q.includes('workflow') || q.includes('queue')) {return 'workflow';}
    if (q.includes('company') || q.includes('branch') || q.includes('unit') || q.includes('category')) {return 'master';}
    return 'unknown';
  }

  private detectTimeframe(q: string): ParsedQuery['timeframe'] {
    if (q.includes('today')) {return 'today';}
    if (q.includes('this week') || q.includes('weekly')) {return 'this_week';}
    if (q.includes('this month') || q.includes('monthly') || q.includes('current month')) {return 'this_month';}
    if (q.includes('quarter')) {return 'this_quarter';}
    if (q.includes('this year') || q.includes('yearly') || q.includes('ytd') || q.includes('year to date')) {return 'this_year';}
    if (q.includes('last month') || q.includes('previous month')) {return 'custom';}
    return 'all';
  }

  private extractFilters(q: string): Record<string, string> {
    const filters: Record<string, string> = {};

    // Extract status mentions
    if (q.includes('pending')) {filters.status = 'pending';}
    if (q.includes('approved')) {filters.status = 'approved';}
    if (q.includes('completed') || q.includes('closed')) {filters.status = 'completed';}
    if (q.includes('draft')) {filters.status = 'draft';}
    if (q.includes('cancelled') || q.includes('canceled')) {filters.status = 'cancelled';}

    // Extract entity mentions
    if (q.includes('low stock') || q.includes('out of stock')) {filters.condition = 'low_stock';}
    if (q.includes('overdue')) {filters.condition = 'overdue';}
    if (q.includes('top') || q.includes('best')) {filters.sort = 'desc';}
    if (q.includes('worst') || q.includes('bottom')) {filters.sort = 'asc';}

    return filters;
  }

  private async generateAnswer(parsed: ParsedQuery, question: string, _userId: string): Promise<string> {
    // Generate context-aware responses using templates
    const response = await this.aiService.complete({
      messages: [
        {
          role: 'system',
          content: `You are an ERP data assistant. Answer the user's question about their business data concisely. 
If you don't have real-time data access, explain what data is available and suggest they check the relevant dashboard.
Intent detected: ${parsed.intent}, Entity: ${parsed.entity}, Timeframe: ${parsed.timeframe}`,
        },
        { role: 'user', content: question },
      ],
    });

    return response.content;
  }
}
