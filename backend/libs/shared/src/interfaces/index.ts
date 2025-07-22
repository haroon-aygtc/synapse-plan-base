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

export interface IOrganization {
  id: string;
  name: string;
  slug: string;
  plan: SubscriptionPlan;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
