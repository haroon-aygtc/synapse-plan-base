import { apiClient } from './api';
import { ApiResponse } from './api-types';

export interface Widget {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  description?: string;
  type: string;
  configuration: WidgetConfiguration;
  isActive: boolean;
  isDeployed: boolean;
  version: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
export interface WidgetTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontSize: number;
  fontFamily?: string;
  customCSS?: string;
}
export interface WidgetLayout {
  width: number;
  height: number;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center" | "fullscreen";
  responsive: boolean;
  zIndex?: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}
export interface WidgetBehavior {
  autoOpen: boolean;
  showWelcomeMessage: boolean;
  enableTypingIndicator: boolean;
  enableSoundNotifications: boolean;
}
export interface WidgetBranding {
  showLogo: boolean;
  showPoweredBy?: boolean;
  logoUrl?: string;
  companyName?: string;
  poweredByText?: string;
  customHeader?: string;
  customFooter?: string;
}
export interface WidgetSecurity {
  allowedDomains: string[];
  requireAuth: boolean;
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}
export interface WidgetConfiguration {
  theme: WidgetTheme;
  layout: WidgetLayout;
  behavior: WidgetBehavior;
  branding: WidgetBranding;
  security?: WidgetSecurity;
}
export interface WidgetExecution {
  id: string;
  widgetId: string;
  sessionId?: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface WidgetAnalytics {
  id: string;
  widgetId: string;
  event: string;
  data?: Record<string, any>;
  sessionId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface CreateWidgetRequest {
  name: string;
  description?: string;
  type: string;
  config: Record<string, any>;
  styling?: Record<string, any>;
  behavior?: Record<string, any>;
  agentId?: string;
  workflowId?: string;
  isPublic?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateWidgetRequest extends Partial<CreateWidgetRequest> {
  id: string;
}

export interface DeployWidgetRequest {
  environment: 'development' | 'staging' | 'production';
  domain?: string;
  customDomain?: string;
  sslEnabled?: boolean;
  authRequired?: boolean;
  rateLimiting?: {
    enabled: boolean;
    requestsPerMinute?: number;
    requestsPerHour?: number;
  };
  cors?: {
    enabled: boolean;
    allowedOrigins?: string[];
  };
  analytics?: {
    enabled: boolean;
    trackingId?: string;
  };
}

export interface GenerateEmbedCodeRequest {
  framework: 'html' | 'react' | 'vue' | 'angular' | 'svelte';
  theme?: 'light' | 'dark' | 'auto';
  width?: string;
  height?: string;
  responsive?: boolean;
  customCSS?: string;
  initOptions?: Record<string, any>;
}

export interface TestWidgetRequest {
  testCases: Array<{
    name: string;
    input: Record<string, any>;
    expectedBehavior?: string;
    assertions?: Array<{
      type: 'element_exists' | 'text_contains' | 'attribute_equals' | 'custom';
      selector?: string;
      expected?: any;
      custom?: string;
    }>;
  }>;
  browserConfig?: {
    browsers?: ('chrome' | 'firefox' | 'safari' | 'edge')[];
    viewports?: Array<{ width: number; height: number; name: string }>;
    headless?: boolean;
  };
}

export class WidgetAPI {
  // CRUD Operations
  async getWidgets(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    tags?: string[];
    isPublic?: boolean;
    isActive?: boolean;
    userId?: string;
  }): Promise<ApiResponse<Widget[]>> {
    return apiClient.get('/widgets', { params });
  }

  async getWidget(id: string): Promise<ApiResponse<Widget>> {
    return apiClient.get(`/widgets/${id}`);
  }

  async createWidget(data: CreateWidgetRequest): Promise<ApiResponse<Widget>> {
    return apiClient.post('/widgets', data);
  }

  async updateWidget(data: UpdateWidgetRequest): Promise<ApiResponse<Widget>> {
    const { id, ...updateData } = data;
    return apiClient.put(`/widgets/${id}`, updateData);
  }

  async deleteWidget(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/widgets/${id}`);
  }

  async cloneWidget(id: string, name?: string): Promise<ApiResponse<Widget>> {
    return apiClient.post(`/widgets/${id}/clone`, { name });
  }

  // Deployment Operations
  async deployWidget(id: string, data: DeployWidgetRequest): Promise<ApiResponse<{
    deploymentUrl: string;
    deploymentId: string;
    status: string;
  }>> {
    return apiClient.post(`/widgets/${id}/deploy`, data);
  }

  async getDeploymentStatus(id: string): Promise<ApiResponse<{
    status: 'deploying' | 'deployed' | 'failed' | 'stopped';
    url?: string;
    error?: string;
    deployedAt?: string;
    lastDeployment?: string;
  }>> {
    return apiClient.get(`/widgets/${id}/deployment-status`);
  }

  async stopDeployment(id: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/widgets/${id}/stop-deployment`);
  }

  async getDeploymentLogs(id: string, params?: {
    lines?: number;
    since?: string;
    follow?: boolean;
  }): Promise<ApiResponse<string[]>> {
    return apiClient.get(`/widgets/${id}/deployment-logs`, { params });
  }

  // Embed Code Generation
  async generateEmbedCode(id: string, data: GenerateEmbedCodeRequest): Promise<ApiResponse<{
    embedCode: string;
    previewUrl: string;
    instructions: string;
  }>> {
    return apiClient.post(`/widgets/${id}/embed-code`, data);
  }

  async getEmbedCode(id: string): Promise<ApiResponse<{
    embedCode: string;
    lastGenerated: string;
  }>> {
    return apiClient.get(`/widgets/${id}/embed-code`);
  }

  // Preview Operations
  async previewWidget(id: string, params?: {
    theme?: 'light' | 'dark';
    width?: number;
    height?: number;
    mockData?: Record<string, any>;
  }): Promise<ApiResponse<{
    previewUrl: string;
    expiresAt: string;
  }>> {
    return apiClient.post(`/widgets/${id}/preview`, params);
  }

  async getPreviewUrl(id: string): Promise<ApiResponse<{
    previewUrl: string;
    expiresAt: string;
  }>> {
    return apiClient.get(`/widgets/${id}/preview-url`);
  }

  // Testing Operations
  async testWidget(id: string, data: TestWidgetRequest): Promise<ApiResponse<{
    testId: string;
    status: 'running' | 'completed' | 'failed';
    results?: any;
  }>> {
    return apiClient.post(`/widgets/${id}/test`, data);
  }

  async getTestResults(id: string, testId: string): Promise<ApiResponse<{
    testId: string;
    status: string;
    results: any;
    screenshots?: string[];
    logs?: string[];
    completedAt?: string;
  }>> {
    return apiClient.get(`/widgets/${id}/test-results/${testId}`);
  }

 

  async trackEvent(id: string, data: {
    event: string;
    data?: Record<string, any>;
    sessionId?: string;
    userId?: string;
  }): Promise<ApiResponse<void>> {
    return apiClient.post(`/widgets/${id}/track`, data);
  }

  async getPerformanceMetrics(id: string, params?: {
    startDate?: string;
    endDate?: string;
    metrics?: ('load_time' | 'interaction_time' | 'error_rate' | 'success_rate')[];
  }): Promise<ApiResponse<{
    averageLoadTime: number;
    averageInteractionTime: number;
    errorRate: number;
    successRate: number;
    totalInteractions: number;
    performanceScore: number;
  }>> {
    return apiClient.get(`/widgets/${id}/performance`, { params });
  }

  // Execution Operations
  async executeWidget(id: string, data: {
    input: Record<string, any>;
    sessionId?: string;
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<WidgetExecution>> {
    return apiClient.post(`/widgets/${id}/execute`, data);
  }

  async getExecution(executionId: string): Promise<ApiResponse<WidgetExecution>> {
    return apiClient.get(`/widget-executions/${executionId}`);
  }

  async getExecutions(widgetId?: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<WidgetExecution[]>> {
    const url = widgetId ? `/widgets/${widgetId}/executions` : '/widget-executions';
    return apiClient.get(url, { params });
  }

  // Version Management
  async getWidgetVersions(id: string): Promise<ApiResponse<Widget[]>> {
    return apiClient.get(`/widgets/${id}/versions`);
  }

  async createWidgetVersion(id: string, data: Partial<CreateWidgetRequest>): Promise<ApiResponse<Widget>> {
    return apiClient.post(`/widgets/${id}/versions`, data);
  }

  async rollbackWidget(id: string, version: number): Promise<ApiResponse<Widget>> {
    return apiClient.post(`/widgets/${id}/rollback`, { version });
  }

  // Marketplace Operations
  async publishToMarketplace(id: string, data: {
    title: string;
    description: string;
    category: string;
    tags: string[];
    price?: number;
    license?: string;
    screenshots?: string[];
    demoUrl?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.post(`/widgets/${id}/publish`, data);
  }

  async getMarketplaceWidgets(params?: {
    page?: number;
    limit?: number;
    category?: string;
    tags?: string[];
    search?: string;
    sortBy?: 'popularity' | 'rating' | 'created' | 'updated';
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<any[]>> {
    return apiClient.get('/marketplace/widgets', { params });
  }

  async installMarketplaceWidget(marketplaceId: string): Promise<ApiResponse<Widget>> {
    return apiClient.post(`/marketplace/widgets/${marketplaceId}/install`);
  }

  // Templates
  async getWidgetTemplates(params?: {
    category?: string;
    tags?: string[];
    search?: string;
  }): Promise<ApiResponse<any[]>> {
    return apiClient.get('/widget-templates', { params });
  }

  async createFromTemplate(templateId: string, data: {
    name: string;
    customizations?: Record<string, any>;
  }): Promise<ApiResponse<Widget>> {
    return apiClient.post(`/widget-templates/${templateId}/create`, data);
  }

  // Collaboration
  async shareWidget(id: string, data: {
    userIds?: string[];
    emails?: string[];
    permissions: ('read' | 'write' | 'deploy')[];
    expiresAt?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.post(`/widgets/${id}/share`, data);
  }

  async getSharedWidgets(): Promise<ApiResponse<Widget[]>> {
    return apiClient.get('/widgets/shared');
  }

  // Import/Export
  async exportWidget(id: string, format: 'json' | 'zip'): Promise<ApiResponse<any>> {
    return apiClient.get(`/widgets/${id}/export`, { params: { format } });
  }

  async importWidget(data: any, format: 'json' | 'zip'): Promise<ApiResponse<Widget>> {
    return apiClient.post('/widgets/import', { data, format });
  }

  // Security and Access Control
  async updateWidgetSecurity(id: string, data: {
    authRequired?: boolean;
    allowedDomains?: string[];
    rateLimiting?: {
      enabled: boolean;
      requestsPerMinute?: number;
    };
    ipWhitelist?: string[];
    apiKeyRequired?: boolean;
  }): Promise<ApiResponse<Widget>> {
    return apiClient.put(`/widgets/${id}/security`, data);
  }

  async generateApiKey(id: string, data: {
    name: string;
    permissions: string[];
    expiresAt?: string;
  }): Promise<ApiResponse<{
    apiKey: string;
    keyId: string;
  }>> {
    return apiClient.post(`/widgets/${id}/api-keys`, data);
  }

  async getApiKeys(id: string): Promise<ApiResponse<any[]>> {
    return apiClient.get(`/widgets/${id}/api-keys`);
  }

  async revokeApiKey(id: string, keyId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/widgets/${id}/api-keys/${keyId}`);
  }
}

export const widgetAPI = new WidgetAPI();