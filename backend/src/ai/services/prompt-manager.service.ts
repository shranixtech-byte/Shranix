import { Injectable } from '@nestjs/common';

export interface PromptTemplate {
  id: string;
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  temperature?: number;
  maxTokens?: number;
}

@Injectable()
export class PromptManagerService {
  private readonly templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  private registerDefaultTemplates() {
    this.register({
      id: 'copilot-general',
      name: 'General ERP Copilot',
      systemPrompt: `You are an expert ERP assistant for SHRANIX Krushi ERP, an enterprise resource planning system for agricultural businesses.
You have deep knowledge of:
- Purchase management (orders, quotations, GRN, invoices, returns)
- Sales management (quotations, orders, delivery challans, invoices, returns)
- Inventory management (items, stock, warehouses, transfers)
- Finance and accounting (chart of accounts, journal entries, GL, trial balance, P&L, balance sheet)
- GST (registrations, returns, input/output tax, reverse charge)
- Workflow and approvals
- Document management

Answer questions accurately based on the user's ERP data context provided. Be concise but thorough. When you don't know something, say so rather than making things up.`,
      userPromptTemplate: 'User question: {query}\n\nERP Context:\n{context}',
    });

    this.register({
      id: 'insight-analysis',
      name: 'Business Insight Analysis',
      systemPrompt: `You are a business intelligence analyst for an ERP system. Analyze the provided ERP data and generate actionable business insights.
For each insight, provide:
1. Category (sales, inventory, finance, purchase, gst, operations)
2. Severity (positive, negative, warning, info)
3. Clear description of what is happening
4. Root cause analysis
5. Recommended action
6. Confidence score (0-1)

Focus on actionable insights that help business owners make decisions.`,
      userPromptTemplate: 'Analyze the following ERP data and generate insights:\n\n{data}',
      temperature: 0.3,
    });

    this.register({
      id: 'forecast-analysis',
      name: 'Forecast Analysis',
      systemPrompt: `You are a predictive analytics specialist for an ERP system. Analyze historical ERP data and provide forecasts.
For each forecast, provide:
1. Metric being forecasted
2. Current value and trend direction
3. Predicted value and timeframe
4. Confidence level
5. Key factors influencing the forecast
6. Recommended actions based on the forecast`,
      userPromptTemplate: 'Analyze the following historical data and generate forecasts:\n\n{data}\n\nCurrent period: {currentPeriod}\nForecast periods: {forecastPeriods}',
      temperature: 0.2,
    });

    this.register({
      id: 'nl-query',
      name: 'Natural Language Query',
      systemPrompt: `You are a data analyst that converts natural language questions into structured data queries.
Given a user question, identify:
1. Intent: What the user wants (list, count, trend, compare, analyze)
2. Entity: What data domain (sales, purchase, inventory, finance, gst)
3. Filters: Date range, status, category, etc.
4. Aggregation: Sum, count, average, trend
5. Timeframe: Today, this month, this quarter, this year, custom

Respond with a structured JSON object containing the parsed query intent.`,
      userPromptTemplate: 'Convert the following question into a structured query:\n\nQuestion: {query}\n\nAvailable data domains: {domains}\nCurrent date: {currentDate}',
      temperature: 0.1,
    });

    this.register({
      id: 'document-analysis',
      name: 'Document Analysis',
      systemPrompt: `You are a document analyst for an ERP system. Analyze the provided document data and extract:
1. Document type (invoice, contract, PO, report)
2. Key fields identified
3. Potential risks or anomalies
4. Missing information
5. Summary of the document
6. Suggested tags or categories`,
      userPromptTemplate: 'Analyze the following document:\n\nDocument Name: {name}\nDocument Type: {type}\nOCR Text: {ocrText}\nMetadata: {metadata}',
      temperature: 0.3,
    });

    this.register({
      id: 'smart-automation',
      name: 'Smart Automation Suggestions',
      systemPrompt: `You are an automation specialist for an ERP system. Analyze the current system state and suggest:
1. Approval routing recommendations based on amount, department, and user role
2. Purchase reorder suggestions based on stock levels and lead times
3. Supplier recommendations based on historical performance
4. Inventory transfer suggestions based on warehouse demand
5. Task prioritization based on urgency and impact
6. Reminder generation for pending actions`,
      userPromptTemplate: 'Analyze the following system state and suggest automation actions:\n\n{systemState}',
      temperature: 0.4,
    });
  }

  register(template: PromptTemplate) {
    this.templates.set(template.id, template);
  }

  get(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  getAll(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  buildPrompt(templateId: string, variables: Record<string, string>): { systemPrompt: string; userPrompt: string } {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Prompt template not found: ${templateId}`);
    }

    let userPrompt = template.userPromptTemplate;
    for (const [key, value] of Object.entries(variables)) {
      userPrompt = userPrompt.replace(`{${key}}`, value);
    }

    return {
      systemPrompt: template.systemPrompt,
      userPrompt,
    };
  }
}
