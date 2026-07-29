import { Injectable, Logger } from '@nestjs/common';

import { AiProvider, AiProviderConfig, AiCompletionRequest, AiCompletionResponse } from './provider.interface';

@Injectable()
export class ClaudeProvider implements AiProvider {
  readonly name = 'claude';
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly logger = new Logger(ClaudeProvider.name);

  constructor(config: AiProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.CLAUDE_API_KEY || '';
    this.baseUrl = 'https://api.anthropic.com/v1';
    this.model = config.model || process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const start = Date.now();
    const systemMsg = request.messages.find((m) => m.role === 'system');
    const messages = request.messages.filter((m) => m.role !== 'system').map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      max_tokens: request.maxTokens ?? 2048,
      temperature: request.temperature ?? 0.7,
    };

    if (systemMsg) {
      body.system = systemMsg.content;
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Claude API error: ${response.status} ${error}`);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = (await response.json()) as Record<string, any>;
    void (Date.now() - start);

    return {
      content: data.content?.[0]?.text || '',
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens || 0,
        completionTokens: data.usage.output_tokens || 0,
        totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
      } : undefined,
      model: data.model || this.model,
      provider: this.name,
    };
  }

  async healthCheck(): Promise<{ available: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
      });
      return { available: response.ok, latencyMs: Date.now() - start };
    } catch {
      return { available: false, latencyMs: Date.now() - start };
    }
  }
}
