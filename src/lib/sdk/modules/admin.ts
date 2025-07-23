/**
 * Admin Module
 * Provides administrative functionality for organization and user management
 */

import { BaseModule } from "./base";
import { SynapseAI } from "../client";
import {
  APIResponse,
  PaginatedResponse,
  User,
  Organization,
  UserRole,
  SubscriptionPlan,
  Permission,
  RequestOptions,
} from "../types";

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive?: boolean;
  permissions?: string[];
  sendInvitation?: boolean;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  permissions?: string[];
}

export interface UserListOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: "email" | "firstName" | "lastName" | "createdAt" | "lastLoginAt";
  sortOrder?: "asc" | "desc";
}

export interface OrganizationSettings {
  name?: string;
  slug?: string;
  plan?: SubscriptionPlan;
  settings?: Record<string, any>;
  quotas?: Record<string, number>;
  features?: string[];
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customDomain?: string;
  };
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "down";
  services: Array<{
    name: string;
    status: "up" | "down" | "degraded";
    responseTime?: number;
    lastCheck: Date;
    error?: string;
  }>;
  metrics: {
    uptime: number;
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
  };
  alerts: Array<{
    level: "info" | "warning" | "error" | "critical";
    message: string;
    timestamp: Date;
  }>;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  organizationId: string;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: "timestamp" | "action" | "resource";
  sortOrder?: "asc" | "desc";
}

export interface BulkUserOperation {
  operation: "activate" | "deactivate" | "delete" | "update_role";
  userIds: string[];
  data?: {
    role?: UserRole;
    isActive?: boolean;
  };
}

export interface SystemConfiguration {
  authentication: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
    mfaRequired: boolean;
  };
  security: {
    rateLimiting: {
      enabled: boolean;
      requestsPerMinute: number;
      burstLimit: number;
    };
    ipWhitelist: string[];
    corsOrigins: string[];
  };
  features: {
    enabledModules: string[];
    betaFeatures: string[];
    maintenanceMode: boolean;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    webhookEnabled: boolean;
    defaultChannels: string[];
  };
}

/**
 * Admin Module Class
 */
export class AdminModule extends BaseModule {
  constructor(client: SynapseAI) {
    super(client, "/admin");
  }

  // User Management

  /**
   * Create a new user
   */
  async createUser(
    userData: CreateUserRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<User>> {
    this.validateRequired(userData, ["email", "firstName", "lastName", "role"]);

    this.debug("Creating user", { email: userData.email, role: userData.role });

    const response = await this.post<User>(
      "/users",
      {
        ...userData,
        organizationId: this.getCurrentOrganization()?.id,
      },
      options,
    );

    this.emit("admin:user_created", response.data);
    return response;
  }

  /**
   * Get user by ID
   */
  async getUser(
    userId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<User>> {
    this.validateRequired({ userId }, ["userId"]);

    this.debug("Getting user", { userId });

    return this.get<User>(`/users/${userId}`, options);
  }

  /**
   * List users with pagination and filtering
   */
  async listUsers(
    listOptions: UserListOptions = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<User>> {
    this.debug("Listing users", listOptions);

    const params: Record<string, any> = {
      page: listOptions.page,
      limit: listOptions.limit,
      search: listOptions.search,
      role: listOptions.role,
      isActive: listOptions.isActive,
      sortBy: listOptions.sortBy,
      sortOrder: listOptions.sortOrder,
    };

    return this.getPaginated<User>("/users", params, options);
  }

  /**
   * Update user
   */
  async updateUser(
    userId: string,
    userData: UpdateUserRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<User>> {
    this.validateRequired({ userId }, ["userId"]);

    this.debug("Updating user", { userId, data: userData });

    const response = await this.put<User>(
      `/users/${userId}`,
      userData,
      options,
    );

    this.emit("admin:user_updated", response.data);
    return response;
  }

  /**
   * Delete user
   */
  async deleteUser(
    userId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<void>> {
    this.validateRequired({ userId }, ["userId"]);

    this.debug("Deleting user", { userId });

    const response = await this.delete<void>(`/users/${userId}`, options);

    this.emit("admin:user_deleted", { userId });
    return response;
  }

  /**
   * Bulk user operations
   */
  async bulkUserOperation(
    operation: BulkUserOperation,
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      successful: string[];
      failed: Array<{ userId: string; error: string }>;
    }>
  > {
    this.validateRequired(operation, ["operation", "userIds"]);

    if (!operation.userIds.length) {
      throw new Error("At least one user ID is required");
    }

    this.debug("Performing bulk user operation", {
      operation: operation.operation,
      count: operation.userIds.length,
    });

    const response = await this.post("/users/bulk", operation, options);

    this.emit("admin:bulk_user_operation", {
      operation: operation.operation,
      count: operation.userIds.length,
      result: response.data,
    });

    return response;
  }

  /**
   * Invite user to organization
   */
  async inviteUser(
    inviteData: {
      email: string;
      role: UserRole;
      message?: string;
      expiresIn?: number; // hours
    },
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      inviteId: string;
      email: string;
      expiresAt: Date;
      inviteUrl: string;
    }>
  > {
    this.validateRequired(inviteData, ["email", "role"]);

    this.debug("Inviting user", {
      email: inviteData.email,
      role: inviteData.role,
    });

    const response = await this.post(
      "/users/invite",
      {
        ...inviteData,
        organizationId: this.getCurrentOrganization()?.id,
        expiresIn: inviteData.expiresIn || 72, // 3 days default
      },
      options,
    );

    this.emit("admin:user_invited", response.data);
    return response;
  }

  /**
   * Resend user invitation
   */
  async resendInvitation(
    inviteId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<{ success: boolean; expiresAt: Date }>> {
    this.validateRequired({ inviteId }, ["inviteId"]);

    this.debug("Resending invitation", { inviteId });

    return this.post(`/users/invite/${inviteId}/resend`, {}, options);
  }

  /**
   * Cancel user invitation
   */
  async cancelInvitation(
    inviteId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<void>> {
    this.validateRequired({ inviteId }, ["inviteId"]);

    this.debug("Cancelling invitation", { inviteId });

    return this.delete(`/users/invite/${inviteId}`, options);
  }

  // Organization Management

  /**
   * Get organization details
   */
  async getOrganization(
    options: RequestOptions = {},
  ): Promise<APIResponse<Organization>> {
    this.debug("Getting organization details");

    return this.get<Organization>("/organization", options);
  }

  /**
   * Update organization settings
   */
  async updateOrganization(
    settings: OrganizationSettings,
    options: RequestOptions = {},
  ): Promise<APIResponse<Organization>> {
    this.debug("Updating organization settings", settings);

    const response = await this.put<Organization>(
      "/organization",
      settings,
      options,
    );

    this.emit("admin:organization_updated", response.data);
    return response;
  }

  /**
   * Get organization usage statistics
   */
  async getOrganizationStats(
    period: { start: Date; end: Date },
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      users: {
        total: number;
        active: number;
        newThisPeriod: number;
      };
      usage: {
        totalExecutions: number;
        totalCost: number;
        resourceBreakdown: Record<string, number>;
      };
      performance: {
        averageResponseTime: number;
        successRate: number;
        errorRate: number;
      };
    }>
  > {
    this.validateRequired(period, ["start", "end"]);

    this.debug("Getting organization stats", period);

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    };

    return this.get(
      `/organization/stats${this.buildQueryString(params)}`,
      options,
    );
  }

  // System Management

  /**
   * Get system health status
   */
  async getSystemHealth(
    options: RequestOptions = {},
  ): Promise<APIResponse<SystemHealth>> {
    this.debug("Getting system health");

    return this.get<SystemHealth>("/system/health", options);
  }

  /**
   * Get system configuration
   */
  async getSystemConfiguration(
    options: RequestOptions = {},
  ): Promise<APIResponse<SystemConfiguration>> {
    this.debug("Getting system configuration");

    return this.get<SystemConfiguration>("/system/config", options);
  }

  /**
   * Update system configuration
   */
  async updateSystemConfiguration(
    config: Partial<SystemConfiguration>,
    options: RequestOptions = {},
  ): Promise<APIResponse<SystemConfiguration>> {
    this.validateRequired({ config }, ["config"]);

    this.debug("Updating system configuration", config);

    const response = await this.put<SystemConfiguration>(
      "/system/config",
      config,
      options,
    );

    this.emit("admin:system_config_updated", response.data);
    return response;
  }

  /**
   * Restart system service
   */
  async restartService(
    serviceName: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<{ success: boolean; message: string }>> {
    this.validateRequired({ serviceName }, ["serviceName"]);

    this.debug("Restarting service", { serviceName });

    const response = await this.post(
      `/system/services/${serviceName}/restart`,
      {},
      options,
    );

    this.emit("admin:service_restarted", {
      serviceName,
      result: response.data,
    });
    return response;
  }

  // Audit Logs

  /**
   * Get audit logs
   */
  async getAuditLogs(
    query: AuditLogQuery = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<AuditLogEntry>> {
    this.debug("Getting audit logs", query);

    const params: Record<string, any> = {
      page: query.page,
      limit: query.limit,
      userId: query.userId,
      action: query.action,
      resource: query.resource,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    if (query.startDate) {
      params.startDate = query.startDate.toISOString();
    }

    if (query.endDate) {
      params.endDate = query.endDate.toISOString();
    }

    return this.getPaginated<AuditLogEntry>("/audit-logs", params, options);
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(
    query: AuditLogQuery & { format?: "csv" | "json" | "xlsx" },
    options: RequestOptions = {},
  ): Promise<Blob> {
    this.debug("Exporting audit logs", query);

    const params: Record<string, any> = {
      userId: query.userId,
      action: query.action,
      resource: query.resource,
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
      `${config.baseURL}/admin/audit-logs/export${this.buildQueryString(params)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          ...options.headers,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to export audit logs: ${response.statusText}`);
    }

    return response.blob();
  }

  // Permissions Management

  /**
   * Get available permissions
   */
  async getPermissions(
    options: RequestOptions = {},
  ): Promise<APIResponse<Permission[]>> {
    this.debug("Getting available permissions");

    return this.get<Permission[]>("/permissions", options);
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(
    userId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<Permission[]>> {
    this.validateRequired({ userId }, ["userId"]);

    this.debug("Getting user permissions", { userId });

    return this.get<Permission[]>(`/users/${userId}/permissions`, options);
  }

  /**
   * Update user permissions
   */
  async updateUserPermissions(
    userId: string,
    permissionIds: string[],
    options: RequestOptions = {},
  ): Promise<APIResponse<Permission[]>> {
    this.validateRequired({ userId, permissionIds }, [
      "userId",
      "permissionIds",
    ]);

    this.debug("Updating user permissions", { userId, permissionIds });

    const response = await this.put<Permission[]>(
      `/users/${userId}/permissions`,
      { permissionIds },
      options,
    );

    this.emit("admin:user_permissions_updated", {
      userId,
      permissions: response.data,
    });

    return response;
  }

  // Maintenance

  /**
   * Enable maintenance mode
   */
  async enableMaintenanceMode(
    data: {
      message?: string;
      estimatedDuration?: number; // minutes
      allowedIPs?: string[];
    } = {},
    options: RequestOptions = {},
  ): Promise<APIResponse<{ success: boolean; enabledAt: Date }>> {
    this.debug("Enabling maintenance mode", data);

    const response = await this.post(
      "/system/maintenance/enable",
      data,
      options,
    );

    this.emit("admin:maintenance_enabled", response.data);
    return response;
  }

  /**
   * Disable maintenance mode
   */
  async disableMaintenanceMode(
    options: RequestOptions = {},
  ): Promise<APIResponse<{ success: boolean; disabledAt: Date }>> {
    this.debug("Disabling maintenance mode");

    const response = await this.post(
      "/system/maintenance/disable",
      {},
      options,
    );

    this.emit("admin:maintenance_disabled", response.data);
    return response;
  }

  /**
   * Clear system cache
   */
  async clearCache(
    cacheType: "all" | "sessions" | "api" | "database" = "all",
    options: RequestOptions = {},
  ): Promise<APIResponse<{ success: boolean; clearedAt: Date }>> {
    this.debug("Clearing cache", { cacheType });

    const response = await this.post(
      `/system/cache/clear`,
      { type: cacheType },
      options,
    );

    this.emit("admin:cache_cleared", { cacheType, result: response.data });
    return response;
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(
    period: { start: Date; end: Date },
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      performance: {
        averageResponseTime: number;
        requestsPerSecond: number;
        errorRate: number;
        uptime: number;
      };
      resources: {
        cpuUsage: number;
        memoryUsage: number;
        diskUsage: number;
        networkIO: number;
      };
      database: {
        connections: number;
        queryTime: number;
        slowQueries: number;
      };
      trends: Array<{
        timestamp: string;
        metrics: Record<string, number>;
      }>;
    }>
  > {
    this.validateRequired(period, ["start", "end"]);

    this.debug("Getting system metrics", period);

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    };

    return this.get(`/system/metrics${this.buildQueryString(params)}`, options);
  }

  // Event Subscriptions

  /**
   * Subscribe to user events
   */
  onUserEvent(
    callback: (event: { type: string; user: User }) => void,
  ): () => void {
    return this.subscribe("admin:user_event", callback);
  }

  /**
   * Subscribe to system events
   */
  onSystemEvent(
    callback: (event: { type: string; data: any }) => void,
  ): () => void {
    return this.subscribe("admin:system_event", callback);
  }

  /**
   * Subscribe to audit events
   */
  onAuditEvent(callback: (entry: AuditLogEntry) => void): () => void {
    return this.subscribe("admin:audit_event", callback);
  }
}
