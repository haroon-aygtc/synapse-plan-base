export enum AgentEventType {
  // Agent events
  AGENT_CREATED = 'agent.created',
  AGENT_UPDATED = 'agent.updated',
  AGENT_DELETED = 'agent.deleted',
  AGENT_EXECUTION_STARTED = 'agent.execution.started',
  AGENT_EXECUTION_COMPLETED = 'agent.execution.completed',
  AGENT_EXECUTION_FAILED = 'agent.execution.failed',
  AGENT_PERFORMANCE_UPDATE = 'agent.performance.update',

  // Tool events
  TOOL_EXECUTION_STARTED = 'tool.execution.started',
  TOOL_EXECUTION_COMPLETED = 'tool.execution.completed',
  TOOL_EXECUTION_FAILED = 'tool.execution.failed',

  // Knowledge events
  KNOWLEDGE_SEARCH_PERFORMED = 'knowledge.search.performed',

  // AI Provider events
  AI_PROVIDER_CREATED = 'ai_provider.created',
  AI_PROVIDER_UPDATED = 'ai_provider.updated',
  AI_PROVIDER_DELETED = 'ai_provider.deleted',
  AI_PROVIDER_KEY_ROTATED = 'ai_provider.key_rotated',
  AI_PROVIDER_HEALTH_CHECK = 'ai_provider.health_check',
  AI_PROVIDER_STATUS_CHANGED = 'ai_provider.status_changed',

  // Notification events
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_FAILED = 'notification.failed',
  NOTIFICATION_DELIVERED = 'notification.delivered',
  NOTIFICATION_READ = 'notification.read',

  // Knowledge events
  KNOWLEDGE_DOCUMENT_UPLOADED = 'knowledge.document.uploaded',
  KNOWLEDGE_DOCUMENT_PROCESSED = 'knowledge.document.processed',
  KNOWLEDGE_DOCUMENT_DELETED = 'knowledge.document.deleted',

  // Session events
  SESSION_CONTEXT_UPDATED = 'session.context.updated',
  SESSION_RECOVERY_COMPLETED = 'session.recovery.completed',
  
  // User events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_BULK_ACTION = 'user.bulk_action',
  
  // Organization events
  ORGANIZATION_CREATED = 'organization.created',
  ORGANIZATION_UPDATED = 'organization.updated',
  ORGANIZATION_DELETED = 'organization.deleted',
}
