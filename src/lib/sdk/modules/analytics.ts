/**
 * Analytics Module
 * Provides analytics data and reporting functionality
 */

import { BaseModule } from "./base";
import { SynapseAI } from "../client";
import {
  APIResponse,
  PaginatedResponse,
  AnalyticsEvent,
  AnalyticsReport,
  AnalyticsMetric,
  RequestOptions,
} from "../types";

export interface AnalyticsQuery {
  startDate: Date;
  endDate: Date;
  granularity?: "hour" | "day" | "week" | "month";
  filters?: {
    userId?: string;
    organizationId?: string;
    eventType?: string;
    resourceType?: string;
    resourceId?: string;
  };
  groupBy?: string[];
}

export interface MetricQuery {
  metric: string;
  startDate: Date;
  endDate: Date;
  granularity?: "hour" | "day" | "week" | "month";
  filters?: Record<string, any>;
  aggregation?: "sum" | "avg" | "count" | "min" | "max";
}

export interface DashboardData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalExecutions: number;
    successRate: number;
    averageResponseTime: number;
    totalCost: number;
  };
  trends: {
    userGrowth: Array<{ date: string; users: number; newUsers: number }>;
    executionTrends: Array<{
      date: string;
      executions: number;
      successRate: number;
    }>;
    costTrends: Array<{ date: string; cost: number }>;
  };
  topResources: {
    agents: Array<{
      id: string;
      name: string;
      executions: number;
      successRate: number;
    }>;
    tools: Array<{
      id: string;
      name: string;
      calls: number;
      successRate: number;
    }>;
    workflows: Array<{
      id: string;
      name: string;
      executions: number;
      successRate: number;
    }>;
  };
}

export interface ReportRequest {
  name: string;
  type: "usage" | "performance" | "cost" | "custom";
  description?: string;
  filters: Record<string, any>;
  metrics: string[];
  period: { start: Date; end: Date };
  schedule?: {
    frequency: "daily" | "weekly" | "monthly";
    recipients: string[];
    format: "pdf" | "csv" | "json";
  };
}

export interface FunnelAnalysis {
  steps: Array<{
    name: string;
    eventType: string;
    filters?: Record<string, any>;
  }>;
  period: { start: Date; end: Date };
  groupBy?: string;
}

export interface CohortAnalysis {
  cohortType: "registration" | "first_execution" | "custom";
  period: { start: Date; end: Date };
  retentionPeriods: number[];
  groupBy?: string;
}

/**
 * Analytics Module Class
 */
export class AnalyticsModule extends BaseModule {
  constructor(client: SynapseAI) {
    super(client, "/analytics");
  }

  /**
   * Track custom event
   */
  async trackEvent(
    event: {
      type: string;
      properties: Record<string, any>;
      userId?: string;
      sessionId?: string;
    },
    options: RequestOptions = {},
  ): Promise<APIResponse<AnalyticsEvent>> {
    this.validateRequired(event, ["type", "properties"]);

    this.debug("Tracking analytics event", { type: event.type });

    const response = await this.post<AnalyticsEvent>(
      "/events",
      {
        ...event,
        userId: event.userId || this.getCurrentUser()?.id,
        organizationId: this.getCurrentOrganization()?.id,
        timestamp: new Date(),
      },
      options,
    );

    this.emit("analytics:event_tracked", response.data);
    return response;
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(
    period: { start: Date; end: Date },
    options: RequestOptions = {},
  ): Promise<APIResponse<DashboardData>> {
    this.validateRequired(period, ["start", "end"]);

    this.debug("Getting dashboard data", period);

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    };

    return this.get<DashboardData>(
      `/dashboard${this.buildQueryString(params)}`,
      options,
    );
  }

  /**
   * Query analytics data
   */
  async queryAnalytics(
    query: AnalyticsQuery,
    options: RequestOptions = {},
  ): Promise<
    APIResponse<
      Array<{
        timestamp: string;
        value: number;
        dimensions?: Record<string, any>;
      }>
    >
  > {
    this.validateRequired(query, ["startDate", "endDate"]);

    this.debug("Querying analytics data", query);

    const requestData = {
      startDate: query.startDate.toISOString(),
      endDate: query.endDate.toISOString(),
      granularity: query.granularity || "day",
      filters: query.filters,
      groupBy: query.groupBy,
    };

    return this.post("/query", requestData, options);
  }

  /**
   * Get specific metric data
   */
  async getMetric(
    query: MetricQuery,
    options: RequestOptions = {},
  ): Promise<
    APIResponse<
      AnalyticsMetric & {
        data: Array<{
          timestamp: string;
          value: number;
        }>;
      }
    >
  > {
    this.validateRequired(query, ["metric", "startDate", "endDate"]);

    this.debug("Getting metric data", { metric: query.metric });

    const requestData = {
      startDate: query.startDate.toISOString(),
      endDate: query.endDate.toISOString(),
      granularity: query.granularity || "day",
      filters: query.filters,
      aggregation: query.aggregation || "sum",
    };

    return this.post(`/metrics/${query.metric}`, requestData, options);
  }

  /**
   * Get available metrics
   */
  async getAvailableMetrics(options: RequestOptions = {}): Promise<
    APIResponse<
      Array<{
        name: string;
        displayName: string;
        description: string;
        unit: string;
        category: string;
        aggregations: string[];
      }>
    >
  > {
    this.debug("Getting available metrics");

    return this.get("/metrics", options);
  }

  /**
   * Create custom report
   */
  async createReport(
    reportData: ReportRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<AnalyticsReport>> {
    this.validateRequired(reportData, [
      "name",
      "type",
      "filters",
      "metrics",
      "period",
    ]);

    this.debug("Creating analytics report", {
      name: reportData.name,
      type: reportData.type,
    });

    const requestData = {
      ...reportData,
      period: {
        start: reportData.period.start.toISOString(),
        end: reportData.period.end.toISOString(),
      },
      organizationId: this.getCurrentOrganization()?.id,
      userId: this.getCurrentUser()?.id,
    };

    const response = await this.post<AnalyticsReport>(
      "/reports",
      requestData,
      options,
    );

    this.emit("analytics:report_created", response.data);
    return response;
  }

  /**
   * Get report by ID
   */
  async getReport(
    reportId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<AnalyticsReport>> {
    this.validateRequired({ reportId }, ["reportId"]);

    this.debug("Getting analytics report", { reportId });

    return this.get<AnalyticsReport>(`/reports/${reportId}`, options);
  }

  /**
   * List reports
   */
  async listReports(
    query: {
      page?: number;
      limit?: number;
      type?: AnalyticsReport["type"];
      search?: string;
    } = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<AnalyticsReport>> {
    this.debug("Listing analytics reports", query);

    return this.getPaginated<AnalyticsReport>("/reports", query, options);
  }

  /**
   * Generate report data
   */
  async generateReport(
    reportId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<AnalyticsReport>> {
    this.validateRequired({ reportId }, ["reportId"]);

    this.debug("Generating report data", { reportId });

    const response = await this.post<AnalyticsReport>(
      `/reports/${reportId}/generate`,
      {},
      options,
    );

    this.emit("analytics:report_generated", response.data);
    return response;
  }

  /**
   * Export report data
   */
  async exportReport(
    reportId: string,
    format: "pdf" | "csv" | "json" | "xlsx" = "pdf",
    options: RequestOptions = {},
  ): Promise<Blob> {
    this.validateRequired({ reportId }, ["reportId"]);

    this.debug("Exporting report", { reportId, format });

    const config = this.client.getConfig();
    const response = await fetch(
      `${config.baseURL}/analytics/reports/${reportId}/export?format=${format}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          ...options.headers,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to export report: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Delete report
   */
  async deleteReport(
    reportId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<void>> {
    this.validateRequired({ reportId }, ["reportId"]);

    this.debug("Deleting analytics report", { reportId });

    const response = await this.delete<void>(`/reports/${reportId}`, options);

    this.emit("analytics:report_deleted", { reportId });
    return response;
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehavior(
    query: {
      userId?: string;
      startDate: Date;
      endDate: Date;
      events?: string[];
    },
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      totalSessions: number;
      averageSessionDuration: number;
      topEvents: Array<{ event: string; count: number }>;
      userJourney: Array<{
        timestamp: string;
        event: string;
        properties: Record<string, any>;
      }>;
      conversionFunnel: Array<{
        step: string;
        users: number;
        conversionRate: number;
      }>;
    }>
  > {
    this.validateRequired(query, ["startDate", "endDate"]);

    this.debug("Getting user behavior analytics", query);

    const requestData = {
      userId: query.userId,
      startDate: query.startDate.toISOString(),
      endDate: query.endDate.toISOString(),
      events: query.events,
    };

    return this.post("/behavior", requestData, options);
  }

  /**
   * Perform funnel analysis
   */
  async analyzeFunnel(
    funnelData: FunnelAnalysis,
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      totalUsers: number;
      steps: Array<{
        name: string;
        users: number;
        conversionRate: number;
        dropoffRate: number;
      }>;
      insights: string[];
    }>
  > {
    this.validateRequired(funnelData, ["steps", "period"]);

    this.debug("Analyzing funnel", { steps: funnelData.steps.length });

    const requestData = {
      ...funnelData,
      period: {
        start: funnelData.period.start.toISOString(),
        end: funnelData.period.end.toISOString(),
      },
    };

    return this.post("/funnel", requestData, options);
  }

  /**
   * Perform cohort analysis
   */
  async analyzeCohort(
    cohortData: CohortAnalysis,
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      cohorts: Array<{
        cohortDate: string;
        totalUsers: number;
        retentionRates: Record<string, number>;
      }>;
      averageRetention: Record<string, number>;
      insights: string[];
    }>
  > {
    this.validateRequired(cohortData, [
      "cohortType",
      "period",
      "retentionPeriods",
    ]);

    this.debug("Analyzing cohort", { cohortType: cohortData.cohortType });

    const requestData = {
      ...cohortData,
      period: {
        start: cohortData.period.start.toISOString(),
        end: cohortData.period.end.toISOString(),
      },
    };

    return this.post("/cohort", requestData, options);
  }

  /**
   * Get real-time analytics
   */
  async getRealTimeAnalytics(
    metrics: string[] = ["active_users", "executions_per_minute", "error_rate"],
    options: RequestOptions = {},
  ): Promise<
    APIResponse<
      Record<
        string,
        {
          value: number;
          change: number;
          trend: "up" | "down" | "stable";
          lastUpdated: string;
        }
      >
    >
  > {
    this.debug("Getting real-time analytics", { metrics });

    const params = {
      metrics: metrics.join(","),
    };

    return this.get(`/realtime${this.buildQueryString(params)}`, options);
  }

  /**
   * Get performance insights
   */
  async getPerformanceInsights(
    period: { start: Date; end: Date },
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      insights: Array<{
        type: "improvement" | "warning" | "critical";
        title: string;
        description: string;
        impact: "high" | "medium" | "low";
        recommendation: string;
        data: Record<string, any>;
      }>;
      score: number;
      trends: Record<string, "improving" | "declining" | "stable">;
    }>
  > {
    this.validateRequired(period, ["start", "end"]);

    this.debug("Getting performance insights", period);

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    };

    return this.get(`/insights${this.buildQueryString(params)}`, options);
  }

  /**
   * Create custom dashboard
   */
  async createDashboard(
    dashboard: {
      name: string;
      description?: string;
      widgets: Array<{
        type: string;
        title: string;
        config: Record<string, any>;
        position: { x: number; y: number; width: number; height: number };
      }>;
      isPublic?: boolean;
    },
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      id: string;
      name: string;
      description?: string;
      widgets: any[];
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    this.validateRequired(dashboard, ["name", "widgets"]);

    this.debug("Creating custom dashboard", { name: dashboard.name });

    const response = await this.post(
      "/dashboards",
      {
        ...dashboard,
        organizationId: this.getCurrentOrganization()?.id,
        userId: this.getCurrentUser()?.id,
      },
      options,
    );

    this.emit("analytics:dashboard_created", response.data);
    return response;
  }

  /**
   * Subscribe to real-time analytics updates
   */
  onRealTimeUpdate(callback: (data: Record<string, any>) => void): () => void {
    return this.subscribe("analytics:realtime_update", callback);
  }

  /**
   * Subscribe to report generation events
   */
  onReportGenerated(callback: (report: AnalyticsReport) => void): () => void {
    return this.subscribe("analytics:report_generated", callback);
  }

  /**
   * Subscribe to alert events
   */
  onAlert(
    callback: (alert: { type: string; message: string; data: any }) => void,
  ): () => void {
    return this.subscribe("analytics:alert", callback);
  }
}
