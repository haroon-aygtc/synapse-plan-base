import { api } from './api';
import { AgentConfiguration } from './ai-assistant';

export interface Agent {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  tools?: string[];
  knowledgeSources?: string[];
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
  isActive: boolean;
  version: string;
  promptTemplateId?: string;
  testingConfig?: Record<string, any>;
  performanceMetrics?: {
    successRate: number;
    averageResponseTime: number;
    totalExecutions: number;
    errorRate: number;
    lastUpdated: Date;
  };
  organizationId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  knowledgeSources?: string[];
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
  version?: string;
  promptTemplateId?: string;
  testingConfig?: Record<string, any>;
  isActive?: boolean;
}

export interface ExecuteAgentRequest {
  input: string;
  sessionId?: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  stream?: boolean;
  includeToolCalls?: boolean;
  includeKnowledgeSearch?: boolean;
}

export interface AgentExecutionResult {
  id: string;
  output: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  tokensUsed?: number;
  cost?: number;
  executionTimeMs: number;
  toolCalls?: Array<{
    toolId: string;
    input: Record<string, any>;
    output: Record<string, any>;
    executionTime: number;
  }>;
  knowledgeSearches?: Array<{
    query: string;
    results: any[];
    sources: string[];
  }>;
  metadata?: Record<string, any>;
}

export interface TestAgentRequest {
  testName: string;
  testType: 'unit' | 'integration' | 'performance' | 'ab_test';
  testInput: Record<string, any>;
  expectedOutput?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AgentTestResult {
  testId: string;
  passed: boolean;
  score?: number;
  metrics: {
    responseTime: number;
    tokenUsage: number;
    cost: number;
    accuracy?: number;
    relevance?: number;
    coherence?: number;
  };
  actualOutput: Record<string, any>;
  errorMessage?: string;
}

export interface AgentStatistics {
  totalAgents: number;
  activeAgents: number;
  totalExecutions: number;
  averageSuccessRate: number;
  topPerformingAgents: Array<{
    id: string;
    name: string;
    successRate: number;
    totalExecutions: number;
  }>;
}

export class AgentAPI {
  // Create a new agent
  static async createAgent(data: CreateAgentRequest): Promise<Agent> {
    const response = await api.post('/agents', data);
    return response.data;
  }

  // Get all agents
  static async getAgents(params?: {
    userId?: string;
    includeInactive?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
    category?: string;
    model?: string;
  }): Promise<Agent[]> {
    const response = await api.get('/agents', { params });
    return response.data;
  }

  // Get agent by ID
  static async getAgent(
    id: string,
    params?: {
      includeExecutions?: boolean;
      includeTestResults?: boolean;
    }
  ): Promise<Agent> {
    const response = await api.get(`/agents/${id}`, { params });
    return response.data;
  }

  // Update agent
  static async updateAgent(id: string, data: Partial<CreateAgentRequest>): Promise<Agent> {
    const response = await api.patch(`/agents/${id}`, data);
    return response.data;
  }

  // Delete agent
  static async deleteAgent(id: string): Promise<void> {
    await api.delete(`/agents/${id}`);
  }

  // Execute agent
  static async executeAgent(id: string, data: ExecuteAgentRequest): Promise<AgentExecutionResult> {
    const response = await api.post(`/agents/${id}/execute`, data);
    return response.data;
  }

  // Execute agent with streaming
  static executeAgentStream(
    id: string,
    input: string,
    sessionId?: string
  ): EventSource {
    const params = new URLSearchParams({ input });
    if (sessionId) params.append('sessionId', sessionId);
    
    return new EventSource(
      `${api.defaults.baseURL}/agents/${id}/execute/stream?${params.toString()}`
    );
  }

  // Test agent
  static async testAgent(id: string, data: TestAgentRequest): Promise<AgentTestResult> {
    const response = await api.post(`/agents/${id}/test`, data);
    return response.data;
  }

  // Batch test agent
  static async batchTestAgent(
    id: string,
    data: {
      testCases: TestAgentRequest[];
      maxConcurrency?: number;
    }
  ): Promise<AgentTestResult[]> {
    const response = await api.post(`/agents/${id}/test/batch`, data);
    return response.data;
  }

  // Get agent statistics
  static async getStatistics(params?: {
    from?: string;
    to?: string;
  }): Promise<AgentStatistics> {
    const response = await api.get('/agents/statistics', { params });
    return response.data;
  }

  // Create agent version
  static async createVersion(
    id: string,
    data: {
      version: string;
      changes: Record<string, any>;
    }
  ): Promise<Agent> {
    const response = await api.post(`/agents/${id}/versions`, data);
    return response.data;
  }

  // Get version history
  static async getVersionHistory(id: string): Promise<Agent[]> {
    const response = await api.get(`/agents/${id}/versions`);
    return response.data;
  }

  // Convert AgentConfiguration to CreateAgentRequest
  static configurationToRequest(config: Partial<AgentConfiguration>): CreateAgentRequest {
    return {
      name: config.name || '',
      description: config.description,
      prompt: this.generatePromptFromConfig(config),
      model: config.model || 'gpt-4',
      temperature: config.temperature || 0.7,
      maxTokens: 2000,
      tools: config.tools || [],
      knowledgeSources: config.knowledgeSources || [],
      settings: {
        memoryEnabled: config.memoryEnabled,
        contextWindow: config.contextWindow,
        tone: config.tone,
        style: config.style,
      },
      metadata: {
        category: config.category,
        personality: config.personality,
        traits: config.traits,
        capabilities: config.capabilities,
      },
      isActive: true,
    };
  }

  // Generate prompt from configuration
  private static generatePromptFromConfig(config: Partial<AgentConfiguration>): string {
    const parts = [];
    
    // Base instruction
    parts.push(`You are ${config.name || 'an AI assistant'}.`);
    
    if (config.description) {
      parts.push(config.description);
    }
    
    // Personality and tone
    if (config.personality) {
      parts.push(`Your personality is ${config.personality}.`);
    }
    
    if (config.tone) {
      parts.push(`Your tone should be ${config.tone}.`);
    }
    
    if (config.style) {
      parts.push(`Your communication style should be ${config.style}.`);
    }
    
    // Traits
    if (config.traits && config.traits.length > 0) {
      parts.push(`Key traits: ${config.traits.join(', ')}.`);
    }
    
    // Capabilities
    if (config.capabilities && config.capabilities.length > 0) {
      parts.push(`You have the following capabilities: ${config.capabilities.join(', ')}.`);
    }
    
    // Memory instructions
    if (config.memoryEnabled) {
      parts.push('Remember the context of our conversation and refer to previous messages when relevant.');
    }
    
    // General guidelines
    parts.push('Always be helpful, accurate, and provide clear responses.');
    parts.push('If you are unsure about something, say so rather than guessing.');
    
    return parts.join(' ');
  }
}
