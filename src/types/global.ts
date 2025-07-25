export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ORG_ADMIN = "ORG_ADMIN",
  DEVELOPER = "DEVELOPER",
  VIEWER = "VIEWER",
}

export const PERMISSIONS = {
  // System permissions
  SYSTEM_ADMIN: "system:admin",
  SYSTEM_MONITOR: "system:monitor",

  // Organization permissions
  ORG_READ: "org:read",
  ORG_UPDATE: "org:update",
  ORG_DELETE: "org:delete",
  ORG_SETTINGS: "org:settings",
  ORG_BILLING: "org:billing",

  // User permissions
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_INVITE: "user:invite",

  // Agent permissions
  AGENT_CREATE: "agent:create",
  AGENT_READ: "agent:read",
  AGENT_UPDATE: "agent:update",
  AGENT_DELETE: "agent:delete",
  AGENT_EXECUTE: "agent:execute",

  // Tool permissions
  TOOL_CREATE: "tool:create",
  TOOL_READ: "tool:read",
  TOOL_UPDATE: "tool:update",
  TOOL_DELETE: "tool:delete",
  TOOL_EXECUTE: "tool:execute",

  // Workflow permissions
  WORKFLOW_CREATE: "workflow:create",
  WORKFLOW_READ: "workflow:read",
  WORKFLOW_UPDATE: "workflow:update",
  WORKFLOW_DELETE: "workflow:delete",
  WORKFLOW_EXECUTE: "workflow:execute",
  WORKFLOW_APPROVE: "workflow:approve",

  // Knowledge permissions
  KNOWLEDGE_CREATE: "knowledge:create",
  KNOWLEDGE_READ: "knowledge:read",
  KNOWLEDGE_UPDATE: "knowledge:update",
  KNOWLEDGE_DELETE: "knowledge:delete",
  KNOWLEDGE_SEARCH: "knowledge:search",

  // Analytics permissions
  ANALYTICS_READ: "analytics:read",
  ANALYTICS_EXPORT: "analytics:export",
} as const;

export const ROLE_PERMISSIONS = {
  [UserRole.SUPER_ADMIN]: [
    PERMISSIONS.SYSTEM_ADMIN,
    PERMISSIONS.SYSTEM_MONITOR,
    PERMISSIONS.ORG_READ,
    PERMISSIONS.ORG_UPDATE,
    PERMISSIONS.ORG_DELETE,
    PERMISSIONS.ORG_SETTINGS,
    PERMISSIONS.ORG_BILLING,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_INVITE,
    PERMISSIONS.AGENT_CREATE,
    PERMISSIONS.AGENT_READ,
    PERMISSIONS.AGENT_UPDATE,
    PERMISSIONS.AGENT_DELETE,
    PERMISSIONS.AGENT_EXECUTE,
    PERMISSIONS.TOOL_CREATE,
    PERMISSIONS.TOOL_READ,
    PERMISSIONS.TOOL_UPDATE,
    PERMISSIONS.TOOL_DELETE,
    PERMISSIONS.TOOL_EXECUTE,
    PERMISSIONS.WORKFLOW_CREATE,
    PERMISSIONS.WORKFLOW_READ,
    PERMISSIONS.WORKFLOW_UPDATE,
    PERMISSIONS.WORKFLOW_DELETE,
    PERMISSIONS.WORKFLOW_EXECUTE,
    PERMISSIONS.WORKFLOW_APPROVE,
    PERMISSIONS.KNOWLEDGE_CREATE,
    PERMISSIONS.KNOWLEDGE_READ,
    PERMISSIONS.KNOWLEDGE_UPDATE,
    PERMISSIONS.KNOWLEDGE_DELETE,
    PERMISSIONS.KNOWLEDGE_SEARCH,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_EXPORT,
  ],
  [UserRole.ORG_ADMIN]: [
    PERMISSIONS.ORG_READ,
    PERMISSIONS.ORG_UPDATE,
    PERMISSIONS.ORG_SETTINGS,
    PERMISSIONS.ORG_BILLING,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_INVITE,
    PERMISSIONS.AGENT_CREATE,
    PERMISSIONS.AGENT_READ,
    PERMISSIONS.AGENT_UPDATE,
    PERMISSIONS.AGENT_DELETE,
    PERMISSIONS.AGENT_EXECUTE,
    PERMISSIONS.TOOL_CREATE,
    PERMISSIONS.TOOL_READ,
    PERMISSIONS.TOOL_UPDATE,
    PERMISSIONS.TOOL_DELETE,
    PERMISSIONS.TOOL_EXECUTE,
    PERMISSIONS.WORKFLOW_CREATE,
    PERMISSIONS.WORKFLOW_READ,
    PERMISSIONS.WORKFLOW_UPDATE,
    PERMISSIONS.WORKFLOW_DELETE,
    PERMISSIONS.WORKFLOW_EXECUTE,
    PERMISSIONS.WORKFLOW_APPROVE,
    PERMISSIONS.KNOWLEDGE_CREATE,
    PERMISSIONS.KNOWLEDGE_READ,
    PERMISSIONS.KNOWLEDGE_UPDATE,
    PERMISSIONS.KNOWLEDGE_DELETE,
    PERMISSIONS.KNOWLEDGE_SEARCH,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_EXPORT,
  ],
  [UserRole.DEVELOPER]: [
    PERMISSIONS.AGENT_CREATE,
    PERMISSIONS.AGENT_READ,
    PERMISSIONS.AGENT_UPDATE,
    PERMISSIONS.AGENT_DELETE,
    PERMISSIONS.AGENT_EXECUTE,
    PERMISSIONS.TOOL_CREATE,
    PERMISSIONS.TOOL_READ,
    PERMISSIONS.TOOL_UPDATE,
    PERMISSIONS.TOOL_DELETE,
    PERMISSIONS.TOOL_EXECUTE,
    PERMISSIONS.WORKFLOW_CREATE,
    PERMISSIONS.WORKFLOW_READ,
    PERMISSIONS.WORKFLOW_UPDATE,
    PERMISSIONS.WORKFLOW_DELETE,
    PERMISSIONS.WORKFLOW_EXECUTE,
    PERMISSIONS.KNOWLEDGE_CREATE,
    PERMISSIONS.KNOWLEDGE_READ,
    PERMISSIONS.KNOWLEDGE_UPDATE,
    PERMISSIONS.KNOWLEDGE_DELETE,
    PERMISSIONS.KNOWLEDGE_SEARCH,
    PERMISSIONS.ANALYTICS_READ,
  ],
  [UserRole.VIEWER]: [
    PERMISSIONS.AGENT_READ,
    PERMISSIONS.TOOL_READ,
    PERMISSIONS.WORKFLOW_READ,
    PERMISSIONS.KNOWLEDGE_READ,
    PERMISSIONS.KNOWLEDGE_SEARCH,
    PERMISSIONS.ANALYTICS_READ,
  ],
};

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  avatar?: string;
  preferences?: Record<string, any>;
  permissions?: string[];
  emailVerified: boolean;
  organization?: {
    id: string;
    name: string;
  };
}

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface RolePermissions {
  role: UserRole;
  permissions: string[];
}

export const PERMISSIONS = {
  // System permissions
  SYSTEM_ADMIN: "system:admin",
  SYSTEM_MONITOR: "system:monitor",

  // Organization permissions
  ORG_READ: "org:read",
  ORG_UPDATE: "org:update",
  ORG_DELETE: "org:delete",
  ORG_SETTINGS: "org:settings",
  ORG_BILLING: "org:billing",

  // User permissions
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_INVITE: "user:invite",

  // Agent permissions
  AGENT_CREATE: "agent:create",
  AGENT_READ: "agent:read",
  AGENT_UPDATE: "agent:update",
  AGENT_DELETE: "agent:delete",
  AGENT_EXECUTE: "agent:execute",

  // Tool permissions
  TOOL_CREATE: "tool:create",
  TOOL_READ: "tool:read",
  TOOL_UPDATE: "tool:update",
  TOOL_DELETE: "tool:delete",
  TOOL_EXECUTE: "tool:execute",

  // Workflow permissions
  WORKFLOW_CREATE: "workflow:create",
  WORKFLOW_READ: "workflow:read",
  WORKFLOW_UPDATE: "workflow:update",
  WORKFLOW_DELETE: "workflow:delete",
  WORKFLOW_EXECUTE: "workflow:execute",
  WORKFLOW_APPROVE: "workflow:approve",

  // Knowledge permissions
  KNOWLEDGE_CREATE: "knowledge:create",
  KNOWLEDGE_READ: "knowledge:read",
  KNOWLEDGE_UPDATE: "knowledge:update",
  KNOWLEDGE_DELETE: "knowledge:delete",
  KNOWLEDGE_SEARCH: "knowledge:search",

  // Analytics permissions
  ANALYTICS_READ: "analytics:read",
  ANALYTICS_EXPORT: "analytics:export",
} as const;

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [UserRole.ORG_ADMIN]: [
    PERMISSIONS.ORG_READ,
    PERMISSIONS.ORG_UPDATE,
    PERMISSIONS.ORG_SETTINGS,
    PERMISSIONS.ORG_BILLING,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_INVITE,
    PERMISSIONS.AGENT_CREATE,
    PERMISSIONS.AGENT_READ,
    PERMISSIONS.AGENT_UPDATE,
    PERMISSIONS.AGENT_DELETE,
    PERMISSIONS.AGENT_EXECUTE,
    PERMISSIONS.TOOL_CREATE,
    PERMISSIONS.TOOL_READ,
    PERMISSIONS.TOOL_UPDATE,
    PERMISSIONS.TOOL_DELETE,
    PERMISSIONS.TOOL_EXECUTE,
    PERMISSIONS.WORKFLOW_CREATE,
    PERMISSIONS.WORKFLOW_READ,
    PERMISSIONS.WORKFLOW_UPDATE,
    PERMISSIONS.WORKFLOW_DELETE,
    PERMISSIONS.WORKFLOW_EXECUTE,
    PERMISSIONS.WORKFLOW_APPROVE,
    PERMISSIONS.KNOWLEDGE_CREATE,
    PERMISSIONS.KNOWLEDGE_READ,
    PERMISSIONS.KNOWLEDGE_UPDATE,
    PERMISSIONS.KNOWLEDGE_DELETE,
    PERMISSIONS.KNOWLEDGE_SEARCH,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_EXPORT,
  ],
  [UserRole.DEVELOPER]: [
    PERMISSIONS.AGENT_CREATE,
    PERMISSIONS.AGENT_READ,
    PERMISSIONS.AGENT_UPDATE,
    PERMISSIONS.AGENT_DELETE,
    PERMISSIONS.AGENT_EXECUTE,
    PERMISSIONS.TOOL_CREATE,
    PERMISSIONS.TOOL_READ,
    PERMISSIONS.TOOL_UPDATE,
    PERMISSIONS.TOOL_DELETE,
    PERMISSIONS.TOOL_EXECUTE,
    PERMISSIONS.WORKFLOW_CREATE,
    PERMISSIONS.WORKFLOW_READ,
    PERMISSIONS.WORKFLOW_UPDATE,
    PERMISSIONS.WORKFLOW_DELETE,
    PERMISSIONS.WORKFLOW_EXECUTE,
    PERMISSIONS.KNOWLEDGE_CREATE,
    PERMISSIONS.KNOWLEDGE_READ,
    PERMISSIONS.KNOWLEDGE_UPDATE,
    PERMISSIONS.KNOWLEDGE_DELETE,
    PERMISSIONS.KNOWLEDGE_SEARCH,
    PERMISSIONS.ANALYTICS_READ,
  ],
  [UserRole.VIEWER]: [
    PERMISSIONS.AGENT_READ,
    PERMISSIONS.TOOL_READ,
    PERMISSIONS.WORKFLOW_READ,
    PERMISSIONS.KNOWLEDGE_READ,
    PERMISSIONS.KNOWLEDGE_SEARCH,
    PERMISSIONS.ANALYTICS_READ,
  ],
};
