/**
 * SDK Modules Index
 * Exports all SDK modules for easy importing
 */

export { BaseModule } from "./base";
export { AuthModule } from "./auth";
export { AgentModule } from "./agent";
export { ToolModule } from "./tool";
export { SessionModule } from "./session";
export { WorkflowModule } from "./workflow";
export { KnowledgeModule } from "./knowledge";
export { BillingModule } from "./billing";
export { AnalyticsModule } from "./analytics";
export { AdminModule } from "./admin";
export { WidgetModule } from "./widget";
export { HITLModule } from "./hitl";
export { ProviderModule } from "./provider";

// Re-export types and interfaces
export type {
  CreateAgentRequest,
  UpdateAgentRequest,
  ExecuteAgentRequest,
  TestAgentRequest,
  AgentTestResult,
} from "./agent";

export type {
  CreateToolRequest,
  UpdateToolRequest,
  ExecuteToolRequest,
  TestToolRequest,
  ToolTestResult,
} from "./tool";

export type {
  CreateSessionRequest,
  UpdateSessionRequest,
  SessionData,
  SessionStats,
} from "./session";

export type {
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  ExecuteWorkflowRequest,
  WorkflowListOptions,
  WorkflowExecutionListOptions,
  WorkflowAnalytics,
} from "./workflow";

export type {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentListOptions,
  SearchRequest,
  SearchHistoryOptions,
  KnowledgeAnalytics,
} from "./knowledge";

export type {
  UsageQuery,
  QuotaStatus,
  BillingPeriod,
  Invoice,
  PlanLimits,
  BillingAlert,
} from "./billing";

export type {
  AnalyticsQuery,
  MetricQuery,
  DashboardData,
  ReportRequest,
  FunnelAnalysis,
  CohortAnalysis,
} from "./analytics";

export type {
  CreateUserRequest,
  UpdateUserRequest,
  UserListOptions,
  OrganizationSettings,
  SystemHealth,
  AuditLogEntry,
  AuditLogQuery,
  BulkUserOperation,
  SystemConfiguration,
} from "./admin";

export type {
  CreateWidgetRequest,
  UpdateWidgetRequest,
  WidgetListOptions,
  WidgetDeployment,
  WidgetAnalytics,
  WidgetTemplate,
  WidgetTestResult,
} from "./widget";

export type {
  CreateHITLRequest,
  UpdateHITLRequest,
  ResolveHITLRequest,
  HITLListOptions,
  HITLAnalytics,
} from "./hitl";

export type {
  CreateProviderRequest,
  UpdateProviderRequest,
  ProviderListOptions,
  ProviderPerformance,
  ProviderRouting,
  ProviderUsage,
  ProviderHealth,
} from "./provider";

// Authentication types
export type {
  LoginCredentials,
  RegisterData,
  LoginResponse,
  RefreshTokenResponse,
  PasswordResetRequest,
  PasswordReset,
  ChangePasswordRequest,
  UpdateProfileRequest,
} from "./auth";
