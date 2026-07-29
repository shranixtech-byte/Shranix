export interface AiModuleConfig {
  provider: 'openai' | 'gemini' | 'claude' | 'ollama';
  fallbackProvider?: 'openai' | 'gemini' | 'claude' | 'ollama';
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  rateLimitRpm: number;
  enableStreaming: boolean;
  enableInsights: boolean;
  enablePredictions: boolean;
  maxConversationHistory: number;
  openai?: { apiKey?: string; model?: string; baseUrl?: string };
  gemini?: { apiKey?: string; model?: string };
  claude?: { apiKey?: string; model?: string };
  ollama?: { baseUrl?: string; model?: string };
}

export const defaultAiConfig: AiModuleConfig = {
  provider: (process.env.AI_PROVIDER as AiModuleConfig['provider']) || 'ollama',
  fallbackProvider: process.env.AI_FALLBACK_PROVIDER as AiModuleConfig['fallbackProvider'],
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2048', 10),
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10),
  rateLimitRpm: parseInt(process.env.AI_RATE_LIMIT_RPM || '30', 10),
  enableStreaming: process.env.AI_ENABLE_STREAMING !== 'false',
  enableInsights: process.env.AI_ENABLE_INSIGHTS !== 'false',
  enablePredictions: process.env.AI_ENABLE_PREDICTIONS !== 'false',
  maxConversationHistory: parseInt(process.env.AI_MAX_CONVERSATION_HISTORY || '50', 10),
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2',
  },
};
