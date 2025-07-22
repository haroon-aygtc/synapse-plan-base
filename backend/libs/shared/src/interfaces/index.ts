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
  userId: string;
  organizationId: string;
  context: Record<string, any>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
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

export enum EventPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum EventTargetType {
  ALL = 'ALL',
  TENANT = 'TENANT',
  USER = 'USER',
  FLOW = 'FLOW',
}

export enum EventType {
  AGENT_EXECUTION = 'AGENT_EXECUTION',
  TOOL_EXECUTION = 'TOOL_EXECUTION',
  WORKFLOW_EXECUTION = 'WORKFLOW_EXECUTION',
  SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION',
  USER_ACTION = 'USER_ACTION',
}

export enum WebSocketEventType {
  CONNECTION = 'CONNECTION',
  SUBSCRIPTION = 'SUBSCRIPTION',
  MESSAGE = 'MESSAGE',
  HEARTBEAT = 'HEARTBEAT',
}

export interface IJwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  role: UserRole;
  iat?: number;
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

export * from './websocket.interface';

export interface IWebSocketMessage {
  event: string;
  payload: any;
  timestamp: Date;
  messageId: string;
  userId?: string;
  organizationId?: string;
  targetType?: EventTargetType;
  targetId?: string;
  priority?: EventPriority;
  correlationId?: string;
  retryCount?: number;
}

export interface IConnectionInfo {
  id: string;
  userId: string;
  organizationId: string;
  role?: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  userAgent?: string;
  ipAddress?: string;
  subscriptions?: Set<string>;
}

export interface ISubscriptionInfo {
  connectionId: string;
  userId: string;
  organizationId: string;
  eventTypes: Set<string>;
  subscribedAt: Date;
  lastActivity: Date;
  filters?: Record<string, any>;
}

export interface IEventTargeting {
  type: EventTargetType;
  targetId?: string;
  organizationId: string;
  filters?: Record<string, any>;
}

export interface IEventPublication {
  eventId: string;
  eventType: EventType | WebSocketEventType | string;
  sourceModule: string;
  targetModule?: string;
  payload: any;
  targeting: IEventTargeting;
  priority: EventPriority;
  correlationId?: string;
  parentEventId?: string;
  timestamp: Date;
  expiresAt?: Date;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

export interface IEventSubscription {
  subscriptionId: string;
  connectionId: string;
  userId: string;
  organizationId: string;
  eventType: string;
  targetType: EventTargetType;
  targetId?: string;
  filters?: Record<string, any>;
  subscribedAt: Date;
  isActive: boolean;
}

export interface IConnectionStats {
  totalConnections: number;
  connectionsByOrg: Record<string, number>;
  connectionsByRole: Record<string, number>;
  averageConnectionTime: number;
  peakConnections: number;
  messagesPerMinute: number;
  subscriptionStats: {
    totalSubscriptions: number;
    subscriptionsByEvent: Record<string, number>;
    subscriptionsByOrg: Record<string, number>;
    activeSubscribers: number;
  };
}

export interface IEventReplay {
  fromTimestamp: Date;
  toTimestamp?: Date;
  eventTypes?: string[];
  organizationId: string;
  userId?: string;
  correlationId?: string;
  maxEvents?: number;
}

export interface ICrossModuleEvent {
  sourceModule: string;
  targetModule: string;
  eventType: EventType | WebSocketEventType;
  payload: any;
  context: {
    userId: string;
    organizationId: string;
    sessionId?: string;
    workflowId?: string;
    agentId?: string;
    toolId?: string;
  };
  metadata?: Record<string, any>;
}
