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
  HITLResolution,
  HITLOption,
  RequestOptions,
} from "../types";
import { APXMessageType } from "../../../types/apix";
import { generateRequestId } from "../utils";

export interface CreateHITLRequest {
  type: "approval" | "input" | "decision" | "review";
  title: string;
  description: string;
  context: Record<string, any>;
  options?: HITLOption[];
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeRoles?: string[];
  assigneeUsers?: string[];
  expiresIn?: number; // hours
}

export interface UpdateHITLRequest {
  title?: string;
  description?: string;
  context?: Record<string, any>;
  options?: HITLOption[];
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeRoles?: string[];
  assigneeUsers?: string[];
  expiresAt?: Date;
}

export interface ResolveHITLRequest {
  decision: any;
  reasoning?: string;
  metadata?: Record<string, any>;
}

export interface HITLListOptions {
  page?: number;
  limit?: number;
  status?: "pending" | "assigned" | "resolved" | "expired";
  type?: "approval" | "input" | "decision" | "review";
  priority?: "low" | "medium" | "high" | "urgent";
  assignedTo?: string;
  createdBy?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: "createdAt" | "priority" | "expiresAt";
  sortOrder?: "asc" | "desc";
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
  topApprovers: Array<{
    userId: string;
    userName: string;
    requestsResolved: number;
    averageResolutionTime: number;
  }>;
  trends: Array<{
    date: string;
    created: number;
    resolved: number;
    expired: number;
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
  async create(
    data: CreateHITLRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLRequest>> {
    this.validateRequired(data, ["type", "title", "description", "context"]);

    this.debug("Creating HITL request", {
      type: data.type,
      title: data.title,
      priority: data.priority,
    });

    const requestData = {
      ...data,
      organizationId: this.getCurrentOrganization()?.id,
      userId: this.getCurrentUser()?.id,
      expiresAt: data.expiresIn
        ? new Date(Date.now() + data.expiresIn * 60 * 60 * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
    };

    const response = await this.post<HITLRequest>("/requests", requestData, options);

    // If connected to APIX, also create via real-time
    if (this.isConnected()) {
      try {
        await this.client.apixClient.createHITLRequest(
          data.type,
          data.title,
          data.description,
          {
            context: data.context,
            options: data.options,
            priority: data.priority,
            expires_at: requestData.expiresAt.toISOString(),
            assignee_roles: data.assigneeRoles,
            assignee_users: data.assigneeUsers,
          },
        );
      } catch (error) {
        this.debug("Failed to create HITL request via APIX", error);
      }
    }

    this.emit("hitl:request_created", response.data);
    return response;
  }

  /**
   * Get HITL request by ID
   */
  async get(
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
  async list(
    listOptions: HITLListOptions = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<HITLRequest>> {
    this.debug("Listing HITL requests", listOptions);

    const params: Record<string, any> = {
      page: listOptions.page,
      limit: listOptions.limit,
      status: listOptions.status,
      type: listOptions.type,
      priority: listOptions.priority,
      assignedTo: listOptions.assignedTo,
      createdBy: listOptions.createdBy,
      sortBy: listOptions.sortBy,
      sortOrder: listOptions.sortOrder,
    };

    if (listOptions.startDate) {
      params.startDate = listOptions.startDate.toISOString();
    }

    if (listOptions.endDate) {
      params.endDate = listOptions.endDate.toISOString();
    }

    return this.getPaginated<HITLRequest>("/requests", params, options);
  }

  /**
   * Update HITL request
   */
  async update(
    id: string,
    data: UpdateHITLRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLRequest>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Updating HITL request", { id, data });

    const updateData = {
      ...data,
      expiresAt: data.expiresAt?.toISOString(),
    };

    const response = await this.put<HITLRequest>(
      `/requests/${id}`,
      updateData,
      options,
    );

    this.emit("hitl:request_updated", response.data);
    return response;
  }

  /**
   * Resolve HITL request
   */
  async resolve(
    id: string,
    resolution: ResolveHITLRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLRequest>> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(resolution, ["decision"]);

    this.debug("Resolving HITL request", { id, decision: resolution.decision });

    const resolutionData = {
      ...resolution,
      resolvedBy: this.getCurrentUser()?.id,
      resolvedAt: new Date(),
    };

    const response = await this.post<HITLRequest>(
      `/requests/${id}/resolve`,
      resolutionData,
      options,
    );

    this.emit("hitl:request_resolved", response.data);
    return response;
  }

  /**
   * Assign HITL request to user
   */
  async assign(
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
   * Escalate HITL request
   */
  async escalate(
    id: string,
    escalationData: {
      reason: string;
      newPriority?: "high" | "urgent";
      newAssigneeRoles?: string[];
      newAssigneeUsers?: string[];
    },
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLRequest>> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(escalationData, ["reason"]);

    this.debug("Escalating HITL request", { id, reason: escalationData.reason });

    const response = await this.post<HITLRequest>(
      `/requests/${id}/escalate`,
      escalationData,
      options,
    );

    this.emit("hitl:request_escalated", response.data);
    return response;
  }

  /**
   * Cancel HITL request
   */
  async cancel(
    id: string,
    reason?: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLRequest>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Cancelling HITL request", { id, reason });

    const response = await this.post<HITLRequest>(
      `/requests/${id}/cancel`,
      { reason: reason || "Request cancelled" },
      options,
    );

    this.emit("hitl:request_cancelled", response.data);
    return response;
  }

  /**
   * Get requests assigned to current user
   */
  async getMyRequests(
    listOptions: Omit<HITLListOptions, "assignedTo"> = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<HITLRequest>> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    this.debug("Getting my HITL requests", { userId: currentUser.id });

    return this.list(
      {
        ...listOptions,
        assignedTo: currentUser.id,
      },
      options,
    );
  }

  /**
   * Get pending requests for current user's roles
   */
  async getPendingRequests(
    listOptions: Omit<HITLListOptions, "status"> = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<HITLRequest>> {
    this.debug("Getting pending HITL requests");

    return this.list(
      {
        ...listOptions,
        status: "pending",
      },
      options,
    );
  }

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
   * Get request history for a specific resource
   */
  async getRequestHistory(
    resourceType: string,
    resourceId: string,
    listOptions: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    } = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<HITLRequest>> {
    this.validateRequired({ resourceType, resourceId }, [
      "resourceType",
      "resourceId",
    ]);

    this.debug("Getting request history", { resourceType, resourceId });

    const params: Record<string, any> = {
      resourceType,
      resourceId,
      page: listOptions.page,
      limit: listOptions.limit,
    };

    if (listOptions.startDate) {
      params.startDate = listOptions.startDate.toISOString();
    }

    if (listOptions.endDate) {
      params.endDate = listOptions.endDate.toISOString();
    }

    return this.getPaginated<HITLRequest>("/history", params, options);
  }

  /**
   * Bulk resolve requests
   */
  async bulkResolve(
    requests: Array<{
      id: string;
      decision: any;
      reasoning?: string;
    }>,
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      successful: string[];
      failed: Array<{ id: string; error: string }>;
    }>
  > {
    this.validateRequired({ requests }, ["requests"]);

    if (!requests.length) {
      throw new Error("At least one request is required");
    }

    this.debug("Bulk resolving HITL requests", { count: requests.length });

    const response = await this.post(
      "/requests/bulk-resolve",
      {
        requests,
        resolvedBy: this.getCurrentUser()?.id,
        resolvedAt: new Date(),
      },
      options,
    );

    this.emit("hitl:bulk_resolve", {
      count: requests.length,
      result: response.data,
    });

    return response;
  }

  /**
   * Create approval template
   */
  async createTemplate(
    templateData: {
      name: string;
      description: string;
      type: "approval" | "input" | "decision" | "review";
      defaultOptions?: HITLOption[];
      defaultPriority?: "low" | "medium" | "high" | "urgent";
      defaultAssigneeRoles?: string[];
      defaultExpiresIn?: number;
    },
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      id: string;
      name: string;
      description: string;
      type: string;
      createdAt: Date;
    }>
  > {
    this.validateRequired(templateData, ["name", "description", "type"]);

    this.debug("Creating HITL template", { name: templateData.name });

    const response = await this.post(
      "/templates",
      {
        ...templateData,
        organizationId: this.getCurrentOrganization()?.id,
        userId: this.getCurrentUser()?.id,
      },
      options,
    );

    this.emit("hitl:template_created", response.data);
    return response;
  }

  /**
   * Create request from template
   */
  async createFromTemplate(
    templateId: string,
    requestData: {
      title: string;
      description: string;
      context: Record<string, any>;
      overrides?: {
        options?: HITLOption[];
        priority?: "low" | "medium" | "high" | "urgent";
        assigneeRoles?: string[];
        assigneeUsers?: string[];
        expiresIn?: number;
      };
    },
    options: RequestOptions = {},
  ): Promise<APIResponse<HITLRequest>> {
    this.validateRequired({ templateId }, ["templateId"]);
    this.validateRequired(requestData, ["title", "description", "context"]);

    this.debug("Creating HITL request from template", {
      templateId,
      title: requestData.title,
    });

    const response = await this.post<HITLRequest>(
      `/templates/${templateId}/create`,
      requestData,
      options,
    );

    this.emit("hitl:request_created_from_template", {
      templateId,
      request: response.data,
    });

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
   * Subscribe to new HITL requests
   */
  onNewRequest(callback: (request: HITLRequest) => void): () => void {
    return this.subscribe("hitl:request_created", callback);
  }

  /**
   * Subscribe to HITL request assignments
   */
  onRequestAssigned(
    callback: (data: { request: HITLRequest; assignee: string }) => void,
  ): () => void {
    return this.subscribe("hitl:request_assigned", callback);
  }

  /**
   * Subscribe to HITL request resolutions
   */
  onRequestResolved(
    callback: (data: { request: HITLRequest; resolution: HITLResolution }) => void,
  ): () => void {
    return this.subscribe("hitl:request_resolved", callback);
  }

  /**
   * Subscribe to HITL request escalations
   */
  onRequestEscalated(
    callback: (data: { request: HITLRequest; reason: string }) => void,
  ): () => void {
    return this.subscribe("hitl:request_escalated", callback);
  }

  /**
   * Subscribe to HITL request expirations
   */
  onRequestExpired(callback: (request: HITLRequest) => void): () => void {
    return this.subscribe("hitl:request_expired", callback);
  }
}
