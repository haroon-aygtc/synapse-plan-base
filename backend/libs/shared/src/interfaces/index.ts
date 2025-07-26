import { UserRole } from '../enums';

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  organizationId: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpiresAt?: Date;
  lastLoginAt?: Date;
  avatar?: string;
  preferences?: Record<string, any>;
  permissions?: string[];
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
  privacySettings?: Record<string, any>;
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

// Session interfaces are defined in session.interface.ts

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

// Re-export enums directly from the enums file
export {
  EventPriority,
  EventTargetType,
  WebSocketEventType,
  AgentEventType, // Changed EventType to AgentEventType
  UserRole,
} from '../enums';

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

// HITL Interfaces
export interface AuditTrailEntry {
  action: string;
  userId: string;
  timestamp: Date;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface HITLRequest {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  decisionType: string;
  sourceType: 'agent' | 'tool' | 'workflow';
  sourceId: string;
  executionId?: string;
  executionContext?: Record<string, any>;
  requesterId: string;
  assigneeId?: string;
  assigneeRoles?: string[];
  assigneeUsers?: string[];
  delegatedFromId?: string;
  delegatedToId?: string;
  decisionData?: {
    approved?: boolean;
    reason?: string;
    comments?: string;
    attachments?: string[];
    metadata?: Record<string, any>;
  };
  votingData?: {
    totalVotes: number;
    approvalVotes: number;
    rejectionVotes: number;
    abstainVotes: number;
    requiredVotes: number;
    voters: Array<{
      userId: string;
      vote: 'approve' | 'reject' | 'abstain';
      reason?: string;
      votedAt: Date;
    }>;
  };
  expiresAt: Date;
  timeoutMs: number;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  escalatedAt?: Date;
  escalationRules?: {
    enabled: boolean;
    timeoutMinutes: number;
    escalationChain: Array<{
      level: number;
      assigneeRoles?: string[];
      assigneeUsers?: string[];
      timeoutMinutes: number;
    }>;
    autoEscalate: boolean;
    maxEscalationLevel: number;
  };
  escalationLevel: number;
  escalationReason?: string;
  allowDiscussion: boolean;
  requireExpertConsultation: boolean;
  expertConsultants?: string[];
  discussionThreadId?: string;
  performanceMetrics?: {
    responseTimeMs: number;
    decisionTimeMs: number;
    escalationCount: number;
    discussionMessages: number;
    expertsConsulted: number;
    qualityScore?: number;
  };
  auditTrail?: AuditTrailEntry[];
  metadata?: Record<string, any>;
  tags?: string[];
  category?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Export all interface files
export * from './websocket.interface';
export * from './session.interface';
export * from './apix-protocol.interface';
export * from './widget.interface';
