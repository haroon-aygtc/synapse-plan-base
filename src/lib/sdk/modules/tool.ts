/**
 * Tool Module
 */

import { BaseModule } from "./base";
import { SynapseAI } from "../client";
import {
  Tool,
  ToolCall,
  ExecutionStatus,
  APIResponse,
  PaginatedResponse,
} from "../types";
import { ValidationError, ExecutionError } from "../errors";
import { generateExecutionId } from "../utils";
import { APXMessageType } from "../../../types/apix";

export interface CreateToolRequest {
  name: string;
  description: string;
  schema: any;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  category?: string;
  tags?: string[];
  isActive?: boolean;
}

export interface UpdateToolRequest {
  name?: string;
  description?: string;
  schema?: any;
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  category?: string;
  tags?: string[];
  isActive?: boolean;
}

export interface ExecuteToolRequest {
  functionName: string;
  parameters: Record<string, any>;
  callerType?: "agent" | "workflow" | "user";
  callerId?: string;
  timeout?: number;
}

export interface TestToolRequest {
  functionName: string;
  parameters: Record<string, any>;
  expectedResult?: any;
}

export interface ToolTestResult {
  success: boolean;
  result: any;
  executionTime: number;
  cost: number;
  error?: string;
  validationErrors?: string[];
}

/**
 * Tool module for managing external integrations and API tools
 */
export class ToolModule extends BaseModule {
  constructor(client: SynapseAI) {
    super(client, "/tools");
  }

  /**
   * Create a new tool
   */
  async create(request: CreateToolRequest): Promise<Tool> {
    this.validateRequired(request, [
      "name",
      "description",
      "schema",
      "endpoint",
      "method",
    ]);

    if (!this.isValidURL(request.endpoint)) {
      throw new ValidationError(
        "Invalid endpoint URL",
        "endpoint",
        "valid URL",
        request.endpoint,
      );
    }

    if (!this.isValidHTTPMethod(request.method)) {
      throw new ValidationError(
        "Invalid HTTP method",
        "method",
        "GET, POST, PUT, DELETE, or PATCH",
        request.method,
      );
    }

    try {
      const response = await this.post<Tool>("", {
        name: request.name,
        description: request.description,
        schema: request.schema,
        endpoint: request.endpoint,
        method: request.method,
        headers: request.headers || {},
        category: request.category || "general",
        tags: request.tags || [],
        isActive: request.isActive ?? true,
      });

      if (response.success && response.data) {
        this.emit("tool:created", response.data);
        this.debug("Tool created successfully", { toolId: response.data.id });
        return response.data;
      }

      throw new Error("Failed to create tool");
    } catch (error) {
      this.debug("Tool creation failed", error);
      throw error;
    }
  }

  /**
   * Get tool by ID
   */
  async get(toolId: string): Promise<Tool> {
    this.validateRequired({ toolId }, ["toolId"]);

    try {
      const response = await this.get<Tool>(`/${toolId}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Tool not found");
    } catch (error) {
      this.debug("Failed to get tool", { toolId, error });
      throw error;
    }
  }

  /**
   * List tools with pagination and filtering
   */
  async list(
    params: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      tags?: string[];
      isActive?: boolean;
    } = {},
  ): Promise<PaginatedResponse<Tool>> {
    try {
      const queryParams = {
        ...params,
        tags: params.tags?.join(","),
      };

      const response = await this.getPaginated<Tool>("", queryParams);
      return response;
    } catch (error) {
      this.debug("Failed to list tools", error);
      throw error;
    }
  }

  /**
   * Update tool
   */
  async update(toolId: string, updates: UpdateToolRequest): Promise<Tool> {
    this.validateRequired({ toolId }, ["toolId"]);

    if (updates.endpoint && !this.isValidURL(updates.endpoint)) {
      throw new ValidationError(
        "Invalid endpoint URL",
        "endpoint",
        "valid URL",
        updates.endpoint,
      );
    }

    if (updates.method && !this.isValidHTTPMethod(updates.method)) {
      throw new ValidationError(
        "Invalid HTTP method",
        "method",
        "GET, POST, PUT, DELETE, or PATCH",
        updates.method,
      );
    }

    try {
      const response = await this.patch<Tool>(`/${toolId}`, updates);

      if (response.success && response.data) {
        this.emit("tool:updated", response.data);
        this.debug("Tool updated successfully", { toolId });
        return response.data;
      }

      throw new Error("Failed to update tool");
    } catch (error) {
      this.debug("Tool update failed", { toolId, error });
      throw error;
    }
  }

  /**
   * Delete tool
   */
  async delete(toolId: string): Promise<void> {
    this.validateRequired({ toolId }, ["toolId"]);

    try {
      const response = await this.delete(`/${toolId}`);

      if (response.success) {
        this.emit("tool:deleted", { toolId });
        this.debug("Tool deleted successfully", { toolId });
      } else {
        throw new Error("Failed to delete tool");
      }
    } catch (error) {
      this.debug("Tool deletion failed", { toolId, error });
      throw error;
    }
  }

  /**
   * Execute tool function
   */
  async execute(
    toolId: string,
    request: ExecuteToolRequest,
  ): Promise<ToolCall> {
    this.validateRequired(
      {
        toolId,
        functionName: request.functionName,
        parameters: request.parameters,
      },
      ["toolId", "functionName", "parameters"],
    );

    const toolCallId = generateExecutionId();
    const startTime = Date.now();

    try {
      // Use APIX for real-time execution if connected
      if (this.client.isConnected()) {
        return await this.executeWithAPX(toolId, request, toolCallId);
      }

      // Fallback to HTTP execution
      const response = await this.post<any>(`/${toolId}/execute`, {
        toolCallId,
        functionName: request.functionName,
        parameters: request.parameters,
        callerType: request.callerType || "user",
        callerId: request.callerId,
        timeout: request.timeout || 30000,
      });

      if (response.success && response.data) {
        const toolCall: ToolCall = {
          id: toolCallId,
          toolId,
          functionName: request.functionName,
          parameters: request.parameters,
          result: response.data.result,
          status: ExecutionStatus.COMPLETED,
          executionTime: Date.now() - startTime,
          cost: response.data.cost || 0,
        };

        this.emit("tool:execution_complete", toolCall);
        return toolCall;
      }

      throw new ExecutionError("Tool execution failed", toolCallId);
    } catch (error) {
      this.debug("Tool execution failed", { toolId, toolCallId, error });
      throw error;
    }
  }

  /**
   * Execute tool via APIX with real-time updates
   */
  private async executeWithAPX(
    toolId: string,
    request: ExecuteToolRequest,
    toolCallId: string,
  ): Promise<ToolCall> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let toolCall: Partial<ToolCall> = {
        id: toolCallId,
        toolId,
        functionName: request.functionName,
        parameters: request.parameters,
        status: ExecutionStatus.PENDING,
      };

      // Subscribe to tool execution events
      const unsubscribers = [
        this.subscribe(APXMessageType.TOOL_CALL_START, (message) => {
          if (message.payload.tool_call_id === toolCallId) {
            toolCall.status = ExecutionStatus.RUNNING;
            this.emit("tool:execution_started", toolCall);
          }
        }),

        this.subscribe(APXMessageType.TOOL_CALL_RESULT, (message) => {
          if (message.payload.tool_call_id === toolCallId) {
            const completedToolCall: ToolCall = {
              ...(toolCall as ToolCall),
              result: message.payload.result,
              status: message.payload.success
                ? ExecutionStatus.COMPLETED
                : ExecutionStatus.FAILED,
              executionTime: message.payload.execution_time_ms,
              cost: message.payload.cost,
            };

            // Cleanup subscriptions
            unsubscribers.forEach((unsub) => unsub());

            this.emit("tool:execution_complete", completedToolCall);
            resolve(completedToolCall);
          }
        }),

        this.subscribe(APXMessageType.TOOL_CALL_ERROR, (message) => {
          if (message.payload.tool_call_id === toolCallId) {
            const error = new ExecutionError(
              message.payload.error_message,
              toolCallId,
              "tool_execution",
              message.payload.retry_possible,
            );

            // Cleanup subscriptions
            unsubscribers.forEach((unsub) => unsub());

            this.emit("tool:execution_error", { toolCallId, error });
            reject(error);
          }
        }),
      ];

      // Start the execution via APIX
      this.client.apixClient
        .callTool(toolId, request.functionName, request.parameters, {
          caller_type: request.callerType || "user",
          caller_id: request.callerId,
          timeout_ms: request.timeout || 30000,
        })
        .catch((error) => {
          // Cleanup subscriptions
          unsubscribers.forEach((unsub) => unsub());
          reject(
            new ExecutionError("Failed to start tool execution", toolCallId),
          );
        });

      // Set timeout
      setTimeout(() => {
        unsubscribers.forEach((unsub) => unsub());
        reject(new ExecutionError("Tool execution timeout", toolCallId));
      }, request.timeout || 30000);
    });
  }

  /**
   * Test tool function
   */
  async test(
    toolId: string,
    request: TestToolRequest,
  ): Promise<ToolTestResult> {
    this.validateRequired(
      {
        toolId,
        functionName: request.functionName,
        parameters: request.parameters,
      },
      ["toolId", "functionName", "parameters"],
    );

    try {
      const response = await this.post<ToolTestResult>(`/${toolId}/test`, {
        functionName: request.functionName,
        parameters: request.parameters,
        expectedResult: request.expectedResult,
      });

      if (response.success && response.data) {
        this.emit("tool:test_complete", { toolId, result: response.data });
        return response.data;
      }

      throw new Error("Tool testing failed");
    } catch (error) {
      this.debug("Tool testing failed", { toolId, error });
      throw error;
    }
  }

  /**
   * Get tool execution history
   */
  async getExecutions(
    toolId: string,
    params: {
      page?: number;
      limit?: number;
      status?: ExecutionStatus;
      startDate?: Date;
      endDate?: Date;
      callerId?: string;
    } = {},
  ): Promise<PaginatedResponse<ToolCall>> {
    this.validateRequired({ toolId }, ["toolId"]);

    try {
      const queryParams = {
        ...params,
        startDate: params.startDate?.toISOString(),
        endDate: params.endDate?.toISOString(),
      };

      const response = await this.getPaginated<ToolCall>(
        `/${toolId}/executions`,
        queryParams,
      );
      return response;
    } catch (error) {
      this.debug("Failed to get tool executions", { toolId, error });
      throw error;
    }
  }

  /**
   * Get tool analytics
   */
  async getAnalytics(
    toolId: string,
    params: {
      startDate?: Date;
      endDate?: Date;
      granularity?: "hour" | "day" | "week" | "month";
    } = {},
  ): Promise<{
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    totalCost: number;
    errorRate: number;
    popularFunctions: Array<{
      functionName: string;
      callCount: number;
      successRate: number;
    }>;
  }> {
    this.validateRequired({ toolId }, ["toolId"]);

    try {
      const queryParams = {
        startDate: params.startDate?.toISOString(),
        endDate: params.endDate?.toISOString(),
        granularity: params.granularity || "day",
      };

      const queryString = this.buildQueryString(queryParams);
      const response = await this.get<any>(
        `/${toolId}/analytics${queryString}`,
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Failed to get tool analytics");
    } catch (error) {
      this.debug("Failed to get tool analytics", { toolId, error });
      throw error;
    }
  }

  /**
   * Validate tool schema
   */
  async validateSchema(schema: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    this.validateRequired({ schema }, ["schema"]);

    try {
      const response = await this.post<any>("/validate-schema", { schema });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Schema validation failed");
    } catch (error) {
      this.debug("Schema validation failed", error);
      throw error;
    }
  }

  /**
   * Get available tool categories
   */
  async getCategories(): Promise<
    Array<{
      name: string;
      count: number;
      description?: string;
    }>
  > {
    try {
      const response = await this.get<any>("/categories");

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Failed to get tool categories");
    } catch (error) {
      this.debug("Failed to get tool categories", error);
      throw error;
    }
  }

  /**
   * Search tools by functionality
   */
  async search(
    query: string,
    params: {
      category?: string;
      tags?: string[];
      limit?: number;
    } = {},
  ): Promise<Tool[]> {
    this.validateRequired({ query }, ["query"]);

    try {
      const queryParams = {
        q: query,
        category: params.category,
        tags: params.tags?.join(","),
        limit: params.limit || 20,
      };

      const queryString = this.buildQueryString(queryParams);
      const response = await this.get<Tool[]>(`/search${queryString}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Tool search failed");
    } catch (error) {
      this.debug("Tool search failed", { query, error });
      throw error;
    }
  }

  // Private helper methods

  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidHTTPMethod(method: string): boolean {
    return ["GET", "POST", "PUT", "DELETE", "PATCH"].includes(
      method.toUpperCase(),
    );
  }
}
