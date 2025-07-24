export enum APXMessageType {
  // Lifecycle Events
  CONNECTION_ACK = 'connection_ack',
  CONNECTION_HEARTBEAT = 'connection_heartbeat',
  SESSION_CREATED = 'session_created',
  SESSION_ENDED = 'session_ended',

  // Stream Events
  STREAM_STARTED = 'stream_started',
  STREAM_OUTPUT = 'stream_output',
  STREAM_COMPLETED = 'stream_completed',
  STREAM_ERROR = 'stream_error',
  STREAM_CANCELLED = 'stream_cancelled',

  // Tool Events
  TOOL_STARTED = 'tool_started',
  TOOL_OUTPUT = 'tool_output',
  TOOL_COMPLETED = 'tool_completed',
  TOOL_ERROR = 'tool_error',
  TOOL_CANCELLED = 'tool_cancelled',

  // Message Events
  MESSAGE_CREATED = 'message_created',
  MESSAGE_UPDATED = 'message_updated',
  MESSAGE_DELETED = 'message_deleted',
  MESSAGE_SENT = 'message_sent',
  MESSAGE_RECEIVED = 'message_received',

  // Conversation Events
  CONVERSATION_CREATED = 'conversation_created',
  CONVERSATION_UPDATED = 'conversation_updated',
  CONVERSATION_DELETED = 'conversation_deleted',

  // User Events
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',

  // Team Events
  TEAM_CREATED = 'team_created',
  TEAM_UPDATED = 'team_updated',
  TEAM_DELETED = 'team_deleted',

  // Workspace Events
  WORKSPACE_CREATED = 'workspace_created',
  WORKSPACE_UPDATED = 'workspace_updated',
  WORKSPACE_DELETED = 'workspace_deleted',

  // Agent Events
  AGENT_CREATED = 'agent_created',
  AGENT_UPDATED = 'agent_updated',
  AGENT_DELETED = 'agent_deleted',

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

  // HITL
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

  // Workflow Events
  WORKFLOW_EXECUTION_STARTED = 'workflow_execution_started',

  // Error Events
  VALIDATION_ERROR = 'validation_error',
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
}

export enum APXSecurityLevel {
  PUBLIC = 'public',
  AUTHENTICATED = 'authenticated',
  ENCRYPTED = 'encrypted',
  SENSITIVE = 'sensitive',
  PRIVATE = 'private',
}

export enum APXPermissionLevel {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
  ADMIN = 'admin',
}

export enum APXStreamState {
  INITIALIZING = 'initializing',
  STREAMING = 'streaming',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

export enum APXExecutionState {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}
