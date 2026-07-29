import { Injectable } from '@nestjs/common';

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  provider: string;
  model: string;
  timestamp: Date;
  userId?: string;
}

interface CostRates {
  inputPer1k: number;
  outputPer1k: number;
}

const PROVIDER_COST_RATES: Record<string, CostRates> = {
  openai: { inputPer1k: 0.0025, outputPer1k: 0.01 },
  gemini: { inputPer1k: 0.0005, outputPer1k: 0.0015 },
  claude: { inputPer1k: 0.003, outputPer1k: 0.015 },
  ollama: { inputPer1k: 0, outputPer1k: 0 },
};

@Injectable()
export class TokenTrackerService {
  private readonly usageHistory: TokenUsage[] = [];
  private readonly maxHistory = 10000;

  track(usage: TokenUsage) {
    this.usageHistory.push(usage);
    if (this.usageHistory.length > this.maxHistory) {
      this.usageHistory.splice(0, this.usageHistory.length - this.maxHistory);
    }
  }

  getTotalUsage(): { totalTokens: number; totalCost: number; totalRequests: number } {
    let totalTokens = 0;
    let totalCost = 0;

    for (const usage of this.usageHistory) {
      totalTokens += usage.totalTokens;
      const rates = PROVIDER_COST_RATES[usage.provider];
      if (rates) {
        totalCost += (usage.promptTokens / 1000) * rates.inputPer1k;
        totalCost += (usage.completionTokens / 1000) * rates.outputPer1k;
      }
    }

    return { totalTokens, totalCost, totalRequests: this.usageHistory.length };
  }

  getUsageByProvider(): Record<string, { tokens: number; cost: number; requests: number }> {
    const byProvider: Record<string, { tokens: number; cost: number; requests: number }> = {};

    for (const usage of this.usageHistory) {
      if (!byProvider[usage.provider]) {
        byProvider[usage.provider] = { tokens: 0, cost: 0, requests: 0 };
      }
      byProvider[usage.provider].tokens += usage.totalTokens;
      byProvider[usage.provider].requests += 1;

      const rates = PROVIDER_COST_RATES[usage.provider];
      if (rates) {
        byProvider[usage.provider].cost += (usage.promptTokens / 1000) * rates.inputPer1k;
        byProvider[usage.provider].cost += (usage.completionTokens / 1000) * rates.outputPer1k;
      }
    }

    return byProvider;
  }

  getUsageByUser(userId: string): { totalTokens: number; requests: number } {
    let totalTokens = 0;
    let requests = 0;

    for (const usage of this.usageHistory) {
      if (usage.userId === userId) {
        totalTokens += usage.totalTokens;
        requests += 1;
      }
    }

    return { totalTokens, requests };
  }

  getRecentUsage(hours = 24): TokenUsage[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.usageHistory.filter((u) => u.timestamp >= cutoff);
  }
}
