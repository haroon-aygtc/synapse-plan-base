import { apiClient } from './api';
import { ApiResponse } from './api-types';

export interface AnalyticsQuery {
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  startDate?: string;
  endDate?: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

export interface AnalyticsDataPoint {
  timestamp: string;
  [key: string]: any;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  description?: string;
  query: AnalyticsQuery;
  data: AnalyticsDataPoint[];
  createdAt: string;
  updatedAt: string;
}

export interface RealTimeMetrics {
  activeUsers: number;
  activeSessions: number;
  requestsPerSecond: number;
  errorRate: number;
  avgResponseTime: number;
}

export interface UserBehaviorAnalytics {
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionDuration: number;
  topPages: Array<{ path: string; views: number }>;
  userRetention: Record<string, number>;
}

export interface HITLAnalytics {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  avgResolutionTime: number;
  agentPerformance: Array<{ agentId: string; completed: number; avgTime: number }>;
}

export interface WidgetAnalytics {
  views: number;
  interactions: number;
  conversionRate: number;
  avgTimeOnWidget: number;
  deviceBreakdown: Record<string, number>;
}

export interface ToolAnalytics {
  usageCount: number;
  avgExecutionTime: number;
  successRate: number;
  errorBreakdown: Record<string, number>;
}

export interface ProviderAnalytics {
  totalCost: number;
  usageByModel: Record<string, { requests: number; cost: number }>;
  performanceMetrics: Record<string, number>;
}

export interface KnowledgeAnalytics {
  totalQueries: number;
  successfulQueries: number;
  avgResponseTime: number;
  topKnowledgeBases: Array<{ id: string; queries: number }>;
}

export interface WorkflowAnalytics {
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  stepPerformance: Record<string, { executions: number; avgTime: number }>;
}

export interface AnalyticsDashboard {
  id: string;
  name: string;
  widgets: Array<{
    type: string;
    config: Record<string, any>;
    position: { x: number; y: number; w: number; h: number };
  }>;
  createdAt: string;
  updatedAt: string;
}

export class AnalyticsAPI {
  // Core Analytics Operations
  async queryAnalytics(query: AnalyticsQuery): Promise<ApiResponse<AnalyticsDataPoint[]>> {
    return apiClient.post('/analytics/query', query);
  }

  async getRealTimeMetrics(metrics: string[]): Promise<ApiResponse<RealTimeMetrics>> {
    return apiClient.get('/analytics/realtime', { params: { metrics: metrics.join(',') } });
  }

  async getUserBehaviorAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    page?: string;
  }): Promise<ApiResponse<UserBehaviorAnalytics>> {
    return apiClient.get('/analytics/user-behavior', { params });
  }

  // Report Management
  async createReport(reportData: {
    name: string;
    description?: string;
    query: AnalyticsQuery;
  }): Promise<ApiResponse<AnalyticsReport>> {
    return apiClient.post('/analytics/reports', reportData);
  }

  async getReports(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<AnalyticsReport[]>> {
    return apiClient.get('/analytics/reports', { params });
  }

  async getReportById(id: string): Promise<ApiResponse<AnalyticsReport>> {
    return apiClient.get(`/analytics/reports/${id}`);
  }

  async updateReport(
    id: string,
    reportData: Partial<{
      name: string;
      description: string;
      query: AnalyticsQuery;
    }>
  ): Promise<ApiResponse<AnalyticsReport>> {
    return apiClient.put(`/analytics/reports/${id}`, reportData);
  }

  async deleteReport(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/analytics/reports/${id}`);
  }

  async exportReport(id: string, format: 'csv' | 'json' | 'pdf'): Promise<ApiResponse<any>> {
    return apiClient.get(`/analytics/reports/${id}/export`, {
      params: { format },
      responseType: 'blob'
    });
  }

  // Dashboard Management
  async createDashboard(dashboardData: {
    name: string;
    widgets: AnalyticsDashboard['widgets'];
  }): Promise<ApiResponse<AnalyticsDashboard>> {
    return apiClient.post('/analytics/dashboards', dashboardData);
  }

  async getDashboards(): Promise<ApiResponse<AnalyticsDashboard[]>> {
    return apiClient.get('/analytics/dashboards');
  }

  async getDashboardById(id: string): Promise<ApiResponse<AnalyticsDashboard>> {
    return apiClient.get(`/analytics/dashboards/${id}`);
  }

  async updateDashboard(
    id: string,
    dashboardData: Partial<{
      name: string;
      widgets: AnalyticsDashboard['widgets'];
    }>
  ): Promise<ApiResponse<AnalyticsDashboard>> {
    return apiClient.put(`/analytics/dashboards/${id}`, dashboardData);
  }

  async deleteDashboard(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/analytics/dashboards/${id}`);
  }

  // Module-specific Analytics
  async getHITLAnalytics(period?: 'day' | 'week' | 'month'): Promise<ApiResponse<HITLAnalytics>> {
    return apiClient.get('/hitl/analytics', { params: { period } });
  }

  async getWidgetAnalytics(
    widgetId: string,
    params?: { startDate?: string; endDate?: string; granularity?: string }
  ): Promise<ApiResponse<WidgetAnalytics>> {
    return apiClient.get(`/widgets/${widgetId}/analytics`, { params });
  }

  async getToolAnalytics(
    toolId: string,
    params?: { startDate?: string; endDate?: string }
  ): Promise<ApiResponse<ToolAnalytics>> {
    return apiClient.get(`/tools/${toolId}/analytics`, { params });
  }

  async getProviderAnalytics(
    params?: { startDate?: string; endDate?: string; providerId?: string }
  ): Promise<ApiResponse<ProviderAnalytics>> {
    return apiClient.get('/providers/analytics', { params });
  }

  async getKnowledgeAnalytics(
    params?: { startDate?: string; endDate?: string; knowledgeBaseId?: string }
  ): Promise<ApiResponse<KnowledgeAnalytics>> {
    return apiClient.get('/knowledge/analytics', { params });
  }

  async getWorkflowAnalytics(
    workflowId: string,
    params?: { startDate?: string; endDate?: string }
  ): Promise<ApiResponse<WorkflowAnalytics>> {
    return apiClient.get(`/workflows/${workflowId}/analytics`, { params });
  }

  // Event Tracking
  async trackEvent(eventData: {
    type: string;
    properties: Record<string, any>;
    userId?: string;
    sessionId?: string;
  }): Promise<ApiResponse<void>> {
    return apiClient.post('/analytics/events', eventData);
  }

  async batchTrackEvents(events: Array<{
    type: string;
    properties: Record<string, any>;
    userId?: string;
    sessionId?: string;
    timestamp?: string;
  }>): Promise<ApiResponse<void>> {
    return apiClient.post('/analytics/events/batch', { events });
  }
}

export const analyticsAPI = new AnalyticsAPI();
