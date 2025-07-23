/**
 * Provider Module
 * Manages AI provider configurations and routing
 */

import { BaseModule } from "./base";
import { SynapseAI } from "../client";
import {
  APIResponse,
  PaginatedResponse,
  AIProvider,
  ProviderConfiguration,
  RequestOptions,
} from "../types";

export interface CreateProviderRequest {
  name: string;
  type: "openai" | "anthropic" | "google" | "mistral" | "groq" | "custom";
  configuration: ProviderConfiguration;
  isActive?: boolean;
  priority?: number;
}

export interface UpdateProviderRequest {
  name?: string;
  configuration?: Partial<ProviderConfiguration>;
  isActive?: boolean;
  priority?: number;
}

export interface ProviderListOptions {
  page?: number;
  limit?: number;
  type?: "openai" | "anthropic" | "google" | "mistral" | "groq" | "custom";
  isActive?: boolean;
  sortBy?: "name" | "priority" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface ProviderPerformance {
  providerId: string;
  providerName: string;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    averageTokensPerSecond: number;
    totalCost: number;
    successRate: number;
    uptime: number;
  };
  trends: Array<{
    timestamp: string;
    requests: number;
    responseTime: number;
    successRate: number;
    cost: number;
  }>;
  errors: Array<{
    timestamp: string;
    error: string;
    count: number;
  }>;
}

export interface ProviderRouting {
  rules: Array<{
    id: string;
    name: string;
    conditions: {
      model?: string[];
      requestType?: string[];
      priority?: "low" | "medium" | "high";
      costThreshold?: number;
      performanceThreshold?: number;
    };
    providers: Array<{
      providerId: string;
      weight: number;
      fallback: boolean;
    }>;
    isActive: boolean;
  }>;
  defaultProvider: string;
  fallbackProvider: string;
  loadBalancing: {
    strategy: "round_robin" | "weighted" | "performance" | "cost";
    healthCheckInterval: number;
    failoverThreshold: number;
  };
}

export interface ProviderUsage {
  providerId: string;
  period: { start: Date; end: Date };
  usage: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    requestsByModel: Record<string, number>;
    tokensByModel: Record<string, number>;
    costByModel: Record<string, number>;
  };
  quotas: {
    requestsPerMinute: {
      used: number;
      limit: number;
      percentage: number;
    };
    tokensPerMinute: {
      used: number;
      limit: number;
      percentage: number;
    };
    monthlyCost: {
      used: number;
      limit: number;
      percentage: number;
    };
  };
}

export interface ProviderHealth {
  providerId: string;
  status: "healthy" | "degraded" | "unhealthy" | "offline";
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  availability: number;
  issues: Array<{
    type: "latency" | "errors" | "quota" | "authentication" | "other";
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    timestamp: Date;
  }>;
}

/**
 * Provider Module Class
 */
export class ProviderModule extends BaseModule {
  constructor(client: SynapseAI) {
    super(client, "/providers");
  }

  /**
   * Create a new AI provider
   */
  async create(
    data: CreateProviderRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<AIProvider>> {
    this.validateRequired(data, ["name", "type", "configuration"]);

    this.debug("Creating AI provider", {
      name: data.name,
      type: data.type,
    });

    const response = await this.post<AIProvider>(
      "",
      {
        ...data,
        organizationId: this.getCurrentOrganization()?.id,
        isActive: data.isActive ?? true,
        priority: data.priority ?? 1,
      },
      options,
    );

    this.emit("provider:created", response.data);
    return response;
  }

  /**
   * Get provider by ID
   */
  async get(
    id: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<AIProvider>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Getting AI provider", { id });

    return this.get<AIProvider>(`/${id}`, options);
  }

  /**
   * List providers with pagination and filtering
   */
  async list(
    listOptions: ProviderListOptions = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<AIProvider>> {
    this.debug("Listing AI providers", listOptions);

    const params: Record<string, any> = {
      page: listOptions.page,
      limit: listOptions.limit,
      type: listOptions.type,
      isActive: listOptions.isActive,
      sortBy: listOptions.sortBy,
      sortOrder: listOptions.sortOrder,
    };

    return this.getPaginated<AIProvider>("", params, options);
  }

  /**
   * Update provider
   */
  async update(
    id: string,
    data: UpdateProviderRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<AIProvider>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Updating AI provider", { id, data });

    const response = await this.put<AIProvider>(`/${id}`, data, options);

    this.emit("provider:updated", response.data);
    return response;
  }

  /**
   * Delete provider
   */
  async delete(
    id: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<void>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Deleting AI provider", { id });

    const response = await this.delete<void>(`/${id}`, options);

    this.emit("provider:deleted", { id });
    return response;
  }

  /**
   * Test provider connection
   */
  async test(
    id: string,
    testOptions: {
      model?: string;
      prompt?: string;
      maxTokens?: number;
    } = {},
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      success: boolean;
      responseTime: number;
      model: string;
      tokensUsed?: number;
      cost?: number;
      response?: string;
      error?: string;
    }>
  > {
    this.validateRequired({ id }, ["id"]);

    this.debug("Testing AI provider", { id, testOptions });

    return this.post(
      `/${id}/test`,
      {
        model: testOptions.model || "gpt-3.5-turbo",
        prompt: testOptions.prompt || "Hello, this is a test message.",
        maxTokens: testOptions.maxTokens || 50,
      },
      options,
    );
  }

  /**
   * Get provider performance metrics
   */
  async getPerformance(
    id: string,
    period: { start: Date; end: Date },
    options: RequestOptions = {},
  ): Promise<APIResponse<ProviderPerformance>> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(period, ["start", "end"]);

    this.debug("Getting provider performance", { id, period });

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    };

    return this.get<ProviderPerformance>(
      `/${id}/performance${this.buildQueryString(params)}`,
      options,
    );
  }

  /**
   * Get provider usage statistics
   */
  async getUsage(
    id: string,
    period: { start: Date; end: Date },
    options: RequestOptions = {},
  ): Promise<APIResponse<ProviderUsage>> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(period, ["start", "end"]);

    this.debug("Getting provider usage", { id, period });

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    };

    return this.get<ProviderUsage>(
      `/${id}/usage${this.buildQueryString(params)}`,
      options,
    );
  }

  /**
   * Get provider health status
   */
  async getHealth(
    id: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<ProviderHealth>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Getting provider health", { id });

    return this.get<ProviderHealth>(`/${id}/health`, options);
  }

  /**
   * Get all providers health status
   */
  async getAllHealth(
    options: RequestOptions = {},
  ): Promise<APIResponse<ProviderHealth[]>> {
    this.debug("Getting all providers health");

    return this.get<ProviderHealth[]>("/health", options);
  }

  /**
   * Get provider routing configuration
   */
  async getRouting(
    options: RequestOptions = {},
  ): Promise<APIResponse<ProviderRouting>> {
    this.debug("Getting provider routing configuration");

    return this.get<ProviderRouting>("/routing", options);
  }

  /**
   * Update provider routing configuration
   */
  async updateRouting(
    routing: ProviderRouting,
    options: RequestOptions = {},
  ): Promise<APIResponse<ProviderRouting>> {
    this.validateRequired({ routing }, ["routing"]);

    this.debug("Updating provider routing configuration", routing);

    const response = await this.put<ProviderRouting>(
      "/routing",
      routing,
      options,
    );

    this.emit("provider:routing_updated", response.data);
    return response;
  }

  /**
   * Get optimal provider for request
   */
  async getOptimalProvider(
    requestData: {
      model?: string;
      requestType?: string;
      priority?: "low" | "medium" | "high";
      maxCost?: number;
      maxResponseTime?: number;
    },
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      providerId: string;
      providerName: string;
      confidence: number;
      estimatedCost: number;
      estimatedResponseTime: number;
      reasoning: string[];
    }>
  > {
    this.debug("Getting optimal provider", requestData);

    return this.post("/routing/optimal", requestData, options);
  }

  /**
   * Rotate API keys for provider
   */
  async rotateApiKey(
    id: string,
    newApiKey: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<{ success: boolean; rotatedAt: Date }>> {
    this.validateRequired({ id, newApiKey }, ["id", "newApiKey"]);

    this.debug("Rotating API key for provider", { id });

    const response = await this.post(
      `/${id}/rotate-key`,
      { apiKey: newApiKey },
      options,
    );

    this.emit("provider:api_key_rotated", { providerId: id, rotatedAt: new Date() });
    return response;
  }

  /**
   * Enable/disable provider
   */
  async toggleStatus(
    id: string,
    isActive: boolean,
    options: RequestOptions = {},
  ): Promise<APIResponse<AIProvider>> {
    this.validateRequired({ id, isActive }, ["id", "isActive"]);

    this.debug("Toggling provider status", { id, isActive });

    const response = await this.patch<AIProvider>(
      `/${id}/status`,
      { isActive },
      options,
    );

    this.emit("provider:status_changed", {
      providerId: id,
      isActive,
      provider: response.data,
    });

    return response;
  }

  /**
   * Update provider priority
   */
  async updatePriority(
    id: string,
    priority: number,
    options: RequestOptions = {},
  ): Promise<APIResponse<AIProvider>> {
    this.validateRequired({ id, priority }, ["id", "priority"]);

    if (priority < 1 || priority > 10) {
      throw new Error("Priority must be between 1 and 10");
    }

    this.debug("Updating provider priority", { id, priority });

    const response = await this.patch<AIProvider>(
      `/${id}/priority`,
      { priority },
      options,
    );

    this.emit("provider:priority_updated", {
      providerId: id,
      priority,
      provider: response.data,
    });

    return response;
  }

  /**
   * Get provider cost analysis
   */
  async getCostAnalysis(
    period: { start: Date; end: Date },
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      totalCost: number;
      costByProvider: Array<{
        providerId: string;
        providerName: string;
        cost: number;
        percentage: number;
        requests: number;
        tokens: number;
      }>;
      costByModel: Array<{
        model: string;
        cost: number;
        percentage: number;
        requests: number;
        tokens: number;
      }>;
      trends: Array<{
        date: string;
        totalCost: number;
        providerBreakdown: Record<string, number>;
      }>;
      projections: {
        nextMonth: number;
        nextQuarter: number;
        nextYear: number;
      };
      recommendations: Array<{
        type: "cost_optimization" | "performance" | "reliability";
        message: string;
        potentialSavings?: number;
        impact: "low" | "medium" | "high";
      }>;
    }>
  > {
    this.validateRequired(period, ["start", "end"]);

    this.debug("Getting provider cost analysis", period);

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    };

    return this.get(
      `/analytics/cost${this.buildQueryString(params)}`,
      options,
    );
  }

  /**
   * Export provider data
   */
  async exportData(
    id: string,
    period: { start: Date; end: Date },
    format: "csv" | "json" | "xlsx" = "csv",
    options: RequestOptions = {},
  ): Promise<Blob> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(period, ["start", "end"]);

    this.debug("Exporting provider data", { id, period, format });

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      format,
    };

    const config = this.client.getConfig();
    const response = await fetch(
      `${config.baseURL}/providers/${id}/export${this.buildQueryString(params)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          ...options.headers,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to export provider data: ${response.statusText}`);
    }

    return response.blob();
  }

  // Event Subscriptions

  /**
   * Subscribe to provider events
   */
  onProviderEvent(
    callback: (event: { type: string; provider: AIProvider }) => void,
  ): () => void {
    return this.subscribe("provider:event", callback);
  }

  /**
   * Subscribe to provider health changes
   */
  onHealthChange(
    callback: (health: ProviderHealth) => void,
  ): () => void {
    return this.subscribe("provider:health_changed", callback);
  }

  /**
   * Subscribe to provider performance alerts
   */
  onPerformanceAlert(
    callback: (alert: {
      providerId: string;
      type: "latency" | "errors" | "quota";
      severity: "low" | "medium" | "high" | "critical";
      message: string;
    }) => void,
  ): () => void {
    return this.subscribe("provider:performance_alert", callback);
  }

  /**
   * Subscribe to provider cost alerts
   */
  onCostAlert(
    callback: (alert: {
      providerId: string;
      threshold: number;
      currentCost: number;
      period: string;
    }) => void,
  ): () => void {
    return this.subscribe("provider:cost_alert", callback);
  }

  /**
   * Subscribe to routing changes
   */
  onRoutingChanged(
    callback: (routing: ProviderRouting) => void,
  ): () => void {
    return this.subscribe("provider:routing_changed", callback);
  }
}
