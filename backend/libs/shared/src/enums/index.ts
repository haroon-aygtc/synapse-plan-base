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
  NOTIFICATION_READ = 'notification.read',
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

export enum WebSocketEventType {
  // Connection Events
  CONNECTION_ESTABLISHED = 'connection.established',
  CONNECTION_LOST = 'connection.lost',
  HEARTBEAT = 'heartbeat',
  HEARTBEAT_ACK = 'heartbeat.ack',

  // Subscription Events
  SUBSCRIBE_EVENT = 'subscribe.event',
  UNSUBSCRIBE_EVENT = 'unsubscribe.event',
  SUBSCRIPTION_CONFIRMED = 'subscription.confirmed',
  SUBSCRIPTION_ERROR = 'subscription.error',

  // Publishing Events
  PUBLISH_EVENT = 'publish.event',
  EVENT_PUBLISHED = 'event.published',

  // Room Events
  JOIN_ROOM = 'join.room',
  LEAVE_ROOM = 'leave.room',
  ROOM_JOINED = 'room.joined',
  ROOM_LEFT = 'room.left',

  // Stats Events
  CONNECTION_STATS_UPDATE = 'connection.stats.update',
  SUBSCRIPTION_STATS_UPDATE = 'subscription.stats.update',

  // Flow Events
  NODE_MOVED = 'node.moved',
  NODE_CREATED = 'node.created',
  NODE_DELETED = 'node.deleted',
  NODE_UPDATED = 'node.updated',

  // Cross-Module Events
  AGENT_TOOL_CALL = 'agent.tool.call',
  TOOL_AGENT_RESPONSE = 'tool.agent.response',
  WORKFLOW_AGENT_EXECUTE = 'workflow.agent.execute',
  WORKFLOW_TOOL_EXECUTE = 'workflow.tool.execute',
  WORKFLOW_HITL_REQUEST = 'workflow.hitl.request',
  HITL_WORKFLOW_RESPONSE = 'hitl.workflow.response',
  KNOWLEDGE_AGENT_SEARCH = 'knowledge.agent.search',
  KNOWLEDGE_SEARCH_RESULT = 'knowledge.search.result',
}

// APIX WebSocket Protocol Message Types
export enum APXMessageType {
  // Lifecycle Events
  SESSION_CREATED = 'session_created',
  SESSION_ENDED = 'session_ended',
  CONNECTION_ACK = 'connection_ack',
  CONNECTION_HEARTBEAT = 'connection_heartbeat',

  // Agent Execution
  AGENT_EXECUTION_STARTED = 'agent_execution_started',
  AGENT_TEXT_CHUNK = 'agent_text_chunk',
  AGENT_TOOL_CALL = 'agent_tool_call',
  AGENT_MEMORY_USED = 'agent_memory_used',
  AGENT_ERROR = 'agent_error',
  AGENT_EXECUTION_COMPLETE = 'agent_execution_complete',

  // Tool Invocation
  TOOL_CALL_START = 'tool_call_start',
  TOOL_CALL_RESULT = 'tool_call_result',
  TOOL_CALL_ERROR = 'tool_call_error',

  // Knowledge Base
  KB_SEARCH_PERFORMED = 'kb_search_performed',
  KB_CHUNK_INJECTED = 'kb_chunk_injected',

  // HITL (Human-in-the-Loop)
  HITL_REQUEST_CREATED = 'hitl_request_created',
  HITL_RESOLUTION_PENDING = 'hitl_resolution_pending',
  HITL_RESOLVED = 'hitl_resolved',
  HITL_EXPIRED = 'hitl_expired',

  // Widget Events
  WIDGET_LOADED = 'widget_loaded',
  WIDGET_OPENED = 'widget_opened',
  WIDGET_QUERY_SUBMITTED = 'widget_query_submitted',
  WIDGET_CONVERTED = 'widget_converted',

  // Control Events
  STREAM_PAUSE = 'stream_pause',
  STREAM_RESUME = 'stream_resume',
  TOKEN_LIMIT_REACHED = 'token_limit_reached',
  PROVIDER_FALLBACK = 'provider_fallback',

  // Error Events
  VALIDATION_ERROR = 'validation_error',
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SESSION_EXPIRED = 'session_expired',
}

export enum APXStreamState {
  IDLE = 'idle',
  STREAMING = 'streaming',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export enum APXExecutionState {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}

export enum APXPermissionLevel {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
  EXECUTE = 'execute',
}

export enum APXSecurityLevel {
  PUBLIC = 'public',
  AUTHENTICATED = 'authenticated',
  ORGANIZATION = 'organization',
  PRIVATE = 'private',
}

export enum EventTargetType {
  ALL = 'all',
  TENANT = 'tenant',
  USER = 'user',
  FLOW = 'flow',
  ROOM = 'room',
}

export enum EventPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
}

export enum SessionEventType {
  SESSION_CREATED = 'session.created',
  SESSION_UPDATED = 'session.updated',
  SESSION_EXPIRED = 'session.expired',
  SESSION_DESTROYED = 'session.destroyed',
  SESSION_CONTEXT_UPDATED = 'session.context.updated',
  SESSION_MEMORY_WARNING = 'session.memory.warning',
  SESSION_MEMORY_LIMIT_EXCEEDED = 'session.memory.limit.exceeded',
  SESSION_CROSS_MODULE_UPDATE = 'session.cross.module.update',
  SESSION_RECOVERY_INITIATED = 'session.recovery.initiated',
  SESSION_RECOVERY_COMPLETED = 'session.recovery.completed',
  SESSION_ANALYTICS_UPDATE = 'session.analytics.update',
}
