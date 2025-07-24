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
}
