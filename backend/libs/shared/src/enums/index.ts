export enum EventType {
  // Agent Events
  AGENT_CREATED = 'agent.created',
  AGENT_UPDATED = 'agent.updated',
  AGENT_DELETED = 'agent.deleted',
  AGENT_EXECUTION_STARTED = 'agent.execution.started',
  AGENT_EXECUTION_COMPLETED = 'agent.execution.completed',
  AGENT_EXECUTION_FAILED = 'agent.execution.failed',

  // Tool Events
  TOOL_CREATED = 'tool.created',
  TOOL_UPDATED = 'tool.updated',
  TOOL_DELETED = 'tool.deleted',
  TOOL_EXECUTION_STARTED = 'tool.execution.started',
  TOOL_EXECUTION_COMPLETED = 'tool.execution.completed',
  TOOL_EXECUTION_FAILED = 'tool.execution.failed',

  // Workflow Events
  WORKFLOW_CREATED = 'workflow.created',
  WORKFLOW_UPDATED = 'workflow.updated',
  WORKFLOW_DELETED = 'workflow.deleted',
  WORKFLOW_EXECUTION_STARTED = 'workflow.execution.started',
  WORKFLOW_EXECUTION_COMPLETED = 'workflow.execution.completed',
  WORKFLOW_EXECUTION_FAILED = 'workflow.execution.failed',
  WORKFLOW_STEP_COMPLETED = 'workflow.step.completed',
  WORKFLOW_APPROVAL_REQUESTED = 'workflow.approval.requested',
  WORKFLOW_APPROVAL_GRANTED = 'workflow.approval.granted',
  WORKFLOW_APPROVAL_DENIED = 'workflow.approval.denied',

  // Knowledge Events
  KNOWLEDGE_DOCUMENT_UPLOADED = 'knowledge.document.uploaded',
  KNOWLEDGE_DOCUMENT_PROCESSED = 'knowledge.document.processed',
  KNOWLEDGE_SEARCH_PERFORMED = 'knowledge.search.performed',

  // User Events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',

  // Organization Events
  ORGANIZATION_CREATED = 'organization.created',
  ORGANIZATION_UPDATED = 'organization.updated',
  ORGANIZATION_DELETED = 'organization.deleted',

  // Billing Events
  USAGE_RECORDED = 'billing.usage.recorded',
  QUOTA_EXCEEDED = 'billing.quota.exceeded',
  PAYMENT_PROCESSED = 'billing.payment.processed',
  SUBSCRIPTION_UPDATED = 'billing.subscription.updated',

  // Notification Events
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_FAILED = 'notification.failed',

  // System Events
  SYSTEM_HEALTH_CHECK = 'system.health.check',
  SYSTEM_ERROR = 'system.error',
}

export enum NotificationType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WEBHOOK = 'WEBHOOK',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum DocumentStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
}
