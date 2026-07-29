import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';

import { AiController } from './controllers/ai.controller';
import { McpToolsService } from './mcp/mcp-tools.service';
import { AiAuditService } from './services/ai-audit.service';
import { AiService } from './services/ai.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { ConversationService } from './services/conversation.service';
import { CopilotService } from './services/copilot.service';
import { DataMaskService } from './services/data-mask.service';
import { DocumentAiService } from './services/document-ai.service';
import { InsightsService } from './services/insights.service';
import { NLQueryService } from './services/nl-query.service';
import { AiPermissionSeedService } from './services/permission-seed.service';
import { PredictiveService } from './services/predictive.service';
import { PromptGuardService } from './services/prompt-guard.service';
import { PromptManagerService } from './services/prompt-manager.service';
import { SmartAutomationService } from './services/smart-automation.service';
import { TokenTrackerService } from './services/token-tracker.service';

@Module({
  controllers: [AiController],
  imports: [CommonModule],
  providers: [
    AiService,
    PromptManagerService,
    ConversationService,
    TokenTrackerService,
    CopilotService,
    NLQueryService,
    InsightsService,
    PredictiveService,
    DocumentAiService,
    SmartAutomationService,
    DataMaskService,
    AiAuditService,
    PromptGuardService,
    AiPermissionSeedService,
    CircuitBreakerService,
    McpToolsService,
  ],
  exports: [
    AiService,
    CopilotService,
    InsightsService,
    PredictiveService,
    DocumentAiService,
    SmartAutomationService,
    DataMaskService,
    AiAuditService,
    PromptGuardService,
    McpToolsService,
    ConversationService,
    TokenTrackerService,
  ],
})
export class AiModule {}
