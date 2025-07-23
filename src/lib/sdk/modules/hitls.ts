/**
 * HITL (Human-in-the-Loop) Module
 * Manages human approval workflows and decision-making processes
 */

import { BaseModule } from "./base";
import { SynapseAI } from "../client";
import {
  APIResponse,
  PaginatedResponse,
  HITLRequest,
  HITLOption,
  HITLResolution,
  UserRole,
  RequestOptions,
} from "../types";

export interface CreateHITLRequest {
  type: "approval" | "input" | "decision" | "review";
  title: string;
  description: string;
  context: Record<string, any>;
  options?: HITLOption[];
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeRoles?: UserRole[];
  assigneeUsers?: string[];
  expiresIn?: number; // hours
  metadata?: Record<string, any>;
}

export interface UpdateHITLRequest {
  title?: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeRoles?: UserRole[];
  assigneeUsers?: string[];
  expiresAt?: Date;
}

export interface HITLListOptions {
  page?: number;
  limit?: number;
  type?: "approval" | "input" | "decision" | "review";
  status?: "pending" | "assigned" | "resolved" | "expired";
  priority?: "low" | "medium" | "high" | "urgent";
  assignedToMe?: boolean;
  assigneeId?: string;
  createdBy?: string;
  sortBy?: "createdAt" | "priority" | "expiresAt" | "status";
  sortOrder?: "asc" | "desc";
}

export interface ResolveHITLRequest {
  decision: any;
  reasoning?: string;
  metadata?: Record<string, any>;
}

export interface HITLWorkflowRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    resourceType: "agent" | "tool" | "workflow";
    conditions: Array<{
      field: string;
      operator: "equals" | "contains" | "greater_than" | "less_than";
      value: any;
    }>;
  };
  action: {
    type: "approval" | "input" | "decision" | "review";
    assigneeRoles: UserRole[];
    assigneeUsers?: string[];
    priority: "low" | "medium" | "high" | "urgent";
    template: {
      title: string;
      description: string;
      options?: HITLOption[];
    };
  };
  isActive: boolean;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HITLAnalytics {
  totalRequests: number;
  pendingRequests: number;
  resolvedRequests: number;
  expiredRequests: number;
  averageResolutionTime: number;
  resolutionRate: number;
  requestsByType: Record<string, number>;
  requestsByPriority: Record<string, number>;
  assigneePerformance: Array<{
    userId: string;
    userName: string;
    assignedRequests: number;
    resolvedRequests: number;
    averageResolutionTime: number;
    resolutionRate: number;
  }>;
  trends: Array<{
    date: string;
    created: number;
    resolved: number;
    expired: number;
  }>;
}

export interface HITLNotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  webhookNotifications: boolean;
  notificationChannels: {
    onAssignment: string[];
    onEscalation: string[];
    onExpiration: string[];
    onResolution: string[];
  };
  escalationRules: Array<{
    afterHours: number;
    escalateTo: UserRole[];
    escalateToUsers?: string[];
  }>;
}

/**
 * HITL Module Class
 */
export class HITLModule extends BaseModule {
  constructor(client: SynapseAI) {
    super(client, "/hitl");
  }

  /**
   * Create a new HITL request
   */
  async createRequest(
    data: CreateHITLRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLRequest>> {
    this.validateRequired(data, ["type", "title", "description", "context"]);

    this.debug("Creating HITL request", {
      type: data.type,
      title: data.title,
      priority: data.priority,
    });

    const expiresAt = data.expiresIn
      ? new Date(Date.now() + data.expiresIn * 60 * 60 * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours default

    const response = await this.post<HITLRequest>(
      "/requests",
      {
        ...data,
        priority: data.priority || "medium",
        assigneeRoles: data.assigneeRoles || [UserRole.ORG_ADMIN],
        expiresAt,
        organizationId: this.getCurrentOrganization()?.id,
        createdBy: this.getCurrentUser()?.id,
      },
      options,
    );

    this.emit("hitl:request_created", response.data);
    return response;
  }

  /**
   * Get HITL request by ID
   */
  async getRequest(
    id: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLRequest>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Getting HITL request", { id });

    return this.get<HITLRequest>(`/requests/${id}`, options);
  }

  /**
   * List HITL requests with pagination and filtering
   */
  async listRequests(
    listOptions: HITLListOptions = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<HITLRequest>> {
    this.debug("Listing HITL requests", listOptions);

    const params: Record<string, any> = {
      page: listOptions.page,
      limit: listOptions.limit,
      type: listOptions.type,
      status: listOptions.status,
      priority: listOptions.priority,
      assignedToMe: listOptions.assignedToMe,
      assigneeId: listOptions.assigneeId,
      createdBy: listOptions.createdBy,
      sortBy: listOptions.sortBy,
      sortOrder: listOptions.sortOrder,
    };

    return this.getPaginated<HITLRequest>("/requests", params, options);
  }

  /**
   * Update HITL request
   */
  async updateRequest(
    id: string,
    data: UpdateHITLRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLRequest>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Updating HITL request", { id, data });

    const response = await this.put<HITLRequest>(
      `/requests/${id}`,
      data,
      options,
    );

    this.emit("hitl:request_updated", response.data);
    return response;
  }

  /**
   * Assign HITL request to user
   */
  async assignRequest(
    id: string,
    assigneeId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLRequest>> {
    this.validateRequired({ id, assigneeId }, ["id", "assigneeId"]);

    this.debug("Assigning HITL request", { id, assigneeId });

    const response = await this.post<HITLRequest>(
      `/requests/${id}/assign`,
      { assigneeId },
      options,
    );

    this.emit("hitl:request_assigned", response.data);
    return response;
  }

  /**
   * Resolve HITL request
   */
  async resolveRequest(
    id: string,
    resolution: ResolveHITLRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLRequest>> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(resolution, ["decision"]);

    this.debug("Resolving HITL request", { id, decision: resolution.decision });

    const response = await this.post<HITLRequest>(
      `/requests/${id}/resolve`,
      {
        ...resolution,
        resolvedBy: this.getCurrentUser()?.id,
        resolvedAt: new Date(),
      },
      options,
    );

    this.emit("hitl:request_resolved", response.data);
    return response;
  }

  /**
   * Escalate HITL request
   */
  async escalateRequest(
    id: string,
    escalationData: {
      escalateTo: UserRole[] | string[];
      reason: string;
      priority?: "high" | "urgent";
    },
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLRequest>> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(escalationData, ["escalateTo", "reason"]);

    this.debug("Escalating HITL request", { id, escalationData });

    const response = await this.post<HITLRequest>(
      `/requests/${id}/escalate`,
      {
        ...escalationData,
        escalatedBy: this.getCurrentUser()?.id,
        escalatedAt: new Date(),
      },
      options,
    );

    this.emit("hitl:request_escalated", response.data);
    return response;
  }

  /**
   * Cancel HITL request
   */
  async cancelRequest(
    id: string,
    reason?: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLRequest>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Cancelling HITL request", { id, reason });

    const response = await this.post<HITLRequest>(
      `/requests/${id}/cancel`,
      {
        reason,
        cancelledBy: this.getCurrentUser()?.id,
        cancelledAt: new Date(),
      },
      options,
    );

    this.emit("hitl:request_cancelled", response.data);
    return response;
  }

  /**
   * Get my assigned requests
   */
  async getMyRequests(
    query: {
      status?: "pending" | "assigned" | "resolved" | "expired";
      priority?: "low" | "medium" | "high" | "urgent";
      page?: number;
      limit?: number;
    } = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<HITLRequest>> {
    this.debug("Getting my HITL requests", query);

    const params = {
      ...query,
      assignedToMe: true,
    };

    return this.getPaginated<HITLRequest>("/requests", params, options);
  }

  /**
   * Add comment to HITL request
   */
  async addComment(
    id: string,
    comment: {
      content: string;
      isInternal?: boolean;
      attachments?: string[];
    },
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      id: string;
      content: string;
      isInternal: boolean;
      attachments: string[];
      createdBy: string;
      createdAt: Date;
    }>
  > {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(comment, ["content"]);

    this.debug("Adding comment to HITL request", { id, comment });

    const response = await this.post(
      `/requests/${id}/comments`,
      {
        ...comment,
        isInternal: comment.isInternal ?? false,
        createdBy: this.getCurrentUser()?.id,
      },
      options,
    );

    this.emit("hitl:comment_added", { requestId: id, comment: response.data });
    return response;
  }

  /**
   * Get comments for HITL request
   */
  async getComments(
    id: string,
    options: RequestOptions = {},
  ): Promise<
    APIResponse<
      Array<{
        id: string;
        content: string;
        isInternal: boolean;
        attachments: string[];
        createdBy: string;
        createdByName: string;
        createdAt: Date;
      }>
    >
  > {
    this.validateRequired({ id }, ["id"]);

    this.debug("Getting comments for HITL request", { id });

    return this.get(`/requests/${id}/comments`, options);
  }

  // Workflow Rules Management

  /**
   * Create HITL workflow rule
   */
  async createWorkflowRule(
    rule: Omit<
      HITLWorkflowRule,
      "id" | "organizationId" | "createdAt" | "updatedAt"
    >,
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLWorkflowRule>> {
    this.validateRequired(rule, ["name", "trigger", "action"]);

    this.debug("Creating HITL workflow rule", { name: rule.name });

    const response = await this.post<HITLWorkflowRule>(
      "/workflow-rules",
      {
        ...rule,
        organizationId: this.getCurrentOrganization()?.id,
      },
      options,
    );

    this.emit("hitl:workflow_rule_created", response.data);
    return response;
  }

  /**
   * List workflow rules
   */
  async listWorkflowRules(
    query: {
      page?: number;
      limit?: number;
      isActive?: boolean;
      resourceType?: "agent" | "tool" | "workflow";
    } = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<HITLWorkflowRule>> {
    this.debug("Listing HITL workflow rules", query);

    return this.getPaginated<HITLWorkflowRule>(
      "/workflow-rules",
      query,
      options,
    );
  }

  /**
   * Update workflow rule
   */
  async updateWorkflowRule(
    id: string,
    updates: Partial<
      Omit<
        HITLWorkflowRule,
        "id" | "organizationId" | "createdAt" | "updatedAt"
      >
    >,
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLWorkflowRule>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Updating HITL workflow rule", { id, updates });

    const response = await this.put<HITLWorkflowRule>(
      `/workflow-rules/${id}`,
      updates,
      options,
    );

    this.emit("hitl:workflow_rule_updated", response.data);
    return response;
  }

  /**
   * Delete workflow rule
   */
  async deleteWorkflowRule(
    id: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<void>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Deleting HITL workflow rule", { id });

    const response = await this.delete<void>(`/workflow-rules/${id}`, options);

    this.emit("hitl:workflow_rule_deleted", { id });
    return response;
  }

  // Analytics and Reporting

  /**
   * Get HITL analytics
   */
  async getAnalytics(
    period: { start: Date; end: Date },
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLAnalytics>> {
    this.validateRequired(period, ["start", "end"]);

    this.debug("Getting HITL analytics", period);

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    };

    return this.get<HITLAnalytics>(
      `/analytics${this.buildQueryString(params)}`,
      options,
    );
  }

  /**
   * Export HITL data
   */
  async exportData(
    query: {
      startDate?: Date;
      endDate?: Date;
      status?: "pending" | "assigned" | "resolved" | "expired";
      type?: "approval" | "input" | "decision" | "review";
      format?: "csv" | "json" | "xlsx";
    } = {},
    options: RequestOptions = {},
  ): Promise<Blob> {
    this.debug("Exporting HITL data", query);

    const params: Record<string, any> = {
      status: query.status,
      type: query.type,
      format: query.format || "csv",
    };

    if (query.startDate) {
      params.startDate = query.startDate.toISOString();
    }

    if (query.endDate) {
      params.endDate = query.endDate.toISOString();
    }

    const config = this.client.getConfig();
    const response = await fetch(
      `${config.baseURL}/hitl/export${this.buildQueryString(params)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          ...options.headers,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to export HITL data: ${response.statusText}`);
    }

    return response.blob();
  }

  // Notification Settings

  /**
   * Get notification settings
   */
  async getNotificationSettings(
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLNotificationSettings>> {
    this.debug("Getting HITL notification settings");

    return this.get<HITLNotificationSettings>(
      "/notification-settings",
      options,
    );
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    settings: Partial<HITLNotificationSettings>,
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLNotificationSettings>> {
    this.debug("Updating HITL notification settings", settings);

    const response = await this.put<HITLNotificationSettings>(
      "/notification-settings",
      settings,
      options,
    );

    this.emit("hitl:notification_settings_updated", response.data);
    return response;
  }

  // Bulk Operations

  /**
   * Bulk resolve requests
   */
  async bulkResolve(
    requestIds: string[],
    resolution: ResolveHITLRequest,
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      successful: string[];
      failed: Array<{ requestId: string; error: string }>;
    }>
  > {
    this.validateRequired({ requestIds }, ["requestIds"]);
    this.validateRequired(resolution, ["decision"]);

    if (!requestIds.length) {
      throw new Error("At least one request ID is required");
    }

    this.debug("Bulk resolving HITL requests", {
      count: requestIds.length,
      decision: resolution.decision,
    });

    const response = await this.post(
      "/requests/bulk-resolve",
      {
        requestIds,
        resolution: {
          ...resolution,
          resolvedBy: this.getCurrentUser()?.id,
          resolvedAt: new Date(),
        },
      },
      options,
    );

    this.emit("hitl:bulk_resolve_completed", response.data);
    return response;
  }

  /**
   * Bulk assign requests
   */
  async bulkAssign(
    requestIds: string[],
    assigneeId: string,
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      successful: string[];
      failed: Array<{ requestId: string; error: string }>;
    }>
  > {
    this.validateRequired({ requestIds, assigneeId }, [
      "requestIds",
      "assigneeId",
    ]);

    if (!requestIds.length) {
      throw new Error("At least one request ID is required");
    }

    this.debug("Bulk assigning HITL requests", {
      count: requestIds.length,
      assigneeId,
    });

    const response = await this.post(
      "/requests/bulk-assign",
      { requestIds, assigneeId },
      options,
    );

    this.emit("hitl:bulk_assign_completed", response.data);
    return response;
  }

  // Event Subscriptions

  /**
   * Subscribe to HITL request events
   */
  onRequestEvent(
    callback: (event: { type: string; request: HITLRequest }) => void,
  ): () => void {
    return this.subscribe("hitl:request_event", callback);
  }

  /**
   * Subscribe to assignment events
   */
  onAssignmentEvent(
    callback: (event: { requestId: string; assigneeId: string }) => void,
  ): () => void {
    return this.subscribe("hitl:assignment_event", callback);
  }

  /**
   * Subscribe to resolution events
   */
  onResolutionEvent(
    callback: (event: {
      requestId: string;
      resolution: HITLResolution;
    }) => void,
  ): () => void {
    return this.subscribe("hitl:resolution_event", callback);
  }

  /**
   * Subscribe to escalation events
   */
  onEscalationEvent(
    callback: (event: { requestId: string; escalatedTo: string[] }) => void,
  ): () => void {
    return this.subscribe("hitl:escalation_event", callback);
  }
}
