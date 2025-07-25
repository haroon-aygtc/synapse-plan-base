import { apiClient } from "./api";
import { getToken } from "./auth";

export interface AIProvider {
  id: string;
  name: string;
  type: "openai" | "claude" | "gemini" | "mistral" | "groq" | "openrouter";
  status: "active" | "inactive" | "error" | "maintenance";
  config: {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;
    rateLimits?: {
      requestsPerMinute: number;
      tokensPerMinute: number;
      enabled: boolean;
    };
    models?: string[];
    customHeaders?: Record<string, string>;
  };
  priority: number;
  costMultiplier: number;
  healthCheck?: {
    lastCheck: Date;
    status: "healthy" | "unhealthy" | "degraded";
    responseTime: number;
    errorRate: number;
    uptime: number;
  };
  metrics?: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    totalCost: number;
    lastUpdated: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProviderRequest {
  name: string;
  type: AIProvider["type"];
  config: {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;
    rateLimits?: {
      requestsPerMinute: number;
      tokensPerMinute: number;
      enabled: boolean;
    };
    models?: string[];
    customHeaders?: Record<string, string>;
  };
  priority?: number;
  costMultiplier?: number;
  isActive?: boolean;
}

export interface UpdateProviderRequest {
  name?: string;
  config?: Partial<AIProvider["config"]>;
  priority?: number;
  costMultiplier?: number;
  isActive?: boolean;
}

export interface ProviderHealthResponse {
  overall: "healthy" | "degraded" | "unhealthy";
  providers: Array<{
    id: string;
    name: string;
    type: string;
    status: "healthy" | "degraded" | "unhealthy";
    responseTime: number;
    errorRate: number;
    uptime: number;
    lastCheck: Date;
  }>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    averageResponseTime: number;
    averageUptime: number;
  };
}

export interface CostAnalytics {
  totalCost: number;
  totalRequests: number;
  averageCostPerRequest: number;
  costByProvider: Array<{
    providerId: string;
    providerName: string;
    providerType: string;
    cost: number;
    requests: number;
    averageCostPerRequest: number;
    percentage: number;
  }>;
  costByModel: Array<{
    model: string;
    cost: number;
    requests: number;
    averageCostPerRequest: number;
    percentage: number;
  }>;
  costByExecutionType: Array<{
    executionType: "agent" | "tool" | "workflow" | "knowledge";
    cost: number;
    requests: number;
    averageCostPerRequest: number;
    percentage: number;
  }>;
  dailyTrend: Array<{
    date: string;
    cost: number;
    requests: number;
  }>;
  projectedMonthlyCost: number;
  costOptimizationSuggestions: Array<{
    type: "provider_switch" | "model_downgrade" | "usage_reduction";
    description: string;
    potentialSavings: number;
    impact: "low" | "medium" | "high";
    recommendation: string;
  }>;
}

export interface UsageStats {
  totalRequests: number;
  totalCost: number;
  averageResponseTime: number;
  errorRate: number;
  providerBreakdown: Array<{
    providerId: string;
    providerName: string;
    requests: number;
    cost: number;
    avgResponseTime: number;
    errorRate: number;
  }>;
  modelBreakdown: Array<{
    model: string;
    requests: number;
    cost: number;
    avgResponseTime: number;
  }>;
  executionTypeBreakdown: Array<{
    type: "agent" | "tool" | "workflow" | "knowledge";
    requests: number;
    cost: number;
    avgResponseTime: number;
  }>;
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: {
    model?: string;
    executionType?: string;
    costThreshold?: number;
    performanceThreshold?: number;
    organizationId?: string;
    userId?: string;
  };
  targetProvider: string;
  fallbackProviders?: string[];
  isActive: boolean;
}

export interface OptimizationSuggestions {
  costOptimizations: Array<{
    type: "switch_provider" | "adjust_routing" | "model_downgrade";
    description: string;
    potentialSavings: number;
    impact: "low" | "medium" | "high";
    recommendation: string;
  }>;
  performanceOptimizations: Array<{
    type: "switch_provider" | "adjust_routing" | "load_balance";
    description: string;
    expectedImprovement: string;
    impact: "low" | "medium" | "high";
    recommendation: string;
  }>;
}

class ProviderAPI {
  private baseURL: string;

  constructor() {
    // Use the same baseURL pattern as the main api
    this.baseURL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/ai-providers`;
  }

  private async getAuthHeaders() {
    const token = await getToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async getProviders(includeInactive = false): Promise<AIProvider[]> {
    const response = await apiClient.get(`${this.baseURL}`, {
      headers: await this.getAuthHeaders(),
      params: { includeInactive },
    });
    return response.data;
  }

  async getProvider(id: string): Promise<AIProvider> {
    const response = await apiClient.get(`${this.baseURL}/${id}`, {
      headers: await this.getAuthHeaders(),
    });
    return response.data;
  }

  async createProvider(data: CreateProviderRequest): Promise<AIProvider> {
    const response = await apiClient.post(`${this.baseURL}`, data, {
      headers: await this.getAuthHeaders(),
    });
    return response.data;
  }

  async updateProvider(
    id: string,
    data: UpdateProviderRequest,
  ): Promise<AIProvider> {
    const response = await apiClient.put(`${this.baseURL}/${id}`, data, {
      headers: await this.getAuthHeaders(),
    });
    return response.data;
  }

  async deleteProvider(id: string): Promise<void> {
    await apiClient.delete(`${this.baseURL}/${id}`, {
      headers: await this.getAuthHeaders(),
    });
  }

  async testProvider(
    id: string,
  ): Promise<{ success: boolean; responseTime?: number; error?: string }> {
    const response = await apiClient.post(
      `${this.baseURL}/${id}/test`,
      {},
      {
        headers: await this.getAuthHeaders(),
      },
    );
    return response.data;
  }

  async rotateApiKey(id: string, newApiKey: string): Promise<AIProvider> {
    const response = await apiClient.post(
      `${this.baseURL}/${id}/rotate-key`,
      { newApiKey },
      {
        headers: await this.getAuthHeaders(),
      },
    );
    return response.data;
  }

  async getAvailableProviders(): Promise<
    Array<{
      type: AIProvider["type"];
      name: string;
      description: string;
      models: string[];
      features: string[];
    }>
  > {
    const response = await apiClient.get(`${this.baseURL}/available`, {
      headers: await this.getAuthHeaders(),
    });
    return response.data;
  }

  async getAvailableModels(): Promise<{
    models: Array<{
      name: string;
      provider: string;
      capabilities: string[];
      costPerToken: number;
      maxTokens: number;
      isAvailable: boolean;
    }>;
  }> {
    const response = await apiClient.get(`${this.baseURL}/models`, {
      headers: await this.getAuthHeaders(),
    });
    return response.data;
  }

  async executeCompletion(request: {
    messages: Array<{
      role: "system" | "user" | "assistant" | "tool";
      content: string;
      tool_calls?: any[];
    }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    tools?: any[];
    executionType: "agent" | "tool" | "workflow" | "knowledge";
    resourceId: string;
    sessionId?: string;
    streamResponse?: boolean;
    preferredProvider?: string;
  }): Promise<{
    id: string;
    content: string;
    tokensUsed: number;
    cost: number;
    executionTime: number;
    providerId: string;
    providerType: string;
    model: string;
    toolCalls?: any[];
    metadata?: any;
  }> {
    const response = await apiClient.post(`${this.baseURL}/ai/complete`, request, {
      headers: await this.getAuthHeaders(),
    });
    return response.data;
  }

  async getProviderHealth(): Promise<ProviderHealthResponse> {
      const response = await apiClient.get(`${this.baseURL}/health`, {
      headers: await this.getAuthHeaders(),
    });
    return response.data;
  }

  async getCostAnalytics(
    startDate?: string,
    endDate?: string,
  ): Promise<CostAnalytics> {
    const response = await apiClient.get(`${this.baseURL}/costs`, {
      headers: await this.getAuthHeaders(),
      params: { startDate, endDate },
    });
    return response.data;
  }

  async getUsageStats(
    period: "day" | "week" | "month" = "week",
  ): Promise<UsageStats> {
    const response = await apiClient.get(`${this.baseURL}/usage-stats`, {
      headers: await this.getAuthHeaders(),
      params: { period },
    });
    return response.data;
  }

  async getRoutingRules(): Promise<RoutingRule[]> {
    const response = await apiClient.get(`${this.baseURL}/routing-rules`, {
      headers: await this.getAuthHeaders(),
    });
    return response.data;
  }

  async createRoutingRule(rule: Omit<RoutingRule, "id">): Promise<RoutingRule> {
    const response = await apiClient.post(`${this.baseURL}/routing-rules`, rule, {
      headers: await this.getAuthHeaders(),
    });
    return response.data;
  }

  async getOptimizationSuggestions(): Promise<OptimizationSuggestions> {
    const response = await apiClient.get(
      `${this.baseURL}/optimization-suggestions`,
      {
        headers: await this.getAuthHeaders(),
      },
    );
    return response.data;
  }

  async getProviderMetrics(
    id: string,
    period: "hour" | "day" | "week" | "month" = "day",
  ): Promise<{
    current: {
      requests: number;
      successRate: number;
      avgResponseTime: number;
      cost: number;
      errorRate: number;
    };
    historical: Array<{
      timestamp: Date;
      requests: number;
      successRate: number;
      avgResponseTime: number;
      cost: number;
      errorRate: number;
    }>;
  }> {
    const response = await apiClient.get(`${this.baseURL}/${id}/metrics`, {
      headers: await this.getAuthHeaders(),
      params: { period },
    });
    return response.data;
  }

  async bulkConfigureProviders(
    providers: Array<{
      name: string;
      type: AIProvider["type"];
      apiKey: string;
      baseUrl?: string;
      models?: string[];
      priority?: number;
      costMultiplier?: number;
      isActive?: boolean;
    }>,
  ): Promise<AIProvider[]> {
    const response = await apiClient.post(
      `${this.baseURL}/bulk-configure`,
      { providers },
      {
        headers: await this.getAuthHeaders(),
      },
    );
    return response.data;
  }
}

export const providerAPI = new ProviderAPI();
