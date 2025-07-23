import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ProviderType,
  ProviderConfig,
} from '@database/entities/ai-provider.entity';
import OpenAI from 'openai';
import axios from 'axios';

export interface ProviderResponse {
  content: string;
  tokensUsed: number;
  cost: number;
  model: string;
  finishReason?: string;
  metadata?: Record<string, any>;
}

export interface ProviderRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  stream?: boolean;
}

@Injectable()
export class ProviderAdapterService {
  private readonly logger = new Logger(ProviderAdapterService.name);
  private readonly adapters = new Map<ProviderType, any>();

  constructor(private readonly configService: ConfigService) {
    this.initializeAdapters();
  }

  private initializeAdapters() {
    // Initialize adapters for each provider type
    this.adapters.set(ProviderType.OPENAI, this.createOpenAIAdapter());
    this.adapters.set(ProviderType.CLAUDE, this.createClaudeAdapter());
    this.adapters.set(ProviderType.GEMINI, this.createGeminiAdapter());
    this.adapters.set(ProviderType.MISTRAL, this.createMistralAdapter());
    this.adapters.set(ProviderType.GROQ, this.createGroqAdapter());
    this.adapters.set(ProviderType.OPENROUTER, this.createOpenRouterAdapter());
  }

  async executeRequest(
    providerType: ProviderType,
    config: ProviderConfig,
    request: ProviderRequest,
  ): Promise<ProviderResponse> {
    const adapter = this.adapters.get(providerType);
    if (!adapter) {
      throw new Error(`Unsupported provider type: ${providerType}`);
    }

    const startTime = Date.now();
    try {
      const response = await adapter.execute(config, request);
      const responseTime = Date.now() - startTime;

      this.logger.debug(
        `Provider ${providerType} request completed in ${responseTime}ms`,
      );

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `Provider ${providerType} request failed after ${responseTime}ms: ${error.message}`,
      );
      throw error;
    }
  }

  async testConnection(
    providerType: ProviderType,
    config: ProviderConfig,
  ): Promise<{ success: boolean; responseTime?: number; error?: string }> {
    const startTime = Date.now();

    try {
      const testRequest: ProviderRequest = {
        messages: [
          {
            role: 'user',
            content:
              'Hello, this is a connection test. Please respond with "OK".',
          },
        ],
        model: this.getDefaultModel(providerType),
        temperature: 0.1,
        maxTokens: 10,
      };

      await this.executeRequest(providerType, config, testRequest);
      const responseTime = Date.now() - startTime;

      return { success: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        responseTime,
        error: error.message,
      };
    }
  }

  getAvailableModels(providerType: ProviderType): string[] {
    switch (providerType) {
      case ProviderType.OPENAI:
        return ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o'];
      case ProviderType.CLAUDE:
        return [
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
        ];
      case ProviderType.GEMINI:
        return ['gemini-pro', 'gemini-pro-vision'];
      case ProviderType.MISTRAL:
        return [
          'mistral-large-latest',
          'mistral-medium-latest',
          'mistral-small-latest',
        ];
      case ProviderType.GROQ:
        return ['llama2-70b-4096', 'mixtral-8x7b-32768', 'gemma-7b-it'];
      case ProviderType.OPENROUTER:
        return [
          'openai/gpt-4-turbo',
          'openai/gpt-3.5-turbo',
          'anthropic/claude-3-opus',
          'anthropic/claude-3-sonnet',
          'google/gemini-pro',
          'meta-llama/llama-2-70b-chat',
          'mistralai/mistral-7b-instruct',
        ];
      default:
        return [];
    }
  }

  private getDefaultModel(providerType: ProviderType): string {
    const models = this.getAvailableModels(providerType);
    return models[0] || 'default';
  }

  private createOpenAIAdapter() {
    return {
      execute: async (
        config: ProviderConfig,
        request: ProviderRequest,
      ): Promise<ProviderResponse> => {
        const client = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseUrl,
          timeout: config.timeout || 30000,
        });

        const completion = await client.chat.completions.create({
          model: request.model,
          messages: request.messages as any,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          tools: request.tools,
          stream: request.stream || false,
        });

        const choice = completion.choices[0];
        const tokensUsed = completion.usage?.total_tokens || 0;
        const cost = this.calculateOpenAICost(request.model, tokensUsed);

        return {
          content: choice.message.content || '',
          tokensUsed,
          cost,
          model: request.model,
          finishReason: choice.finish_reason || undefined,
          metadata: {
            usage: completion.usage,
            toolCalls: choice.message.tool_calls,
          },
        };
      },
    };
  }

  private createClaudeAdapter() {
    return {
      execute: async (
        config: ProviderConfig,
        request: ProviderRequest,
      ): Promise<ProviderResponse> => {
        const baseUrl = config.baseUrl || 'https://api.anthropic.com';
        const url = `${baseUrl}/v1/messages`;

        // Convert messages format for Claude
        const systemMessage = request.messages.find((m) => m.role === 'system');
        const messages = request.messages.filter((m) => m.role !== 'system');

        const response = await axios.post(
          url,
          {
            model: request.model,
            max_tokens: request.maxTokens || 1000,
            temperature: request.temperature,
            system: systemMessage?.content,
            messages: messages,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': config.apiKey,
              'anthropic-version': '2023-06-01',
              ...config.customHeaders,
            },
            timeout: config.timeout || 30000,
          },
        );

        const content = response.data.content[0];
        const tokensUsed =
          response.data.usage.input_tokens + response.data.usage.output_tokens;
        const cost = this.calculateClaudeCost(request.model, tokensUsed);

        return {
          content: content.type === 'text' ? content.text : '',
          tokensUsed,
          cost,
          model: request.model,
          finishReason: response.data.stop_reason || undefined,
          metadata: {
            usage: response.data.usage,
            stopSequence: response.data.stop_sequence,
          },
        };
      },
    };
  }

  private createGeminiAdapter() {
    return {
      execute: async (
        config: ProviderConfig,
        request: ProviderRequest,
      ): Promise<ProviderResponse> => {
        const baseUrl =
          config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
        const url = `${baseUrl}/models/${request.model}:generateContent`;

        // Convert messages format for Gemini
        const contents = request.messages.map((msg) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        }));

        const response = await axios.post(
          url,
          {
            contents,
            generationConfig: {
              temperature: request.temperature,
              maxOutputTokens: request.maxTokens,
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': config.apiKey,
              ...config.customHeaders,
            },
            timeout: config.timeout || 30000,
          },
        );

        const candidate = response.data.candidates[0];
        const content = candidate.content.parts[0].text;
        const tokensUsed = response.data.usageMetadata?.totalTokenCount || 0;
        const cost = this.calculateGeminiCost(request.model, tokensUsed);

        return {
          content,
          tokensUsed,
          cost,
          model: request.model,
          finishReason: candidate.finishReason,
          metadata: {
            usageMetadata: response.data.usageMetadata,
            safetyRatings: candidate.safetyRatings,
          },
        };
      },
    };
  }

  private createMistralAdapter() {
    return {
      execute: async (
        config: ProviderConfig,
        request: ProviderRequest,
      ): Promise<ProviderResponse> => {
        const baseUrl = config.baseUrl || 'https://api.mistral.ai/v1';
        const url = `${baseUrl}/chat/completions`;

        const response = await axios.post(
          url,
          {
            model: request.model,
            messages: request.messages,
            temperature: request.temperature,
            max_tokens: request.maxTokens,
            stream: request.stream || false,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.apiKey}`,
              ...config.customHeaders,
            },
            timeout: config.timeout || 30000,
          },
        );

        const choice = response.data.choices[0];
        const tokensUsed = response.data.usage?.total_tokens || 0;
        const cost = this.calculateMistralCost(request.model, tokensUsed);

        return {
          content: choice.message.content,
          tokensUsed,
          cost,
          model: request.model,
          finishReason: choice.finish_reason,
          metadata: {
            usage: response.data.usage,
          },
        };
      },
    };
  }

  private createGroqAdapter() {
    return {
      execute: async (
        config: ProviderConfig,
        request: ProviderRequest,
      ): Promise<ProviderResponse> => {
        const baseUrl = config.baseUrl || 'https://api.groq.com/openai/v1';
        const url = `${baseUrl}/chat/completions`;

        const response = await axios.post(
          url,
          {
            model: request.model,
            messages: request.messages,
            temperature: request.temperature,
            max_tokens: request.maxTokens,
            stream: request.stream || false,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.apiKey}`,
              ...config.customHeaders,
            },
            timeout: config.timeout || 30000,
          },
        );

        const choice = response.data.choices[0];
        const tokensUsed = response.data.usage?.total_tokens || 0;
        const cost = this.calculateGroqCost(request.model, tokensUsed);

        return {
          content: choice.message.content,
          tokensUsed,
          cost,
          model: request.model,
          finishReason: choice.finish_reason,
          metadata: {
            usage: response.data.usage,
          },
        };
      },
    };
  }

  // Cost calculation methods
  private calculateOpenAICost(model: string, tokens: number): number {
    const pricing = {
      'gpt-4': 0.00003,
      'gpt-4-turbo': 0.00001,
      'gpt-3.5-turbo': 0.000002,
      'gpt-4o': 0.000005,
    };
    return (pricing[model] || pricing['gpt-3.5-turbo']) * tokens;
  }

  private calculateClaudeCost(model: string, tokens: number): number {
    const pricing = {
      'claude-3-opus-20240229': 0.000015,
      'claude-3-sonnet-20240229': 0.000003,
      'claude-3-haiku-20240307': 0.00000025,
    };
    return (pricing[model] || pricing['claude-3-sonnet-20240229']) * tokens;
  }

  private calculateGeminiCost(model: string, tokens: number): number {
    const pricing = {
      'gemini-pro': 0.000001,
      'gemini-pro-vision': 0.000002,
    };
    return (pricing[model] || pricing['gemini-pro']) * tokens;
  }

  private calculateMistralCost(model: string, tokens: number): number {
    const pricing = {
      'mistral-large-latest': 0.000008,
      'mistral-medium-latest': 0.0000027,
      'mistral-small-latest': 0.000002,
    };
    return (pricing[model] || pricing['mistral-small-latest']) * tokens;
  }

  private calculateGroqCost(model: string, tokens: number): number {
    const pricing = {
      'llama2-70b-4096': 0.0000007,
      'mixtral-8x7b-32768': 0.0000002,
      'gemma-7b-it': 0.0000001,
    };
    return (pricing[model] || pricing['gemma-7b-it']) * tokens;
  }

  private createOpenRouterAdapter() {
    return {
      execute: async (
        config: ProviderConfig,
        request: ProviderRequest,
      ): Promise<ProviderResponse> => {
        const baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
        const url = `${baseUrl}/chat/completions`;

        const response = await axios.post(
          url,
          {
            model: request.model,
            messages: request.messages,
            temperature: request.temperature,
            max_tokens: request.maxTokens,
            stream: request.stream || false,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.apiKey}`,
              'HTTP-Referer': 'https://synapseai.com',
              'X-Title': 'SynapseAI',
              ...config.customHeaders,
            },
            timeout: config.timeout || 30000,
          },
        );

        const choice = response.data.choices[0];
        const tokensUsed = response.data.usage?.total_tokens || 0;
        const cost = this.calculateOpenRouterCost(request.model, tokensUsed);

        return {
          content: choice.message.content,
          tokensUsed,
          cost,
          model: request.model,
          finishReason: choice.finish_reason,
          metadata: {
            usage: response.data.usage,
            generation_id: response.data.id,
          },
        };
      },
    };
  }

  private calculateOpenRouterCost(model: string, tokens: number): number {
    const pricing = {
      'openai/gpt-4-turbo': 0.00001,
      'openai/gpt-3.5-turbo': 0.000002,
      'anthropic/claude-3-opus': 0.000015,
      'anthropic/claude-3-sonnet': 0.000003,
      'google/gemini-pro': 0.000001,
      'meta-llama/llama-2-70b-chat': 0.0000007,
      'mistralai/mistral-7b-instruct': 0.0000002,
    };
    return (pricing[model] || 0.000005) * tokens; // Default pricing
  }
}
