export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserWithOrg extends IUser {
  organization: IOrganization;
}

export interface IOrganization {
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

export interface IAgent {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface ITool {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkflow {
  id: string;
  name: string;
  description: string;
  definition: any;
  organizationId: string;
  userId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISession {
  id: string;
  sessionToken: string;
  userId: string;
  organizationId: string;
  context: Record<string, any>;
  metadata?: Record<string, any>;
  expiresAt: Date;
  lastAccessedAt?: Date;
  isActive: boolean;
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
  permissions?: Record<string, any>;
  accessCount: number;
  memoryUsage: number;
  memoryLimit?: number;
  crossModuleData?: Record<string, any>;
  workflowId?: string;
  agentId?: string;
  toolId?: string;
  knowledgeId?: string;
  hitlRequestId?: string;
  executionState?: Record<string, any>;
  isRecoverable: boolean;
  recoveryData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionContext {
  userId: string;
  organizationId: string;
  sessionId: string;
  permissions: Record<string, any>;
  crossModuleData: Record<string, any>;
  executionState?: Record<string, any>;
  workflowContext?: {
    workflowId: string;
    stepId: string;
    variables: Record<string, any>;
    state: 'running' | 'paused' | 'completed' | 'failed';
  };
  agentContext?: {
    agentId: string;
    conversationId: string;
    memory: Record<string, any>;
    toolCalls: Array<{
      toolId: string;
      parameters: Record<string, any>;
      result?: any;
    }>;
  };
  toolContext?: {
    toolId: string;
    executionId: string;
    parameters: Record<string, any>;
    state: 'pending' | 'running' | 'completed' | 'failed';
  };
  knowledgeContext?: {
    searchHistory: Array<{
      query: string;
      results: any[];
      timestamp: Date;
    }>;
    documentAccess: string[];
  };
  hitlContext?: {
    requestId: string;
    approvalType: string;
    requestData: Record<string, any>;
    status: 'pending' | 'approved' | 'rejected';
  };
}

export interface ISessionAnalytics {
  sessionId: string;
  organizationId: string;
  userId: string;
  duration: number;
  accessCount: number;
  memoryUsage: number;
  crossModuleInteractions: number;
  performanceMetrics: {
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  moduleUsage: {
    agent: number;
    tool: number;
    workflow: number;
    knowledge: number;
    hitl: number;
  };
  timestamp: Date;
}

export interface ISessionRecovery {
  sessionId: string;
  userId: string;
  organizationId: string;
  recoveryPoint: Date;
  executionState: Record<string, any>;
  crossModuleData: Record<string, any>;
  workflowState?: {
    workflowId: string;
    currentStep: string;
    completedSteps: string[];
    variables: Record<string, any>;
  };
  agentState?: {
    agentId: string;
    conversationHistory: any[];
    memory: Record<string, any>;
  };
  toolState?: {
    toolId: string;
    pendingExecutions: any[];
    results: Record<string, any>;
  };
}

export interface IUsageMetric {
  id: string;
  organizationId: string;
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  quantity: number;
  cost: number;
  timestamp: Date;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  DEVELOPER = 'DEVELOPER',
  VIEWER = 'VIEWER',
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum ResourceType {
  AGENT_EXECUTION = 'AGENT_EXECUTION',
  TOOL_EXECUTION = 'TOOL_EXECUTION',
  WORKFLOW_EXECUTION = 'WORKFLOW_EXECUTION',
  KNOWLEDGE_SEARCH = 'KNOWLEDGE_SEARCH',
  STORAGE = 'STORAGE',
  API_CALL = 'API_CALL',
}

// Import and re-export enums
import {
  EventPriority,
  EventTargetType,
  WebSocketEventType,
  EventType
} from '../enums';

export {
  EventPriority,
  EventTargetType,
  WebSocketEventType,
  EventType
};

export interface IJwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  role: UserRole;
  iat: number;
  exp?: number;
  tokenVersion?: number;
}

export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface IPaginatedResponse<T = any> extends IApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Export all interface files
export * from './websocket.interface';
export * from './apix-protocol.interface';

// MessageTrackingInfo is imported from @database/entities
