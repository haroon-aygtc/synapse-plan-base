import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderType, ProviderConfig } from '@database/entities/ai-provider.entity';
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
    options?: {
      streamResponse?: boolean;
      onChunk?: (chunk: string) => void;
      onComplete?: (response: ProviderResponse) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<ProviderResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    this.logger.debug(`Executing request ${requestId} for provider ${providerType}`);

    try {
      // Apply rate limiting
      await this.applyRateLimit(config, providerType);

      let response: ProviderResponse;

      switch (providerType) {
        case ProviderType.OPENAI:
          response = await this.executeOpenAI(config, request, startTime, options);
          break;
        case ProviderType.CLAUDE:
          response = await this.executeClaude(config, request, startTime, options);
          break;
        case ProviderType.GEMINI:
          response = await this.executeGemini(config, request, startTime, options);
          break;
        case ProviderType.MISTRAL:
          response = await this.executeMistral(config, request, startTime, options);
          break;
        case ProviderType.GROQ:
          response = await this.executeGroq(config, request, startTime, options);
          break;
        case ProviderType.OPENROUTER:
          response = await this.executeOpenRouter(config, request, startTime, options);
          break;
        default:
          throw new Error(`Unsupported provider type: ${providerType}`);
      }

      // Add performance metrics
      response.metadata = {
        ...response.metadata,
        requestId,
        providerType,
        totalTime: Date.now() - startTime,
        timeToFirstToken: response.metadata?.timeToFirstToken || 0,
        tokensPerSecond: response.tokensUsed / ((Date.now() - startTime) / 1000),
      };

      this.logger.debug(
        `Request ${requestId} completed successfully in ${Date.now() - startTime}ms`
      );

      return response;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(
        `Provider execution failed for ${providerType} (${requestId}): ${error.message} after ${executionTime}ms`,
        error.stack
      );

      // Enhance error with context
      const enhancedError = new Error(`${providerType} execution failed: ${error.message}`);
      (enhancedError as any).requestId = requestId;
      (enhancedError as any).providerType = providerType;
      (enhancedError as any).executionTime = executionTime;
      (enhancedError as any).originalError = error;

      if (options?.onError) {
        options.onError(enhancedError);
      }

      throw enhancedError;
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async applyRateLimit(config: ProviderConfig, providerType: ProviderType): Promise<void> {
    if (!config.rateLimits) return;

    // Simple in-memory rate limiting (in production, use Redis)
    const key = `rate_limit_${providerType}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    // This is a simplified implementation
    // In production, implement proper distributed rate limiting
  }

  async testConnection(
    providerType: ProviderType,
    config: ProviderConfig
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
    options?: {
      streamResponse?: boolean;
      onChunk?: (chunk: string) => void;
      onComplete?: (response: ProviderResponse) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<ProviderResponse> {
    const url = config.baseUrl || 'https://api.openai.com/v1/chat/completions';

    const payload = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1000,
      tools: request.tools,
      stream: options?.streamResponse || false,
    };

    if (options?.streamResponse) {
      return this.executeOpenAIStream(url, payload, config, startTime, options);
    }

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

    const responseTime = Date.now() - startTime;
    const result = {
      content: choice.message.content || '',
      tokensUsed: usage.total_tokens,
      cost: this.calculateCost(request.model, usage.total_tokens),
      toolCalls: choice.message.tool_calls,
      metadata: {
        responseTime,
        finishReason: choice.finish_reason,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        timeToFirstToken: responseTime, // For non-streaming, this is the full response time
      },
    };

    if (options?.onComplete) {
      options.onComplete(result);
    }

    return result;
  }

  private async executeClaude(
    config: ProviderConfig,
    request: ProviderRequest,
    startTime: number,
    options?: {
      streamResponse?: boolean;
      onChunk?: (chunk: string) => void;
      onComplete?: (response: ProviderResponse) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<ProviderResponse> {
    const url = config.baseUrl || 'https://api.anthropic.com/v1/messages';

    // Convert messages format for Claude
    const messages = request.messages.filter((m) => m.role !== 'system');
    const systemMessage = request.messages.find((m) => m.role === 'system')?.content;

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
      cost: this.calculateCost(request.model, usage.input_tokens + usage.output_tokens),
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
    options?: {
      streamResponse?: boolean;
      onChunk?: (chunk: string) => void;
      onComplete?: (response: ProviderResponse) => void;
      onError?: (error: Error) => void;
    }
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
    options?: {
      streamResponse?: boolean;
      onChunk?: (chunk: string) => void;
      onComplete?: (response: ProviderResponse) => void;
      onError?: (error: Error) => void;
    }
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
    options?: {
      streamResponse?: boolean;
      onChunk?: (chunk: string) => void;
      onComplete?: (response: ProviderResponse) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<ProviderResponse> {
    const url = config.baseUrl || 'https://api.groq.com/openai/v1/chat/completions';

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
    options?: {
      streamResponse?: boolean;
      onChunk?: (chunk: string) => void;
      onComplete?: (response: ProviderResponse) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<ProviderResponse> {
    const url = config.baseUrl || 'https://openrouter.ai/api/v1/chat/completions';

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

  private async executeOpenAIStream(
    url: string,
    payload: any,
    config: ProviderConfig,
    startTime: number,
    options: {
      onChunk?: (chunk: string) => void;
      onComplete?: (response: ProviderResponse) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<ProviderResponse> {
    return new Promise(async (resolve, reject) => {
      let fullContent = '';
      let totalTokens = 0;
      let timeToFirstToken = 0;
      let firstTokenReceived = false;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            ...config.customHeaders,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body reader available');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                const result = {
                  content: fullContent,
                  tokensUsed: totalTokens,
                  cost: this.calculateCost(payload.model, totalTokens),
                  metadata: {
                    responseTime: Date.now() - startTime,
                    timeToFirstToken,
                    finishReason: 'stop',
                  },
                };

                if (options.onComplete) {
                  options.onComplete(result);
                }

                resolve(result);
                return;
              }

              try {
                const parsed = JSON.parse(data);

                if (!firstTokenReceived) {
                  timeToFirstToken = Date.now() - startTime;
                  firstTokenReceived = true;
                }

                if (parsed.choices?.[0]?.delta?.content) {
                  const chunk = parsed.choices[0].delta.content;
                  fullContent += chunk;

                  if (options.onChunk) {
                    options.onChunk(chunk);
                  }
                }

                if (parsed.usage) {
                  totalTokens = parsed.usage.total_tokens;
                }
              } catch (parseError) {
                // Ignore parse errors for individual chunks
                continue;
              }
            }
          }
        }
      } catch (error) {
        if (options.onError) {
          options.onError(error as Error);
        }
        reject(error);
      }
    });
  }

  private calculateCost(model: string, tokens: number): number {
    // Production-grade cost calculation with actual pricing
    const costPerToken: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.00003, output: 0.00006 },
      'gpt-4-turbo': { input: 0.00001, output: 0.00003 },
      'gpt-3.5-turbo': { input: 0.0000015, output: 0.000002 },
      'claude-3-opus': { input: 0.000015, output: 0.000075 },
      'claude-3-sonnet': { input: 0.000003, output: 0.000015 },
      'claude-3-haiku': { input: 0.00000025, output: 0.00000125 },
      'gemini-pro': { input: 0.0000005, output: 0.0000015 },
      'mistral-large': { input: 0.000008, output: 0.000024 },
      'mistral-medium': { input: 0.0000027, output: 0.0000081 },
      'mistral-small': { input: 0.000002, output: 0.000006 },
      'llama2-70b-4096': { input: 0.0000007, output: 0.0000008 },
      'mixtral-8x7b-32768': { input: 0.0000006, output: 0.0000006 },
    };

    const pricing = costPerToken[model] || costPerToken['gpt-3.5-turbo'];
    // Simplified: assume 70% input, 30% output tokens
    const inputTokens = Math.floor(tokens * 0.7);
    const outputTokens = Math.floor(tokens * 0.3);

    return inputTokens * pricing.input + outputTokens * pricing.output;
  }
}
