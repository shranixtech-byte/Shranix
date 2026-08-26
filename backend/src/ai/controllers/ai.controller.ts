import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiService } from '../services/ai.service';
import { ConversationService } from '../services/conversation.service';
import { CopilotService } from '../services/copilot.service';
import { DocumentAiService } from '../services/document-ai.service';
import { InsightsService } from '../services/insights.service';
import { NLQueryService } from '../services/nl-query.service';
import { PredictiveService } from '../services/predictive.service';
import { PromptManagerService } from '../services/prompt-manager.service';
import { SmartAutomationService } from '../services/smart-automation.service';
import { TokenTrackerService } from '../services/token-tracker.service';

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly copilotService: CopilotService,
    private readonly nlQueryService: NLQueryService,
    private readonly insightsService: InsightsService,
    private readonly predictiveService: PredictiveService,
    private readonly documentAiService: DocumentAiService,
    private readonly smartAutomationService: SmartAutomationService,
    private readonly tokenTracker: TokenTrackerService,
    private readonly conversationService: ConversationService,
    private readonly promptManager: PromptManagerService,
  ) {}

  @Post('copilot/chat')
  @Permissions('ai.chat')
  @ApiOperation({ summary: 'Chat with ERP AI Copilot' })
  @HttpCode(HttpStatus.OK)
  async chat(
    @Body()
    body: {
      message: string;
      history?: Array<{ role: string; content: string }>;
      conversationId?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.copilotService.chat(
      body.message,
      (body.history || []).map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      userId,
      body.conversationId,
    );
  }

  @Post('copilot/explain-report')
  @Permissions('ai.chat')
  @ApiOperation({ summary: 'Explain a report using AI' })
  @HttpCode(HttpStatus.OK)
  async explainReport(@Body() body: { reportType: string; data: Record<string, unknown> }) {
    return this.copilotService.explainReport(body.reportType, body.data);
  }

  @Post('copilot/explain-kpi')
  @Permissions('ai.chat')
  @ApiOperation({ summary: 'Explain a KPI using AI' })
  @HttpCode(HttpStatus.OK)
  async explainKPI(
    @Body() body: { kpiName: string; value: number; trend: string; context: string },
  ) {
    return this.copilotService.explainKPI(body.kpiName, body.value, body.trend, body.context);
  }

  @Post('query')
  @Permissions('ai.query')
  @ApiOperation({ summary: 'Execute a natural language query' })
  @HttpCode(HttpStatus.OK)
  async query(@Body() body: { question: string }, @CurrentUser('id') userId: string) {
    return this.nlQueryService.executeQuery(body.question, userId);
  }

  @Get('insights')
  @Permissions('ai.insights')
  @ApiOperation({ summary: 'Get AI-generated business insights' })
  async getInsights(@CurrentUser('id') userId: string) {
    return this.insightsService.generateInsights(userId);
  }

  @Get('insights/:category')
  @Permissions('ai.insights')
  @ApiOperation({ summary: 'Get AI insights for a specific category' })
  async getInsightsByCategory(@Param('category') category: string) {
    return this.insightsService.generateInsightsForCategory(category as any);
  }

  @Get('forecast/sales')
  @Permissions('ai.predict')
  @ApiOperation({ summary: 'Get sales forecast' })
  async forecastSales(@Query('periods') periods?: number) {
    return this.predictiveService.forecastSales(periods ? Number(periods) : undefined);
  }

  @Get('forecast/purchases')
  @Permissions('ai.predict')
  @ApiOperation({ summary: 'Get purchase forecast' })
  async forecastPurchases(@Query('periods') periods?: number) {
    return this.predictiveService.forecastPurchases(periods ? Number(periods) : undefined);
  }

  @Get('forecast/revenue')
  @Permissions('ai.predict')
  @ApiOperation({ summary: 'Get revenue forecast' })
  async forecastRevenue(@Query('periods') periods?: number) {
    return this.predictiveService.forecastRevenue(periods ? Number(periods) : undefined);
  }

  @Get('forecast/cashflow')
  @Permissions('ai.predict')
  @ApiOperation({ summary: 'Get cash flow forecast' })
  async forecastCashFlow(@Query('periods') periods?: number) {
    return this.predictiveService.forecastCashFlow(periods ? Number(periods) : undefined);
  }

  @Get('forecast/inventory')
  @Permissions('ai.predict')
  @ApiOperation({ summary: 'Get inventory forecast' })
  async forecastInventory(@Query('periods') periods?: number) {
    return this.predictiveService.forecastInventory(periods ? Number(periods) : undefined);
  }

  @Post('document/analyze')
  @Permissions('ai.documents')
  @ApiOperation({ summary: 'Analyze a document using AI' })
  @HttpCode(HttpStatus.OK)
  async analyzeDocument(
    @Body()
    body: {
      name: string;
      type: string;
      ocrText?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.documentAiService.analyzeDocument(
      body.name,
      body.type,
      body.ocrText,
      body.metadata,
    );
  }

  @Post('document/suggest-tags')
  @Permissions('ai.documents')
  @ApiOperation({ summary: 'Suggest tags for a document' })
  @HttpCode(HttpStatus.OK)
  async suggestTags(@Body() body: { name: string; type: string; content: string }) {
    return this.documentAiService.suggestTags(body.name, body.type, body.content);
  }

  @Post('automation/suggestions')
  @Permissions('ai.automation')
  @ApiOperation({ summary: 'Get AI automation suggestions' })
  @HttpCode(HttpStatus.OK)
  async getAutomationSuggestions(@Body() body?: { systemState?: Record<string, unknown> }) {
    return this.smartAutomationService.getSuggestions(body?.systemState);
  }

  @Post('automation/approval-routing')
  @Permissions('ai.automation')
  @ApiOperation({ summary: 'Suggest approval routing' })
  @HttpCode(HttpStatus.OK)
  async suggestApprovalRouting(
    @Body() body: { amount: number; department: string; module: string },
  ) {
    return this.smartAutomationService.suggestApprovalRouting(
      body.amount,
      body.department,
      body.module,
    );
  }

  @Get('health')
  @ApiOperation({ summary: 'AI provider health check' })
  async getHealth() {
    return this.aiService.getHealth();
  }

  @Get('usage')
  @Permissions('ai.admin')
  @ApiOperation({ summary: 'Get token usage statistics' })
  async getUsage() {
    return this.tokenTracker.getTotalUsage();
  }

  @Get('usage/by-provider')
  @Permissions('ai.admin')
  @ApiOperation({ summary: 'Get usage by provider' })
  async getUsageByProvider() {
    return this.tokenTracker.getUsageByProvider();
  }

  @Get('conversations')
  @Permissions('ai.chat')
  @ApiOperation({ summary: 'Get user conversation list' })
  async getConversations(@CurrentUser('id') userId: string) {
    return this.conversationService.getUserConversations(userId);
  }

  @Get('conversations/:id')
  @Permissions('ai.chat')
  @ApiOperation({ summary: 'Get conversation history' })
  async getConversation(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const conv = this.conversationService.getConversation(id);
    if (!conv || conv.userId !== userId) {
      return null;
    }
    return conv;
  }

  @Delete('conversations/:id')
  @UseGuards(JwtAuthGuard)
  @Permissions('ai.chat')
  @ApiOperation({ summary: 'Delete a conversation' })
  @HttpCode(HttpStatus.OK)
  async deleteConversation(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const conv = this.conversationService.getConversation(id);
    if (!conv || conv.userId !== userId) {
      return { deleted: false };
    }
    return { deleted: this.conversationService.deleteConversation(id) };
  }

  @Post('provider/switch')
  @Permissions('ai.admin')
  @ApiOperation({ summary: 'Switch AI provider' })
  @HttpCode(HttpStatus.OK)
  async switchProvider(@Body() body: { provider: string }) {
    return { switched: await this.aiService.switchProvider(body.provider) };
  }

  @Get('templates')
  @Permissions('ai.admin')
  @ApiOperation({ summary: 'List prompt templates' })
  async getTemplates() {
    return this.promptManager.getAll();
  }
}
