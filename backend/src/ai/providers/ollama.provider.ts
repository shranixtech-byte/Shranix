import { Injectable, Logger } from '@nestjs/common';

import { AiProvider, AiProviderConfig, AiCompletionRequest, AiCompletionResponse } from './provider.interface';

@Injectable()
export class OllamaProvider implements AiProvider {
  readonly name = 'ollama';
  readonly model: string;
  private readonly baseUrl: string;
  private readonly logger = new Logger(OllamaProvider.name);

  constructor(config: AiProviderConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = config.model || process.env.OLLAMA_MODEL || 'llama3.2';
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const start = Date.now();

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 2048,
        },
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Ollama API error: ${response.status} ${error}`);
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = (await response.json()) as Record<string, any>;
    void (Date.now() - start);

    return {
      content: data.message?.content || '',
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      model: data.model || this.model,
      provider: this.name,
    };
  }

  async healthCheck(): Promise<{ available: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return { available: response.ok, latencyMs: Date.now() - start };
    } catch {
      return { available: false, latencyMs: Date.now() - start };
    }
  }
}
