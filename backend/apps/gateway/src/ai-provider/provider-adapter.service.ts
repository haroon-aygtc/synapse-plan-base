import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ProviderType,
  ProviderConfig,
} from '@database/entities/ai-provider.entity';
import axios from 'axios';

export interface ProviderRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: any[];
  }>;
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
}

export interface ProviderResponse {
  content: string;
  tokensUsed: number;
  cost: number;
  toolCalls?: Array<{
    id: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  metadata?: Record<string, any>;
}

export interface ConnectionTestResult {
  success: boolean;
  responseTime?: number;
  error?: string;
}

@Injectable()
export class ProviderAdapterService {
  private readonly logger = new Logger(ProviderAdapterService.name);

  constructor(private readonly configService: ConfigService) {}

  async executeRequest(
    providerType: ProviderType,
    config: ProviderConfig,
    request: ProviderRequest,
  ): Promise<ProviderResponse> {
    const startTime = Date.now();

    try {
      switch (providerType) {
        case ProviderType.OPENAI:
          return await this.executeOpenAI(config, request, startTime);
        case ProviderType.CLAUDE:
          return await this.executeClaude(config, request, startTime);
        case ProviderType.GEMINI:
          return await this.executeGemini(config, request, startTime);
        case ProviderType.MISTRAL:
          return await this.executeMistral(config, request, startTime);
        case ProviderType.GROQ:
          return await this.executeGroq(config, request, startTime);
        case ProviderType.OPENROUTER:
          return await this.executeOpenRouter(config, request, startTime);
        default:
          throw new Error(`Unsupported provider type: ${providerType}`);
      }
    } catch (error) {
      this.logger.error(
        `Provider execution failed for ${providerType}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async testConnection(
    providerType: ProviderType,
    config: ProviderConfig,
  ): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      const testRequest: ProviderRequest = {
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a connection test.',
          },
        ],
        model: this.getDefaultModel(providerType),
        maxTokens: 10,
        temperature: 0,
      };

      await this.executeRequest(providerType, config, testRequest);

      return {
        success: true,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async executeOpenAI(
    config: ProviderConfig,
    request: ProviderRequest,
    startTime: number,
  ): Promise<ProviderResponse> {
    const url = config.baseUrl || 'https://api.openai.com/v1/chat/completions';

    const payload = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1000,
      tools: request.tools,
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        ...config.customHeaders,
      },
      timeout: config.timeout || 30000,
    });

    const choice = response.data.choices[0];
    const usage = response.data.usage;

    return {
      content: choice.message.content || '',
      tokensUsed: usage.total_tokens,
      cost: this.calculateCost(request.model, usage.total_tokens),
      toolCalls: choice.message.tool_calls,
      metadata: {
        responseTime: Date.now() - startTime,
        finishReason: choice.finish_reason,
      },
    };
  }

  private async executeClaude(
    config: ProviderConfig,
    request: ProviderRequest,
    startTime: number,
  ): Promise<ProviderResponse> {
    const url = config.baseUrl || 'https://api.anthropic.com/v1/messages';

    // Convert messages format for Claude
    const messages = request.messages.filter((m) => m.role !== 'system');
    const systemMessage = request.messages.find(
      (m) => m.role === 'system',
    )?.content;

    const payload = {
      model: request.model,
      messages,
      system: systemMessage,
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7,
    };

    const response = await axios.post(url, payload, {
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        ...config.customHeaders,
      },
      timeout: config.timeout || 30000,
    });

    const content = response.data.content[0];
    const usage = response.data.usage;

    return {
      content: content.text || '',
      tokensUsed: usage.input_tokens + usage.output_tokens,
      cost: this.calculateCost(
        request.model,
        usage.input_tokens + usage.output_tokens,
      ),
      metadata: {
        responseTime: Date.now() - startTime,
        stopReason: response.data.stop_reason,
      },
    };
  }

  private async executeGemini(
    config: ProviderConfig,
    request: ProviderRequest,
    startTime: number,
  ): Promise<ProviderResponse> {
    const url =
      config.baseUrl ||
      `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent`;

    // Convert messages format for Gemini
    const contents = request.messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const payload = {
      contents,
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 1000,
      },
    };

    const response = await axios.post(`${url}?key=${config.apiKey}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...config.customHeaders,
      },
      timeout: config.timeout || 30000,
    });

    const candidate = response.data.candidates[0];
    const content = candidate.content.parts[0].text;
    const usage = response.data.usageMetadata;

    return {
      content: content || '',
      tokensUsed: usage.totalTokenCount || 0,
      cost: this.calculateCost(request.model, usage.totalTokenCount || 0),
      metadata: {
        responseTime: Date.now() - startTime,
        finishReason: candidate.finishReason,
      },
    };
  }

  private async executeMistral(
    config: ProviderConfig,
    request: ProviderRequest,
    startTime: number,
  ): Promise<ProviderResponse> {
    const url = config.baseUrl || 'https://api.mistral.ai/v1/chat/completions';

    const payload = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1000,
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        ...config.customHeaders,
      },
      timeout: config.timeout || 30000,
    });

    const choice = response.data.choices[0];
    const usage = response.data.usage;

    return {
      content: choice.message.content || '',
      tokensUsed: usage.total_tokens,
      cost: this.calculateCost(request.model, usage.total_tokens),
      metadata: {
        responseTime: Date.now() - startTime,
        finishReason: choice.finish_reason,
      },
    };
  }

  private async executeGroq(
    config: ProviderConfig,
    request: ProviderRequest,
    startTime: number,
  ): Promise<ProviderResponse> {
    const url =
      config.baseUrl || 'https://api.groq.com/openai/v1/chat/completions';

    const payload = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1000,
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        ...config.customHeaders,
      },
      timeout: config.timeout || 30000,
    });

    const choice = response.data.choices[0];
    const usage = response.data.usage;

    return {
      content: choice.message.content || '',
      tokensUsed: usage.total_tokens,
      cost: this.calculateCost(request.model, usage.total_tokens),
      metadata: {
        responseTime: Date.now() - startTime,
        finishReason: choice.finish_reason,
      },
    };
  }

  private async executeOpenRouter(
    config: ProviderConfig,
    request: ProviderRequest,
    startTime: number,
  ): Promise<ProviderResponse> {
    const url =
      config.baseUrl || 'https://openrouter.ai/api/v1/chat/completions';

    const payload = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1000,
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://tempo.build',
        'X-Title': 'Tempo AI Platform',
        ...config.customHeaders,
      },
      timeout: config.timeout || 30000,
    });

    const choice = response.data.choices[0];
    const usage = response.data.usage;

    return {
      content: choice.message.content || '',
      tokensUsed: usage.total_tokens,
      cost: this.calculateCost(request.model, usage.total_tokens),
      metadata: {
        responseTime: Date.now() - startTime,
        finishReason: choice.finish_reason,
      },
    };
  }

  private getDefaultModel(providerType: ProviderType): string {
    const defaultModels = {
      [ProviderType.OPENAI]: 'gpt-3.5-turbo',
      [ProviderType.CLAUDE]: 'claude-3-haiku-20240307',
      [ProviderType.GEMINI]: 'gemini-pro',
      [ProviderType.MISTRAL]: 'mistral-small-latest',
      [ProviderType.GROQ]: 'llama2-70b-4096',
      [ProviderType.OPENROUTER]: 'openai/gpt-3.5-turbo',
    };

    return defaultModels[providerType] || 'gpt-3.5-turbo';
  }

  private calculateCost(model: string, tokens: number): number {
    // Simplified cost calculation - in production, use actual pricing
    const costPerToken: Record<string, number> = {
      'gpt-4': 0.00003,
      'gpt-4-turbo': 0.00001,
      'gpt-3.5-turbo': 0.000002,
      'claude-3-opus': 0.000015,
      'claude-3-sonnet': 0.000003,
      'claude-3-haiku': 0.00000025,
      'gemini-pro': 0.000001,
      'mistral-large': 0.000006,
      'mistral-medium': 0.000003,
      'mistral-small': 0.000001,
      'llama2-70b-4096': 0.0000007,
      'mixtral-8x7b-32768': 0.0000006,
    };

    return (costPerToken[model] || costPerToken['gpt-3.5-turbo']) * tokens;
  }
}
