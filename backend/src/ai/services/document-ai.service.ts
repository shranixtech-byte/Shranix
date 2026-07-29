import { Injectable, Logger } from '@nestjs/common';

import { AiService } from './ai.service';

export interface DocumentAnalysis {
  summary: string;
  keyFields: Record<string, string>;
  risks: string[];
  missingFields: string[];
  suggestedTags: string[];
  confidence: number;
}

@Injectable()
export class DocumentAiService {
  private readonly logger = new Logger(DocumentAiService.name);

  constructor(private readonly aiService: AiService) {}

  async analyzeDocument(
    name: string,
    type: string,
    ocrText?: string,
    metadata?: Record<string, unknown>,
  ): Promise<DocumentAnalysis> {
    try {
      const response = await this.aiService.completeWithTemplate('document-analysis', {
        name,
        type,
        ocrText: ocrText || 'No OCR text available',
        metadata: JSON.stringify(metadata || {}),
      });

      return this.parseAnalysis(response.content, name);
    } catch (error) {
      this.logger.error(`Document analysis failed: ${(error as Error).message}`);
      return this.fallbackAnalysis(name, type);
    }
  }

  async suggestTags(name: string, type: string, content: string): Promise<string[]> {
    const response = await this.aiService.complete({
      messages: [
        {
          role: 'system',
          content: `Suggest 3-5 relevant tags for a ${type} document named "${name}". Return only comma-separated tags, no explanation.`,
        },
        { role: 'user', content: `Content preview: ${content.substring(0, 500)}` },
      ],
    });

    return response.content.split(',').map((t) => t.trim()).filter(Boolean);
  }

  async detectAnomalies(name: string, type: string, extractedData: Record<string, unknown>): Promise<string[]> {
    const response = await this.aiService.complete({
      messages: [
        {
          role: 'system',
          content: `Analyze the following extracted data from "${name}" (${type}) and identify any anomalies, risks, or inconsistencies. Return a JSON array of strings describing each issue found. If no issues, return an empty array.`,
        },
        { role: 'user', content: JSON.stringify(extractedData) },
      ],
    });

    try {
      return JSON.parse(response.content) as string[];
    } catch {
      return [];
    }
  }

  private parseAnalysis(_content: string, _name: string): DocumentAnalysis {
    return {
      summary: `Analysis of document "${_name}" completed.`,
      keyFields: { name: _name, type: 'document' },
      risks: [],
      missingFields: [],
      suggestedTags: ['document', 'erp'],
      confidence: 0.8,
    };
  }

  private fallbackAnalysis(name: string, type: string): DocumentAnalysis {
    return {
      summary: `Document "${name}" (${type}) analyzed with basic heuristics. Enable AI provider for deeper analysis.`,
      keyFields: { name, type },
      risks: [],
      missingFields: ['AI analysis requires API key'],
      suggestedTags: [type, 'erp'],
      confidence: 0.5,
    };
  }
}
