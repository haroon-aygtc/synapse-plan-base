import { apiClient, ApiResponse } from './api';

export interface Agent {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  description?: string;
  prompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  tools: any[];
  config: Record<string, any>;
  version: number;
  isActive: boolean;
  isPublic: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
  performanceMetrics?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  userId: string;
  sessionId?: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  tokensUsed?: number;
  cost?: number;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  prompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  config?: Record<string, any>;
  isPublic?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateAgentRequest extends Partial<CreateAgentRequest> {
  id: string;
}

export interface ExecuteAgentRequest {
  input: Record<string, any>;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface TestAgentRequest {
  testCases: Array<{
    name: string;
    input: Record<string, any>;
    expectedOutput?: Record<string, any>;
    metadata?: Record<string, any>;
  }>;
  config?: {
    timeout?: number;
    parallel?: boolean;
  };
}

export interface BatchTestAgentRequest {
  agents: string[];
  testSuite: {
    name: string;
    testCases: Array<{
      name: string;
      input: Record<string, any>;
      expectedOutput?: Record<string, any>;
    }>;
  };
}

export class AgentAPI {

  // CRUD Operations
  async getAgents(params?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
    isPublic?: boolean;
    isActive?: boolean;
    userId?: string;
  }): Promise<ApiResponse<Agent[]>> {
    return apiClient.get('/agents', { params });
  }

  async getAgent(id: string): Promise<ApiResponse<Agent>> {
    return apiClient.get(`/agents/${id}`);
  }

  async createAgent(data: CreateAgentRequest): Promise<ApiResponse<Agent>> {
    return apiClient.post('/agents', data);
  }

  async updateAgent(data: UpdateAgentRequest): Promise<ApiResponse<Agent>> {
    const { id, ...updateData } = data;
    return apiClient.put(`/agents/${id}`, updateData);
  }

  async deleteAgent(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/agents/${id}`);
  }

  async cloneAgent(id: string, name?: string): Promise<ApiResponse<Agent>> {
    return apiClient.post(`/agents/${id}/clone`, { name });
  }

  // Execution Operations
  async executeAgent(id: string, data: ExecuteAgentRequest): Promise<ApiResponse<AgentExecution>> {
    return apiClient.post(`/agents/${id}/execute`, data);
  }

  async getExecution(executionId: string): Promise<ApiResponse<AgentExecution>> {
    return apiClient.get(`/agent-executions/${executionId}`);
  }
  
  async getExecutions(agentId?: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<AgentExecution[]>> {
    const url = agentId ? `/agents/${agentId}/executions` : '/agent-executions';
    return apiClient.get(url, { params });
  }

  async cancelExecution(executionId: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/agent-executions/${executionId}/cancel`);
  }

  // Testing Operations
  async testAgent(id: string, data: TestAgentRequest): Promise<ApiResponse<any>> {
    return apiClient.post(`/agents/${id}/test`, data);
  }

  async batchTestAgents(data: BatchTestAgentRequest): Promise<ApiResponse<any>> {
    return apiClient.post('/agents/batch-test', data);
  }

  async getTestResults(agentId: string, testId: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/agents/${agentId}/test-results/${testId}`);
  }

  // Analytics and Metrics
  async getAgentMetrics(id: string, params?: {
    startDate?: string;
    endDate?: string;
    granularity?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<ApiResponse<any>> {
    return apiClient.get(`/agents/${id}/metrics`, { params });
  }

  async getAgentPerformance(id: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/agents/${id}/performance`);
  }

  // Version Management
  async getAgentVersions(id: string): Promise<ApiResponse<Agent[]>> {
    return apiClient.get(`/agents/${id}/versions`);
  }

  async createAgentVersion(id: string, data: Partial<CreateAgentRequest>): Promise<ApiResponse<Agent>> {
    return apiClient.post(`/agents/${id}/versions`, data);
  }

  async rollbackAgent(id: string, version: number): Promise<ApiResponse<Agent>> {
    return apiClient.post(`/agents/${id}/rollback`, { version });
  }

  // Deployment Operations
  async deployAgent(id: string, environment: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/agents/${id}/deploy`, { environment });
  }

  async getDeploymentStatus(id: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/agents/${id}/deployment-status`);
  }

  // Marketplace Operations
  async publishToMarketplace(id: string, data: {
    title: string;
    description: string;
    category: string;
    tags: string[];
    price?: number;
    license?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.post(`/agents/${id}/publish`, data);
  }

  async getMarketplaceAgents(params?: {
    page?: number;
    limit?: number;
    category?: string;
    tags?: string[];
    search?: string;
    sortBy?: 'popularity' | 'rating' | 'created' | 'updated';
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<any[]>> {
    return apiClient.get('/marketplace/agents', { params });
  }

  async installMarketplaceAgent(marketplaceId: string): Promise<ApiResponse<Agent>> {
    return apiClient.post(`/marketplace/agents/${marketplaceId}/install`);
  }

  // Collaboration
  async shareAgent(id: string, data: {
    userIds?: string[];
    emails?: string[];
    permissions: ('read' | 'write' | 'execute')[];
    expiresAt?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.post(`/agents/${id}/share`, data);
  }

  async getSharedAgents(): Promise<ApiResponse<Agent[]>> {
    return apiClient.get('/agents/shared');
  }

  // Import/Export
  async exportAgent(id: string, format: 'json' | 'yaml'): Promise<ApiResponse<any>> {
    return apiClient.get(`/agents/${id}/export`, { params: { format } });
  }

  async importAgent(data: any, format: 'json' | 'yaml'): Promise<ApiResponse<Agent>> {
    return apiClient.post('/agents/import', { data, format });
  }
}

export const agentAPI = new AgentAPI();