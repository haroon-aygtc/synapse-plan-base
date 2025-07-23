/**
 * Widget Module
 * Manages widget creation, customization, and deployment
 */

import { BaseModule } from "./base";
import { SynapseAI } from "../client";
import {
  APIResponse,
  PaginatedResponse,
  Widget,
  WidgetConfiguration,
  WidgetTheme,
  WidgetLayout,
  WidgetBehavior,
  WidgetBranding,
  WidgetSecurity,
  RequestOptions,
} from "../types";

export interface CreateWidgetRequest {
  name: string;
  type: "agent" | "tool" | "workflow";
  sourceId: string;
  configuration: WidgetConfiguration;
  isActive?: boolean;
}

export interface UpdateWidgetRequest {
  name?: string;
  configuration?: Partial<WidgetConfiguration>;
  isActive?: boolean;
}

export interface WidgetListOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: "agent" | "tool" | "workflow";
  isActive?: boolean;
  sortBy?: "name" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface WidgetDeployment {
  id: string;
  widgetId: string;
  embedCode: {
    javascript: string;
    iframe: string;
    react: string;
    vue: string;
    angular: string;
  };
  urls: {
    standalone: string;
    embed: string;
    api: string;
  };
  configuration: WidgetConfiguration;
  analytics: {
    views: number;
    interactions: number;
    conversions: number;
    lastAccessed: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetAnalytics {
  widgetId: string;
  period: { start: Date; end: Date };
  metrics: {
    totalViews: number;
    uniqueVisitors: number;
    interactions: number;
    conversions: number;
    averageSessionDuration: number;
    bounceRate: number;
  };
  trends: Array<{
    date: string;
    views: number;
    interactions: number;
    conversions: number;
  }>;
  topPages: Array<{
    url: string;
    views: number;
    interactions: number;
  }>;
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  browserBreakdown: Record<string, number>;
  geographicData: Array<{
    country: string;
    views: number;
    interactions: number;
  }>;
}

export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: "agent" | "tool" | "workflow";
  configuration: WidgetConfiguration;
  preview: {
    image: string;
    demoUrl: string;
  };
  tags: string[];
  rating: number;
  downloads: number;
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetTestResult {
  success: boolean;
  performance: {
    loadTime: number;
    renderTime: number;
    interactionTime: number;
  };
  compatibility: {
    browsers: Record<string, boolean>;
    devices: Record<string, boolean>;
    frameworks: Record<string, boolean>;
  };
  accessibility: {
    score: number;
    issues: Array<{
      level: "error" | "warning" | "info";
      message: string;
      element?: string;
    }>;
  };
  seo: {
    score: number;
    recommendations: string[];
  };
  errors: string[];
  warnings: string[];
}

/**
 * Widget Module Class
 */
export class WidgetModule extends BaseModule {
  constructor(client: SynapseAI) {
    super(client, "/widgets");
  }

  /**
   * Create a new widget
   */
  async create(
    data: CreateWidgetRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<Widget>> {
    this.validateRequired(data, ["name", "type", "sourceId", "configuration"]);

    this.debug("Creating widget", {
      name: data.name,
      type: data.type,
      sourceId: data.sourceId,
    });

    const response = await this.post<Widget>(
      "",
      {
        ...data,
        organizationId: this.getCurrentOrganization()?.id,
        userId: this.getCurrentUser()?.id,
      },
      options,
    );

    this.emit("widget:created", response.data);
    return response;
  }

  /**
   * Get widget by ID
   */
  async get(
    id: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<Widget>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Getting widget", { id });

    return this.get<Widget>(`/${id}`, options);
  }

  /**
   * List widgets with pagination and filtering
   */
  async list(
    listOptions: WidgetListOptions = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<Widget>> {
    this.debug("Listing widgets", listOptions);

    const params: Record<string, any> = {
      page: listOptions.page,
      limit: listOptions.limit,
      search: listOptions.search,
      type: listOptions.type,
      isActive: listOptions.isActive,
      sortBy: listOptions.sortBy,
      sortOrder: listOptions.sortOrder,
    };

    return this.getPaginated<Widget>("", params, options);
  }

  /**
   * Update widget
   */
  async update(
    id: string,
    data: UpdateWidgetRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<Widget>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Updating widget", { id, data });

    const response = await this.put<Widget>(`/${id}`, data, options);

    this.emit("widget:updated", response.data);
    return response;
  }

  /**
   * Delete widget
   */
  async delete(
    id: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<void>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Deleting widget", { id });

    const response = await this.delete<void>(`/${id}`, options);

    this.emit("widget:deleted", { id });
    return response;
  }

  /**
   * Deploy widget
   */
  async deploy(
    id: string,
    deploymentOptions: {
      environment?: "staging" | "production";
      customDomain?: string;
      enableAnalytics?: boolean;
      enableCaching?: boolean;
    } = {},
    options: RequestOptions = {},
  ): Promise<APIResponse<WidgetDeployment>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Deploying widget", { id, deploymentOptions });

    const response = await this.post<WidgetDeployment>(
      `/${id}/deploy`,
      {
        environment: deploymentOptions.environment || "production",
        customDomain: deploymentOptions.customDomain,
        enableAnalytics: deploymentOptions.enableAnalytics ?? true,
        enableCaching: deploymentOptions.enableCaching ?? true,
      },
      options,
    );

    this.emit("widget:deployed", response.data);
    return response;
  }

  /**
   * Get widget deployment info
   */
  async getDeployment(
    id: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<WidgetDeployment>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Getting widget deployment", { id });

    return this.get<WidgetDeployment>(`/${id}/deployment`, options);
  }

  /**
   * Update widget deployment
   */
  async updateDeployment(
    id: string,
    deploymentData: {
      customDomain?: string;
      enableAnalytics?: boolean;
      enableCaching?: boolean;
      configuration?: Partial<WidgetConfiguration>;
    },
    options: RequestOptions = {},
  ): Promise<APIResponse<WidgetDeployment>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Updating widget deployment", { id, deploymentData });

    const response = await this.put<WidgetDeployment>(
      `/${id}/deployment`,
      deploymentData,
      options,
    );

    this.emit("widget:deployment_updated", response.data);
    return response;
  }

  /**
   * Undeploy widget
   */
  async undeploy(
    id: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<{ success: boolean; undeployedAt: Date }>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Undeploying widget", { id });

    const response = await this.post(`/${id}/undeploy`, {}, options);

    this.emit("widget:undeployed", { id, result: response.data });
    return response;
  }

  /**
   * Generate embed code
   */
  async generateEmbedCode(
    id: string,
    format:
      | "javascript"
      | "iframe"
      | "react"
      | "vue"
      | "angular" = "javascript",
    customOptions: {
      containerId?: string;
      width?: string;
      height?: string;
      responsive?: boolean;
      theme?: Partial<WidgetTheme>;
    } = {},
    options: RequestOptions = {},
  ): Promise<APIResponse<{ code: string; instructions: string }>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Generating embed code", { id, format });

    return this.post(
      `/${id}/embed-code`,
      {
        format,
        options: customOptions,
      },
      options,
    );
  }

  /**
   * Test widget
   */
  async test(
    id: string,
    testOptions: {
      browsers?: string[];
      devices?: string[];
      checkAccessibility?: boolean;
      checkPerformance?: boolean;
      checkSEO?: boolean;
    } = {},
    options: RequestOptions = {},
  ): Promise<APIResponse<WidgetTestResult>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Testing widget", { id, testOptions });

    return this.post(
      `/${id}/test`,
      {
        browsers: testOptions.browsers || [
          "chrome",
          "firefox",
          "safari",
          "edge",
        ],
        devices: testOptions.devices || ["desktop", "mobile", "tablet"],
        checkAccessibility: testOptions.checkAccessibility ?? true,
        checkPerformance: testOptions.checkPerformance ?? true,
        checkSEO: testOptions.checkSEO ?? true,
      },
      options,
    );
  }

  /**
   * Preview widget
   */
  async preview(
    id: string,
    previewOptions: {
      device?: "desktop" | "mobile" | "tablet";
      theme?: Partial<WidgetTheme>;
      mockData?: Record<string, any>;
    } = {},
    options: RequestOptions = {},
  ): Promise<APIResponse<{ previewUrl: string; expiresAt: Date }>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Generating widget preview", { id, previewOptions });

    return this.post(`/${id}/preview`, previewOptions, options);
  }

  /**
   * Clone widget
   */
  async clone(
    id: string,
    cloneData: {
      name: string;
      configuration?: Partial<WidgetConfiguration>;
    },
    options: RequestOptions = {},
  ): Promise<APIResponse<Widget>> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(cloneData, ["name"]);

    this.debug("Cloning widget", { id, name: cloneData.name });

    const response = await this.post<Widget>(
      `/${id}/clone`,
      cloneData,
      options,
    );

    this.emit("widget:cloned", response.data);
    return response;
  }

  /**
   * Get widget analytics
   */
  async getAnalytics(
    id: string,
    period: { start: Date; end: Date },
    options: RequestOptions = {},
  ): Promise<APIResponse<WidgetAnalytics>> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(period, ["start", "end"]);

    this.debug("Getting widget analytics", { id, period });

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    };

    return this.get<WidgetAnalytics>(
      `/${id}/analytics${this.buildQueryString(params)}`,
      options,
    );
  }

  /**
   * Export widget analytics
   */
  async exportAnalytics(
    id: string,
    period: { start: Date; end: Date },
    format: "csv" | "json" | "xlsx" = "csv",
    options: RequestOptions = {},
  ): Promise<Blob> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(period, ["start", "end"]);

    this.debug("Exporting widget analytics", { id, period, format });

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      format,
    };

    const config = this.client.getConfig();
    const response = await fetch(
      `${config.baseURL}/widgets/${id}/analytics/export${this.buildQueryString(params)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          ...options.headers,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to export analytics: ${response.statusText}`);
    }

    return response.blob();
  }

  // Widget Templates

  /**
   * Get widget templates
   */
  async getTemplates(
    query: {
      page?: number;
      limit?: number;
      category?: string;
      type?: "agent" | "tool" | "workflow";
      search?: string;
      sortBy?: "name" | "rating" | "downloads" | "createdAt";
      sortOrder?: "asc" | "desc";
    } = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<WidgetTemplate>> {
    this.debug("Getting widget templates", query);

    return this.getPaginated<WidgetTemplate>("/templates", query, options);
  }

  /**
   * Get template by ID
   */
  async getTemplate(
    templateId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<WidgetTemplate>> {
    this.validateRequired({ templateId }, ["templateId"]);

    this.debug("Getting widget template", { templateId });

    return this.get<WidgetTemplate>(`/templates/${templateId}`, options);
  }

  /**
   * Create widget from template
   */
  async createFromTemplate(
    templateId: string,
    widgetData: {
      name: string;
      sourceId: string;
      configuration?: Partial<WidgetConfiguration>;
    },
    options: RequestOptions = {},
  ): Promise<APIResponse<Widget>> {
    this.validateRequired({ templateId }, ["templateId"]);
    this.validateRequired(widgetData, ["name", "sourceId"]);

    this.debug("Creating widget from template", {
      templateId,
      name: widgetData.name,
    });

    const response = await this.post<Widget>(
      `/templates/${templateId}/create`,
      {
        ...widgetData,
        organizationId: this.getCurrentOrganization()?.id,
        userId: this.getCurrentUser()?.id,
      },
      options,
    );

    this.emit("widget:created_from_template", {
      templateId,
      widget: response.data,
    });

    return response;
  }

  /**
   * Publish widget as template
   */
  async publishAsTemplate(
    id: string,
    templateData: {
      name: string;
      description: string;
      category: string;
      tags: string[];
      isPublic?: boolean;
    },
    options: RequestOptions = {},
  ): Promise<APIResponse<WidgetTemplate>> {
    this.validateRequired({ id }, ["id"]);
    this.validateRequired(templateData, [
      "name",
      "description",
      "category",
      "tags",
    ]);

    this.debug("Publishing widget as template", {
      id,
      name: templateData.name,
    });

    const response = await this.post<WidgetTemplate>(
      `/${id}/publish-template`,
      {
        ...templateData,
        isPublic: templateData.isPublic ?? false,
      },
      options,
    );

    this.emit("widget:published_as_template", response.data);
    return response;
  }

  // Widget Customization Helpers

  /**
   * Create default widget configuration
   */
  createDefaultConfiguration(
    type: "agent" | "tool" | "workflow",
    overrides: Partial<WidgetConfiguration> = {},
  ): WidgetConfiguration {
    const defaultTheme: WidgetTheme = {
      primaryColor: "#3b82f6",
      secondaryColor: "#64748b",
      backgroundColor: "#ffffff",
      textColor: "#1f2937",
      borderRadius: 8,
      fontSize: 14,
    };

    const defaultLayout: WidgetLayout = {
      width: 400,
      height: 600,
      position: "bottom-right",
      responsive: true,
    };

    const defaultBehavior: WidgetBehavior = {
      autoOpen: false,
      showWelcomeMessage: true,
      enableTypingIndicator: true,
      enableSoundNotifications: false,
    };

    const defaultBranding: WidgetBranding = {
      showLogo: true,
      companyName: this.getCurrentOrganization()?.name,
    };

    const defaultSecurity: WidgetSecurity = {
      allowedDomains: [],
      requireAuth: false,
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 60,
      },
    };

    return {
      theme: { ...defaultTheme, ...overrides.theme },
      layout: { ...defaultLayout, ...overrides.layout },
      behavior: { ...defaultBehavior, ...overrides.behavior },
      branding: { ...defaultBranding, ...overrides.branding },
      security: { ...defaultSecurity, ...overrides.security },
    };
  }

  // Event Subscriptions

  /**
   * Subscribe to widget events
   */
  onWidgetEvent(
    callback: (event: { type: string; widget: Widget }) => void,
  ): () => void {
    return this.subscribe("widget:event", callback);
  }

  /**
   * Subscribe to widget analytics updates
   */
  onAnalyticsUpdate(
    callback: (data: { widgetId: string; metrics: any }) => void,
  ): () => void {
    return this.subscribe("widget:analytics_update", callback);
  }

  /**
   * Subscribe to widget deployment events
   */
  onDeploymentEvent(
    callback: (event: { type: string; deployment: WidgetDeployment }) => void,
  ): () => void {
    return this.subscribe("widget:deployment_event", callback);
  }
}
