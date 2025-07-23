import {
  EventType,
  WebSocketEventType,
  EventTargetType,
  EventPriority,
  APXMessageType,
  APXStreamState,
  APXExecutionState,
  APXPermissionLevel,
  APXSecurityLevel,
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
  eventType: EventType | WebSocketEventType | string;
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
  eventType: EventType | WebSocketEventType;
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

// APIX WebSocket Protocol Interfaces
export interface IAPXMessage {
  type: APXMessageType;
  session_id: string;
  payload: any;
  timestamp: string;
  request_id: string;
  user_id?: string;
  organization_id?: string;
  correlation_id?: string;
  security_level?: APXSecurityLevel;
  permissions?: APXPermissionLevel[];
  metadata?: Record<string, any>;
}

export interface IAPXSessionContext {
  session_id: string;
  user_id: string;
  organization_id: string;
  permissions: APXPermissionLevel[];
  security_level: APXSecurityLevel;
  created_at: string;
  expires_at: string;
  agent_context?: {
    agent_id: string;
    conversation_id: string;
    memory: Record<string, any>;
    active_tools: string[];
  };
  workflow_context?: {
    workflow_id: string;
    execution_id: string;
    current_step: string;
    variables: Record<string, any>;
    state: APXExecutionState;
  };
  tool_context?: {
    active_calls: Array<{
      tool_id: string;
      call_id: string;
      parameters: Record<string, any>;
      state: APXExecutionState;
    }>;
  };
  knowledge_context?: {
    active_searches: string[];
    document_access: string[];
    search_history: Array<{
      query: string;
      timestamp: string;
      results_count: number;
    }>;
  };
  hitl_context?: {
    pending_requests: Array<{
      request_id: string;
      type: string;
      created_at: string;
      expires_at: string;
    }>;
  };
  widget_context?: {
    widget_id: string;
    embed_context: Record<string, any>;
    interaction_history: Array<{
      action: string;
      timestamp: string;
      data: any;
    }>;
  };
}

// Agent Execution Payloads
export interface IAPXAgentExecutionStarted {
  agent_id: string;
  execution_id: string;
  prompt: string;
  model: string;
  parameters: {
    temperature: number;
    max_tokens: number;
    stream: boolean;
  };
  tools_available: string[];
  memory_context: Record<string, any>;
}

export interface IAPXAgentTextChunk {
  execution_id: string;
  chunk_id: string;
  text: string;
  is_final: boolean;
  token_count: number;
  cumulative_tokens: number;
}

export interface IAPXAgentToolCall {
  execution_id: string;
  tool_call_id: string;
  tool_id: string;
  function_name: string;
  parameters: Record<string, any>;
  reasoning?: string;
}

export interface IAPXAgentMemoryUsed {
  execution_id: string;
  memory_type: 'short_term' | 'long_term' | 'episodic';
  memory_key: string;
  memory_value: any;
  context_relevance: number;
}

export interface IAPXAgentError {
  execution_id: string;
  error_type:
    | 'validation'
    | 'execution'
    | 'timeout'
    | 'rate_limit'
    | 'provider';
  error_code: string;
  error_message: string;
  error_details?: Record<string, any>;
  retry_possible: boolean;
  suggested_action?: string;
}

export interface IAPXAgentExecutionComplete {
  execution_id: string;
  final_response: string;
  total_tokens: number;
  execution_time_ms: number;
  tools_used: Array<{
    tool_id: string;
    call_count: number;
    success_rate: number;
  }>;
  memory_updates: Array<{
    type: string;
    key: string;
    operation: 'create' | 'update' | 'delete';
  }>;
  cost_breakdown: {
    model_cost: number;
    tool_cost: number;
    total_cost: number;
  };
}

// Tool Invocation Payloads
export interface IAPXToolCallStart {
  tool_call_id: string;
  tool_id: string;
  function_name: string;
  parameters: Record<string, any>;
  caller_type: 'agent' | 'workflow' | 'user';
  caller_id: string;
  timeout_ms: number;
}

export interface IAPXToolCallResult {
  tool_call_id: string;
  success: boolean;
  result: any;
  execution_time_ms: number;
  cost: number;
  metadata?: {
    api_calls_made: number;
    data_processed: number;
    cache_hit: boolean;
  };
}

export interface IAPXToolCallError {
  tool_call_id: string;
  error_type: 'validation' | 'execution' | 'timeout' | 'auth' | 'rate_limit';
  error_code: string;
  error_message: string;
  retry_possible: boolean;
  retry_after_ms?: number;
}

// Knowledge Base Payloads
export interface IAPXKBSearchPerformed {
  search_id: string;
  query: string;
  search_type: 'semantic' | 'keyword' | 'hybrid';
  filters?: Record<string, any>;
  max_results: number;
  threshold: number;
}

export interface IAPXKBChunkInjected {
  search_id: string;
  chunk_id: string;
  document_id: string;
  content: string;
  relevance_score: number;
  metadata: {
    document_title: string;
    chunk_index: number;
    source_url?: string;
    last_updated: string;
  };
}

// HITL Payloads
export interface IAPXHITLRequestCreated {
  request_id: string;
  request_type: 'approval' | 'input' | 'decision' | 'review';
  title: string;
  description: string;
  context: Record<string, any>;
  options?: Array<{
    id: string;
    label: string;
    value: any;
  }>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expires_at: string;
  assignee_roles: string[];
  assignee_users?: string[];
}

export interface IAPXHITLResolutionPending {
  request_id: string;
  assigned_to: string;
  assigned_at: string;
  estimated_resolution_time?: string;
}

export interface IAPXHITLResolved {
  request_id: string;
  resolution: {
    decision: any;
    reasoning?: string;
    resolved_by: string;
    resolved_at: string;
  };
  execution_should_continue: boolean;
  next_action?: string;
}

export interface IAPXHITLExpired {
  request_id: string;
  expired_at: string;
  default_action: 'continue' | 'halt' | 'retry';
  fallback_decision?: any;
}

// Widget Event Payloads
export interface IAPXWidgetLoaded {
  widget_id: string;
  embed_url: string;
  configuration: Record<string, any>;
  user_context?: {
    ip_address: string;
    user_agent: string;
    referrer?: string;
  };
}

export interface IAPXWidgetOpened {
  widget_id: string;
  interaction_id: string;
  opened_at: string;
  trigger: 'user_click' | 'auto_open' | 'api_call';
}

export interface IAPXWidgetQuerySubmitted {
  widget_id: string;
  interaction_id: string;
  query: string;
  query_type: 'text' | 'voice' | 'structured';
  context: Record<string, any>;
}

export interface IAPXWidgetConverted {
  widget_id: string;
  interaction_id: string;
  conversion_type: 'lead' | 'sale' | 'signup' | 'custom';
  conversion_value?: number;
  conversion_data: Record<string, any>;
}

// Control Event Payloads
export interface IAPXStreamControl {
  execution_id: string;
  action: 'pause' | 'resume';
  reason?: string;
  requested_by: string;
}

export interface IAPXTokenLimitReached {
  execution_id: string;
  current_tokens: number;
  token_limit: number;
  suggested_action: 'truncate' | 'summarize' | 'split' | 'upgrade';
}

export interface IAPXProviderFallback {
  execution_id: string;
  original_provider: string;
  fallback_provider: string;
  reason: 'rate_limit' | 'error' | 'timeout' | 'cost_optimization';
  impact_on_quality?: 'none' | 'minimal' | 'moderate' | 'significant';
}

// Session Lifecycle Payloads
export interface IAPXSessionCreated {
  session_id: string;
  user_id: string;
  organization_id: string;
  created_at: string;
  expires_at: string;
  permissions: APXPermissionLevel[];
  security_level: APXSecurityLevel;
  initial_context: Record<string, any>;
}

export interface IAPXSessionEnded {
  session_id: string;
  ended_at: string;
  reason: 'user_logout' | 'timeout' | 'admin_action' | 'system_shutdown';
  duration_ms: number;
  final_stats: {
    messages_sent: number;
    messages_received: number;
    executions_performed: number;
    total_cost: number;
  };
}

// Connection Acknowledgment
export interface IAPXConnectionAck {
  connection_id: string;
  session_id: string;
  server_time: string;
  protocol_version: string;
  supported_features: string[];
  rate_limits: {
    messages_per_minute: number;
    executions_per_hour: number;
    concurrent_streams: number;
  };
}

// Error Response Payloads
export interface IAPXValidationError {
  field: string;
  message: string;
  code: string;
  received_value?: any;
  expected_format?: string;
}

export interface IAPXPermissionDenied {
  required_permission: APXPermissionLevel;
  current_permissions: APXPermissionLevel[];
  resource_type: string;
  resource_id?: string;
  suggested_action: string;
}

export interface IAPXRateLimitExceeded {
  limit_type: 'messages' | 'executions' | 'bandwidth' | 'cost';
  current_usage: number;
  limit: number;
  reset_time: string;
  retry_after_ms: number;
}

// Message Validation Schema Types
export interface IAPXMessageSchema {
  type: APXMessageType;
  required_fields: string[];
  optional_fields: string[];
  payload_schema: Record<string, any>;
  security_requirements: {
    min_permission_level: APXPermissionLevel;
    required_security_level: APXSecurityLevel;
    tenant_isolation: boolean;
  };
}

// Real-time Streaming Interface
export interface IAPXStreamingSession {
  session_id: string;
  stream_id: string;
  stream_type: 'agent_execution' | 'tool_call' | 'knowledge_search';
  state: APXStreamState;
  created_at: string;
  last_activity: string;
  buffer_size: number;
  compression_enabled: boolean;
  encryption_enabled: boolean;
}

// Performance Monitoring
export interface IAPXPerformanceMetrics {
  session_id: string;
  message_type: APXMessageType;
  processing_time_ms: number;
  queue_time_ms: number;
  serialization_time_ms: number;
  network_latency_ms?: number;
  memory_usage_bytes: number;
  cpu_usage_percent: number;
  timestamp: string;
}

// Security Audit Trail
export interface IAPXSecurityEvent {
  event_id: string;
  session_id: string;
  event_type:
    | 'authentication'
    | 'authorization'
    | 'data_access'
    | 'permission_change';
  user_id: string;
  organization_id: string;
  resource_accessed?: string;
  action_attempted: string;
  result: 'allowed' | 'denied' | 'error';
  ip_address: string;
  user_agent: string;
  timestamp: string;
  additional_context?: Record<string, any>;
}
