import {
  AgentEventType,
  WebSocketEventType,
  EventTargetType,
  EventPriority,
} from '../enums';

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
  eventType: AgentEventType | WebSocketEventType | string;
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
  eventType: AgentEventType | WebSocketEventType;
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

// Note: APIX Protocol interfaces have been moved to apix-protocol.interface.ts
// to avoid naming conflicts and maintain better organization
