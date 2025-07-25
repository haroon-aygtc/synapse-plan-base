/**
 * Workflow Module
 * Manages workflow creation, execution, and monitoring
 */

import { BaseModule } from "./base";
import { SynapseAI } from "../client";
import {
  APIResponse,
  PaginatedResponse,
  Workflow,
  WorkflowExecution,
  WorkflowDefinition,
  ExecutionStatus,
  StreamingOptions,
  RequestOptions,
} from "../types";
import { APXMessageType } from "../../../types/apix";
import { generateExecutionId } from "../utils";

export interface CreateWorkflowRequest {
  name: string;
  description: string;
  definition: WorkflowDefinition;
  tags?: string[];
  isActive?: boolean;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  definition?: WorkflowDefinition;
  tags?: string[];
  isActive?: boolean;
}

export interface ExecuteWorkflowRequest {
  input: Record<string, any>;
  variables?: Record<string, any>;
  timeout?: number;
  retryAttempts?: number;
  notifyOnCompletion?: boolean;
}

export interface WorkflowListOptions {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  isActive?: boolean;
  sortBy?: "name" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface WorkflowExecutionListOptions {
  page?: number;
  limit?: number;
  workflowId?: string;
  status?: ExecutionStatus;
  startDate?: Date;
  endDate?: Date;
  sortBy?: "createdAt" | "completedAt" | "status";
  sortOrder?: "asc" | "desc";
}

export interface WorkflowAnalytics {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  errorRate: number;
  mostCommonErrors: Array<{
    error: string;
    count: number;
  }>;
  executionTrends: Array<{
    date: string;
    executions: number;
    successRate: number;
  }>;
}

/**
 * Workflow Module Class
 */
export class WorkflowModule extends BaseModule {
  constructor(client: SynapseAI) {
    super(client, "/workflows");
  }

  /**
   * Create a new workflow
   */
  async create(
    data: CreateWorkflowRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<Workflow>> {
    this.validateRequired(data, ["name", "description", "definition"]);

    this.debug("Creating workflow", { name: data.name });

    const response = await this.post<Workflow>(
      "",
      {
        ...data,
        organizationId: this.getCurrentOrganization()?.id,
        userId: this.getCurrentUser()?.id,
      },
      options,
    );

    this.emit("workflow:created", response.data);
    return response;
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(
    id: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<Workflow>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Getting workflow", { id });

    const response = await this.get<Workflow>(`/${id}`, options);
    return response;
  }

  /**
   * List workflows with pagination and filtering
   */
  async list(
    listOptions: WorkflowListOptions = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<Workflow>> {
    this.debug("Listing workflows", listOptions);

    const params: Record<string, any> = {
      page: listOptions.page,
      limit: listOptions.limit,
      search: listOptions.search,
      isActive: listOptions.isActive,
      sortBy: listOptions.sortBy,
      sortOrder: listOptions.sortOrder,
    };

    if (listOptions.tags?.length) {
      params.tags = listOptions.tags.join(",");
    }

    return this.getPaginated<Workflow>("", params, options);
  }

  /**
   * Update workflow
   */
  async update(
    id: string,
    data: UpdateWorkflowRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<Workflow>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Updating workflow", { id, data });

    const response = await this.put<Workflow>(`/${id}`, data, options);

    this.emit("workflow:updated", response.data);
    return response;
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(
    id: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<void>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Deleting workflow", { id });

    const response = await this.delete<void>(`/${id}`, options);

    this.emit("workflow:deleted", { id });
    return response;
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(
    id: string, 
    data: ExecuteWorkflowRequest & { executionId: string },
    options: RequestOptions = {},
  ): Promise<APIResponse<WorkflowExecution>> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(data, ["input"]);

    this.debug("Executing workflow", { id, input: data.input });

    const executionId = generateExecutionId();

    const response = await this.post<WorkflowExecution>(
      `/${id}/execute`,
      {
        ...data,
        executionId,
      },
      options,
    );

    this.emit("workflow:execution_started", response.data);
    return response;
  }

  /**
   * Execute workflow with real-time streaming
   */
  async executeStream(
    id: string,
    data: ExecuteWorkflowRequest,
    streamingOptions: StreamingOptions = {},
    options: RequestOptions = {},
  ): Promise<string> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(data, ["input"]);

    if (!this.isConnected()) {
      throw new Error("WebSocket connection required for streaming execution");
    }

    const executionId = generateExecutionId();

    this.debug("Starting workflow stream execution", { id, executionId });

    // Subscribe to workflow execution events
    const unsubscribe = this.subscribe(
      "workflow_execution_update",
      (data: any) => {
        if (data.executionId === executionId) {
          switch (data.status) {
            case "running":
              streamingOptions.onChunk?.(data);
              break;
            case "completed":
              streamingOptions.onComplete?.(data);
              unsubscribe();
              break;
            case "failed":
              streamingOptions.onError?.(
                new Error(data.error || "Workflow execution failed"),
              );
              unsubscribe();
              break;
          }
        }
      },
      { targetId: executionId },
    );

    // Start execution
    await this.executeWorkflow(id, { ...data, executionId }, options);

    return executionId;
  }

  /**
   * Get workflow execution by ID
   */
  async getWorkflowExecution(
    executionId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<WorkflowExecution>> {
    this.validateRequired({ executionId }, ["executionId"]);

    this.debug("Getting workflow execution", { executionId });

    return this.get<WorkflowExecution>(`/executions/${executionId}`, options);
  }

  /**
   * List workflow executions
   */
  async listExecutions(
    listOptions: WorkflowExecutionListOptions = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<WorkflowExecution>> {
    this.debug("Listing workflow executions", listOptions);

    const params: Record<string, any> = {
      page: listOptions.page,
      limit: listOptions.limit,
      workflowId: listOptions.workflowId,
      status: listOptions.status,
      sortBy: listOptions.sortBy,
      sortOrder: listOptions.sortOrder,
    };

    if (listOptions.startDate) {
      params.startDate = listOptions.startDate.toISOString();
    }

    if (listOptions.endDate) {
      params.endDate = listOptions.endDate.toISOString();
    }

    return this.getPaginated<WorkflowExecution>("/executions", params, options);
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(
    executionId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<WorkflowExecution>> {
    this.validateRequired({ executionId }, ["executionId"]);

    this.debug("Cancelling workflow execution", { executionId });

    const response = await this.post<WorkflowExecution>(
      `/executions/${executionId}/cancel`,
      {},
      options,
    );

    this.emit("workflow:execution_cancelled", response.data);
    return response;
  }

  /**
   * Pause workflow execution
   */
  async pauseExecution(
    executionId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<WorkflowExecution>> {
    this.validateRequired({ executionId }, ["executionId"]);

    this.debug("Pausing workflow execution", { executionId });

    const response = await this.post<WorkflowExecution>(
      `/executions/${executionId}/pause`,
      {},
      options,
    );

    this.emit("workflow:execution_paused", response.data);
    return response;
  }

  /**
   * Resume workflow execution
   */
  async resumeExecution(
    executionId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<WorkflowExecution>> {
    this.validateRequired({ executionId }, ["executionId"]);

    this.debug("Resuming workflow execution", { executionId });

    const response = await this.post<WorkflowExecution>(
      `/executions/${executionId}/resume`,
      {},
      options,
    );

    this.emit("workflow:execution_resumed", response.data);
    return response;
  }

  /**
   * Retry failed workflow execution
   */
  async retryExecution(
    executionId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<WorkflowExecution>> {
    this.validateRequired({ executionId }, ["executionId"]);

    this.debug("Retrying workflow execution", { executionId });

    const response = await this.post<WorkflowExecution>(
      `/executions/${executionId}/retry`,
      {},
      options,
    );

    this.emit("workflow:execution_retried", response.data);
    return response;
  }

  /**
   * Get workflow analytics
   */
  async getAnalytics(
    id: string,
    period: { start: Date; end: Date },
    options: RequestOptions = {},
  ): Promise<APIResponse<WorkflowAnalytics>> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(period, ["start", "end"]);

    this.debug("Getting workflow analytics", { id, period });

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    };

    return this.get<WorkflowAnalytics>(
      `/${id}/analytics${this.buildQueryString(params)}`,
      options,
    );
  }

  /**
   * Test workflow with sample data
   */
  async test(
    id: string,
    testData: {
      input: Record<string, any>;
      variables?: Record<string, any>;
      mockResponses?: Record<string, any>;
    },
    options: RequestOptions = {},
  ): Promise<APIResponse<WorkflowExecution>> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(testData, ["input"]);

    this.debug("Testing workflow", { id, testData });

    return this.post<WorkflowExecution>(`/${id}/test`, testData, options);
  }

  /**
   * Validate workflow definition
   */
  async validate(
    definition: WorkflowDefinition,
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{ isValid: boolean; errors: string[]; warnings: string[] }>
  > {
    this.validateRequired({ definition }, ["definition"]);

    this.debug("Validating workflow definition", { definition });

    return this.post<{
      isValid: boolean;
      errors: string[];
      warnings: string[];
    }>("/validate", { definition }, options);
  }

  /**
   * Clone workflow
   */
  async clone(
    id: string,
    data: { name: string; description?: string },
    options: RequestOptions = {},
  ): Promise<APIResponse<Workflow>> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(data, ["name"]);

    this.debug("Cloning workflow", { id, name: data.name });

    const response = await this.post<Workflow>(`/${id}/clone`, data, options);

    this.emit("workflow:cloned", response.data);
    return response;
  }

  /**
   * Export workflow definition
   */
  async export(
    id: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<{ definition: WorkflowDefinition; metadata: any }>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Exporting workflow", { id });

    return this.get<{ definition: WorkflowDefinition; metadata: any }>(
      `/${id}/export`,
      options,
    );
  }

  /**
   * Import workflow definition
   */
  async import(
    data: {
      name: string;
      description: string;
      definition: WorkflowDefinition;
      metadata?: any;
    },
    options: RequestOptions = {},
  ): Promise<APIResponse<Workflow>> {
    this.validateRequired(data, ["name", "description", "definition"]);

    this.debug("Importing workflow", { name: data.name });

    const response = await this.post<Workflow>("/import", data, options);

    this.emit("workflow:imported", response.data);
    return response;
  }

  /**
   * Subscribe to workflow events
   */
  onExecutionUpdate(
    callback: (execution: WorkflowExecution) => void,
  ): () => void {
    return this.subscribe("workflow_execution_update", callback);
  }

  /**
   * Subscribe to workflow completion events
   */
  onExecutionComplete(
    callback: (execution: WorkflowExecution) => void,
  ): () => void {
    return this.subscribe("workflow_execution_complete", callback);
  }

  /**
   * Subscribe to workflow error events
   */
  onExecutionError(
    callback: (data: { executionId: string; error: string }) => void,
  ): () => void {
    return this.subscribe("workflow_execution_error", callback);
  }
}
