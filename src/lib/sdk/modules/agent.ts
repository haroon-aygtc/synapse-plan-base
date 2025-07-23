/**
 * Agent Module
 */

import { BaseModule } from "./base";
import { SynapseAI } from "../client";
import {
  Agent,
  AgentExecution,
  AgentPerformanceMetrics,
  ExecutionStatus,
  APIResponse,
  PaginatedResponse,
  StreamingResponse,
  StreamingOptions,
} from "../types";
import { ValidationError, ExecutionError } from "../errors";
import { generateExecutionId } from "../utils";
import { APXMessageType } from "../../../types/apix";

export interface CreateAgentRequest {
  name: string;
  description: string;
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  knowledgeSources?: string[];
  isActive?: boolean;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  prompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  knowledgeSources?: string[];
  isActive?: boolean;
}

export interface ExecuteAgentRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: string[];
  memoryContext?: Record<string, any>;
}

export interface TestAgentRequest {
  testCases: Array<{
    input: string;
    expectedOutput?: string;
    context?: Record<string, any>;
  }>;
  model?: string;
  temperature?: number;
}

export interface AgentTestResult {
  testCaseId: string;
  input: string;
  output: string;
  expectedOutput?: string;
  passed: boolean;
  executionTime: number;
  tokensUsed: number;
  cost: number;
  error?: string;
}

/**
 * Agent module for managing AI agents and their executions
 */
export class AgentModule extends BaseModule {
  constructor(client: SynapseAI) {
    super(client, "/agents");
  }

  /**
   * Create a new agent
   */
  async create(request: CreateAgentRequest): Promise<Agent> {
    this.validateRequired(request, ["name", "description", "prompt"]);

    if (
      request.temperature !== undefined &&
      (request.temperature < 0 || request.temperature > 2)
    ) {
      throw new ValidationError(
        "Temperature must be between 0 and 2",
        "temperature",
        "number between 0 and 2",
        request.temperature,
      );
    }

    if (request.maxTokens !== undefined && request.maxTokens < 1) {
      throw new ValidationError(
        "Max tokens must be greater than 0",
        "maxTokens",
        "positive number",
        request.maxTokens,
      );
    }

    try {
      const response = await this.post<Agent>("", {
        name: request.name,
        description: request.description,
        prompt: request.prompt,
        model: request.model || "gpt-4",
        temperature: request.temperature ?? 0.7,
        maxTokens: request.maxTokens ?? 2000,
        tools: request.tools || [],
        knowledgeSources: request.knowledgeSources || [],
        isActive: request.isActive ?? true,
      });

      if (response.success && response.data) {
        this.emit("agent:created", response.data);
        this.debug("Agent created successfully", { agentId: response.data.id });
        return response.data;
      }

      throw new Error("Failed to create agent");
    } catch (error) {
      this.debug("Agent creation failed", error);
      throw error;
    }
  }

  /**
   * Get agent by ID
   */
  async get(agentId: string): Promise<Agent> {
    this.validateRequired({ agentId }, ["agentId"]);

    try {
      const response = await this.get<Agent>(`/${agentId}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Agent not found");
    } catch (error) {
      this.debug("Failed to get agent", { agentId, error });
      throw error;
    }
  }

  /**
   * List agents with pagination
   */
  async list(
    params: {
      page?: number;
      limit?: number;
      search?: string;
      isActive?: boolean;
      model?: string;
    } = {},
  ): Promise<PaginatedResponse<Agent>> {
    try {
      const response = await this.getPaginated<Agent>("", params);
      return response;
    } catch (error) {
      this.debug("Failed to list agents", error);
      throw error;
    }
  }

  /**
   * Update agent
   */
  async update(agentId: string, updates: UpdateAgentRequest): Promise<Agent> {
    this.validateRequired({ agentId }, ["agentId"]);

    if (
      updates.temperature !== undefined &&
      (updates.temperature < 0 || updates.temperature > 2)
    ) {
      throw new ValidationError(
        "Temperature must be between 0 and 2",
        "temperature",
        "number between 0 and 2",
        updates.temperature,
      );
    }

    try {
      const response = await this.patch<Agent>(`/${agentId}`, updates);

      if (response.success && response.data) {
        this.emit("agent:updated", response.data);
        this.debug("Agent updated successfully", { agentId });
        return response.data;
      }

      throw new Error("Failed to update agent");
    } catch (error) {
      this.debug("Agent update failed", { agentId, error });
      throw error;
    }
  }

  /**
   * Delete agent
   */
  async delete(agentId: string): Promise<void> {
    this.validateRequired({ agentId }, ["agentId"]);

    try {
      const response = await this.delete(`/${agentId}`);

      if (response.success) {
        this.emit("agent:deleted", { agentId });
        this.debug("Agent deleted successfully", { agentId });
      } else {
        throw new Error("Failed to delete agent");
      }
    } catch (error) {
      this.debug("Agent deletion failed", { agentId, error });
      throw error;
    }
  }

  /**
   * Execute agent with streaming support
   */
  async execute(
    agentId: string,
    request: ExecuteAgentRequest,
    streamingOptions?: StreamingOptions,
  ): Promise<AgentExecution> {
    this.validateRequired({ agentId, prompt: request.prompt }, [
      "agentId",
      "prompt",
    ]);

    const executionId = generateExecutionId();

    try {
      // Start execution via APIX if streaming is enabled
      if (request.stream && this.client.isConnected()) {
        return await this.executeWithStreaming(
          agentId,
          request,
          executionId,
          streamingOptions,
        );
      }

      // Standard HTTP execution
      const response = await this.post<AgentExecution>(`/${agentId}/execute`, {
        executionId,
        prompt: request.prompt,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        stream: false,
        tools: request.tools || [],
        memoryContext: request.memoryContext || {},
      });

      if (response.success && response.data) {
        this.emit("agent:execution_complete", response.data);
        return response.data;
      }

      throw new ExecutionError("Agent execution failed", executionId);
    } catch (error) {
      this.debug("Agent execution failed", { agentId, executionId, error });
      throw error;
    }
  }

  /**
   * Execute agent with real-time streaming
   */
  private async executeWithStreaming(
    agentId: string,
    request: ExecuteAgentRequest,
    executionId: string,
    streamingOptions?: StreamingOptions,
  ): Promise<AgentExecution> {
    return new Promise((resolve, reject) => {
      let execution: Partial<AgentExecution> = {
        id: executionId,
        agentId,
        input: request.prompt,
        status: ExecutionStatus.PENDING,
        createdAt: new Date(),
      };

      const chunks: string[] = [];
      let startTime = Date.now();

      // Subscribe to execution events
      const unsubscribers = [
        this.subscribe(APXMessageType.AGENT_EXECUTION_STARTED, (message) => {
          if (message.payload.execution_id === executionId) {
            execution.status = ExecutionStatus.RUNNING;
            startTime = Date.now();
            this.emit("agent:execution_started", execution);
          }
        }),

        this.subscribe(APXMessageType.AGENT_TEXT_CHUNK, (message) => {
          if (message.payload.execution_id === executionId) {
            const chunk = message.payload.text;
            chunks.push(chunk);

            const streamingResponse: StreamingResponse = {
              id: executionId,
              type: "chunk",
              data: { text: chunk, tokens: message.payload.token_count },
              timestamp: new Date(),
            };

            streamingOptions?.onChunk?.(streamingResponse);
            this.emit("agent:text_chunk", streamingResponse);
          }
        }),

        this.subscribe(APXMessageType.AGENT_EXECUTION_COMPLETE, (message) => {
          if (message.payload.execution_id === executionId) {
            const completedExecution: AgentExecution = {
              ...(execution as AgentExecution),
              output: message.payload.final_response,
              status: ExecutionStatus.COMPLETED,
              tokensUsed: message.payload.total_tokens,
              cost: message.payload.cost_breakdown.total_cost,
              executionTimeMs: Date.now() - startTime,
              completedAt: new Date(),
              toolCalls:
                message.payload.tools_used?.map((tool: any) => ({
                  id: `${tool.tool_id}_${Date.now()}`,
                  toolId: tool.tool_id,
                  functionName: tool.function_name || "execute",
                  parameters: {},
                  status: ExecutionStatus.COMPLETED,
                  executionTime: 0,
                })) || [],
            };

            // Cleanup subscriptions
            unsubscribers.forEach((unsub) => unsub());

            streamingOptions?.onComplete?.(completedExecution);
            this.emit("agent:execution_complete", completedExecution);
            resolve(completedExecution);
          }
        }),

        this.subscribe(APXMessageType.AGENT_ERROR, (message) => {
          if (message.payload.execution_id === executionId) {
            const error = new ExecutionError(
              message.payload.error_message,
              executionId,
              "agent_execution",
              message.payload.retry_possible,
            );

            // Cleanup subscriptions
            unsubscribers.forEach((unsub) => unsub());

            streamingOptions?.onError?.(error);
            this.emit("agent:execution_error", { executionId, error });
            reject(error);
          }
        }),
      ];

      // Start the execution via APIX
      this.client.apixClient
        .startAgentExecution(agentId, request.prompt, {
          model: request.model,
          parameters: {
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? 2000,
            stream: true,
          },
          tools_available: request.tools || [],
          memory_context: request.memoryContext || {},
        })
        .catch((error) => {
          // Cleanup subscriptions
          unsubscribers.forEach((unsub) => unsub());
          reject(
            new ExecutionError("Failed to start agent execution", executionId),
          );
        });

      // Set timeout
      setTimeout(() => {
        unsubscribers.forEach((unsub) => unsub());
        reject(new ExecutionError("Agent execution timeout", executionId));
      }, 300000); // 5 minutes timeout
    });
  }

  /**
   * Get agent execution by ID
   */
  async getExecution(
    agentId: string,
    executionId: string,
  ): Promise<AgentExecution> {
    this.validateRequired({ agentId, executionId }, ["agentId", "executionId"]);

    try {
      const response = await this.get<AgentExecution>(
        `/${agentId}/executions/${executionId}`,
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Execution not found");
    } catch (error) {
      this.debug("Failed to get execution", { agentId, executionId, error });
      throw error;
    }
  }

  /**
   * List agent executions
   */
  async listExecutions(
    agentId: string,
    params: {
      page?: number;
      limit?: number;
      status?: ExecutionStatus;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<PaginatedResponse<AgentExecution>> {
    this.validateRequired({ agentId }, ["agentId"]);

    try {
      const queryParams = {
        ...params,
        startDate: params.startDate?.toISOString(),
        endDate: params.endDate?.toISOString(),
      };

      const response = await this.getPaginated<AgentExecution>(
        `/${agentId}/executions`,
        queryParams,
      );
      return response;
    } catch (error) {
      this.debug("Failed to list executions", { agentId, error });
      throw error;
    }
  }

  /**
   * Test agent with multiple test cases
   */
  async test(
    agentId: string,
    request: TestAgentRequest,
  ): Promise<AgentTestResult[]> {
    this.validateRequired({ agentId, testCases: request.testCases }, [
      "agentId",
      "testCases",
    ]);

    if (!Array.isArray(request.testCases) || request.testCases.length === 0) {
      throw new ValidationError(
        "Test cases must be a non-empty array",
        "testCases",
        "array of test cases",
        request.testCases,
      );
    }

    try {
      const response = await this.post<AgentTestResult[]>(`/${agentId}/test`, {
        testCases: request.testCases,
        model: request.model,
        temperature: request.temperature,
      });

      if (response.success && response.data) {
        this.emit("agent:test_complete", { agentId, results: response.data });
        return response.data;
      }

      throw new Error("Agent testing failed");
    } catch (error) {
      this.debug("Agent testing failed", { agentId, error });
      throw error;
    }
  }

  /**
   * Get agent performance metrics
   */
  async getMetrics(
    agentId: string,
    params: {
      startDate?: Date;
      endDate?: Date;
      granularity?: "hour" | "day" | "week" | "month";
    } = {},
  ): Promise<AgentPerformanceMetrics> {
    this.validateRequired({ agentId }, ["agentId"]);

    try {
      const queryParams = {
        startDate: params.startDate?.toISOString(),
        endDate: params.endDate?.toISOString(),
        granularity: params.granularity || "day",
      };

      const queryString = this.buildQueryString(queryParams);
      const response = await this.get<AgentPerformanceMetrics>(
        `/${agentId}/metrics${queryString}`,
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Failed to get agent metrics");
    } catch (error) {
      this.debug("Failed to get agent metrics", { agentId, error });
      throw error;
    }
  }

  /**
   * Clone agent
   */
  async clone(
    agentId: string,
    name: string,
    description?: string,
  ): Promise<Agent> {
    this.validateRequired({ agentId, name }, ["agentId", "name"]);

    try {
      const response = await this.post<Agent>(`/${agentId}/clone`, {
        name,
        description: description || `Clone of agent ${agentId}`,
      });

      if (response.success && response.data) {
        this.emit("agent:cloned", {
          originalId: agentId,
          clonedAgent: response.data,
        });
        return response.data;
      }

      throw new Error("Failed to clone agent");
    } catch (error) {
      this.debug("Agent cloning failed", { agentId, error });
      throw error;
    }
  }

  /**
   * Export agent configuration
   */
  async export(agentId: string): Promise<{
    agent: Agent;
    exportedAt: Date;
    version: string;
  }> {
    this.validateRequired({ agentId }, ["agentId"]);

    try {
      const response = await this.get<any>(`/${agentId}/export`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Failed to export agent");
    } catch (error) {
      this.debug("Agent export failed", { agentId, error });
      throw error;
    }
  }

  /**
   * Import agent configuration
   */
  async import(agentData: {
    agent: Partial<Agent>;
    version: string;
  }): Promise<Agent> {
    this.validateRequired({ agentData }, ["agentData"]);

    try {
      const response = await this.post<Agent>("/import", agentData);

      if (response.success && response.data) {
        this.emit("agent:imported", response.data);
        return response.data;
      }

      throw new Error("Failed to import agent");
    } catch (error) {
      this.debug("Agent import failed", error);
      throw error;
    }
  }
}
