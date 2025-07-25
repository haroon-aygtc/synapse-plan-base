/**
 * SynapseAI SDK Type Definitions
 */

// Core SDK Configuration
export interface SynapseAIConfig {
  baseURL?: string;
  wsURL?: string;
  apiKey?: string;
  organizationId?: string;
  environment?: "development" | "staging" | "production";
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  autoConnect?: boolean;
  enableCache?: boolean;
  cacheSize?: number;
  debug?: boolean;
  rateLimiting?: {
    enabled?: boolean;
    requestsPerMinute?: number;
    burstLimit?: number;
  };
}

// Connection State
export interface ConnectionState {
  status: "connecting" | "connected" | "disconnected" | "error";
  lastConnected?: Date;
  reconnectAttempts: number;
  latency?: number;
  serverFeatures?: string[];
}

// Authentication State
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  organization: Organization | null;
  permissions: Permission[];
  tokenExpiresAt?: Date;
}

// Session Context
export interface SessionContext {
  sessionId: string;
  userId: string;
  organizationId: string;
  permissions: Record<string, any>;
  crossModuleData: Record<string, any>;
  executionState?: Record<string, any>;
  createdAt: Date;
  expiresAt: Date;
}

// Event Subscription
export interface EventSubscription {
  id: string;
  eventType: string;
  callback: (data: any) => void;
  options: {
    targetType?: "all" | "tenant" | "user" | "flow";
    targetId?: string;
    filters?: Record<string, any>;
  };
  subscribedAt: Date;
  isActive: boolean;
}

// API Response
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
  requestId?: string;
}

// Paginated Response
export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  preferences?: Record<string, any>;
}

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ORG_ADMIN = "ORG_ADMIN",
  DEVELOPER = "DEVELOPER",
  VIEWER = "VIEWER",
}

// Organization Types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: SubscriptionPlan;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  settings?: Record<string, any>;
  quotas?: Record<string, number>;
}

export enum SubscriptionPlan {
  FREE = "FREE",
  STARTER = "STARTER",
  PROFESSIONAL = "PROFESSIONAL",
  ENTERPRISE = "ENTERPRISE",
}

// Permission Types
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

// Agent Types
export interface Agent {
  id: string;
  name: string;
  description: string;
  prompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  organizationId: string;
  userId: string;
  isActive: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  performanceMetrics?: AgentPerformanceMetrics;
  tools?: string[];
  knowledgeSources?: string[];
}

export interface AgentPerformanceMetrics {
  successRate: number;
  averageResponseTime: number;
  totalExecutions: number;
  errorRate: number;
  lastUpdated: Date;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  input: string;
  output?: string;
  status: ExecutionStatus;
  tokensUsed?: number;
  cost?: number;
  executionTimeMs: number;
  toolCalls?: ToolCall[];
  knowledgeSearches?: KnowledgeSearch[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// Tool Types
export interface Tool {
  id: string;
  name: string;
  description: string;
  schema: any;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  organizationId: string;
  userId: string;
  isActive: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  category?: string;
  tags?: string[];
}

export interface ToolCall {
  id: string;
  toolId: string;
  functionName: string;
  parameters: Record<string, any>;
  result?: any;
  status: ExecutionStatus;
  executionTime: number;
  cost?: number;
  error?: string;
}

// Workflow Types
export interface Workflow {
  id: string;
  name: string;
  description: string;
  definition: WorkflowDefinition;
  organizationId: string;
  userId: string;
  isActive: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, any>;
  settings: WorkflowSettings;
}

export interface WorkflowNode {
  id: string;
  type: "agent" | "tool" | "condition" | "loop" | "hitl" | "start" | "end";
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  label?: string;
}

export interface WorkflowSettings {
  timeout: number;
  retryAttempts: number;
  errorHandling: "stop" | "continue" | "retry";
  notifications: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  currentStep?: string;
  completedSteps: string[];
  variables: Record<string, any>;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// Knowledge Types
export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  type: "text" | "pdf" | "docx" | "url";
  source: string;
  organizationId: string;
  userId: string;
  status: DocumentStatus;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export interface KnowledgeSearch {
  id: string;
  query: string;
  type: "semantic" | "keyword" | "hybrid";
  results: KnowledgeSearchResult[];
  filters?: Record<string, any>;
  createdAt: Date;
}

export interface KnowledgeSearchResult {
  documentId: string;
  title: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

// Billing Types
export interface UsageMetric {
  id: string;
  organizationId: string;
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  quantity: number;
  cost: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export enum ResourceType {
  AGENT_EXECUTION = "AGENT_EXECUTION",
  TOOL_EXECUTION = "TOOL_EXECUTION",
  WORKFLOW_EXECUTION = "WORKFLOW_EXECUTION",
  KNOWLEDGE_SEARCH = "KNOWLEDGE_SEARCH",
  STORAGE = "STORAGE",
  API_CALL = "API_CALL",
}

export interface BillingUsage {
  organizationId: string;
  period: { start: Date; end: Date };
  usage: Record<
    ResourceType,
    {
      quantity: number;
      cost: number;
      limit?: number;
    }
  >;
  totalCost: number;
  quotaStatus: Record<
    ResourceType,
    {
      used: number;
      limit: number;
      percentage: number;
    }
  >;
}

// Analytics Types
export interface AnalyticsEvent {
  id: string;
  type: string;
  userId: string;
  organizationId: string;
  properties: Record<string, any>;
  timestamp: Date;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  type: "usage" | "performance" | "cost" | "custom";
  filters: Record<string, any>;
  metrics: AnalyticsMetric[];
  period: { start: Date; end: Date };
  data: Record<string, any>;
  generatedAt: Date;
}

export interface AnalyticsMetric {
  name: string;
  value: number;
  unit: string;
  change?: {
    value: number;
    percentage: number;
    period: string;
  };
}

// Widget Types
export interface Widget {
  id: string;
  name: string;
  description?: string;
  type: "agent" | "tool" | "workflow";
  sourceId: string;
  configuration: WidgetConfiguration;
  organizationId: string;
  userId: string;
  isActive: boolean;
  isDeployed: boolean;
  usageCount?: number;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  deploymentInfo?: WidgetDeploymentInfo;
  analyticsData?: WidgetAnalyticsData;
}

export interface WidgetConfiguration {
  theme: WidgetTheme;
  layout: WidgetLayout;
  behavior: WidgetBehavior;
  branding: WidgetBranding;
  security?: WidgetSecurity;
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
  position:
    | "bottom-right"
    | "bottom-left"
    | "top-right"
    | "top-left"
    | "center"
    | "fullscreen";
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

// Widget Deployment and Analytics Types
export interface WidgetDeploymentInfo {
  environment: 'staging' | 'production';
  customDomain?: string;
  enableAnalytics: boolean;
  enableCaching: boolean;
  deployedAt: Date;
  lastUpdated: Date;
  status: 'active' | 'inactive' | 'error';
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
}

export interface WidgetAnalyticsData {
  views: number;
  interactions: number;
  conversions: number;
  averageSessionDuration: number;
  bounceRate: number;
  lastAccessed: Date;
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

// Widget Runtime Types
export interface WidgetRuntime {
  executeWidget(widgetId: string, input: any, context: WidgetExecutionContext): Promise<WidgetExecutionResult>;
  establishConnection(widgetId: string, parentOrigin: string): Promise<WidgetConnection>;
  trackEvent(event: WidgetEvent): void;
  validateOrigin(origin: string, allowedDomains: string[]): boolean;
}

export interface WidgetExecutionContext {
  sessionId: string;
  userId?: string;
  deviceInfo: DeviceInfo;
  geolocation?: GeolocationData;
  customData?: Record<string, any>;
}

export interface WidgetExecutionResult {
  executionId: string;
  result: any;
  status: 'completed' | 'failed' | 'timeout';
  tokensUsed?: number;
  executionTime: number;
  error?: string; 
  cost?: number;
  cacheHit?: boolean;
  apiCalls?: number;
  model?: string;
  provider?: string;
}

export interface WidgetConnection {
  id: string;
  widgetId: string;
  parentOrigin: string;
  userId?: string;
  organizationId?: string;
  user?: User;
  organization?: Organization;
  permissions?: Permission[];
  metadata?: Record<string, any>;
  established: Date;
  lastActivity: Date;
  isActive: boolean;
  sessionId?: string; 
  deviceInfo?: DeviceInfo;
  geolocation?: GeolocationData;
  customData?: Record<string, any>;
  messageHandler?: (event: MessageEvent) => void;
}

export interface WidgetEvent {
  type: 'view' | 'interaction' | 'conversion' | 'error';
  widgetId: string;
  sessionId: string;
  timestamp: Date;
  data: Record<string, any>;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  userAgent: string;
  screenResolution: {
    width: number;
    height: number;
  };
  browserInfo: {
    name: string;
    version: string;
  };
  operatingSystem: string;
}

export interface GeolocationData {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

// HITL Types
export interface HITLRequest {
  id: string;
  type: "approval" | "input" | "decision" | "review";
  title: string;
  description: string;
  context: Record<string, any>;
  options?: HITLOption[];
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "assigned" | "resolved" | "expired";
  assigneeRoles: string[];
  assigneeUsers?: string[];
  assignedTo?: string;
  resolution?: HITLResolution;
  createdAt: Date;
  expiresAt: Date;
  resolvedAt?: Date;
}

export interface HITLOption {
  id: string;
  label: string;
  value: any;
  description?: string;
}

export interface HITLResolution {
  decision: any;
  reasoning?: string;
  resolvedBy: string;
  resolvedAt: Date;
  metadata?: Record<string, any>;
}

// Provider Types
export interface AIProvider {
  id: string;
  name: string;
  type: "openai" | "anthropic" | "google" | "mistral" | "groq" | "custom";
  configuration: ProviderConfiguration;
  isActive: boolean;
  priority: number;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderConfiguration {
  apiKey: string;
  baseURL?: string;
  models: string[];
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  costPerToken: Record<string, number>;
  features: string[];
}

// Common Enums
export enum ExecutionStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  PAUSED = "PAUSED",
}

export enum DocumentStatus {
  UPLOADED = "UPLOADED",
  PROCESSING = "PROCESSING",
  PROCESSED = "PROCESSED",
  FAILED = "FAILED",
}

// Error Types
export interface SDKError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  requestId?: string;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Event Types
export interface SDKEvent {
  type: string;
  data: any;
  timestamp: Date;
  source: "sdk" | "websocket" | "apix";
}

// Cache Types
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  expiresAt: Date;
  createdAt: Date;
  }

// Request Options
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  cache?: boolean;
  cacheTTL?: number;
}

// Streaming Types
export interface StreamingResponse<T = any> {
  id: string;
  type: "chunk" | "complete" | "error";
  data: T;
  timestamp: Date;
}

export interface StreamingOptions {
  onChunk?: (chunk: any) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}
