import { Injectable, Logger } from '@nestjs/common';

import { AiProvider, AiProviderConfig, AiCompletionRequest, AiCompletionResponse } from './provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(config: AiProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || '';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = config.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const start = Date.now();

    // Convert messages to Gemini format
    const contents = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = request.messages.find((m) => m.role === 'system');

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 2048,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
    }

    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Gemini API error: ${response.status} ${error}`);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = (await response.json()) as Record<string, any>;
    void (Date.now() - start);

    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount || 0,
        completionTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0,
      } : undefined,
      model: this.model,
      provider: this.name,
    };
  }

  async healthCheck(): Promise<{ available: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const response = await fetch(
        `${this.baseUrl}/models?key=${this.apiKey}`,
      );
      return { available: response.ok, latencyMs: Date.now() - start };
    } catch {
      return { available: false, latencyMs: Date.now() - start };
    }
  }
}
