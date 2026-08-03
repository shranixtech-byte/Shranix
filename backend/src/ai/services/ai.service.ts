import { OnModuleInit, Injectable, Logger } from '@nestjs/common';

import { defaultAiConfig, type AiModuleConfig } from '../ai.config';
import { ClaudeProvider } from '../providers/claude.provider';
import { GeminiProvider } from '../providers/gemini.provider';
import { OllamaProvider } from '../providers/ollama.provider';
import { OpenAIProvider } from '../providers/openai.provider';
import {
  AiProvider,
  AiCompletionRequest,
  AiCompletionResponse,
} from '../providers/provider.interface';

import { AiAuditService } from './ai-audit.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { DataMaskService } from './data-mask.service';
import { PromptGuardService } from './prompt-guard.service';
import { PromptManagerService } from './prompt-manager.service';
import { TokenTrackerService } from './token-tracker.service';

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private provider!: AiProvider;
  private fallbackProvider?: AiProvider;
  private readonly config: AiModuleConfig;
  private requestCount = 0;
  private rateLimitReset = Date.now();

  constructor(
    private readonly promptManager: PromptManagerService,
    private readonly tokenTracker: TokenTrackerService,
    private readonly dataMask: DataMaskService,
    private readonly aiAudit: AiAuditService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly promptGuard: PromptGuardService,
  ) {
    this.config = defaultAiConfig;
  }

  onModuleInit() {
    this.provider = this.createProvider(this.config.provider);
    if (this.config.fallbackProvider) {
      this.fallbackProvider = this.createProvider(this.config.fallbackProvider);
    }
    this.logger.log(
      `AI module initialized with provider: ${this.provider.name}/${this.provider.model}`,
    );
    if (this.fallbackProvider) {
      this.logger.log(
        `Fallback provider: ${this.fallbackProvider.name}/${this.fallbackProvider.model}`,
      );
    }
  }

  private createProvider(name: string): AiProvider {
    switch (name) {
      case 'openai':
        return new OpenAIProvider(this.config.openai);
      case 'gemini':
        return new GeminiProvider(this.config.gemini);
      case 'claude':
        return new ClaudeProvider(this.config.claude);
      case 'ollama':
        return new OllamaProvider(this.config.ollama);
      default:
        this.logger.warn(`Unknown provider: ${name}, falling back to ollama`);
        return new OllamaProvider();
    }
  }

  async complete(request: AiCompletionRequest, userId?: string): Promise<AiCompletionResponse> {
    await this.checkRateLimit();

    const startTime = Date.now();
    const endpoint = 'complete';
    let success = false;
    let errorMsg: string | undefined;

    try {
      // 1. Prompt Injection Protection - check all user messages
      for (const msg of request.messages) {
        if (msg.role === 'user') {
          const sanitized = this.promptGuard.sanitize(msg.content);
          msg.content = sanitized;

          const check = this.promptGuard.check(sanitized);
          if (!check.safe) {
            this.logger.warn(`Prompt injection detected: ${check.reason}`);
            await this.aiAudit.logSecurityViolation(
              userId,
              `Prompt injection detected: ${check.reason}`,
              {
                endpoint,
                sanitizedPrompt: sanitized.substring(0, 200),
              },
            );
            throw new Error(`Prompt rejected: ${check.reason}`);
          }
        }
      }

      // 2. Data Masking - mask sensitive data in user messages
      const maskedMessages: Array<{ role: string; content: string }> = this.dataMask.maskPrompt(
        request.messages.map((m) => ({ role: m.role, content: m.content })),
      );
      const maskedRequest = {
        ...request,
        messages: maskedMessages as AiCompletionRequest['messages'],
      };

      // 3. Circuit Breaker with retry, timeout, and fallback
      const response = await this.circuitBreaker.call<AiCompletionResponse>(
        `${this.provider.name}:${endpoint}`,
        async () => {
          const result = await this.provider.complete(maskedRequest);
          return result;
        },
        this.fallbackProvider
          ? async () => {
              this.logger.log('Using fallback provider for completion');
              const result = await this.fallbackProvider!.complete(maskedRequest);
              return result;
            }
          : undefined,
        30000, // 30 second timeout
        2, // 2 retries
      );

      // 4. Token Tracking
      if (response.usage) {
        this.tokenTracker.track({
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
          provider: this.provider.name,
          model: response.model,
          timestamp: new Date(),
          userId,
        });
      }

      success = true;
      return response;
    } catch (error) {
      errorMsg = (error as Error).message;
      throw error;
    } finally {
      // 5. Audit Logging
      const latencyMs = Date.now() - startTime;
      this.aiAudit
        .logAiInteraction({
          userId,
          action: 'complete',
          provider: this.provider.name,
          model: this.provider.model,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          latencyMs,
          success,
          error: errorMsg,
          endpoint,
        })
        .catch((err) => this.logger.error(`Audit log failed: ${(err as Error).message}`));
    }
  }

  async completeWithTemplate(
    templateId: string,
    variables: Record<string, string>,
    userId?: string,
  ): Promise<AiCompletionResponse> {
    const { systemPrompt, userPrompt } = this.promptManager.buildPrompt(templateId, variables);
    const template = this.promptManager.get(templateId);

    return this.complete(
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: template?.temperature ?? this.config.temperature,
        maxTokens: template?.maxTokens ?? this.config.maxTokens,
      },
      userId,
    );
  }

  async chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    userId?: string,
  ): Promise<AiCompletionResponse> {
    return this.complete({ messages }, userId);
  }

  async getHealth(): Promise<{
    provider: string;
    model: string;
    available: boolean;
    latencyMs: number;
    fallbackAvailable: boolean;
  }> {
    const startTime = Date.now();

    const getPrimaryHealth = async () => {
      try {
        return await this.circuitBreaker.call(
          `${this.provider.name}:health`,
          () => this.provider.healthCheck(),
          undefined,
          5000, // 5s timeout for health checks
          0, // no retries for health checks
        );
      } catch {
        return { available: false, latencyMs: 0 };
      }
    };

    const getFallbackHealth = async () => {
      const fb = this.fallbackProvider;
      if (!fb) {
        return { available: false, latencyMs: 0 };
      }
      try {
        return await this.circuitBreaker.call(
          `${fb.name}:health`,
          () => fb.healthCheck(),
          undefined,
          5000,
          0,
        );
      } catch {
        return { available: false, latencyMs: 0 };
      }
    };

    const [primaryHealth, fallbackHealth] = await Promise.all([
      getPrimaryHealth(),
      getFallbackHealth(),
    ]);

    return {
      provider: this.provider.name,
      model: this.provider.model,
      available: primaryHealth.available,
      latencyMs: Date.now() - startTime,
      fallbackAvailable: fallbackHealth.available,
    };
  }

  async switchProvider(name: string): Promise<boolean> {
    try {
      this.provider = this.createProvider(name);
      this.logger.log(`Switched to provider: ${this.provider.name}/${this.provider.model}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to switch provider: ${(error as Error).message}`);
      return false;
    }
  }

  private async checkRateLimit() {
    const now = Date.now();
    if (now > this.rateLimitReset) {
      this.requestCount = 0;
      this.rateLimitReset = now + 60000;
    }

    this.requestCount++;
    if (this.requestCount > this.config.rateLimitRpm) {
      throw new Error(`Rate limit exceeded: ${this.config.rateLimitRpm} requests per minute`);
    }
  }
}
